CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS songs (
    song_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    artist VARCHAR(120) NOT NULL,
    album VARCHAR(150),
    genre VARCHAR(50),
    audio_url TEXT,
    duration_seconds INT CHECK (duration_seconds > 0),
    release_year INT,
    lyrics TEXT,
    popularity INT DEFAULT 0,
    explicit BOOLEAN DEFAULT FALSE,
    UNIQUE (title, artist)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preference_type VARCHAR(20) NOT NULL CHECK (preference_type IN ('genre', 'artist')),
    value VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, preference_type, value)
);

CREATE TABLE IF NOT EXISTS playlists (
    playlist_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id INT NOT NULL,
    song_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (playlist_id, song_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(song_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listening_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    song_id INT NOT NULL,
    listen_duration_seconds INT DEFAULT 0,
    listened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(song_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_interactions (
    interaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    song_id INT NOT NULL,
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('like', 'skip', 'replay', 'complete')),
    feedback VARCHAR(10) NOT NULL DEFAULT 'neutral' CHECK (feedback IN ('like', 'skip', 'neutral')),
    interaction_value DECIMAL(5,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(song_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS song_features (
    song_id INT PRIMARY KEY,
    danceability DECIMAL(4,3) CHECK (danceability >= 0 AND danceability <= 1),
    energy DECIMAL(4,3) CHECK (energy >= 0 AND energy <= 1),
    valence DECIMAL(4,3) CHECK (valence >= 0 AND valence <= 1),
    tempo DECIMAL(6,2) CHECK (tempo > 0),
    acousticness DECIMAL(4,3) CHECK (acousticness >= 0 AND acousticness <= 1),
    speechiness DECIMAL(4,3) CHECK (speechiness >= 0 AND speechiness <= 1),
    instrumentalness DECIMAL(4,3) CHECK (instrumentalness >= 0 AND instrumentalness <= 1),
    liveness DECIMAL(4,3) CHECK (liveness >= 0 AND liveness <= 1),
    FOREIGN KEY (song_id) REFERENCES songs(song_id) ON DELETE CASCADE
);
