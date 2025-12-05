// game.js - fixed and cleaned version
document.addEventListener("DOMContentLoaded", () => {
    // ---- Canvas setup ----
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) {
        console.error("No canvas with id 'gameCanvas' found in DOM.");
        return;
    }
    const ctx = canvas.getContext("2d");
    canvas.width = 500;
    canvas.height = 400;

    // ---- Load images (one place) ----
    // If your files are in a folder named "images", change the paths to "images/x-wing.png" and "images/background.png"
    const xwingImg = new Image();
    xwingImg.src = "./x-wing.png"; // change path if you put the file inside /images/

    const bgImg = new Image();
    bgImg.src = "./background.png"; // change path if you put the file inside /images/

    // Optional: log when loaded
    xwingImg.onload = () => console.log("X-Wing loaded");
    xwingImg.onerror = () => console.warn("X-Wing failed to load:", xwingImg.src);
    bgImg.onload = () => console.log("Background loaded");
    bgImg.onerror = () => console.warn("Background failed to load:", bgImg.src);

    // ---- Input handler ----
    class InputHandler {
        constructor(game) {
            this.game = game;
            window.addEventListener("keydown", (e) => {
                const key = e.key;
                const allowed = ["ArrowUp", "ArrowDown", "z", "Z", "x", "X"];
                if (allowed.includes(key) && !this.game.keys.includes(key)) {
                    this.game.keys.push(key);
                }
            });
            window.addEventListener("keyup", (e) => {
                const idx = this.game.keys.indexOf(e.key);
                if (idx > -1) this.game.keys.splice(idx, 1);
            });
        }
    }

    // ---- Projectile ----
    class Projectile {
        constructor(game, x, y) {
            this.game = game;
            this.x = x;
            this.y = y;
            this.width = 40;
            this.height = 12;
            this.speed = 6;
            this.markedForDeletion = false;
        }
        update() {
            this.x += this.speed;
            if (this.x > this.game.width * 0.98) this.markedForDeletion = true;
        }
        draw(ctx) {
            ctx.save();
            ctx.fillStyle = "yellow";
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }
    }

    // ---- Particle (small explosion bits) ----
    class Particle {
        constructor(game, x, y) {
            this.game = game;
            this.x = x;
            this.y = y;
            this.size = Math.random() * 5 + 1;
            this.speedX = Math.random() * 3 - 1.5;
            this.speedY = Math.random() * 3 - 1.5;
            this.markedForDeletion = false;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.size > 0.2) this.size -= 0.1;
            else this.markedForDeletion = true;
        }
        draw(ctx) {
            ctx.save();
            ctx.fillStyle = "yellow";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ---- Player ----
    class Player {
        constructor(game) {
            this.game = game;
            this.width = 120;
            this.height = 90;
            this.x = 20;
            this.y = (game.height - this.height) / 2;
            this.speedY = 0;
            this.maxSpeed = 5;
            this.projectiles = [];
            this.shootTopTimer = game.shootInterval;
            this.shootBottomTimer = game.shootInterval;
        }
        update(deltaTime) {
            if (this.game.keys.includes("ArrowUp")) this.speedY = -this.maxSpeed;
            else if (this.game.keys.includes("ArrowDown")) this.speedY = this.maxSpeed;
            else this.speedY = 0;

            this.y += this.speedY;
            if (this.y < 0) this.y = 0;
            if (this.y + this.height > this.game.height) this.y = this.game.height - this.height;

            this.projectiles.forEach((p) => p.update());
            this.projectiles = this.projectiles.filter((p) => !p.markedForDeletion);

            // top laser (Z)
            if (this.game.keys.includes("z") || this.game.keys.includes("Z")) {
                if (this.shootTopTimer >= this.game.shootInterval) {
                    this.shootTopLaser();
                    this.shootTopTimer = 0;
                } else {
                    this.shootTopTimer += deltaTime;
                }
            } else this.shootTopTimer = this.game.shootInterval;

            // bottom laser (X)
            if (this.game.keys.includes("x") || this.game.keys.includes("X")) {
                if (this.shootBottomTimer >= this.game.shootInterval) {
                    this.shootBottomLaser();
                    this.shootBottomTimer = 0;
                } else {
                    this.shootBottomTimer += deltaTime;
                }
            } else this.shootBottomTimer = this.game.shootInterval;
        }
        draw(ctx) {
            if (this.game.invincible) {
                const flashOn = Math.floor(this.game.invincibleTimer / 100) % 2 === 0;
                ctx.save();
                ctx.globalAlpha = flashOn ? 1 : 0.3;
                drawXWing(ctx, this.x, this.y, this.width, this.height);
                ctx.restore();
            } else {
                drawXWing(ctx, this.x, this.y, this.width, this.height);
            }
            this.projectiles.forEach((p) => p.draw(ctx));
        }
        shootTopLaser() {
            if (this.game.ammo > 0) {
                const px = this.x + this.width;
                const py = this.y + 8;
                this.projectiles.push(new Projectile(this.game, px, py));
                this.game.ammo--;
            }
        }
        shootBottomLaser() {
            if (this.game.ammo > 0) {
                const px = this.x + this.width;
                const py = this.y + this.height - 12;
                this.projectiles.push(new Projectile(this.game, px, py));
                this.game.ammo--;
            }
        }
    }

    // ---- Enemy base class ----
    class Enemy {
        constructor(game) {
            this.game = game;
            this.width = 120;
            this.height = 90;
            this.x = game.width;
            this.y = Math.random() * (game.height - this.height);
            this.speedX = Math.random() * -2 - 2;
            this.markedForDeletion = false;
            this.lives = 3;
            this.score = this.lives;
        }
        update() {
            this.x += this.speedX;
            if (this.x + this.width < 0) this.markedForDeletion = true;
        }
        draw(ctx) {
            ctx.save();
            ctx.fillStyle = "red";
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = "black";
            ctx.font = "18px Helvetica";
            ctx.fillText(this.lives, this.x + 8, this.y + 22);
            ctx.restore();
        }
    }

    // ---- Specific enemy (angler1) ----
    class Angler1 extends Enemy {
        constructor(game) {
            super(game);
            this.width = Math.floor(228 * 0.3);
            this.height = Math.floor(169 * 0.3);
            this.y = Math.random() * (game.height * 0.95 - this.height);
            this.lives = 2 + Math.floor(Math.random() * 3);
            this.score = this.lives;
            this.speedX = Math.random() * -2.5 - 2.0;
        }
    }

    // ---- Parallax Layer & Background ----
    class Layer {
        constructor(game, image, speedModifier) {
            this.game = game;
            this.image = image;
            this.speedModifier = speedModifier;
            this.width = image ? image.naturalWidth || 1768 : 1768;
            this.height = image ? image.naturalHeight || 500 : 500;
            this.x = 0;
            this.y = 0;
        }
        update() {
            if (this.x <= -this.width) this.x = 0;
            else this.x -= this.game.speed * this.speedModifier;
        }
        draw(ctx) {
            if (!this.image || !this.image.complete) return;
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
            ctx.drawImage(this.image, this.x + this.width, this.y, this.width, this.height);
        }
    }

    class Background {
        constructor(game) {
            this.game = game;
            // use loaded bgImg (fallback to a solid fill if missing)
            if (bgImg && bgImg.complete) {
                this.layer = new Layer(game, bgImg, 1);
            } else {
                this.layer = null;
            }
        }
        update() {
            if (this.layer) this.layer.update();
        }
        draw(ctx) {
            if (this.layer) {
                this.layer.draw(ctx);
            } else {
                // simple fallback background
                ctx.save();
                ctx.fillStyle = "#000000ff";
                ctx.fillRect(0, 0, this.game.width, this.game.height);
                ctx.fillStyle = "#000000ff";
                ctx.fillRect(0, this.game.height - 70, this.game.width, 70);
                ctx.restore();
            }
        }
    }

    // ---- UI ----
    class UI {
        constructor(game) {
            this.game = game;
            this.fontsize = 25;
            this.fontfamily = "Helvetica";
            this.color = "white";
        }
        draw(ctx) {
            ctx.save();
            ctx.font = this.fontsize + "px " + this.fontfamily;
            ctx.fillStyle = this.color;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.shadowColor = "black";
            ctx.shadowBlur = 0;

            // Score (center top)
            ctx.textAlign = "center";
            ctx.fillText("Score: " + this.game.score, this.game.width / 2, 40);
            // Score multiplier indicator (appears after 30s)
            if (this.game.scoreMultiplier && this.game.scoreMultiplier > 1) {
                ctx.save();
                ctx.fillStyle = "#ffd700"; // gold color
                ctx.font = "18px " + this.fontfamily;
                ctx.fillText("x" + this.game.scoreMultiplier, this.game.width / 2 + 110, 40);
                ctx.restore();
            }

            // Lives as hearts (left)
            ctx.textAlign = "start";
            const heartSize = 18;
            const heartSpacing = 6;
            const heartsX = 20;
            const heartsY = 50;
            ctx.fillStyle = "#ff4b4b";
            for (let i = 0; i < this.game.lives; i++) {
                const x = heartsX + i * (heartSize + heartSpacing) + heartSize / 2;
                drawHeart(ctx, x, heartsY, heartSize);
            }

            // Time (over hearts on the left)
            const formattedTime = (this.game.gametime * 0.001).toFixed(1);
            ctx.fillStyle = this.color;
            ctx.textAlign = "start";
            ctx.font = "20px " + this.fontfamily;
            ctx.fillText("Time: " + formattedTime, heartsX, heartsY - 20);

            // Ammo bars (top-right)
            ctx.fillStyle = "white";
            const ammoCount = this.game.ammo;
            const ammoBarWidth = 6;
            const ammoBarHeight = 18;
            const ammoSpacing = 8;
            const rightMargin = 20;
            const totalWidth = ammoCount * ammoSpacing;
            let startX = this.game.width - rightMargin - totalWidth;
            if (startX < 200) startX = this.game.width - rightMargin - ammoCount * ammoSpacing;

            for (let i = 0; i < ammoCount; i++) {
                ctx.fillRect(startX + i * ammoSpacing, 50, ammoBarWidth, ammoBarHeight);
            }

            // High score (near top-right)
            ctx.textAlign = "right";
            ctx.fillText("High: " + this.game.highScore, this.game.width - rightMargin, 40);


            // Game over message
            if (this.game.gameOver) {
                ctx.textAlign = "center";
                let message1, message2;
                if (this.game.score >= this.game.winningScore) {
                    message1 = "You Win!";
                    message2 = "Well Done!";
                } else {
                    message1 = "Game Over!";
                    message2 = "Try Again!";
                }
                ctx.font = "50px " + this.fontfamily;
                ctx.fillText(message1, this.game.width / 2, this.game.height / 2);
                ctx.font = "25px " + this.fontfamily;
                ctx.fillText(message2, this.game.width / 2, this.game.height / 2 + 40);
            }

            ctx.restore();
        }
    }

    // draw a heart shape centered at (x, y)
    function drawHeart(ctx, x, y, size) {
        ctx.save();
        ctx.beginPath();
        const topCurveHeight = size * 0.3;
        ctx.moveTo(x, y + topCurveHeight);
        ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
        ctx.bezierCurveTo(
            x - size / 2,
            y + (size + topCurveHeight) / 2,
            x,
            y + (size + topCurveHeight) / 1.05,
            x,
            y + size
        );
        ctx.bezierCurveTo(
            x,
            y + (size + topCurveHeight) / 1.05,
            x + size / 2,
            y + (size + topCurveHeight) / 2,
            x + size / 2,
            y + topCurveHeight
        );
        ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // ---- Game ----
    class Game {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.keys = [];
            this.shootInterval = 200; // ms
            this.player = new Player(this);
            this.input = new InputHandler(this);
            this.ui = new UI(this);
            this.background = new Background(this);
            this.enemies = [];
            this.enemyTimer = 0;
            this.enemyInterval = 1000;
            this.ammo = 30;
            this.maxAmmo = 200;
            this.ammotimer = 0;
            this.ammointerval = 500;
            this.gameOver = false;
            this.lives = 3;
            this.invincible = false;
            this.invincibleTimer = 0;
            this.invincibleDuration = 1000; // ms
            this.score = 0;
            this.scoreMultiplier = 1; // doubles after 30s
            this.winningScore = 100;
            this.gametime = 9999999999999; // ms
            this.speed = 1;
            const saved = localStorage.getItem("simpleGameHighScore");
            this.highScore = saved ? parseInt(saved, 10) : 0;
            this._highScoreSaved = false;
            this.particles = [];
        }

        reset() {
            this.player = new Player(this);
            this.enemies = [];
            this.enemyTimer = 0;
            this.ammo = 25;
            this.ammotimer = 0;
            this.gameOver = false;
            this.lives = 3;
            this.invincible = false;
            this.invincibleTimer = 0;
            this.score = 0;
            this.scoreMultiplier = 1; // reset multiplier on game reset
            this._highScoreSaved = false;
            this.gametime = 0;
            this.background = new Background(this);
            this.particles = [];
        }

        update(deltaTime) {
            if (!this.gameOver) this.gametime += deltaTime;
            this.player.update(deltaTime);
            this.background.update();

            if (this.invincible) {
                if (this.invincibleTimer > this.invincibleDuration) {
                    this.invincible = false;
                    this.invincibleTimer = 0;
                } else {
                    this.invincibleTimer += deltaTime;
                }
            }

            if (this.ammotimer > this.ammointerval) {
                if (this.ammo < this.maxAmmo) this.ammo++;
                this.ammotimer = 0;
            } else {
                this.ammotimer += deltaTime;
            }

            // update enemies and collisions
            this.enemies.forEach((enemy) => {
                enemy.update();

                if (this.checkCollision(this.player, enemy)) {
                    if (!this.invincible) {
                        enemy.markedForDeletion = true;
                        this.lives--;
                        this.invincible = true;
                        this.invincibleTimer = 0;
                        if (this.lives <= 0) this.gameOver = true;
                    }
                }

                this.player.projectiles.forEach((projectile) => {
                    if (!projectile.markedForDeletion && this.checkCollision(projectile, enemy)) {
                        enemy.lives--;
                        projectile.markedForDeletion = true;
                        // spawn particles at hit location
                        for (let i = 0; i < 8; i++) {
                            this.particles.push(new Particle(this, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
                        }
                        if (enemy.lives <= 0) {
                            enemy.markedForDeletion = true;
                            this.score += enemy.score;
                            for (let i = 0; i < 14; i++) {
                                this.particles.push(new Particle(this, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
                            }
                            if (this.score >= this.winningScore) this.gameOver = true;
                        }
                    }
                });
            });

            // update particles
            this.particles.forEach((p) => p.update());
            this.particles = this.particles.filter((p) => !p.markedForDeletion);

            this.enemies = this.enemies.filter((e) => !e.markedForDeletion);

            if (this.enemyTimer > this.enemyInterval && !this.gameOver) {
                this.addEnemy();
                this.enemyTimer = 0;
            } else {
                this.enemyTimer += deltaTime;
            }

            if (this.gameOver && !this._highScoreSaved) {
                if (this.score > this.highScore) {
                if (this.gametime >= 30000) this.scoreMultiplier = 2;
                    this.highScore = this.score;
                    try {
                        localStorage.setItem("simpleGameHighScore", String(this.highScore));
                    } catch (e) {
                        console.warn("Could not persist high score:", e);
                    }
                }
                this._highScoreSaved = true;
            }
        }

        draw(ctx) {
            this.background.draw(ctx);
            this.player.draw(ctx);
            this.enemies.forEach((e) => e.draw(ctx));
            this.particles.forEach((p) => p.draw(ctx));
            this.ui.draw(ctx);
        }

        addEnemy() {
            this.enemies.push(new Angler1(this));
        }

        checkCollision(rect1, rect2) {
            return (
                rect1.x < rect2.x + rect2.width &&
                rect1.x + rect1.width > rect2.x &&
                rect1.y < rect2.y + rect2.height &&
                rect1.y + rect1.height > rect2.y
            );
        }
    }

    // ---- Instantiate and add start/play-again controls ----
    const game = new Game(canvas.width, canvas.height);
    let lastTime = performance.now();
    let gameStarted = false;

    const startBtn = document.getElementById('startBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');

    function updateButtons() {
        if (!gameStarted) {
            if (startBtn) startBtn.style.display = 'inline-block';
            if (playAgainBtn) playAgainBtn.style.display = 'none';
            return;
        }
        // When started, show Play Again only if game over
        if (game.gameOver) {
            if (startBtn) startBtn.style.display = 'none';
            if (playAgainBtn) playAgainBtn.style.display = 'inline-block';
        } else {
            if (startBtn) startBtn.style.display = 'none';
            if (playAgainBtn) playAgainBtn.style.display = 'none';
        }
    }

    startBtn?.addEventListener('click', () => {
        game.reset();
        gameStarted = true;
        updateButtons();
    });
    playAgainBtn?.addEventListener('click', () => {
        game.reset();
        gameStarted = true;
        updateButtons();
    });

    // draw a simple start screen when not started
    function drawStartScreen() {
        // background
        game.background.draw(ctx);
        // title text
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.font = '36px Helvetica';
        ctx.fillText('X-Wing Game', game.width / 2, game.height / 2 - 20);
        ctx.font = '18px Helvetica';
        ctx.fillText('Click Start to play', game.width / 2, game.height / 2 + 20);
        ctx.restore();
    }

    requestAnimationFrame(animate);

    // ---- animation loop ----
    function animate(timestamp) {
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!gameStarted) {
            drawStartScreen();
        } else {
            game.update(deltaTime);
            game.draw(ctx);
        }

        updateButtons();
        requestAnimationFrame(animate);
    }

    // ---- Helper: draw a player X-Wing ----
    function drawXWing(ctx, x, y, width, height) {
        if (xwingImg && xwingImg.complete && xwingImg.naturalWidth > 0) {
            ctx.drawImage(xwingImg, x, y, width, height);
        } else {
            // fallback placeholder
            ctx.save();
            ctx.fillStyle = "black";
            ctx.fillRect(x, y, width, height);
            ctx.fillStyle = "white";
            ctx.font = "14px Helvetica";
            ctx.fillText("PLAYER", x + 6, y + height / 2 + 6);
            ctx.restore();
        }
    }
    
}); // END DOMContentLoaded
