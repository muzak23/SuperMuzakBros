import { Game } from './game.js';
import { Enemy } from './entities/Enemy.js';
import { attemptConnect, sendUsername } from './network.js';

let game;

function onDOMContentLoaded(evt) {
    attemptConnect();

    // Add event listener for username submit button
    document.getElementById('usernameSubmitBtn').addEventListener('click', onUsernameSubmit);

    // Add event listener for Enter key on username input
    document.getElementById('usernameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            onUsernameSubmit();
        }
    });
}

// Username input
function onUsernameSubmit(evt) {
    let username = document.getElementById('usernameInput').value;
    console.log("emitting username: " + username);
    sendUsername(username, function (callback) {
        console.log(callback);
        if (callback === 'validUsername') {
            localStorage.setItem('username', username);
            game.joinGame(username);
        } else {
            alert('Username is already taken');
        }
    });
}

// Sets up the game with the initial data from the server right on page load, before player username selection/spawning
function gameSetup(data) {
    game = new Game();
    // foreach enemy make enemy
    // format of data['players'] is {username: (x, y)}
    for (const enemy in data['players']) {
        game.enemies[enemy] = new Enemy(enemy, data['players'][enemy][0], data['players'][enemy][1], 40, 60, game);
    }
}

document.addEventListener('DOMContentLoaded', onDOMContentLoaded, false);
document.addEventListener('usernameSubmit', onUsernameSubmit);


export function connected(data) {
    console.log('connected with data: ' + data);
    gameSetup(data);
}

export function handleNewPlayer(data) {
    game.newPlayer(data);
}
export function handlePlayerMovement(data) {
    game.playerMovement(data);
}
export function handlePlayerMessage(data) {
    game.playerMessage(data);
}
export function handlePlayerDisconnect(data) {
    game.playerDisconnect(data);
}
