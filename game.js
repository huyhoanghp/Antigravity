const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Trạng thái Game
const STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    GAMEOVER: 'GAMEOVER'
};

let gameState = STATE.MENU;
let score = 0;
let highScore = localStorage.getItem('tankHighScore') || 0;
let animationId;
let shakeIntensity = 0;

// Cấu hình Canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Input Handling
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

let mousePos = { x: 0, y: 0 };
window.addEventListener('mousemove', e => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
});

window.addEventListener('mousedown', () => {
    if (gameState === STATE.PLAYING) player.shoot();
});

// Lớp Xe Tăng Cơ Bản
class Tank {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.rotation = 0;
        this.speed = 3;
        this.radius = 25;
        this.health = 100;
        this.lastShot = 0;
        this.shotDelay = 300; // ms
        this.baseSpeed = 3;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Thân xe tăng (Glassmorphism look)
        ctx.beginPath();
        ctx.roundRect(-20, -20, 40, 40, 5);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Tháp pháo
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        ctx.stroke();

        // Nòng súng
        ctx.beginPath();
        ctx.roundRect(5, -4, 25, 8, 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

class Player extends Tank {
    constructor(x, y) {
        super(x, y, '#3b82f6');
        this.speedMultiplier = 1;
        this.isShielded = false;
        this.bulletType = 'NORMAL';
        this.activeBuffs = {
            SPEED: null,
            SHIELD: null,
            TRIPLE: null
        };
    }

    applyPowerUp(type) {
        const duration = 10000; // 10s
        
        // Clear existing timeout if any
        if (this.activeBuffs[type]) clearTimeout(this.activeBuffs[type]);

        switch(type) {
            case 'SPEED':
                this.speedMultiplier = 2;
                break;
            case 'SHIELD':
                this.isShielded = true;
                break;
            case 'TRIPLE':
                this.bulletType = 'TRIPLE';
                break;
        }

        this.activeBuffs[type] = setTimeout(() => {
            this.removePowerUp(type);
        }, duration);
    }

    removePowerUp(type) {
        switch(type) {
            case 'SPEED':
                this.speedMultiplier = 1;
                break;
            case 'SHIELD':
                this.isShielded = false;
                break;
            case 'TRIPLE':
                this.bulletType = 'NORMAL';
                break;
        }
        this.activeBuffs[type] = null;
    }

    draw() {
        super.draw();
        
        // Vẽ khiên nếu có
        if (this.isShielded) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.restore();
        }
    }

    update() {
        // Di chuyển
        const currentSpeed = this.speed * this.speedMultiplier;
        if (keys['KeyW'] || keys['ArrowUp']) this.y -= currentSpeed;
        if (keys['KeyS'] || keys['ArrowDown']) this.y += currentSpeed;
        if (keys['KeyA'] || keys['ArrowLeft']) this.x -= currentSpeed;
        if (keys['KeyD'] || keys['ArrowRight']) this.x += currentSpeed;

        // Giới hạn biên
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        // Xoay theo chuột
        this.rotation = Math.atan2(mousePos.y - this.y, mousePos.x - this.x);

        if (keys['Space']) this.shoot();
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shotDelay) {
            if (this.bulletType === 'TRIPLE') {
                // Bắn 3 tia
                const angles = [this.rotation - 0.2, this.rotation, this.rotation + 0.2];
                angles.forEach(angle => {
                    bullets.push(new Bullet(this.x, this.y, angle, true));
                });
            } else {
                bullets.push(new Bullet(this.x, this.y, this.rotation, true));
            }
            this.lastShot = now;
        }
    }
}

class Enemy extends Tank {
    constructor(x, y) {
        super(x, y, '#ef4444');
        this.speed = 1.5 + Math.random();
        this.shotDelay = 1000 + Math.random() * 2000;
    }

    update() {
        // Di chuyển về phía người chơi
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angle = Math.atan2(dy, dx);
        this.rotation = angle;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 150) {
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        }

        // Tự động bắn
        const now = Date.now();
        if (now - this.lastShot > this.shotDelay) {
            bullets.push(new Bullet(this.x, this.y, this.rotation, false));
            this.lastShot = now;
        }
    }
}

class Bullet {
    constructor(x, y, angle, isPlayer) {
        this.x = x + Math.cos(angle) * 35;
        this.y = y + Math.sin(angle) * 35;
        this.angle = angle;
        this.speed = 7;
        this.radius = 4;
        this.isPlayer = isPlayer;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isPlayer ? '#60a5fa' : '#f87171';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.isPlayer ? '#3b82f6' : '#ef4444';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'SPEED', 'SHIELD', 'TRIPLE'
        this.radius = 15;
        this.color = this.getColor();
        this.spawnTime = Date.now();
        this.lifeTime = 8000; // Tự biến mất sau 8s nếu không nhặt
    }

    getColor() {
        switch(this.type) {
            case 'SPEED': return '#fcd34d'; // Vàng
            case 'SHIELD': return '#3b82f6'; // Xanh dương
            case 'TRIPLE': return '#10b981'; // Xanh lá
        }
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        
        // Vẽ icon đơn giản
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type[0], this.x, this.y + 5);
        
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.alpha = 1;
        this.velocity = 0.8;
    }

    update() {
        this.y -= this.velocity;
        this.alpha -= 0.015;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 20px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// Khởi tạo thực thể
let player;
let enemies = [];
let bullets = [];
let particles = [];
let powerUps = [];
let floatingTexts = [];

function initGame() {
    player = new Player(canvas.width / 2, canvas.height / 2);
    enemies = [];
    bullets = [];
    particles = [];
    powerUps = [];
    floatingTexts = [];
    score = 0;
    shakeIntensity = 0;
    updateUI();
}

function spawnEnemy() {
    if (gameState !== STATE.PLAYING) return;
    
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -50 : canvas.width + 50;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -50 : canvas.height + 50;
    }
    
    enemies.push(new Enemy(x, y));
    setTimeout(spawnEnemy, Math.max(1000, 3000 - score * 10));
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
    // Kích hoạt rung màn hình
    shakeIntensity = 15;
}

function updateUI() {
    document.getElementById('score-val').innerText = score;
    document.getElementById('health-val').innerText = player.health + '%';
    document.getElementById('final-score').innerText = score;
    document.getElementById('high-score').innerText = highScore;
    document.getElementById('menu-high-score').innerText = highScore;
}

function checkCollisions() {
    // Đạn va chạm
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        
        // Đạn người chơi bắn trúng địch
        if (b.isPlayer) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const e = enemies[j];
                const dist = Math.hypot(b.x - e.x, b.y - e.y);
                if (dist < e.radius + b.radius) {
                    createExplosion(e.x, e.y, '#ef4444');
                    enemies.splice(j, 1);
                    bullets.splice(i, 1);
                    score += 10;
                    
                    // Thêm chữ bay điểm số
                    floatingTexts.push(new FloatingText(e.x, e.y, '+10', '#fcd34d'));
                    
                    // Rơi vật phẩm ngẫu nhiên
                    if (Math.random() < 0.2) {
                        const types = ['SPEED', 'SHIELD', 'TRIPLE'];
                        const type = types[Math.floor(Math.random() * types.length)];
                        powerUps.push(new PowerUp(e.x, e.y, type));
                    }
                    
                    updateUI();
                    break;
                }
            }
        } else {
            // Đạn địch bắn trúng người chơi
            const dist = Math.hypot(b.x - player.x, b.y - player.y);
            if (dist < player.radius + b.radius) {
                createExplosion(player.x, player.y, '#3b82f6');
                bullets.splice(i, 1);
                
                // Nếu có khiên thì không mất máu
                if (player.isShielded) {
                    player.removePowerUp('SHIELD'); // Mất khiên khi trúng đạn
                } else {
                    player.health -= 10;
                }
                
                updateUI();
                if (player.health <= 0) gameOver();
            }
        }

        // Xóa đạn ra ngoài màn hình
        if (b.x < -100 || b.x > canvas.width + 100 || b.y < -100 || b.y > canvas.height + 100) {
            bullets.splice(i, 1);
        }
    }

    // Va chạm người chơi nhặt vật phẩm
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        const dist = Math.hypot(p.x - player.x, p.y - player.y);
        
        if (dist < player.radius + p.radius) {
            player.applyPowerUp(p.type);
            powerUps.splice(i, 1);
        } else if (Date.now() - p.spawnTime > p.lifeTime) {
            powerUps.splice(i, 1);
        }
    }
}

function gameOver() {
    gameState = STATE.GAMEOVER;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tankHighScore', highScore);
    }
    updateUI();
    document.getElementById('game-over-screen').classList.add('active');
}

function gameLoop() {
    ctx.save();
    
    // Áp dụng Screen Shake
    if (shakeIntensity > 0) {
        const shakeX = (Math.random() - 0.5) * shakeIntensity;
        const shakeY = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(shakeX, shakeY);
        shakeIntensity *= 0.9; // Giảm dần cường độ
        if (shakeIntensity < 0.1) shakeIntensity = 0;
    }

    ctx.clearRect(-100, -100, canvas.width + 200, canvas.height + 200); // Clear rộng hơn để tránh lộ biên khi rung

    if (gameState === STATE.PLAYING) {
        player.update();
        player.draw();

        enemies.forEach((enemy, index) => {
            enemy.update();
            enemy.draw();
        });

        bullets.forEach((bullet, index) => {
            bullet.update();
            bullet.draw();
        });

        particles.forEach((particle, index) => {
            particle.update();
            particle.draw();
            if (particle.life <= 0) particles.splice(index, 1);
        });

        powerUps.forEach(p => p.draw());

        floatingTexts.forEach((ft, index) => {
            ft.update();
            ft.draw();
            if (ft.alpha <= 0) floatingTexts.splice(index, 1);
        });

        checkCollisions();
    }

    ctx.restore();
    animationId = requestAnimationFrame(gameLoop);
}

// Event Listeners cho Buttons
document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.remove('active');
    gameState = STATE.PLAYING;
    initGame();
    spawnEnemy();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('game-over-screen').classList.remove('active');
    gameState = STATE.PLAYING;
    initGame();
});

// Bắt đầu vòng lặp
gameLoop();
