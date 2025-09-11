import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { Platform } from './entities/Platform.js';
import { socket } from './network.js';

export class Game {
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
            new Platform(0, 350, 275, 50, this),
            new Platform(300, 300, 200, 15, this),
            new Platform(525, 350, 275, 50, this)
        ];
        this.enemies = {};

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

        this.player = new Player(50, 50, 40, 60, this, username);
    }

    setupNetworkEventListeners() {
        socket.on('newPlayer', (data) => {
            this.enemies[data] = new Enemy(data, 50, 200, 40, 60, this);
        });

        socket.on('playerMovement', (data) => {
            this.enemies[data.username].updatePos(data.pos[0], data.pos[1]);
            this.enemies[data.username].updateVel(data.vel[0], data.vel[1]);
        });

        socket.on('playerMessage', (data) => {
            this.enemies[data.username].showMessage(data.message);
        });

        socket.on('playerDisconnect', (data) => {
            delete this.enemies[data];
        });
    }

    setupKeyEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key in this.keys) {
                this.keys[e.key] = true;
            } else if (e.key === 'Enter') {
                if (document.getElementById('usernameOverlay').style.display !== 'none') {
                    // This will be handled by main.js
                    const event = new CustomEvent('usernameSubmit');
                    document.dispatchEvent(event);
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
}
