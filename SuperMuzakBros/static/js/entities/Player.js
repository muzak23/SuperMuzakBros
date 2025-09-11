import { Character } from './Character.js';
import { playerMovement, sendMessage } from '../network.js';

export class Player extends Character {
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
            playerMovement(currentPos, [this.velocityX, this.velocityY]);
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
            sendMessage(message, (response) => {
                if (response !== 'messageSent') {
                    console.log('Error sending message: ' + response);
                    return;
                }
                document.getElementById('chatBox').style.display = 'none';
                document.getElementById('chatInput').value = '';
                document.getElementById('chatBoxOverlay').style.display = 'none';
                this.showMessage(message);
            });
        }
    }
}
