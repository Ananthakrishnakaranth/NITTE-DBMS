#!/usr/bin/env python3
"""
Spotify Dataset Import Script
Imports the full Spotify dataset into the music_reco database.
"""

import sys
from pathlib import Path
import pandas as pd
import mysql.connector

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import Config


def get_connection():
    return mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        database=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
    )


def get_first_artist(artists_str):
    if not artists_str or pd.isna(artists_str):
        return "Unknown Artist"
    artists = str(artists_str).split(";")
    return artists[0].strip()


def convert_duration_ms(duration_ms):
    if pd.isna(duration_ms) or duration_ms is None:
        return 180
    try:
        return int(int(duration_ms) / 1000)
    except (ValueError, TypeError):
        return 180


def import_spotify_data(csv_path: str, batch_size: int = 1000):
    print(f"Loading CSV: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} rows")
    print(f"Unique genres: {df['track_genre'].nunique()}")

    song_records = []
    skipped = 0

    for idx, row in df.iterrows():
        try:
            title = str(row['track_name']).strip() if pd.notna(row['track_name']) else "Unknown"
            if not title or title == "nan":
                skipped += 1
                continue

            artist = get_first_artist(row['artists'])
            album = str(row['album_name']).strip() if pd.notna(row['album_name']) else None
            genre = str(row['track_genre']).strip() if pd.notna(row['track_genre']) else "Other"
            duration_seconds = convert_duration_ms(row['duration_ms'])
            popularity = int(row['popularity']) if pd.notna(row['popularity']) else 0
            explicit = bool(row['explicit']) if pd.notna(row['explicit']) else False

            song_records.append((
                title, artist, album, genre, None,
                duration_seconds, None, None,
                popularity, explicit
            ))

        except Exception as e:
            skipped += 1
            if skipped <= 5:
                print(f"Skipped row {idx}: {e}")

    print(f"Prepared {len(song_records)} songs ({skipped} skipped)")
    print("Inserting songs into database...")

    conn = get_connection()
    try:
        cursor = conn.cursor()
        for i in range(0, len(song_records), batch_size):
            batch = song_records[i:i + batch_size]
            for record in batch:
                cursor.execute(
                    """
                    INSERT IGNORE INTO songs (
                        title, artist, album, genre, audio_url,
                        duration_seconds, release_year, lyrics,
                        popularity, explicit
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    record
                )
            conn.commit()
            print(f"Songs batch {i // batch_size + 1}/{(len(song_records) - 1) // batch_size + 1}")
    finally:
        cursor.close()
        conn.close()

    print("Fetching song_ids for features...")

    df_features = df.copy()
    df_features['artist_first'] = df_features['artists'].apply(get_first_artist)
    df_features['duration_seconds'] = df_features['duration_ms'].apply(convert_duration_ms)

    feature_records = []
    conn = get_connection()
    try:
        cursor = conn.cursor()
        for idx, row in df_features.iterrows():
            try:
                title = str(row['track_name']).strip() if pd.notna(row['track_name']) else "Unknown"
                artist = row['artist_first']
                
                cursor.execute(
                    "SELECT song_id FROM songs WHERE title = %s AND artist = %s",
                    (title, artist)
                )
                result = cursor.fetchone()
                if result:
                    song_id = result[0]
                    danceability = float(row['danceability']) if pd.notna(row['danceability']) else 0.5
                    energy = float(row['energy']) if pd.notna(row['energy']) else 0.5
                    valence = float(row['valence']) if pd.notna(row['valence']) else 0.5
                    tempo = float(row['tempo']) if pd.notna(row['tempo']) else 120.0
                    acousticness = float(row['acousticness']) if pd.notna(row['acousticness']) else 0.5
                    speechiness = float(row['speechiness']) if pd.notna(row['speechiness']) else 0.0
                    instrumentalness = float(row['instrumentalness']) if pd.notna(row['instrumentalness']) else 0.0
                    liveness = float(row['liveness']) if pd.notna(row['liveness']) else 0.0
                    
                    feature_records.append((
                        song_id, danceability, energy, valence, tempo,
                        acousticness, speechiness, instrumentalness, liveness
                    ))
            except Exception as e:
                pass
            
            if (idx + 1) % 10000 == 0:
                print(f"Processed features for {idx + 1}/{len(df_features)} songs")
    finally:
        cursor.close()
        conn.close()

    print(f"Prepared {len(feature_records)} feature records")
    print("Inserting features...")

    conn = get_connection()
    try:
        cursor = conn.cursor()
        for i in range(0, len(feature_records), batch_size):
            batch = feature_records[i:i + batch_size]
            for record in batch:
                cursor.execute(
                    """
                    INSERT IGNORE INTO song_features (
                        song_id, danceability, energy, valence, tempo,
                        acousticness, speechiness, instrumentalness, liveness
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    record
                )
            conn.commit()
            print(f"Features batch {i // batch_size + 1}/{(len(feature_records) - 1) // batch_size + 1}")
    finally:
        cursor.close()
        conn.close()

    print("Import complete!")

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM songs")
        total = cursor.fetchone()[0]
        print(f"Total songs: {total}")

        cursor.execute("SELECT COUNT(*) FROM song_features")
        features = cursor.fetchone()[0]
        print(f"Total features: {features}")

        cursor.execute("SELECT COUNT(DISTINCT genre) FROM songs WHERE genre IS NOT NULL")
        genres = cursor.fetchone()[0]
        print(f"Unique genres: {genres}")

        cursor.execute("SELECT genre, COUNT(*) as cnt FROM songs GROUP BY genre ORDER BY cnt DESC LIMIT 10")
        print("Top 10 genres:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    csv_path = Path("C:\\Users\\Vishwa\\Downloads\\DBMS\\dataset.csv")
    
    if not csv_path.exists():
        print(f"ERROR: Could not find dataset.csv at {csv_path}")
        sys.exit(1)
    
    print(f"Starting Spotify import from {csv_path}")
    import_spotify_data(str(csv_path))