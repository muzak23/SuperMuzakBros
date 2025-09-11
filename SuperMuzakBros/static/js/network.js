import { connected, handleNewPlayer, handlePlayerMovement, handlePlayerMessage, handlePlayerDisconnect } from './main.js';

// Socket.IO connection and event handling
export const socket = io();

/**
 * Attempts to connect to the server
 */
export function attemptConnect() {
    console.log('attempting to connect')
    socket.connect();
}

export function sendUsername(username, callback) {
    socket.emit('username', {username: username}, callback);
}

export function playerMovement(position, velocity) {
    socket.emit('playerMovement', {'pos': position, 'vel': velocity});
}

export function sendMessage(message, callback) {
    socket.emit('chatMessage', {message: message}, callback);
}

socket.on('connected', (data) => {
    connected(data);
});

socket.on('newPlayer', (data) => {
    handleNewPlayer(data);
});

socket.on('playerMovement', (data) => {
    handlePlayerMovement(data)
});

socket.on('playerMessage', (data) => {
    handlePlayerMessage(data);
});

socket.on('playerDisconnect', (data) => {
    handlePlayerDisconnect(data);
});
