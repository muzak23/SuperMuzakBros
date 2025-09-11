export class Character {
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
