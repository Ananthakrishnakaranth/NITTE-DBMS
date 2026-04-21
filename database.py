from pathlib import Path

import mysql.connector
from mysql.connector import Error

from config import Config


BASE_DIR = Path(__file__).resolve().parent


def get_connection():
    return mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        database=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
    )


def run_sql_file(file_path: Path) -> None:
    sql = file_path.read_text(encoding="utf-8")
    conn = get_connection()
    try:
        cursor = conn.cursor()
        # Split by semicolon to handle multiple statements
        statements = [stmt.strip() for stmt in sql.split(';') if stmt.strip()]
        for statement in statements:
            cursor.execute(statement)
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def initialize_database() -> None:
    schema_path = BASE_DIR / "db" / "schema.sql"
    data_path = BASE_DIR / "db" / "sample_data.sql"
    run_sql_file(schema_path)
    run_sql_file(data_path)


def _cursor_to_dict(cursor, row):
    """Convert cursor row to dictionary."""
    if row is None:
        return None
    return {cursor.column_names[i]: row[i] for i in range(len(row))}


def fetch_all(query, params=None):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params or ())
        rows = cursor.fetchall()
        return [_cursor_to_dict(cursor, row) for row in rows]
    finally:
        cursor.close()
        conn.close()


def fetch_one(query, params=None):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params or ())
        row = cursor.fetchone()
        return _cursor_to_dict(cursor, row)
    finally:
        cursor.close()
        conn.close()


def execute_query(query, params=None):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params or ())
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def create_user(username: str, email: str, password_hash: str):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash)
            VALUES (%s, %s, %s)
            """,
            (username, email, password_hash),
        )
        conn.commit()
        user_id = cursor.lastrowid
        # Fetch the created user
        cursor.execute(
            "SELECT user_id, username, onboarding_complete FROM users WHERE user_id = %s",
            (user_id,)
        )
        row = cursor.fetchone()
        return _cursor_to_dict(cursor, row)
    finally:
        cursor.close()
        conn.close()


def get_song_by_id(song_id: int):
    return fetch_one("SELECT song_id, title, artist, genre, audio_url FROM songs WHERE song_id = %s", (song_id,))


def search_songs(query: str):
    # LIKE is case-insensitive in MySQL by default
    pattern = f"%{query}%"
    return fetch_all(
        """
        SELECT song_id, title, artist, genre, album, audio_url
        FROM songs
        WHERE title LIKE %s OR artist LIKE %s OR genre LIKE %s
        ORDER BY title
        """,
        (pattern, pattern, pattern),
    )


def log_song_play(user_id: int, song_id: int, listen_duration_seconds: int = 180, interaction_type: str = "complete"):
    execute_query(
        """
        INSERT INTO listening_history (user_id, song_id, listen_duration_seconds)
        VALUES (%s, %s, %s)
        """,
        (user_id, song_id, listen_duration_seconds),
    )


def get_onboarding_options():
    genres = fetch_all("""
        SELECT genre AS value, COUNT(*) as cnt 
        FROM songs WHERE genre IS NOT NULL 
        GROUP BY genre ORDER BY cnt DESC LIMIT 10
    """)
    artists = fetch_all("""
        SELECT artist AS value, COUNT(*) as cnt 
        FROM songs WHERE artist IS NOT NULL 
        GROUP BY artist ORDER BY cnt DESC LIMIT 20
    """)
    return {
        "genres": [row["value"] for row in genres],
        "artists": [row["value"] for row in artists],
    }


def save_user_preferences(user_id: int, genres, artists):
    for genre in genres:
        execute_query(
            """
            INSERT INTO user_preferences (user_id, preference_type, value)
            VALUES (%s, 'genre', %s)
            ON DUPLICATE KEY UPDATE value = VALUES(value)
            """,
            (user_id, genre),
        )

    for artist in artists:
        execute_query(
            """
            INSERT INTO user_preferences (user_id, preference_type, value)
            VALUES (%s, 'artist', %s)
            ON DUPLICATE KEY UPDATE value = VALUES(value)
            """,
            (user_id, artist),
        )
    for genre in genres:
        execute_query(
            """
            INSERT INTO user_preferences (user_id, preference_type, value)
            VALUES (%s, 'genre', %s)
            ON DUPLICATE KEY UPDATE preference_id = preference_id
            """,
            (user_id, genre),
        )

    for artist in artists:
        execute_query(
            """
            INSERT INTO user_preferences (user_id, preference_type, value)
            VALUES (%s, 'artist', %s)
            ON DUPLICATE KEY UPDATE preference_id = preference_id
            """,
            (user_id, artist),
        )


def set_onboarding_complete(user_id: int):
    execute_query("UPDATE users SET onboarding_complete = TRUE WHERE user_id = %s", (user_id,))


def get_user_by_email(email: str):
    return fetch_one(
        "SELECT user_id, username, password_hash, onboarding_complete FROM users WHERE email = %s",
        (email,),
    )


def is_onboarding_complete(user_id: int):
    user = fetch_one("SELECT onboarding_complete FROM users WHERE user_id = %s", (user_id,))
    if not user:
        return False
    return bool(user["onboarding_complete"])
