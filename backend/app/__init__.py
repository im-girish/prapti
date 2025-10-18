from flask import Flask
from backend.app.db import db_init
from backend.app.api import api_bp
from backend.app.views import views_bp
import os

def create_app():
    app = Flask(__name__)
    
    # Basic configuration: Database URL from environment variable
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://prapti_user:prapti_pass@localhost:5432/prapti_db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize database
    db_init(app)

    # Register Blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(views_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5001, debug=True)

