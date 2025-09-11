import { Character } from './Character.js';

export class Enemy extends Character {
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
