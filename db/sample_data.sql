INSERT INTO users (username, email, password_hash)
VALUES
    -- Demo passwords: alice@example.com / alice123 and bob@example.com / bob123
    ('alice', 'alice@example.com', 'pbkdf2:sha256:600000$alice-salt$91f44c67ab91a6d2e9d4de760fe2115856f7b1311e5d74fe6f3a2834418497f0'),
    ('bob', 'bob@example.com', 'pbkdf2:sha256:600000$bob-salt$5f8863484a698e34930ad1811ebda84a5e709d69f0d25140466e1091f2a6ec19')
ON CONFLICT DO NOTHING;

INSERT INTO songs (song_id, title, artist, album, genre, audio_url, duration_seconds, release_year, lyrics)
VALUES
    (1, 'Sunrise Beats', 'Nova', 'City Lights', 'Pop', 'demo/sunrise_beats.mp3', 210, 2022, 'smile in the sun we dance all night'),
    (2, 'Midnight Rain', 'Echo Lane', 'Neon Dreams', 'Indie', 'demo/midnight_rain.mp3', 240, 2021, 'alone in the dark with silent tears'),
    (3, 'Run Wild', 'Pulse', 'Energy Wave', 'EDM', 'demo/run_wild.mp3', 200, 2023, 'jump and run set the fire free'),
    (4, 'Quiet Lake', 'Willow', 'Nature Tones', 'Ambient', 'demo/quiet_lake.mp3', 260, 2020, 'calm breeze and moonlight by the lake'),
    (5, 'Broken Strings', 'Aria', 'Heart Notes', 'Acoustic', 'demo/broken_strings.mp3', 230, 2019, 'broken words and fading lights'),
    (6, 'Party Orbit', 'Zed X', 'Galaxy Floor', 'Dance', 'demo/party_orbit.mp3', 195, 2024, 'party dance jump higher tonight')
ON CONFLICT (song_id) DO NOTHING;

INSERT INTO song_features (song_id, danceability, energy, valence, tempo, acousticness, speechiness, instrumentalness, liveness)
VALUES
    (1, 0.78, 0.72, 0.81, 122.0, 0.18, 0.05, 0.01, 0.14),
    (2, 0.42, 0.35, 0.22, 90.0, 0.62, 0.07, 0.03, 0.11),
    (3, 0.84, 0.91, 0.70, 130.0, 0.05, 0.04, 0.00, 0.19),
    (4, 0.28, 0.20, 0.48, 74.0, 0.85, 0.03, 0.40, 0.09),
    (5, 0.36, 0.33, 0.18, 82.0, 0.77, 0.06, 0.07, 0.10),
    (6, 0.88, 0.94, 0.86, 128.0, 0.03, 0.05, 0.00, 0.21)
ON CONFLICT (song_id) DO NOTHING;

INSERT INTO playlists (playlist_id, user_id, name)
VALUES
    (1, 1, 'Alice Favorites'),
    (2, 2, 'Bob Chill Mix')
ON CONFLICT DO NOTHING;

INSERT INTO playlist_songs (playlist_id, song_id)
VALUES
    (1, 1), (1, 3), (2, 2), (2, 4)
ON CONFLICT DO NOTHING;

INSERT INTO listening_history (user_id, song_id, listen_duration_seconds)
VALUES
    (1, 1, 205),
    (1, 3, 198),
    (1, 6, 190),
    (2, 2, 220),
    (2, 4, 250)
ON CONFLICT DO NOTHING;

INSERT INTO user_interactions (user_id, song_id, interaction_type, interaction_value)
VALUES
    (1, 1, 'like', 1.0),
    (1, 3, 'replay', 1.0),
    (1, 6, 'complete', 1.0),
    (2, 2, 'like', 1.0),
    (2, 5, 'skip', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO user_preferences (user_id, preference_type, value)
VALUES
    (1, 'genre', 'Pop'),
    (1, 'genre', 'EDM'),
    (1, 'artist', 'Nova'),
    (2, 'genre', 'Ambient'),
    (2, 'genre', 'Indie'),
    (2, 'artist', 'Willow')
ON CONFLICT (user_id, preference_type, value) DO NOTHING;

UPDATE users
SET onboarding_complete = TRUE
WHERE user_id IN (1, 2);

SELECT setval('songs_song_id_seq', COALESCE((SELECT MAX(song_id) FROM songs), 1), true);
SELECT setval('playlists_playlist_id_seq', COALESCE((SELECT MAX(playlist_id) FROM playlists), 1), true);
