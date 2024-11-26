from flask import render_template, session
from flask import Blueprint

from . import socketio
from flask_socketio import emit

# from game import *

main = Blueprint('main', __name__)

players = {}

@main.route("/")
def index():
    print('index route')
    return render_template('index.html')


@socketio.on('connect')
def connect_handler():
    print('someone is trying to connect')
    print('sending them ' + str({'players': players}))
    emit('connected', {
        'players': players
    })


@socketio.on('username')
def username_handler(username):
    print(f'username handler received {username}')
    username = username['username']
    if username is None or str(username).isspace() or username == '' \
            or len(username) > 16:
        print(f'INVALID: user chose username {username}')
        return 'invalidUsername'
    username = username.strip()
    # store username in session
    session['username'] = username
    print(f'VALID: user chose username {username}')
    players[username] = (50, 200)
    emit('newPlayer', username, broadcast=True, include_self=False)
    return 'validUsername'


@socketio.on('playerPos')
def playerPos_handler(data):
    print(f"{session['username']} moved to ({data[0]}, {data[1]})")
    bc = {
        'username': session['username'],
        'pos': data
    }
    players[session['username']] = data
    emit('playerPos', bc, broadcast=True, include_self=False)


@socketio.on('disconnect')
def disconnect_handler():
    print(f'{session["username"]} disconnected')
    del players[session['username']]
    emit('playerDisconnect', session['username'], broadcast=True, include_self=False)
