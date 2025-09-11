export class Platform {
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
