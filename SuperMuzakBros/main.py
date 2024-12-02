from datetime import datetime

from flask import render_template, session
from flask import Blueprint

from . import socketio
from flask_socketio import emit

# from game import *

main = Blueprint('main', __name__)

class Player:
    def __init__(self, username, pos=(50, 200)):
        self.username = username
        self.pos = pos
        self.chat_history = []

    def add_message(self, message, timestamp):
        self.chat_history.append((message, timestamp))

    def get_last_message_time(self):
        if self.chat_history:
            return self.chat_history[-1][1]
        return None

    def isRateLimited(self):
        last_message_time = self.get_last_message_time()
        if last_message_time is not None:
            return (datetime.now() - last_message_time).total_seconds() < 3
        return False


players = {}

@main.route("/")
def index():
    print('index route')
    return render_template('index.html')


@socketio.on('connect')
def connect_handler():
    print('someone is trying to connect')
    public_players = {k: {'username': v.username, 'pos': v.pos} for k, v in players.items()}
    print('sending them ' + str({'players': public_players}))
    emit('connected', {
        'players': public_players
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
    players[username] = Player(username)
    emit('newPlayer', username, broadcast=True, include_self=False)
    return 'validUsername'


@socketio.on('playerPos')
def playerPos_handler(data):
    print(f"{session['username']} moved to ({data[0]}, {data[1]})")
    bc = {
        'username': session['username'],
        'pos': data
    }
    players[session['username']].pos = data
    emit('playerPos', bc, broadcast=True, include_self=False)


@socketio.on('playerMessage')
def playerMessage_handler(data):
    player = players[session['username']]
    print(f"{player.username} says: {data}")
    # don't let them send if sent in last 3 seconds
    if player.isRateLimited():
        print(f"{player.username} is rate limited")
        return 'messageRateLimit'
    player.add_message(data['message'], datetime.now())
    bc = {
        'username': player.username,
        'message': data['message']
    }
    emit('playerMessage', bc, broadcast=True, include_self=False)
    return 'messageReceived'


@socketio.on('disconnect')
def disconnect_handler():
    print(f'{session["username"]} disconnected')
    del players[session['username']]
    emit('playerDisconnect', session['username'], broadcast=True, include_self=False)
