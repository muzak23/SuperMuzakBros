import hashlib
import os
from dotenv import load_dotenv

from flask import Flask, url_for
from flask_socketio import SocketIO


socketio = SocketIO(manage_sessions=False, cors_allowed_origins='*', async_mode='eventlet')


def create_app():
    app = Flask(__name__)
    load_dotenv()
    if os.getenv('SECRET_KEY') is None:
        raise ValueError('SECRET_KEY is not set in .env')
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

    def build_static_map():
        cache = {}
        # Update to include all the new modular JavaScript files
        js_files = [
            'main.js',
            'game.js',
            'network.js',
            'entities/Character.js',
            'entities/Player.js',
            'entities/Enemy.js',
            'entities/Platform.js'
        ]
        css_files = [
            'game.css'
        ]

        for name in js_files + css_files:
            path = os.path.join(app.static_folder, name)
            if os.path.exists(path):
                with open(path, 'rb') as f:
                    cache[name] = hashlib.md5(f.read()).hexdigest()[:8]
            else:
                cache[name] = '0'
        return cache

    STATIC_HASHES = build_static_map()

    @app.context_processor
    def inject_static():
        def static_file(filename):
            h = STATIC_HASHES.get(filename, '0')
            return url_for('static', filename=filename, v=h)
        return {'static_file': static_file}

    with app.app_context():
        # blueprint for main game page/APIs
        from .main import main as main_blueprint
        app.register_blueprint(main_blueprint)


        # # blueprint for an admin panel
        # from .admin import admin as admin_blueprint
        # app.register_blueprint(admin_blueprint)

        socketio.init_app(app)

        return app
