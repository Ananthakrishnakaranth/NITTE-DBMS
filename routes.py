from functools import wraps
import io
import math
from pathlib import Path
import struct
import wave
import mimetypes

from flask import Blueprint, abort, current_app, flash, jsonify, redirect, render_template, request, send_file, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from database import (
    create_user,
    execute_query,
    fetch_all,
    fetch_one,
    get_onboarding_options,
    get_song_by_id,
    get_user_by_email,
    is_onboarding_complete,
    log_song_play,
    save_user_preferences,
    search_songs,
    set_onboarding_complete,
)
from ml.recommender import get_top_recommendations


main_bp = Blueprint("main", __name__)


# MySQL: AUTO_INCREMENT is automatically managed, no sequence reset needed


def _build_demo_audio(song_id: int, duration_seconds: int = 20) -> io.BytesIO:
    """Generate a simple sine-wave WAV as a fallback when song files are missing."""
    sample_rate = 22050
    duration_seconds = max(5, min(duration_seconds or 20, 30))
    frame_count = sample_rate * duration_seconds

    # Pick deterministic notes per song id so tracks sound distinct.
    base_frequency = 220 + ((song_id * 37) % 440)
    secondary_frequency = base_frequency * 1.5
    amplitude = 0.28

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        for i in range(frame_count):
            t = i / sample_rate
            sample = (
                math.sin(2 * math.pi * base_frequency * t)
                + 0.45 * math.sin(2 * math.pi * secondary_frequency * t)
            )
            value = int(max(-1.0, min(1.0, sample * amplitude)) * 32767)
            wav_file.writeframesraw(struct.pack("<h", value))

    buffer.seek(0)
    return buffer


def login_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("main.auth_page"))
        return view_func(*args, **kwargs)

    return wrapped


def api_login_required(view_func):
    """Login guard that returns JSON 401 instead of redirect."""
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthenticated"}), 401
        return view_func(*args, **kwargs)

    return wrapped


# ─── Legacy HTML routes (keep for backward compat) ────────────────────────────

@main_bp.route("/")
def index():
    if "user_id" in session:
        if not is_onboarding_complete(session["user_id"]):
            return redirect(url_for("main.onboard"))
        return redirect(url_for("main.home"))
    return redirect(url_for("main.auth_page"))


@main_bp.route("/auth")
def auth_page():
    return render_template("auth.html")


@main_bp.route("/register", methods=["POST"])
def register():
    username = request.form.get("username", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "").strip()

    if not username or not email or not password:
        flash("All registration fields are required.", "error")
        return redirect(url_for("main.auth_page"))

    existing = fetch_one("SELECT user_id FROM users WHERE email = %s OR username = %s", (email, username))
    if existing:
        flash("User already exists with this email or username.", "error")
        return redirect(url_for("main.auth_page"))

    password_hash = generate_password_hash(password)
    user = create_user(username, email, password_hash)

    session["user_id"] = user["user_id"]
    session["username"] = user["username"]
    flash("Registration successful. Please select your preferences.", "success")
    return redirect(url_for("main.onboard"))


@main_bp.route("/login", methods=["POST"])
def login():
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "").strip()

    user = get_user_by_email(email)
    if not user or not check_password_hash(user["password_hash"], password):
        flash("Invalid email or password.", "error")
        return redirect(url_for("main.auth_page"))

    session["user_id"] = user["user_id"]
    session["username"] = user["username"]
    if not user.get("onboarding_complete"):
        flash("Complete onboarding to continue.", "error")
        return redirect(url_for("main.onboard"))

    flash("Welcome back!", "success")
    return redirect(url_for("main.home"))


@main_bp.route("/logout")
def logout():
    session.clear()
    flash("Logged out.", "success")
    return redirect(url_for("main.auth_page"))


@main_bp.route("/home")
@login_required
def home():
    if not is_onboarding_complete(session["user_id"]):
        return redirect(url_for("main.onboard"))

    songs = fetch_all("SELECT song_id, title, artist, genre, album, audio_url FROM songs ORDER BY title")
    playlists = fetch_all("SELECT playlist_id, name FROM playlists WHERE user_id = %s ORDER BY created_at DESC", (session["user_id"],))
    return render_template("home.html", songs=songs, playlists=playlists)


@main_bp.route("/search")
@login_required
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])
    return jsonify(search_songs(query))


@main_bp.route("/stream/<int:song_id>")
@login_required
def stream_song(song_id):
    song = fetch_one(
        """
        SELECT song_id, title, artist, genre, audio_url, duration_seconds
        FROM songs
        WHERE song_id = %s
        """,
        (song_id,),
    )
    if not song:
        abort(404)

    audio_url = (song.get("audio_url") or "").strip()
    if not audio_url:
        duration_seconds = int(song.get("duration_seconds") or 20)
        return send_file(_build_demo_audio(song_id, duration_seconds), mimetype="audio/wav", download_name=f"song_{song_id}.wav")

    if audio_url.startswith("http://") or audio_url.startswith("https://"):
        return redirect(audio_url)

    audio_base = Path(current_app.root_path) / "static" / "audio"
    audio_path = (audio_base / audio_url).resolve()
    if audio_path.exists() and audio_base in audio_path.parents:
        guessed_type, _ = mimetypes.guess_type(str(audio_path))
        return send_file(audio_path, mimetype=guessed_type or "application/octet-stream")

    # Fallback: synthesize demo audio so frontend playback always works in dev/demo setups.
    duration_seconds = int(song.get("duration_seconds") or 20)
    return send_file(_build_demo_audio(song_id, duration_seconds), mimetype="audio/wav", download_name=f"song_{song_id}.wav")


@main_bp.route("/play/<int:song_id>/log", methods=["POST"])
@login_required
def log_song_play_api(song_id):
    listen_duration = int(request.form.get("listen_duration_seconds", "180"))
    interaction_type = request.form.get("interaction_type", "complete")
    log_song_play(session["user_id"], song_id, listen_duration_seconds=listen_duration, interaction_type=interaction_type)
    return jsonify({"status": "ok"})


@main_bp.route("/play/<int:song_id>", methods=["POST"])
@login_required
def play_song(song_id):
    listen_duration = int(request.form.get("listen_duration_seconds", "180"))
    interaction_type = request.form.get("interaction_type", "complete")
    log_song_play(session["user_id"], song_id, listen_duration_seconds=listen_duration, interaction_type=interaction_type)

    flash("Playback logged.", "success")
    return redirect(url_for("main.home"))


@main_bp.route("/feedback", methods=["POST"])
@login_required
def submit_feedback():
    payload = request.get_json(silent=True) or request.form
    song_id_raw = payload.get("song_id")
    feedback = (payload.get("feedback") or "neutral").strip().lower()

    if not song_id_raw:
        return jsonify({"error": "song_id is required"}), 400

    if feedback not in {"like", "skip", "neutral"}:
        return jsonify({"error": "feedback must be like, skip, or neutral"}), 400

    try:
        song_id = int(song_id_raw)
    except (TypeError, ValueError):
        return jsonify({"error": "song_id must be an integer"}), 400

    existing = fetch_one(
        """
        SELECT interaction_id
        FROM user_interactions
        WHERE user_id = %s AND song_id = %s
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (session["user_id"], song_id),
    )

    if existing:
        execute_query(
            "UPDATE user_interactions SET feedback = %s WHERE interaction_id = %s",
            (feedback, existing["interaction_id"]),
        )
    else:
        execute_query(
            """
            INSERT INTO user_interactions (user_id, song_id, interaction_type, feedback, interaction_value)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (session["user_id"], song_id, "complete", feedback, 1.0),
        )

    return jsonify({"status": "ok", "song_id": song_id, "feedback": feedback})


@main_bp.route("/playlists", methods=["GET", "POST"])
@login_required
def playlists():
    user_id = session["user_id"]

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        if name:
            execute_query("INSERT INTO playlists (user_id, name) VALUES (%s, %s)", (user_id, name))
            flash("Playlist created.", "success")
        return redirect(url_for("main.playlists"))

    # Fetch playlists with their songs
    playlists = fetch_all(
        "SELECT playlist_id, name FROM playlists WHERE user_id = %s ORDER BY playlist_id DESC",
        (user_id,),
    )
    
    playlists_data = []
    for playlist in playlists:
        songs = fetch_all(
            """SELECT s.song_id, s.title, s.artist 
               FROM songs s 
               JOIN playlist_songs ps ON s.song_id = ps.song_id 
               WHERE ps.playlist_id = %s""",
            (playlist["playlist_id"],)
        )
        playlists_data.append({
            "playlist_id": playlist["playlist_id"],
            "name": playlist["name"],
            "songs": songs
        })

    songs = fetch_all("SELECT song_id, title, artist FROM songs ORDER BY title")
    return render_template("playlists.html", playlists=playlists_data, songs=songs)


@main_bp.route("/playlists/<int:playlist_id>/add", methods=["POST"])
@login_required
def add_song_to_playlist(playlist_id):
    song_id = int(request.form.get("song_id", "0"))

    owner = fetch_one("SELECT playlist_id FROM playlists WHERE playlist_id = %s AND user_id = %s", (playlist_id, session["user_id"]))
    if not owner:
        flash("Playlist not found.", "error")
        return redirect(url_for("main.playlists"))

    execute_query(
        """
        INSERT IGNORE INTO playlist_songs (playlist_id, song_id)
        VALUES (%s, %s)
        """,
        (playlist_id, song_id),
    )
    flash("Song added to playlist.", "success")
    return redirect(url_for("main.playlists"))


@main_bp.route("/history")
@login_required
def history():
    rows = fetch_all(
        """
        SELECT lh.history_id, s.title, s.artist, lh.listen_duration_seconds, lh.listened_at
        FROM listening_history lh
        JOIN songs s ON lh.song_id = s.song_id
        WHERE lh.user_id = %s
        ORDER BY lh.listened_at DESC
        """,
        (session["user_id"],),
    )
    return render_template("history.html", history=rows)


@main_bp.route("/onboard", methods=["GET", "POST"])
@login_required
def onboard():
    if is_onboarding_complete(session["user_id"]):
        return redirect(url_for("main.home"))

    if request.method == "POST":
        selected_genres = request.form.getlist("genres")
        selected_artists = request.form.getlist("artists")
        total_selected = len(selected_genres) + len(selected_artists)

        if total_selected < 3:
            flash("Please select at least 3 preferences.", "error")
            options = get_onboarding_options()
            return render_template("onboard.html", genres=options["genres"], artists=options["artists"])

        save_user_preferences(session["user_id"], selected_genres, selected_artists)
        set_onboarding_complete(session["user_id"])
        flash("Onboarding complete. Enjoy your music feed!", "success")
        return redirect(url_for("main.home"))

    options = get_onboarding_options()
    return render_template("onboard.html", genres=options["genres"], artists=options["artists"])


@main_bp.route("/recommendations")
@login_required
def recommendations():
    if not is_onboarding_complete(session["user_id"]):
        return redirect(url_for("main.onboard"))

    recs = get_top_recommendations(session["user_id"], top_n=5)
    return render_template("recommendations.html", recommendations=recs)


# ─── JSON API routes (consumed by React frontend) ─────────────────────────────

@main_bp.route("/api/me")
def api_me():
    if "user_id" not in session:
        return jsonify({"user": None}), 200
    return jsonify({
        "user": {
            "id": session["user_id"],
            "username": session.get("username", ""),
            "onboarding_complete": is_onboarding_complete(session["user_id"]),
        }
    })


@main_bp.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or request.form
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    user = get_user_by_email(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = user["user_id"]
    session["username"] = user["username"]
    return jsonify({
        "user": {
            "id": user["user_id"],
            "username": user["username"],
            "onboarding_complete": bool(user.get("onboarding_complete")),
        }
    })


@main_bp.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or request.form
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    existing = fetch_one("SELECT user_id FROM users WHERE email = %s OR username = %s", (email, username))
    if existing:
        return jsonify({"error": "User already exists with this email or username"}), 409

    password_hash = generate_password_hash(password)
    user = create_user(username, email, password_hash)

    session["user_id"] = user["user_id"]
    session["username"] = user["username"]
    return jsonify({
        "user": {
            "id": user["user_id"],
            "username": user["username"],
            "onboarding_complete": False,
        }
    }), 201


@main_bp.route("/api/logout", methods=["POST", "GET"])
def api_logout():
    session.clear()
    return jsonify({"status": "ok"})


@main_bp.route("/api/songs")
@api_login_required
def api_songs():
    songs = fetch_all("SELECT song_id, title, artist, genre, album, audio_url, duration_seconds, popularity FROM songs ORDER BY popularity DESC LIMIT 100")
    return jsonify(songs)


@main_bp.route("/api/search")
@api_login_required
def api_search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])
    return jsonify(search_songs(query))


@main_bp.route("/api/recommendations")
@api_login_required
def api_recommendations():
    if not is_onboarding_complete(session["user_id"]):
        return jsonify({"error": "Onboarding not complete"}), 403
    recs = get_top_recommendations(session["user_id"], top_n=20)
    return jsonify(recs)


@main_bp.route("/api/history")
@api_login_required
def api_history():
    rows = fetch_all(
        """
        SELECT lh.history_id, s.song_id, s.title, s.artist, s.genre,
               lh.listen_duration_seconds, lh.listened_at
        FROM listening_history lh
        JOIN songs s ON lh.song_id = s.song_id
        WHERE lh.user_id = %s
        ORDER BY lh.listened_at DESC
        LIMIT 200
        """,
        (session["user_id"],),
    )
    # Convert datetime to string for JSON serialisation
    result = []
    for r in rows:
        row = dict(r)
        if row.get("listened_at"):
            row["listened_at"] = row["listened_at"].isoformat()
        result.append(row)
    return jsonify(result)


@main_bp.route("/api/playlists", methods=["GET"])
@api_login_required
def api_playlists_get():
    user_id = session["user_id"]
    playlists = fetch_all(
        "SELECT playlist_id, name FROM playlists WHERE user_id = %s ORDER BY playlist_id DESC",
        (user_id,),
    )
    result = []
    for playlist in playlists:
        songs = fetch_all(
            """SELECT s.song_id, s.title, s.artist, s.genre
               FROM songs s
               JOIN playlist_songs ps ON s.song_id = ps.song_id
               WHERE ps.playlist_id = %s""",
            (playlist["playlist_id"],)
        )
        result.append({
            "playlist_id": playlist["playlist_id"],
            "name": playlist["name"],
            "songs": songs
        })
    return jsonify(result)


@main_bp.route("/api/playlists", methods=["POST"])
@api_login_required
def api_playlists_create():
    data = request.get_json(silent=True) or request.form
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    execute_query("INSERT INTO playlists (user_id, name) VALUES (%s, %s)", (session["user_id"], name))
    playlist = fetch_one(
        "SELECT playlist_id, name FROM playlists WHERE user_id = %s ORDER BY playlist_id DESC LIMIT 1",
        (session["user_id"],),
    )
    return jsonify(dict(playlist)), 201


@main_bp.route("/api/playlists/<int:playlist_id>/songs", methods=["POST"])
@api_login_required
def api_playlist_add_song(playlist_id):
    data = request.get_json(silent=True) or request.form
    song_id = data.get("song_id")
    if not song_id:
        return jsonify({"error": "song_id is required"}), 400

    owner = fetch_one(
        "SELECT playlist_id FROM playlists WHERE playlist_id = %s AND user_id = %s",
        (playlist_id, session["user_id"]),
    )
    if not owner:
        return jsonify({"error": "Playlist not found"}), 404

    execute_query(
        """
        INSERT IGNORE INTO playlist_songs (playlist_id, song_id)
        VALUES (%s, %s)
        """,
        (playlist_id, int(song_id)),
    )
    return jsonify({"status": "ok"})


@main_bp.route("/api/feedback", methods=["POST"])
@api_login_required
def api_feedback():
    payload = request.get_json(silent=True) or request.form
    song_id_raw = payload.get("song_id")
    feedback = (payload.get("feedback") or "neutral").strip().lower()

    if not song_id_raw:
        return jsonify({"error": "song_id is required"}), 400
    if feedback not in {"like", "skip", "neutral"}:
        return jsonify({"error": "feedback must be like, skip, or neutral"}), 400

    try:
        song_id = int(song_id_raw)
    except (TypeError, ValueError):
        return jsonify({"error": "song_id must be an integer"}), 400

    existing = fetch_one(
        """
        SELECT interaction_id FROM user_interactions
        WHERE user_id = %s AND song_id = %s
        ORDER BY created_at DESC LIMIT 1
        """,
        (session["user_id"], song_id),
    )
    if existing:
        execute_query(
            "UPDATE user_interactions SET feedback = %s WHERE interaction_id = %s",
            (feedback, existing["interaction_id"]),
        )
    else:
        execute_query(
            """
            INSERT INTO user_interactions (user_id, song_id, interaction_type, feedback, interaction_value)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (session["user_id"], song_id, "complete", feedback, 1.0),
        )
    return jsonify({"status": "ok", "song_id": song_id, "feedback": feedback})


@main_bp.route("/api/play/<int:song_id>/log", methods=["POST"])
@api_login_required
def api_log_play(song_id):
    data = request.get_json(silent=True) or request.form
    listen_duration = int(data.get("listen_duration_seconds", 180))
    interaction_type = data.get("interaction_type", "complete")
    log_song_play(session["user_id"], song_id, listen_duration_seconds=listen_duration, interaction_type=interaction_type)
    return jsonify({"status": "ok"})


@main_bp.route("/api/onboarding-options")
@api_login_required
def api_onboarding_options():
    options = get_onboarding_options()
    return jsonify(options)


@main_bp.route("/api/onboard", methods=["POST"])
@api_login_required
def api_onboard():
    if is_onboarding_complete(session["user_id"]):
        return jsonify({"status": "already_complete"})

    data = request.get_json(silent=True) or {}
    selected_genres = data.get("genres", [])
    selected_artists = data.get("artists", [])
    total_selected = len(selected_genres) + len(selected_artists)

    if total_selected < 3:
        return jsonify({"error": "Please select at least 3 preferences"}), 400

    save_user_preferences(session["user_id"], selected_genres, selected_artists)
    set_onboarding_complete(session["user_id"])
    return jsonify({"status": "ok"})
