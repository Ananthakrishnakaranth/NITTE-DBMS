from flask import Flask
from flask_cors import CORS

from config import Config
from database import initialize_database
from routes import main_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_DOMAIN'] = None
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SECURE'] = False  # Set True in production

    # Allow the Vite dev server to make credentialed requests
    CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True, allow_headers="Content-Type")

    app.register_blueprint(main_bp)

    if Config.INIT_DB_ON_START:
        initialize_database()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)
