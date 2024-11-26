import os
from dotenv import load_dotenv

from flask import Flask
from flask_socketio import SocketIO


socketio = SocketIO(manage_sessions=False, cors_allowed_origins='*', async_mode='eventlet')


def create_app():
    app = Flask(__name__)
    load_dotenv()
    if os.getenv('SECRET_KEY') is None:
        raise ValueError('SECRET_KEY is not set in .env')
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

    with app.app_context():
        # blueprint for main game page/APIs
        from .main import main as main_blueprint
        app.register_blueprint(main_blueprint)


        # # blueprint for an admin panel
        # from .admin import admin as admin_blueprint
        # app.register_blueprint(admin_blueprint)

        socketio.init_app(app)

        return app

