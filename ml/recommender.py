from typing import List, Dict

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler

from database import fetch_all

try:
    from ml.mood_lstm import predict_mood_from_lyrics
except Exception:
    predict_mood_from_lyrics = None


FEATURE_COLUMNS = ["tempo", "energy", "valence", "danceability", "acousticness"]



def _cold_start_from_preferences(user_id: int, songs_df: pd.DataFrame, heard_song_ids: set, top_n: int):
    preferences = fetch_all(
        """
        SELECT preference_type, value
        FROM user_preferences
        WHERE user_id = %s
        """,
        (user_id,),
    )

    if preferences:
        pref_df = pd.DataFrame(preferences)
        preferred_genres = pref_df[pref_df["preference_type"] == "genre"]["value"].tolist()
        preferred_artists = pref_df[pref_df["preference_type"] == "artist"]["value"].tolist()

        # Use a simple popularity score (plays + likes - skips) among preferred songs.
        ranked = fetch_all(
            """
            SELECT s.song_id,
                   COALESCE(p.play_count, 0) AS play_count,
                   COALESCE(f.feedback_score, 0) AS feedback_score
            FROM songs s
            LEFT JOIN (
                SELECT song_id, COUNT(*) AS play_count
                FROM listening_history
                GROUP BY song_id
            ) p ON p.song_id = s.song_id
            LEFT JOIN (
                SELECT song_id,
                       SUM(CASE feedback WHEN 'like' THEN 1 WHEN 'skip' THEN -1 ELSE 0 END) AS feedback_score
                FROM user_interactions
                GROUP BY song_id
            ) f ON f.song_id = s.song_id
            WHERE (s.genre = ANY(%s) OR s.artist = ANY(%s))
            ORDER BY (COALESCE(p.play_count, 0) + COALESCE(f.feedback_score, 0)) DESC,
                     s.song_id DESC
            LIMIT 30
            """,
            (preferred_genres, preferred_artists),
        )

        ranked_ids = [row["song_id"] for row in ranked if row["song_id"] not in heard_song_ids]
        if ranked_ids:
            preferred_rows = songs_df[songs_df["song_id"].isin(ranked_ids)].copy()
            preferred_rows["fallback_score"] = preferred_rows["song_id"].apply(
                lambda sid: next(
                    (
                        row["play_count"] + row["feedback_score"]
                        for row in ranked
                        if row["song_id"] == sid
                    ),
                    0,
                )
            )
            result = preferred_rows.sort_values("fallback_score", ascending=False).head(top_n)
            return result[["song_id", "title", "artist", "genre", "fallback_score"]].to_dict(orient="records")

    # Last fallback: globally most played songs.
    globally_played = fetch_all(
        """
        SELECT s.song_id, s.title, s.artist, s.genre, COUNT(lh.history_id) AS fallback_score
        FROM songs s
        LEFT JOIN listening_history lh ON lh.song_id = s.song_id
        GROUP BY s.song_id, s.title, s.artist, s.genre
        ORDER BY fallback_score DESC, s.song_id DESC
        """
    )
    result = [row for row in globally_played if row["song_id"] not in heard_song_ids][:top_n]
    return result


def _feedback_multiplier(user_id: int, songs_df: pd.DataFrame, scaled_feature_matrix: np.ndarray):
    feedback_rows = fetch_all(
        """
        SELECT DISTINCT ON (song_id) song_id, feedback
        FROM user_interactions
        WHERE user_id = %s AND feedback IN ('like', 'skip')
        ORDER BY song_id, created_at DESC
        """,
        (user_id,),
    )

    if not feedback_rows:
        return np.ones(len(songs_df))

    feedback_df = pd.DataFrame(feedback_rows)
    song_id_to_idx = {song_id: idx for idx, song_id in enumerate(songs_df["song_id"].tolist())}

    liked_indices = [song_id_to_idx[sid] for sid in feedback_df[feedback_df["feedback"] == "like"]["song_id"] if sid in song_id_to_idx]
    skipped_indices = [song_id_to_idx[sid] for sid in feedback_df[feedback_df["feedback"] == "skip"]["song_id"] if sid in song_id_to_idx]

    multipliers = np.ones(len(songs_df))

    # Propagate explicit feedback through cosine similarity in feature space.
    if liked_indices:
        liked_matrix = scaled_feature_matrix[liked_indices]
        liked_similarity = cosine_similarity(scaled_feature_matrix, liked_matrix)
        liked_signal = np.clip(np.max(liked_similarity, axis=1), 0, 1)
        multipliers += 0.3 * liked_signal

    if skipped_indices:
        skipped_matrix = scaled_feature_matrix[skipped_indices]
        skipped_similarity = cosine_similarity(scaled_feature_matrix, skipped_matrix)
        skipped_signal = np.clip(np.max(skipped_similarity, axis=1), 0, 1)
        multipliers -= 0.3 * skipped_signal

    return np.clip(multipliers, 0.4, 1.6)


def get_top_recommendations(user_id: int, top_n: int = 5) -> List[Dict]:
    song_features = fetch_all(
        """
        SELECT s.song_id, s.title, s.artist, s.genre,
               sf.tempo, sf.energy, sf.valence, sf.danceability, sf.acousticness
        FROM songs s
        JOIN song_features sf ON s.song_id = sf.song_id
        ORDER BY s.song_id
        """
    )

    if not song_features:
        return []

    songs_df = pd.DataFrame(song_features)
    songs_df[FEATURE_COLUMNS] = songs_df[FEATURE_COLUMNS].astype(float)

    # Standardize features so tempo and bounded features are on comparable scale.
    scaler = StandardScaler()
    scaled_feature_matrix = scaler.fit_transform(songs_df[FEATURE_COLUMNS].to_numpy())

    history_entries = fetch_all(
        """
        SELECT song_id, listened_at AS played_at
        FROM listening_history
        WHERE user_id = %s
        ORDER BY listened_at DESC
        """,
        (user_id,),
    )

    heard_song_ids = {row["song_id"] for row in history_entries}

    # Cold-start policy: fewer than 3 plays means we prefer onboarding-based suggestions.
    if len(history_entries) < 3:
        return _cold_start_from_preferences(user_id, songs_df, heard_song_ids, top_n)

    history_df = pd.DataFrame(history_entries)
    history_df["played_at"] = pd.to_datetime(history_df["played_at"])
    latest_play = history_df["played_at"].max()

    # Exponential decay gives more weight to recently played songs.
    decay_rate_per_hour = np.log(2) / (7 * 24)  # 7-day half-life
    hours_ago = (latest_play - history_df["played_at"]).dt.total_seconds() / 3600.0
    history_df["recency_weight"] = np.exp(-decay_rate_per_hour * hours_ago)

    weighted_history = history_df.groupby("song_id", as_index=False)["recency_weight"].sum()
    weighted_rows = songs_df.merge(weighted_history, on="song_id", how="inner")

    if weighted_rows.empty:
        return _cold_start_from_preferences(user_id, songs_df, heard_song_ids, top_n)

    weighted_indices = songs_df[songs_df["song_id"].isin(weighted_rows["song_id"])].index.to_list()
    weighted_matrix = scaled_feature_matrix[weighted_indices]
    user_vector = np.average(
        weighted_matrix,
        axis=0,
        weights=weighted_rows["recency_weight"].to_numpy() + 1e-9,
    ).reshape(1, -1)

    base_similarity = cosine_similarity(user_vector, scaled_feature_matrix).flatten()
    multipliers = _feedback_multiplier(user_id, songs_df, scaled_feature_matrix)

    songs_df["similarity"] = base_similarity
    songs_df["final_score"] = base_similarity * multipliers

    # Return songs the user has not already heard.
    candidates = songs_df[~songs_df["song_id"].isin(heard_song_ids)].copy()
    top = candidates.sort_values("final_score", ascending=False).head(top_n)

    return top[["song_id", "title", "artist", "genre", "similarity", "final_score"]].to_dict(
        orient="records"
    )
