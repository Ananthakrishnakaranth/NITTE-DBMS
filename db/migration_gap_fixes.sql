ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

ALTER TABLE songs
ADD COLUMN IF NOT EXISTS audio_url TEXT;

CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    preference_type VARCHAR(20) NOT NULL CHECK (preference_type IN ('genre', 'artist')),
    value VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, preference_type, value)
);

ALTER TABLE user_interactions
ADD COLUMN IF NOT EXISTS feedback VARCHAR(10) NOT NULL DEFAULT 'neutral';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_interactions_feedback_check'
    ) THEN
        ALTER TABLE user_interactions
        ADD CONSTRAINT user_interactions_feedback_check
        CHECK (feedback IN ('like', 'skip', 'neutral'));
    END IF;
END;
$$;
