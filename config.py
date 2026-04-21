import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")

    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_NAME = os.getenv("DB_NAME", "music_streaming")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "nnm24cs168")

    # Set INIT_DB_ON_START=true to initialize schema and sample data automatically.
    INIT_DB_ON_START = os.getenv("INIT_DB_ON_START", "false").lower() == "true"
