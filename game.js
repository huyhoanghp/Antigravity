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
let skillPoints = 0;
let highScore = localStorage.getItem('tankHighScore') || 0;
let animationId;
let shakeIntensity = 0;
let currentLevel = 1;
let isGameActive = false;

// Audio Controller (Web Audio API 2.0 - Sci-Fi)
const AudioFX = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    
    playShoot() {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        
        // Sóng 1: High frequency click (Plasma fizz)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(800, t);
        osc1.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gain1.gain.setValueAtTime(0.1, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc1.connect(gain1).connect(this.ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.1);

        // Sóng 2: Thump (Lực đẩy)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(150, t);
        osc2.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        gain2.gain.setValueAtTime(0.2, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc2.connect(gain2).connect(this.ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.15);
    },
    
    playExplosion() {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        const duration = 0.5;

        // White Noise
        const bufSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Lowpass sweep
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        noise.connect(filter).connect(gain).connect(this.ctx.destination);
        noise.start(t);

        // Sub Rumble
        const rumble = this.ctx.createOscillator();
        const rGain = this.ctx.createGain();
        rumble.type = 'sawtooth';
        rumble.frequency.setValueAtTime(80, t);
        rumble.frequency.exponentialRampToValueAtTime(20, t + duration);
        rGain.gain.setValueAtTime(0.3, t);
        rGain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        rumble.connect(rGain).connect(this.ctx.destination);
        rumble.start(t);
        rumble.stop(t + duration);
    },
    
    playPowerUp() {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        // Arpeggio: 3 nốt nhạc liên tiếp
        const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + i * 0.08);
            gain.gain.setValueAtTime(0, t + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.15, t + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.2);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.2);
        });
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

// Movement Joystick State
let joystickData = {
    active: false,
    x: 0,
    y: 0,
    angle: 0,
    distance: 0
};

const joystickStick = document.getElementById('joystick-stick');
const joystickBase = document.getElementById('joystick-base');
let joystickTouchId = null;

// Fire Joystick State
let fireJoystickData = {
    active: false,
    x: 0,
    y: 0,
    angle: 0,
    distance: 0
};

const fireJoystickStick = document.getElementById('fire-joystick-stick');
const fireJoystickBase = document.getElementById('fire-joystick-base');
let fireJoystickTouchId = null;

function updateJoystick(touch, base, stick, data) {
    const rect = base.getBoundingClientRect();
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
    
    data.active = true;
    data.x = dx / maxDist;
    data.y = dy / maxDist;
    data.angle = Math.atan2(dy, dx);
    
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
}

// Touch Handling for Movement Joystick
joystickBase.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (joystickTouchId === null) {
            joystickTouchId = touch.identifier;
            updateJoystick(touch, joystickBase, joystickStick, joystickData);
        }
    }
}, {passive: false});

// Touch Handling for Fire Joystick
fireJoystickBase.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (fireJoystickTouchId === null) {
            fireJoystickTouchId = touch.identifier;
            updateJoystick(touch, fireJoystickBase, fireJoystickStick, fireJoystickData);
        }
    }
}, {passive: false});

window.addEventListener('touchmove', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) {
            e.preventDefault();
            updateJoystick(touch, joystickBase, joystickStick, joystickData);
        } else if (touch.identifier === fireJoystickTouchId) {
            e.preventDefault();
            updateJoystick(touch, fireJoystickBase, fireJoystickStick, fireJoystickData);
        } else if (touch.identifier === screenTouchId) {
            screenTouchPos.x = touch.clientX;
            screenTouchPos.y = touch.clientY;
        }
    }
}, {passive: false});

const handleTouchEnd = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) {
            joystickTouchId = null;
            joystickData.active = false;
            joystickData.x = 0;
            joystickData.y = 0;
            joystickStick.style.transform = 'translate(0, 0)';
        } else if (touch.identifier === fireJoystickTouchId) {
            fireJoystickTouchId = null;
            fireJoystickData.active = false;
            fireJoystickData.x = 0;
            fireJoystickData.y = 0;
            fireJoystickStick.style.transform = 'translate(0, 0)';
        } else if (touch.identifier === screenTouchId) {
            screenTouchId = null;
            isScreenFiring = false;
        }
    }
};

window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchcancel', handleTouchEnd);

// Touch Anywhere to Shoot (Screen Touch)
let isScreenFiring = false;
let screenTouchId = null;
let screenTouchPos = { x: 0, y: 0 };

window.addEventListener('touchstart', (e) => {
    if (gameState !== STATE.PLAYING) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        // Ignore if touch is on joysticks
        if (touch.target.closest('#joystick-zone') || touch.target.closest('#fire-zone')) continue;
        
        if (screenTouchId === null) {
            screenTouchId = touch.identifier;
            screenTouchPos.x = touch.clientX;
            screenTouchPos.y = touch.clientY;
            isScreenFiring = true;
        }
    }
}, {passive: false});

// Mouse firing
let isMouseFiring = false;
window.addEventListener('mousedown', (e) => {
    if (gameState === STATE.PLAYING) isMouseFiring = true;
});
window.addEventListener('mouseup', () => {
    isMouseFiring = false;
});


// Lớp Xe Tăng Cơ Bản
class Tank {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color; // Base color
        this.hullRotation = 0;
        this.turretRotation = 0;
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
        ctx.rotate(this.hullRotation);

        // Hiệu ứng đổ bóng Neon tổng thể
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        // 1. Hệ thống Xích xe (Treads) hai bên
        ctx.fillStyle = '#0f172a'; // Đen nhám
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        // Xích trái
        ctx.beginPath();
        ctx.roundRect(-24, -28, 48, 12, 3);
        ctx.fill(); ctx.stroke();
        // Xích phải
        ctx.beginPath();
        ctx.roundRect(-24, 16, 48, 12, 3);
        ctx.fill(); ctx.stroke();
        
        // Chi tiết rãnh xích (Tread lines)
        ctx.strokeStyle = '#1e293b';
        ctx.beginPath();
        for (let i = -20; i <= 20; i += 6) {
            ctx.moveTo(i, -28); ctx.lineTo(i, -16);
            ctx.moveTo(i, 16); ctx.lineTo(i, 28);
        }
        ctx.stroke();

        // 2. Thân chính (Main Hull)
        ctx.beginPath();
        ctx.roundRect(-20, -20, 40, 40, 6);
        const hullGrad = ctx.createLinearGradient(-20, -20, 20, 20);
        hullGrad.addColorStop(0, '#1e293b');
        hullGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = hullGrad;
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 3. Mảng Giáp xếp lớp (Armor Plates)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.moveTo(-15, -15); ctx.lineTo(15, -15);
        ctx.lineTo(20, 0); ctx.lineTo(15, 15);
        ctx.lineTo(-15, 15); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cổng xả khí (Exhaust Vents) phía sau
        ctx.fillStyle = '#ef4444'; // Sáng đỏ
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ef4444';
        ctx.fillRect(-18, -10, 4, 6);
        ctx.fillRect(-18, 4, 4, 6);
        ctx.shadowBlur = 0;
        
        ctx.restore(); // Kết thúc vẽ Thân xe

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.turretRotation);
        
        // Hiệu ứng đổ bóng Neon cho tháp pháo
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        // 4. Nòng súng (Cannon Barrel)
        ctx.beginPath();
        ctx.roundRect(10, -4, 30, 8, 2);
        const gunGrad = ctx.createLinearGradient(10, -4, 40, 4);
        gunGrad.addColorStop(0, '#334155');
        gunGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = gunGrad;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();
        
        // Lỗ tản nhiệt trên nòng
        ctx.fillStyle = '#0f172a';
        for (let i = 15; i <= 25; i += 5) {
            ctx.fillRect(i, -2, 2, 4);
        }

        // Mũi nòng phát sáng
        ctx.beginPath();
        ctx.arc(38, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();

        // 5. Tháp pháo đa giác (Hexagon Turret Dome)
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(4, 10);
        ctx.lineTo(-6, 10);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-6, -10);
        ctx.lineTo(4, -10);
        ctx.closePath();
        const turretGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        turretGrad.addColorStop(0, '#475569');
        turretGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = turretGrad;
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
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
        // Xử lý di chuyển và Hướng Thân Xe
        let dx = 0; let dy = 0;
        
        if (joystickData.active) {
            dx = joystickData.x;
            dy = joystickData.y;
            this.hullRotation = joystickData.angle;
        } else {
            if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
            if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
            
            if (dx !== 0 || dy !== 0) {
                const len = Math.hypot(dx, dy);
                dx /= len;
                dy /= len;
                this.hullRotation = Math.atan2(dy, dx);
            }
        }
        
        this.x += dx * this.speed * this.speedMultiplier;
        this.y += dy * this.speed * this.speedMultiplier;
        
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        // Xử lý Hướng Ngắm Bắn và Tháp Pháo
        let shouldShoot = false;
        
        if (fireJoystickData.active) {
            this.turretRotation = fireJoystickData.angle;
            shouldShoot = true;
        } else if (isScreenFiring) {
            this.turretRotation = Math.atan2(screenTouchPos.y - this.y, screenTouchPos.x - this.x);
            shouldShoot = true;
        } else if (isMouseFiring || keys['Space']) {
            this.turretRotation = Math.atan2(mousePos.y - this.y, mousePos.x - this.x);
            shouldShoot = true;
        } else {
            // Không bắn, tháp pháo hướng theo chuột
            this.turretRotation = Math.atan2(mousePos.y - this.y, mousePos.x - this.x);
        }

        if (shouldShoot) {
            this.shoot();
        }
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shotDelay) {
            AudioFX.playShoot();
            const bulletSpeed = 7 * this.bulletSpeedMultiplier;
            if (this.bulletType === 'TRIPLE' || this.multiShotCount > 1) {
                // Bắn nhiều tia dựa trên multiShotCount
                const spread = 0.2;
                const startAngle = this.turretRotation - (spread * (this.multiShotCount - 1)) / 2;
                for (let i = 0; i < this.multiShotCount; i++) {
                    const angle = startAngle + i * spread;
                    const b = new Bullet(this.x, this.y, angle, true);
                    b.speed = bulletSpeed;
                    bullets.push(b);
                }
            } else {
                const b = new Bullet(this.x, this.y, this.turretRotation, true);
                b.speed = bulletSpeed;
                bullets.push(b);
            }
            
            // Giật lùi (theo chiều ngược lại hướng tháp pháo)
            this.x -= Math.cos(this.turretRotation) * 2;
            this.y -= Math.sin(this.turretRotation) * 2;
            
            this.lastShot = now;
        }
    }
}

class Enemy extends Tank {
    constructor(x, y, type = 'BASIC') {
        let color = '#ef4444';
        if (type === 'BOSS') color = '#f59e0b';
        else if (type === 'SCOUT') color = '#c084fc';
        else if (type === 'ARTILLERY') color = '#eab308';
        
        super(x, y, color);
        this.type = type;
        this.isBoss = type === 'BOSS';
        
        if (this.isBoss) {
            this.radius = 60;
            this.health = 500 + currentLevel * 200;
            this.speed = 0.5;
            this.shotDelay = 800;
            this.scoreValue = 500;
        } else if (type === 'SCOUT') {
            this.radius = 20;
            this.health = 50;
            this.speed = (2.5 + Math.random() + (currentLevel * 0.1)) * 0.5; // Giảm 50% nhưng vẫn nhanh hơn Basic
            this.shotDelay = 1500;
            this.scoreValue = 15;
        } else if (type === 'ARTILLERY') {
            this.radius = 35;
            this.health = 200;
            this.speed = (0.8 + Math.random() * 0.5) * 0.5; // Giảm 50%, rất chậm
            this.shotDelay = 2500;
            this.scoreValue = 25;
        } else {
            // BASIC
            this.radius = 25;
            this.health = 100;
            this.speed = (1.5 + Math.random() + (currentLevel * 0.1)) * 0.5; // Giảm 50% tốc độ
            this.shotDelay = 1000 + Math.random() * 2000;
            this.scoreValue = 10;
        }
        this.maxHealth = this.health;
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
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(this.x - 50, this.y - 80, 100, 10);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(this.x - 50, this.y - 80, 100 * healthPercent, 10);
        }
    }

    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angle = Math.atan2(dy, dx);
        
        this.turretRotation = angle;
        this.hullRotation = angle;

        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let stopDist = 150;
        if (this.type === 'SCOUT') stopDist = 50; // Áp sát
        if (this.type === 'ARTILLERY') stopDist = 300; // Đứng xa

        if (dist > stopDist) {
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        }

        // Bắn
        const now = Date.now();
        if (now - this.lastShot > this.shotDelay) {
            if (this.type === 'ARTILLERY') {
                // Bắn 3 tia
                for (let i = -1; i <= 1; i++) {
                    bullets.push(new Bullet(this.x, this.y, this.turretRotation + i * 0.15, false));
                }
            } else if (this.isBoss) {
                // Boss bắn chùm 5 tia
                for (let i = -2; i <= 2; i++) {
                    bullets.push(new Bullet(this.x, this.y, this.turretRotation + i * 0.1, false));
                }
            } else {
                bullets.push(new Bullet(this.x, this.y, this.turretRotation, false));
            }
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
        
        const coreColor = this.isPlayer ? '#60a5fa' : '#f87171';
        const glowColor = this.isPlayer ? '#3b82f6' : '#ef4444';

        // Bullet Trail (Vệt sáng Neon)
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - Math.cos(this.angle) * 30, this.y - Math.sin(this.angle) * 30);
        ctx.strokeStyle = coreColor;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        ctx.globalAlpha = 1;

        // Core đạn
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; // Lõi trắng
        ctx.shadowBlur = 20;
        ctx.shadowColor = glowColor;
        ctx.fill();
        
        // Viền đạn
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
        ctx.strokeStyle = coreColor;
        ctx.lineWidth = 2;
        ctx.stroke();

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
        this.size = Math.random() * 4 + 2;
        // Nổ văng mạnh hơn
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 8 + 4;
        this.speedX = Math.cos(angle) * velocity;
        this.speedY = Math.sin(angle) * velocity;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
        this.friction = 0.92; // Lực cản
    }

    update() {
        this.speedX *= this.friction;
        this.speedY *= this.friction;
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        this.size = Math.max(0, this.size - 0.1);
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color, isIndicator = false) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.alpha = 1;
        this.isIndicator = isIndicator;
        this.velocity = isIndicator ? 0 : 1.2;
        this.scale = isIndicator ? 0 : 1;
        this.maxLife = isIndicator ? 1.5 : 1; // 1.5s delay cho indicator
        this.life = this.maxLife;
    }

    update() {
        this.y -= this.velocity;
        this.life -= 1/60; // Dựa trên 60FPS
        
        if (this.isIndicator) {
            this.scale = Math.min(1, this.scale + 0.05);
            // Vòng tròn hội tụ dần
            this.alpha = this.life > 0.3 ? 1 : this.life / 0.3;
        } else {
            this.alpha -= 0.015;
        }
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        
        if (this.isIndicator) {
            // Vẽ Reticle
            ctx.translate(this.x, this.y);
            ctx.scale(this.scale, this.scale);
            
            // Xoay liên tục
            ctx.rotate(Date.now() / 200);
            
            ctx.beginPath();
            ctx.arc(0, 0, 30 * (this.life / this.maxLife) + 20, 0, Math.PI * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([15, 10]);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        } else {
            ctx.fillStyle = this.color;
            ctx.font = 'bold 24px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.fillText(this.text, this.x, this.y);
        }
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
    // Chỉ giữ buff nếu game active (chuyển màn). Nếu từ Menu hoặc Game Over thì tạo mới hoàn toàn
    if (!player || gameState === STATE.MENU || gameState === STATE.GAMEOVER) {
        player = new Player(canvas.width / 2, canvas.height / 2);
        score = 0;
        currentLevel = 1;
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
    
    let type = 'BASIC';
    if (isBoss) type = 'BOSS';
    else {
        const rand = Math.random();
        if (rand < 0.2) type = 'SCOUT';
        else if (rand < 0.35) type = 'ARTILLERY';
    }

    // Enemy Spawn Indicator
    let indicatorColor = '#ef4444';
    if (type === 'BOSS') indicatorColor = '#f59e0b';
    else if (type === 'SCOUT') indicatorColor = '#c084fc';
    else if (type === 'ARTILLERY') indicatorColor = '#eab308';

    floatingTexts.push(new FloatingText(x > canvas.width ? canvas.width - 50 : (x < 0 ? 50 : x), 
                                      y > canvas.height ? canvas.height - 50 : (y < 0 ? 50 : y), 
                                      '', indicatorColor, true));

    setTimeout(() => {
        enemies.push(new Enemy(x, y, type));
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

function showTalentTree() {
    gameState = STATE.MENU; // Tạm dừng game
    document.getElementById('shop-score').innerText = score;
    document.getElementById('shop-sp').innerText = skillPoints;
    document.getElementById('talent-tree-screen').classList.add('active');
}

document.getElementById('continue-btn').addEventListener('click', () => {
    document.getElementById('talent-tree-screen').classList.remove('active');
    gameState = STATE.PLAYING;
    currentLevel++;
    floatingTexts.push(new FloatingText(canvas.width/2, canvas.height/2, `LEVEL ${currentLevel}`, '#3b82f6'));
    setTimeout(() => {
        initGame();
        spawnEnemy();
    }, 2000);
});

// Logic mua nâng cấp
document.getElementById('btn-upg-health').addEventListener('click', () => buyUpgrade('health'));
document.getElementById('btn-upg-speed').addEventListener('click', () => buyUpgrade('speed'));
document.getElementById('btn-upg-firerate').addEventListener('click', () => buyUpgrade('firerate'));

function buyUpgrade(type) {
    let costScore = 0;
    let costSP = 0;

    if (type === 'health') { costScore = 1000; costSP = 1; }
    if (type === 'speed') { costScore = 800; costSP = 0; }
    if (type === 'firerate') { costScore = 1500; costSP = 2; }

    if (score >= costScore && skillPoints >= costSP) {
        score -= costScore;
        skillPoints -= costSP;
        
        if (type === 'health') player.health = Math.min(100, player.health + 20);
        if (type === 'speed') player.speedMultiplier += 0.1;
        if (type === 'firerate') player.shotDelay = Math.max(100, player.shotDelay * 0.9);
        
        document.getElementById('shop-score').innerText = score;
        document.getElementById('shop-sp').innerText = skillPoints;
        updateUI();
        AudioFX.playPowerUp();
        
        floatingTexts.push(new FloatingText(canvas.width/2, canvas.height/2 + 50, "UPGRADED!", '#10b981'));
    } else {
        floatingTexts.push(new FloatingText(canvas.width/2, canvas.height/2 + 50, "NOT ENOUGH POINTS!", '#ef4444'));
    }
}

function nextLevel() {
    // Gọi Talent Tree thay vì nhảy thẳng màn
    showTalentTree();
}

function updateUI() {
    document.getElementById('score-val').innerText = score;
    document.getElementById('sp-val').innerText = skillPoints;
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
                    createExplosion(e.x, e.y, e.isBoss ? '#f59e0b' : '#ef4444');
                    e.health -= 25; // Sát thương đạn
                    bullets.splice(i, 1);

                    if (e.health <= 0) {
                        enemies.splice(j, 1);
                        score += e.scoreValue;
                        floatingTexts.push(new FloatingText(e.x, e.y, `+${e.scoreValue}`, '#fcd34d'));
                        
                        if (e.isBoss) {
                            skillPoints += 3;
                            floatingTexts.push(new FloatingText(e.x, e.y - 20, '+3 SP', '#c084fc'));
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

function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 1;
    
    // Tự tính toán offset lưới dựa vào camera nếu có, 
    // tạm thời dùng tốc độ gió nhè nhẹ hoặc time
    const gridSize = 50;
    const offsetX = (Date.now() / 50) % gridSize;
    const offsetY = (Date.now() / 50) % gridSize;

    ctx.beginPath();
    for (let x = -gridSize; x < canvas.width + gridSize; x += gridSize) {
        ctx.moveTo(x + offsetX, 0);
        ctx.lineTo(x + offsetX, canvas.height);
    }
    for (let y = -gridSize; y < canvas.height + gridSize; y += gridSize) {
        ctx.moveTo(0, y + offsetY);
        ctx.lineTo(canvas.width, y + offsetY);
    }
    ctx.stroke();
    ctx.restore();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ nền có Grid cyberpunk
    ctx.fillStyle = '#0f172a'; // Tối hơn
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    ctx.save();
    
    // Áp dụng Screen Shake
    if (shakeIntensity > 0) {
        const shakeX = (Math.random() - 0.5) * shakeIntensity;
        const shakeY = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(shakeX, shakeY);
        shakeIntensity *= 0.9; // Giảm dần cường độ
        if (shakeIntensity < 0.1) shakeIntensity = 0;
    }

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
    initGame(); // InitGame phải chạy trước khi gán PLAYING để nó reset đúng chuẩn GAMEOVER
    gameState = STATE.PLAYING;
    isGameActive = true;
    spawnEnemy();
};
restartBtn.addEventListener('click', handleRestart);
restartBtn.addEventListener('touchend', handleRestart);

// Bắt đầu vòng lặp
gameLoop();
