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
let currentLevel = 1;
let isGameActive = false;

// Audio Controller (Web Audio API)
const AudioFX = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    
    playShoot() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    },
    
    playExplosion() {
        const bufSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    },
    
    playPowerUp() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
};

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

// Joystick State
let joystickData = {
    active: false,
    x: 0,
    y: 0,
    angle: 0,
    distance: 0
};

const joystickStick = document.getElementById('joystick-stick');
const joystickBase = document.getElementById('joystick-base');

function handleJoystick(e) {
    const touch = e.touches[0];
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2;
    
    if (dist > maxDist) {
        dx *= maxDist / dist;
        dy *= maxDist / dist;
    }
    
    joystickData.active = true;
    joystickData.x = dx / maxDist;
    joystickData.y = dy / maxDist;
    joystickData.angle = Math.atan2(dy, dx);
    
    joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
}

joystickBase.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleJoystick(e);
});

joystickBase.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handleJoystick(e);
});

joystickBase.addEventListener('touchend', () => {
    joystickData.active = false;
    joystickData.x = 0;
    joystickData.y = 0;
    joystickStick.style.transform = 'translate(0, 0)';
});

// Auto Fire Mobile
let isFiring = false;
const fireBtn = document.getElementById('fire-btn');
fireBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isFiring = true;
});
fireBtn.addEventListener('touchend', () => isFiring = false);

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
        this.bulletSpeedMultiplier = 1; // Mới: Tốc độ đạn tăng vĩnh viễn
        this.isShielded = false;
        this.bulletType = 'NORMAL';
        this.multiShotCount = 1; // Mới: Số lượng tia đạn tích lũy
        this.activeBuffs = {
            SPEED: null,
            SHIELD: null,
            TRIPLE: null
        };
    }

    applyPowerUp(type) {
        const duration = 10000; // 10s cho các buff tạm thời
        
        switch(type) {
            case 'SPEED':
                // Tốc độ đạn tăng vĩnh viễn
                this.bulletSpeedMultiplier += 0.2;
                break;
            case 'SHIELD':
                this.isShielded = true;
                if (this.activeBuffs['SHIELD']) clearTimeout(this.activeBuffs['SHIELD']);
                this.activeBuffs['SHIELD'] = setTimeout(() => this.isShielded = false, duration);
                break;
            case 'TRIPLE':
                // Tích lũy đạn hoa cải vĩnh viễn
                this.multiShotCount++;
                this.bulletType = 'TRIPLE';
                break;
            case 'HEALTH':
                this.health = Math.min(100, this.health + 20);
                break;
        }
    }

    removePowerUp(type) {
        // Chỉ dùng cho các hiệu ứng có thời hạn nếu cần
    }

    takeDamage(amount) {
        if (this.isShielded) {
            this.isShielded = false;
            if (this.activeBuffs['SHIELD']) clearTimeout(this.activeBuffs['SHIELD']);
            return;
        }

        // Nếu có đạn hoa cải thì trừ cấp độ đạn trước
        if (this.multiShotCount > 1) {
            this.multiShotCount--;
            if (this.multiShotCount === 1) this.bulletType = 'NORMAL';
            return;
        }

        this.health -= amount;
        if (this.health <= 0) gameOver();
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
        // Di chuyển bằng phím
        const currentSpeed = this.speed * this.speedMultiplier;
        if (keys['KeyW'] || keys['ArrowUp']) this.y -= currentSpeed;
        if (keys['KeyS'] || keys['ArrowDown']) this.y += currentSpeed;
        if (keys['KeyA'] || keys['ArrowLeft']) this.x -= currentSpeed;
        if (keys['KeyD'] || keys['ArrowRight']) this.x += currentSpeed;

        // Di chuyển bằng Joystick
        if (joystickData.active) {
            this.x += joystickData.x * currentSpeed;
            this.y += joystickData.y * currentSpeed;
            this.rotation = joystickData.angle;
        } else {
            // Xoay theo chuột nếu không dùng joystick
            this.rotation = Math.atan2(mousePos.y - this.y, mousePos.x - this.x);
        }

        // Giới hạn biên
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        if (keys['Space'] || isFiring) this.shoot();
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shotDelay) {
            AudioFX.playShoot();
            const bulletSpeed = 7 * this.bulletSpeedMultiplier;
            if (this.bulletType === 'TRIPLE' || this.multiShotCount > 1) {
                // Bắn nhiều tia dựa trên multiShotCount
                const spread = 0.2;
                const startAngle = this.rotation - (spread * (this.multiShotCount - 1)) / 2;
                for (let i = 0; i < this.multiShotCount; i++) {
                    const angle = startAngle + i * spread;
                    const b = new Bullet(this.x, this.y, angle, true);
                    b.speed = bulletSpeed;
                    bullets.push(b);
                }
            } else {
                const b = new Bullet(this.x, this.y, this.rotation, true);
                b.speed = bulletSpeed;
                bullets.push(b);
            }
            this.lastShot = now;
        }
    }
}

class Enemy extends Tank {
    constructor(x, y, isBoss = false) {
        super(x, y, isBoss ? '#f59e0b' : '#ef4444');
        this.isBoss = isBoss;
        this.radius = isBoss ? 60 : 25;
        this.health = isBoss ? 500 + currentLevel * 200 : 100;
        this.speed = isBoss ? 1 : 1.5 + Math.random() + (currentLevel * 0.1);
        this.shotDelay = isBoss ? 800 : 1000 + Math.random() * 2000;
        this.scoreValue = isBoss ? 500 : 10;
    }

    draw() {
        super.draw();
        if (this.isBoss) {
            // Hiệu ứng hào quang cho Boss
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
            ctx.lineWidth = 5;
            ctx.setLineDash([10, 5]);
            ctx.stroke();
            ctx.restore();

            // Thanh máu Boss cao cấp
            const healthPercent = this.health / (500 + currentLevel * 200);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(this.x - 50, this.y - 80, 100, 10);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(this.x - 50, this.y - 80, 100 * healthPercent, 10);
        }
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
        ctx.save();
        
        // Bullet Trail (Vệt sáng)
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - Math.cos(this.angle) * 20, this.y - Math.sin(this.angle) * 20);
        ctx.strokeStyle = this.isPlayer ? 'rgba(96, 165, 250, 0.4)' : 'rgba(248, 113, 113, 0.4)';
        ctx.lineWidth = this.radius * 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isPlayer ? '#60a5fa' : '#f87171';
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.isPlayer ? '#3b82f6' : '#ef4444';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
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
            case 'HEALTH': return '#ef4444'; // Đỏ (Mới)
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

// Quản lý Level
let levelEnemiesLeft = 10;
let enemiesDefeated = 0;
let bossSpawned = false;

function initGame() {
    if (!player) {
        player = new Player(canvas.width / 2, canvas.height / 2);
    } else {
        // Giữ nguyên buff khi qua màn
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
    }
    enemies = [];
    bullets = [];
    particles = [];
    powerUps = [];
    floatingTexts = [];
    isGameActive = true;
    bossSpawned = false;
    levelEnemiesLeft = 5 + currentLevel * 5;
    updateUI();
}

function spawnEnemy(isBoss = false) {
    if (gameState !== STATE.PLAYING || (levelEnemiesLeft <= 0 && !isBoss)) return;
    
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -100 : canvas.width + 100;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -100 : canvas.height + 100;
    }
    
    // Enemy Spawn Indicator (UX sẽ làm đẹp hơn)
    floatingTexts.push(new FloatingText(x > canvas.width ? canvas.width - 50 : (x < 0 ? 50 : x), 
                                      y > canvas.height ? canvas.height - 50 : (y < 0 ? 50 : y), 
                                      '⚠', '#ef4444'));

    setTimeout(() => {
        enemies.push(new Enemy(x, y, isBoss));
        if (!isBoss) levelEnemiesLeft--;
        if (levelEnemiesLeft > 0) setTimeout(spawnEnemy, 2000 - currentLevel * 100);
    }, 1500);
}

function createExplosion(x, y, color) {
    AudioFX.playExplosion();
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
    // Kích hoạt rung màn hình
    shakeIntensity = 20;
}

function nextLevel() {
    currentLevel++;
    floatingTexts.push(new FloatingText(canvas.width/2, canvas.height/2, `LEVEL ${currentLevel}`, '#3b82f6'));
    setTimeout(() => initGame(), 2000);
}

function updateUI() {
    document.getElementById('score-val').innerText = score;
    document.getElementById('health-val').innerText = player.health + '%';
    document.getElementById('final-score').innerText = score;
    document.getElementById('high-score').innerText = highScore;
    document.getElementById('menu-high-score').innerText = highScore;
    // Có thể thêm hiển thị Level lên HUD nếu muốn
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
                    createExplosion(e.x, e.y, e.isBoss ? '#f59e0b' : '#ef4444');
                    e.health -= 25; // Sát thương đạn
                    bullets.splice(i, 1);

                    if (e.health <= 0) {
                        enemies.splice(j, 1);
                        score += e.scoreValue;
                        floatingTexts.push(new FloatingText(e.x, e.y, `+${e.scoreValue}`, '#fcd34d'));
                        
                        if (e.isBoss) {
                            nextLevel();
                        } else {
                            enemiesDefeated++;
                            if (levelEnemiesLeft <= 0 && enemies.length === 0 && !bossSpawned) {
                                bossSpawned = true;
                                floatingTexts.push(new FloatingText(canvas.width/2, canvas.height/2, 'BOSS WARNING!', '#ef4444'));
                                setTimeout(() => spawnEnemy(true), 3000);
                            }
                        }

                        // Rơi vật phẩm ngẫu nhiên
                        if (Math.random() < 0.3) {
                            const types = ['SPEED', 'SHIELD', 'TRIPLE', 'HEALTH'];
                            const type = types[Math.floor(Math.random() * types.length)];
                            powerUps.push(new PowerUp(e.x, e.y, type));
                        }
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
                player.takeDamage(10);
                updateUI();
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
            AudioFX.playPowerUp();
            player.applyPowerUp(p.type);
            powerUps.splice(i, 1);
            floatingTexts.push(new FloatingText(player.x, player.y - 30, p.type, p.color));
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
    isGameActive = true;
    initGame();
    spawnEnemy();
});

// Sửa lỗi nút Restart trên Mobile (sử dụng pointerdown hoặc click rõ ràng)
const restartBtn = document.getElementById('restart-btn');
const handleRestart = (e) => {
    e.preventDefault();
    document.getElementById('game-over-screen').classList.remove('active');
    gameState = STATE.PLAYING;
    isGameActive = true;
    initGame();
};
restartBtn.addEventListener('click', handleRestart);
restartBtn.addEventListener('touchend', handleRestart);

// Bắt đầu vòng lặp
gameLoop();
