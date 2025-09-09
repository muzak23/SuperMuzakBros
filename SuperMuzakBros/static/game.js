function onDOMContentLoaded(evt) {
    attemptConnect();
}

let socket = io(), game;

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
    gameSetup(data);
});

// Username input
function onUsernameSubmit(evt) {
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
        this.lastFrameTime = performance.now();
        this.frameTime = 0;
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

        socket.on('playerMovement', (data) => {
            this.enemies[data.username].updatePos(data.pos[0], data.pos[1]);
            this.enemies[data.username].updateVel(data.vel[0], data.vel[1]);
        });

        socket.on('playerMessage', (data) => {
            console.log(data);
            this.enemies[data.username].showMessage(data.message);
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
            } else if (e.key === 'Enter') {
                if (document.getElementById('usernameOverlay').style.display !== 'none') {
                    onUsernameSubmit();
                } else if (document.getElementById('chatBox').style.display === 'none') {
                    console.log('chatting2');
                    document.getElementById('chatBoxOverlay').style.display = 'flex';
                    document.getElementById('chatBox').style.display = 'block';
                    document.getElementById('chatInput').focus();
                } else {
                    this.player.chat();
                }
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
            player.x < platform.x + platform.width &&   // player left edge is left of platform right edge
            player.x + player.width > platform.x &&     // player right edge is right of platform left edge
            player.y < platform.y + platform.height &&  // player top edge is above platform bottom edge
            player.y + player.height > platform.y       // player bottom edge is below platform top edge
        );
    }

    checkStandingOnPlatform(player, platform) {
        return (
            player.x < platform.x + platform.width &&   // player left edge is left of platform right edge
            player.x + player.width >  platform.x &&     // player right edge is right of platform left edge
            (
                player.y + player.height === platform.y ||  // player bottom edge is ON platform top edge
                (                                           // OR
                    player.y + player.height <= platform.y &&   // player bottom edge is above platform top edge
                    player.y + player.height + player.velocityY >= platform.y // clipping: player bottom edge next tick is below platform top edge
                )
            )
        );
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const currentFrameTime = performance.now();
        this.frameTime = (currentFrameTime - this.lastFrameTime) / 17; // Convert to seconds
        this.lastFrameTime = currentFrameTime;

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
            this.enemies[enemy].update();
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
            this.message = undefined;
            this.messageTimeout = null;
        }

        draw() {
            this.game.ctx.fillStyle = this.color;
            this.game.ctx.fillRect(this.x, this.y, this.width, this.height);
            if (this.message !== undefined) {
                this.game.ctx.fillStyle = 'black';
                this.game.ctx.fillText(this.message, this.x, this.y - 20);
            }
        }

        update() {
            // Check for collisions with platforms
            let collided = false;
            for (const platform of this.game.platforms) {
                if (this.velocityY >= 0 && this.game.checkStandingOnPlatform(this, platform)) {
                    // Land on top of the platform
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    collided = true;
                }
            }
            this.isFalling = !collided;

            if (this.isFalling) {
                // Apply gravity
                this.velocityY += this.game.GRAVITY * this.game.frameTime;
            }

            // Update position
            this.x += this.velocityX * this.game.frameTime;
            this.y += this.velocityY * this.game.frameTime;

            // Apply friction
            this.velocityX *= this.game.FRICTION;

            // Prevent falling through the bottom of the canvas
            if (this.isFalling && this.y + this.height > this.game.canvas.height) {
                this.y = this.game.canvas.height - this.height;
                this.velocityY = 0;
                this.isFalling = false;
            }

            // Keep Character within canvas bounds
            this.x = Math.max(0, Math.min(this.x, this.game.canvas.width - this.width));
        }

        showMessage(message) {
            console.log('message received');
            this.message = message;

            if (this.messageTimeout !== null) {
                clearTimeout(this.messageTimeout);
            }
            this.messageTimeout = setTimeout(() => {
                this.message = undefined;
                this.messageTimeout = null
            }, 5000);
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
                socket.emit('playerMovement', {'pos': currentPos, 'vel': [this.velocityX, this.velocityY]});
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

        chat() {
            let message = document.getElementById('chatInput').value;
            if (message.trim() !== '') {
                socket.emit('playerMessage', {message: message}, (callback) => {
                    if (callback === 'messageRateLimit') {
                        console.log('messageRateLimit');
                    } else {
                        console.log('messageReceived');
                        document.getElementById('chatBox').style.display = 'none';
                        document.getElementById('chatInput').value = '';
                        document.getElementById('chatBoxOverlay').style.display = 'none';
                        this.showMessage(message);
                    }
                });
            }

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
            super.draw();
            this.game.ctx.fillStyle = 'black';
            this.game.ctx.fillText(this.username, this.x, this.y - 10);

        }

        updatePos(x, y) {
            this.x = x;
            this.y = y;
        }

        updateVel(x, y) {
            this.velocityX = x;
            this.velocityY = y;
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
