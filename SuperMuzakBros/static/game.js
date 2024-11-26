function onDOMContentLoaded(evt) {
    attemptConnect();
}

const socket = io();

document.addEventListener('DOMContentLoaded', onDOMContentLoaded, false);


/**
 * Attempts to connect to the server
 */
function attemptConnect() {
    console.log('attempting to connect')
    socket.connect();
}

socket.on('connected', (data) => {
    console.log('connected with data: ' + data);
    debug_enemies = data['players'];
    gameSetup(data);
});

// Username input
function onUsernameSubmit(evt) {
    // evt.preventDefault();
    let username = document.getElementById('usernameInput').value;
    console.log("emitting username: " + username);
    socket.emit('username', {username: username}, function (callback) {
        console.log(callback);
        if (callback === 'validUsername') {
            localStorage.setItem('username', username);
            game.joinGame(username);
        } else {
            alert('Username is already taken');
        }
    });
}

//
//  Game logic
//

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.GRAVITY = 0.5;
        this.JUMP_FORCE = -10;
        this.MOVE_SPEED = 5;
        this.FRICTION = 0.8;
        this.ACCELERATION = 1;
        this.keys = {
            ArrowUp: false,
            ArrowLeft: false,
            ArrowRight: false
        };
        this.player = undefined;
        this.platforms = [
            new this.Platform(0, 350, 275, 50, this),
            new this.Platform(300, 300, 200, 15, this),
            new this.Platform(525, 350, 275, 50, this)
        ];
        this.enemies = {
        };

        this.setupNetworkEventListeners();
        this.setupKeyEventListeners();
        console.log('game created, starting loop');
        this.gameLoop();
    }

    joinGame(username) {
        console.log('joining game');
        document.getElementById('usernameOverlay').style.display = 'none';
        document.getElementById('gameCanvas').style.display = 'block';
        document.getElementById('gameCanvas').focus();

        game.player = new game.Player(50, 50, 40, 60, game, username);
    }


    setupNetworkEventListeners() {
        socket.on('newPlayer', (data) => {
            console.log(data);
            this.enemies[data] = new this.Enemy(data, 50, 200, 40, 60, this);
        });

        socket.on('playerPos', (data) => {
            console.log(data);
            console.log(this.enemies);
            this.enemies[data.username].updatePos(data.pos[0], data.pos[1]);
        });

        socket.on('playerDisconnect', (data) => {
            console.log('player disconnected: ' + data);
            delete this.enemies[data];
        });
    }

    setupKeyEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key in this.keys) {
                this.keys[e.key] = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key in this.keys) {
                this.keys[e.key] = false;
            }
        });
    }

    checkCollision(player, platform) {
        return (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y
        );
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // if player exists
        if (this.player !== undefined) {
            if (this.keys.ArrowLeft) this.player.moveLeft();
            if (this.keys.ArrowRight) this.player.moveRight();
            if (this.keys.ArrowUp) this.player.jump();

            this.player.update();
            this.player.draw();
        }
        this.platforms.forEach(platform => platform.draw());
        for (const enemy in this.enemies) {
            this.enemies[enemy].draw();
        }

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    Character = class {
        constructor(x, y, width, height, game) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.velocityX = 0;
            this.velocityY = 0;
            this.isFalling = true;
            this.color = 'red'; // default color if not selected
            this.game = game;
        }

        draw() {
            this.game.ctx.fillStyle = this.color;
            this.game.ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        update() {
            this.isFalling = true; // Assume falling unless collision detected

            // Apply gravity
            this.velocityY += this.game.GRAVITY;

            // Update position
            this.x += this.velocityX;
            this.y += this.velocityY;

            // Check for collisions with platforms
            for (const platform of this.game.platforms) {
                if (this.game.checkCollision(this, platform)) {
                    if (this.velocityY > 0 && this.y + this.height - this.velocityY <= platform.y) {
                        // Land on top of the platform
                        this.y = platform.y - this.height;
                        this.velocityY = 0;
                        this.isFalling = false;
                    }
                }
            }

            // Apply friction
            this.velocityX *= this.game.FRICTION;

            // Prevent falling through the bottom of the canvas
            if (this.y + this.height > this.game.canvas.height) {
                this.y = this.game.canvas.height - this.height;
                this.velocityY = 0;
                this.isFalling = false;
            }

            // Keep Character within canvas bounds
            this.x = Math.max(0, Math.min(this.x, this.game.canvas.width - this.width));
        }
    }
    Player = class extends this.Character {
        constructor(x, y, width, height, game, username) {
            super(x, y, width, height, game);
            this.color = 'blue';
            this.username = username;
        }

        update() {
            let previousPos = [Math.round(this.x), Math.round(this.y)];
            super.update();
            let currentPos = [Math.round(this.x), Math.round(this.y)];
            if (previousPos[0] !== currentPos[0] || previousPos[1] !== currentPos[1]) {
                // debug see why they're equal
                console.log('' + previousPos[0] + ' ' + previousPos[1] + ' and ' + currentPos[0] + ' ' + currentPos[1]);
                socket.emit('playerPos', currentPos);
            }
        }

        jump() {
            if (!this.isFalling) {
                this.velocityY = this.game.JUMP_FORCE;
                this.isFalling = true;
            }
        }

        moveLeft() {
            this.velocityX -= this.game.ACCELERATION;
        }

        moveRight() {
            this.velocityX += this.game.ACCELERATION;
        }
    }

    Platform = class {
        constructor(x, y, width, height, game) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.game = game;
        }

        draw() {
            this.game.ctx.fillStyle = 'green';
            this.game.ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    Enemy = class extends this.Character {
        constructor(username, x, y, width, height, game) {
            super(x, y, width, height, game);
            this.username = username;
            this.color = 'red';
        }

        draw() {
            this.game.ctx.fillStyle = 'red';
            this.game.ctx.fillRect(this.x, this.y, this.width, this.height);
            this.game.ctx.fillStyle = 'black';
            this.game.ctx.fillText(this.username, this.x, this.y - 10);
        }

        updatePos(x, y) {
            this.x = x;
            this.y = y;
        }
    }
}

// Sets up the game with the initial data from the server right on page load, before player selects a username and is spawned
function gameSetup(data) {
    game = new Game();
    // foreach enemy make enemy
    // format of data['players'] is {username: (x, y)}
    for (const enemy in data['players']) {
        game.enemies[enemy] = new game.Enemy(enemy, data['players'][enemy][0], data['players'][enemy][1], 40, 60, game);
    }
}







