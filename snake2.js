let s2canvas, s2ctx;
let s2Snake = []; // array of {x,y} points along the trail
let s2Angle = 0; // current heading in radians
let s2TargetAngle = 0;
let s2Speed = 2.5; // pixels per frame
let s2SegmentSpacing = 6;
let s2Length = 40; // number of trail points to keep
let s2Running = false;
let s2UsingKeyboard = false;
const WORLD_SIZE = 6000; // world is much bigger than any screen
let s2CameraX = 0, s2CameraY = 0;
const S2_MAX_FOOD = 400; // hard cap on combined food + big food count
let s2Foods = []; // array of {x, y}
const S2_FOOD_COUNT = 30; // scattered across the world at once
const S2_BIG_FOOD_COUNT = 10;
let s2PointerLocked = false;
let s2Boosting = false;
const s2NormalSpeed = 2.5;
const s2BoostSpeed = 5;
let s2BoostDrainTimer = null;       
const botThickness = 24;
let killedByPlayer = false;
let s2PlayerKills = 0;
let s2BigFoods = [];
const S2_MAX_TURN_RATE = 0.15; // max radians a snake can turn per frame — smaller = wider turning radius

function s2SpawnBigFood() {
    let x, y, tooClose;
    do {
        x = Math.random() * WORLD_SIZE;
        y = Math.random() * WORLD_SIZE;
        tooClose = s2Foods.some(f => Math.hypot(f.x - x, f.y - y) < 60)
            || s2BigFoods.some(f => Math.hypot(f.x - x, f.y - y) < 60);
    } while (tooClose);
    s2BigFoods.push({ x, y });
}

function s2InitBigFood() {
    s2BigFoods = [];
    for (let i = 0; i < S2_BIG_FOOD_COUNT; i++) s2SpawnBigFood();
}

function s2SpawnFood() {
    let x, y, tooClose;
    do {
        x = Math.random() * WORLD_SIZE;
        y = Math.random() * WORLD_SIZE;
        tooClose = s2Foods.some(f => Math.hypot(f.x - x, f.y - y) < 50)
            || s2BigFoods.some(f => Math.hypot(f.x - x, f.y - y) < 50);
    } while (tooClose);
    s2Foods.push({ x, y });
}

function s2InitFood() {
    s2Foods = [];
    for (let i = 0; i < S2_FOOD_COUNT; i++) s2SpawnFood();
}
function s2SetupBoostButton() {
    const btn = document.querySelector('#s2BoostBtn');
    function startBoost(e) {
        e.preventDefault();
        if (s2Snake.length <= s2Length) return;
        s2Boosting = true;
        s2Speed = s2BoostSpeed;
        s2BoostDrainTimer = setInterval(() => {
            if (s2Snake.length > s2Length) {
                const dropped = s2Snake.pop();
                if (s2Foods.length + s2BigFoods.length < S2_MAX_FOOD) {
                    s2Foods.push({ x: dropped.x, y: dropped.y });
                }
            } else {
                stopBoost();
            }
        }, 150);
    }
    function stopBoost() {
        s2Boosting = false;
        s2Speed = s2NormalSpeed;
        clearInterval(s2BoostDrainTimer);
    }
    btn.addEventListener('mousedown', startBoost);
    btn.addEventListener('mouseup', stopBoost);
    btn.addEventListener('mouseleave', stopBoost);
    btn.addEventListener('touchstart', startBoost, { passive: false });
    btn.addEventListener('touchend', stopBoost);
}


function initSnake2() {
    s2canvas = document.querySelector('#snake2canvas');
    s2ctx = s2canvas.getContext('2d');
    s2canvas.width = s2canvas.clientWidth;
    s2canvas.height = s2canvas.clientHeight;
    document.querySelector('#s2Minimap').width = 120;
    document.querySelector('#s2Minimap').height = 120;
    s2Snake = [];
    for (let i = 0; i < s2Length; i++) {
        s2Snake.push({ x: WORLD_SIZE/2 - i*s2SegmentSpacing, y: WORLD_SIZE/2 });
    }
    s2Running = true;

    s2canvas.addEventListener('click', () => s2canvas.requestPointerLock());
    document.addEventListener('mousemove', s2HandleMouse);
    s2SetupJoystick();
    requestAnimationFrame(s2Loop);
    s2InitFood();
    s2InitBigFood();
    s2InitBots();
    s2SetupBoostButton();
}
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !s2Boosting) {
        e.preventDefault();
        document.querySelector('#s2BoostBtn').dispatchEvent(new Event('mousedown'));
    }
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        document.querySelector('#s2BoostBtn').dispatchEvent(new Event('mouseup'));
    }
});
let s2JoystickX = 0, s2JoystickY = 0; // accumulated offset from center, clamped

function s2HandleMouse(e) {
    if (!s2PointerLocked) return;
    s2JoystickX += e.movementX;
    s2JoystickY += e.movementY;
    const maxOffset = 150;
    const dist = Math.hypot(s2JoystickX, s2JoystickY);
    if (dist > maxOffset) {
        s2JoystickX = (s2JoystickX/dist) * maxOffset;
        s2JoystickY = (s2JoystickY/dist) * maxOffset;
    }
}

document.addEventListener('pointerlockchange', () => {
    s2PointerLocked = document.pointerLockElement === s2canvas;
    document.querySelector('#s2ClickHint').style.display = s2PointerLocked ? 'none' : 'block';
});

let s2JoystickActive = false;
let s2JoystickCenterX = 0, s2JoystickCenterY = 0;

function s2HandleKeydown(e) {
    const key = e.key.toLowerCase();
    if (['arrowleft','a'].includes(key)) { s2UsingKeyboard = true; s2TargetAngle = Math.PI; }
    else if (['arrowright','d'].includes(key)) { s2UsingKeyboard = true; s2TargetAngle = 0; }
    else if (['arrowup','w'].includes(key)) { s2UsingKeyboard = true; s2TargetAngle = -Math.PI/2; }
    else if (['arrowdown','s'].includes(key)) { s2UsingKeyboard = true; s2TargetAngle = Math.PI/2; }
}

function s2SetupJoystick() {
    const container = document.querySelector('#snake2container');
    const joy = document.querySelector('#s2Joystick');
    const knob = document.querySelector('#s2JoystickKnob');
    const maxKnobOffset = 30;
    const maxOffset = 150;

    function start(e) {
        const t = e.touches[0];
        s2JoystickCenterX = t.clientX;
        s2JoystickCenterY = t.clientY;
        joy.style.left = s2JoystickCenterX + 'px';
        joy.style.top = s2JoystickCenterY + 'px';
        joy.style.display = 'block';
        s2JoystickActive = true;
        knob.style.left = '30px';
        knob.style.top = '30px';
    }

    function move(e) {
        if (!s2JoystickActive) return;
        e.preventDefault();
        const t = e.touches[0];
        let dx = t.clientX - s2JoystickCenterX;
        let dy = t.clientY - s2JoystickCenterY;
        const dist = Math.hypot(dx, dy);
        const clamped = Math.min(dist, maxKnobOffset);
        if (dist > 0) {
            dx = (dx/dist) * clamped;
            dy = (dy/dist) * clamped;
        }
        knob.style.left = (30 + dx) + 'px';
        knob.style.top = (30 + dy) + 'px';

        if (dist > 5) {
            s2JoystickX = (dx/clamped) * maxOffset;
            s2JoystickY = (dy/clamped) * maxOffset;
        }
    }

    function end() {
        s2JoystickActive = false;
        joy.style.display = 'none';
        s2JoystickX = 0;
        s2JoystickY = 0;
    }

    container.addEventListener('touchstart', start, { passive: true });
    container.addEventListener('touchmove', move, { passive: false });
    container.addEventListener('touchend', end);
}

function s2Loop() {
    if (!s2Running) return;
    const head = s2Snake[0];
    const distJ = Math.hypot(s2JoystickX, s2JoystickY);
    let dx, dy;
    if (distJ > 5) {
        const desiredAngle = Math.atan2(s2JoystickY, s2JoystickX);
        let angleDiff = desiredAngle - s2Angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI*2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI*2;
        const myTurnRate = Math.max(0.11, S2_MAX_TURN_RATE - (s2Snake.length * 0.0002))
        const clampedTurn = Math.max(-myTurnRate, Math.min(myTurnRate, angleDiff));
        s2Angle += clampedTurn;
        dx = Math.cos(s2Angle);
        dy = Math.sin(s2Angle);
    } else {
        dx = Math.cos(s2Angle);
        dy = Math.sin(s2Angle);
    }
    const newHead = {
        x: Math.max(0, Math.min(WORLD_SIZE, head.x + dx*s2Speed)),
        y: Math.max(0, Math.min(WORLD_SIZE, head.y + dy*s2Speed))
    };
    s2Snake.unshift(newHead);
    s2Snake.pop();
    const thicknessNow = Math.min(24 + s2Snake.length * 0.05, 60);
    if (s2CheckHeadCollision(newHead.x, newHead.y, thicknessNow, 'player')) {
        s2Running = false;
        document.exitPointerLock();
        s2DropFoodTrail(s2Snake);
        document.querySelector('#s2FinalLength').textContent = s2Snake.length;
        document.querySelector('#s2FinalKills').textContent = s2PlayerKills;
        document.querySelector('#s2GameoverPopup').classList.remove('hidden');
        return;
    }
    s2CameraX = s2Snake[0].x - s2canvas.width/2;
    s2CameraY = s2Snake[0].y - s2canvas.height/2;
    // check food collision
    const headR = 12; // half of thickness (24/2)
    for (let i = s2Foods.length - 1; i >= 0; i--) {
        const f = s2Foods[i];
        const dist = Math.hypot(s2Snake[0].x - f.x, s2Snake[0].y - f.y);
        if (dist < headR + 6) {
            s2Foods.splice(i, 1);
            s2SpawnFood(); // keep food count constant
            // grow snake by adding segments at the tail
            const tail = s2Snake[s2Snake.length - 1];
            for (let g = 0; g < 3; g++) s2Snake.push({ x: tail.x, y: tail.y });
            playEatSound();
        }
    }
    for (let i = s2BigFoods.length - 1; i >= 0; i--) {
        const f = s2BigFoods[i];
        if (Math.hypot(s2Snake[0].x - f.x, s2Snake[0].y - f.y) < 20) {
            s2BigFoods.splice(i, 1);
            s2SpawnBigFood();
            const tail = s2Snake[s2Snake.length - 1];
            for (let g = 0; g < 10; g++) s2Snake.push({ x: tail.x, y: tail.y }); // worth 10 normal foods
            playEatSound();
        }
    }
    s2Bots.forEach(s2UpdateBot);
    const aliveBotCount = s2Bots.filter(b => b.alive).length;
    document.querySelector('#s2ScoreNum').textContent = s2Snake.length;
    document.querySelector('#s2AliveNum').textContent = aliveBotCount + 1; // +1 for player
    document.querySelector('#s2KillNum').textContent = s2PlayerKills;
    s2Draw();
    requestAnimationFrame(s2Loop);
}

function s2Draw() {
    s2ctx.fillStyle = '#16181c';
    s2ctx.fillRect(0, 0, s2canvas.width, s2canvas.height);

    const thickness = Math.min(24 + s2Snake.length * 0.05, 60); // grows with length, caps at 60
    const start = hexToRgb(snakeHeadColor || '#9AC606');

    s2Foods.forEach(f => {
        const sx = f.x - s2CameraX;
        const sy = f.y - s2CameraY;
        if (sx < -20 || sx > s2canvas.width+20 || sy < -20 || sy > s2canvas.height+20) return; // skip off-screen
        const grad = s2ctx.createRadialGradient(sx+2, sy+2, 1, sx, sy, 6);
        grad.addColorStop(0, "#FF7A1A");
        grad.addColorStop(1, "#FA3604");
        s2ctx.fillStyle = grad;
        s2ctx.beginPath();
        s2ctx.arc(sx, sy, 6, 0, Math.PI*2);
        s2ctx.fill();
    });
    s2BigFoods.forEach(f => {
        const sx = f.x - s2CameraX, sy = f.y - s2CameraY;
        if (sx < -20 || sx > s2canvas.width+20 || sy < -20 || sy > s2canvas.height+20) return;
        const grad = s2ctx.createRadialGradient(sx+3, sy+3, 2, sx, sy, 14);
        grad.addColorStop(0, "#FFE55C");
        grad.addColorStop(1, "#FFC107");
        s2ctx.fillStyle = grad;
        s2ctx.beginPath();
        s2ctx.arc(sx, sy, 14, 0, Math.PI*2);
        s2ctx.fill();
    });
    s2Bots.forEach(bot => {
        if (!bot.alive) return;
        const bStart = hexToRgb(bot.color);
        const botThicknessNow = Math.min(24 + bot.snake.length * 0.05, 60);
        for (let i = bot.snake.length - 1; i >= 0; i -= 2) {
            const sx = bot.snake[i].x - s2CameraX;
            const sy = bot.snake[i].y - s2CameraY;
            if (sx < -30 || sx > s2canvas.width+30 || sy < -30 || sy > s2canvas.height+30) continue;
            const t = i / bot.snake.length;
            s2ctx.fillStyle = `rgb(${Math.round(bStart.r*(1-t*0.35))},${Math.round(bStart.g*(1-t*0.35))},${Math.round(bStart.b*(1-t*0.35))})`;
            s2ctx.beginPath();
            s2ctx.arc(sx, sy, botThicknessNow/2, 0, Math.PI*2);
            s2ctx.fill();
        }
        // eyes on bot head
        const bHead = bot.snake[0];
        const bx = bHead.x - s2CameraX, by = bHead.y - s2CameraY;
        if (bx > -30 && bx < s2canvas.width+30 && by > -30 && by < s2canvas.height+30) {
            const bdx = Math.cos(bot.angle), bdy = Math.sin(bot.angle);
            const bpx = -bdy, bpy = bdx;
            const boff = 4;
            const bex = bx + bdx*4, bey = by + bdy*4;
            s2ctx.fillStyle = "#111";
            s2ctx.beginPath();
            s2ctx.arc(bex + bpx*boff, bey + bpy*boff, 2, 0, Math.PI*2);
            s2ctx.arc(bex - bpx*boff, bey - bpy*boff, 2, 0, Math.PI*2);
            s2ctx.fill();
        }
    });

    for (let i = s2Snake.length - 1; i >= 0; i--) {
        const t = i / s2Snake.length;
        const r = Math.round(start.r * (1 - t*0.35));
        const g = Math.round(start.g * (1 - t*0.35));
        const b = Math.round(start.b * (1 - t*0.35));
        s2ctx.fillStyle = `rgb(${r},${g},${b})`;
        s2ctx.beginPath();
        s2ctx.arc(s2Snake[i].x - s2CameraX, s2Snake[i].y - s2CameraY, thickness/2, 0, Math.PI*2);
        s2ctx.fill();
    }

    const head = s2Snake[0];
    const dx = Math.cos(s2Angle), dy = Math.sin(s2Angle);
    const px = -dy, py = dx;
    const off = thickness*0.3;
    const ex = (head.x - s2CameraX) + dx*thickness*0.3;
    const ey = (head.y - s2CameraY) + dy*thickness*0.3;
    s2ctx.fillStyle = '#111';
    s2ctx.beginPath();
    s2ctx.arc(ex + px*off, ey + py*off, 3.5, 0, Math.PI*2);
    s2ctx.arc(ex - px*off, ey - py*off, 3.5, 0, Math.PI*2);
    s2ctx.fill();
    const nameTag = myUsername || 'Player';
    s2ctx.font = 'bold 12px -apple-system, sans-serif';
    const tagWidth = s2ctx.measureText(nameTag).width + 16;
    const tagX = ex - tagWidth/2;
    const tagY = ey - thickness - 16;
    s2ctx.fillStyle = 'rgba(0,0,0,0.6)';
    s2ctx.beginPath();
    s2ctx.roundRect(tagX, tagY, tagWidth, 20, 10);
    s2ctx.fill();
    s2ctx.fillStyle = '#ece7de';
    s2ctx.textAlign = 'center';
    s2ctx.fillText(nameTag, ex, tagY + 14);
    s2ctx.textAlign = 'left';
    s2DrawMinimap();
}

function s2DropFoodTrail(snakeArr) {
    const bigChance = Math.min(0.02 + (snakeArr.length / 600), 0.25);
    for (let i = 0; i < snakeArr.length; i += 4) {
        const isBig = Math.random() < bigChance;
        if (isBig) {
            if (s2Foods.length + s2BigFoods.length >= S2_MAX_FOOD && s2Foods.length > 0) {
                s2Foods.shift(); // evict oldest normal food to make room
            }
            if (s2Foods.length + s2BigFoods.length < S2_MAX_FOOD) s2BigFoods.push({ x: snakeArr[i].x, y: snakeArr[i].y });
        } else {
            if (s2Foods.length + s2BigFoods.length < S2_MAX_FOOD) s2Foods.push({ x: snakeArr[i].x, y: snakeArr[i].y });
        }
    }
}

function s2DrawMinimap() {
    const mini = document.querySelector('#s2Minimap');
    const mctx = mini.getContext('2d');
    mctx.fillStyle = 'rgba(0,0,0,0.3)';
    mctx.fillRect(0, 0, 120, 120);

    const scale = 120 / WORLD_SIZE;
    // player dot
    mctx.fillStyle = snakeHeadColor || '#9AC606';
    mctx.beginPath();
    mctx.arc(s2Snake[0].x * scale, s2Snake[0].y * scale, 4, 0, Math.PI*2);
    mctx.fill();
    // bot dots
    mctx.fillStyle = 'rgba(255,255,255,0.4)';
    s2Bots.forEach(bot => {
        if (!bot.alive) return;
        mctx.beginPath();
        mctx.arc(bot.snake[0].x * scale, bot.snake[0].y * scale, 2, 0, Math.PI*2);
        mctx.fill();
    });
}

let s2Bots = [];
const S2_BOT_COUNT = 99;

function s2CreateBot(id) {
    
    const startX = Math.random() * WORLD_SIZE;
    const startY = Math.random() * WORLD_SIZE;
    const trail = [];
    const len = 15 + Math.floor(Math.random() * 60);
    for (let i = 0; i < len; i++) {
        trail.push({ x: startX - i*6, y: startY });
    }
    return {
        id,
        snake: trail,
        angle: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 0.8,
        color: ['#9AC606','#06C6C6','#C60676','#C6A006'][Math.floor(Math.random()*4)],
        alive: true,
        name: 'Bot' + id,
        avoidCheckTimer: 0,
        avoiding: false,
    };
}

function s2InitBots() {
    s2Bots = [];
    for (let i = 0; i < S2_BOT_COUNT; i++) {
        s2Bots.push(s2CreateBot(i));
    }
}

function s2UpdateBot(bot) {
    if (!bot.alive) return;
    const head = bot.snake[0];
    // find nearest food (normal or big), wider search radius
    let nearestFood = null, nearestDist = 700;
    s2Foods.forEach(f => {
        const d = Math.hypot(head.x - f.x, head.y - f.y);
        if (d < nearestDist) { nearestDist = d; nearestFood = f; }
    });
    s2BigFoods.forEach(f => {
        const d = Math.hypot(head.x - f.x, head.y - f.y) - 200; // treat big food as if 200px closer (more attractive)
        if (d < nearestDist) { nearestDist = d; nearestFood = f; }
    });
    
    let targetAngle = bot.angle;
    if (nearestFood) {
        targetAngle = Math.atan2(nearestFood.y - head.y, nearestFood.x - head.x);
    } else {
        // no food nearby — pick a fresh random direction occasionally, hold heading otherwise
        if (!bot.wanderTimer || bot.wanderTimer <= 0) {
            bot.wanderAngle = Math.random() * Math.PI * 2;
            bot.wanderTimer = 60 + Math.random() * 60; // hold for 1-2 seconds at 60fps
        }
        bot.wanderTimer--;
        targetAngle = bot.wanderAngle;
    }

    // basic obstacle avoidance: look ahead, steer away from nearby snake bodies
    bot.avoidCheckTimer--;
    if (bot.avoidCheckTimer <= 0) {
        bot.avoidCheckTimer = 5; // only recheck every 5 frames
        const lookAheadDist = 60;
        const lookX = head.x + Math.cos(bot.angle) * lookAheadDist;
        const lookY = head.y + Math.sin(bot.angle) * lookAheadDist;
        let avoiding = false;

        function checkDanger(segX, segY) {
            return Math.hypot(lookX - segX, lookY - segY) < 30;
        }

        for (let i = 5; i < s2Snake.length; i += 3) {
            if (checkDanger(s2Snake[i].x, s2Snake[i].y)) { avoiding = true; break; }
        }
        if (!avoiding) {
            for (const other of s2Bots) {
                if (other === bot || !other.alive) continue;
                const oHead = other.snake[0];
                if (Math.hypot(head.x - oHead.x, head.y - oHead.y) > 200) continue;
                for (let i = 0; i < other.snake.length; i += 3) {
                    if (checkDanger(other.snake[i].x, other.snake[i].y)) { avoiding = true; break; }
                }
                if (avoiding) break;
            }
        }
        bot.avoiding = avoiding;
    }
    const avoiding = bot.avoiding;

    if (avoiding) {
        targetAngle = bot.angle + Math.PI/2 + (Math.random() - 0.5);
    }
    // world edge avoidance (unchanged)
    const margin = 200;
    if (head.x < margin) targetAngle = 0;
    if (head.x > WORLD_SIZE - margin) targetAngle = Math.PI;
    if (head.y < margin) targetAngle = Math.PI/2;
    if (head.y > WORLD_SIZE - margin) targetAngle = -Math.PI/2;
    
// smooth turning — turn faster when close to target for tighter tracking
    let diff = targetAngle - bot.angle;
    while (diff > Math.PI) diff -= Math.PI*2;
    while (diff < -Math.PI) diff += Math.PI*2;
    const baseTurn = Math.max(0.11, S2_MAX_TURN_RATE - (bot.snake.length * 0.0002));
    const maxTurn = avoiding ? baseTurn * 1.8 : baseTurn;
    const clampedDiff = Math.max(-maxTurn, Math.min(maxTurn, diff));
    bot.angle += clampedDiff;
    
    const newHead = {
        x: Math.max(0, Math.min(WORLD_SIZE, head.x + Math.cos(bot.angle)*bot.speed)),
        y: Math.max(0, Math.min(WORLD_SIZE, head.y + Math.sin(bot.angle)*bot.speed))
    };
    bot.snake.unshift(newHead);
    bot.snake.pop();
    
    // bot eats food too
    for (let i = s2Foods.length - 1; i >= 0; i--) {
        const f = s2Foods[i];
        if (Math.hypot(newHead.x - f.x, newHead.y - f.y) < 12) {
            s2Foods.splice(i, 1);
            s2SpawnFood();
            const tail = bot.snake[bot.snake.length - 1];
            for (let g = 0; g < 3; g++) bot.snake.push({ x: tail.x, y: tail.y });
        }
    }
    for (let i = s2BigFoods.length - 1; i >= 0; i--) {
        const f = s2BigFoods[i];
        if (Math.hypot(newHead.x - f.x, newHead.y - f.y) < 14) {
            s2BigFoods.splice(i, 1);
            s2SpawnBigFood();
            const tail = bot.snake[bot.snake.length - 1];
            for (let g = 0; g < 10; g++) bot.snake.push({ x: tail.x, y: tail.y });
        }
    }
    // collision/death check
    const botThicknessForCollision = Math.min(24 + bot.snake.length * 0.05, 60);
    let killedByPlayer = false;
    for (let i = 5; i < s2Snake.length; i++) {
        const seg = s2Snake[i];
        if (Math.hypot(newHead.x - seg.x, newHead.y - seg.y) < botThicknessForCollision/2 + 10) {
            killedByPlayer = true;
            break;
        }
    }
    if (killedByPlayer || s2CheckHeadCollision(newHead.x, newHead.y, botThicknessForCollision, bot.id)) {
        s2DropFoodTrail(bot.snake);
        bot.alive = false;
        if (killedByPlayer) s2PlayerKills++;
        return;
    }
}

function s2CheckHeadCollision(headX, headY, headThickness, excludeSelf) {
    // check against player
    if (!excludeSelf || excludeSelf !== 'player') {
        for (let i = 5; i < s2Snake.length; i++) { // skip first few segments near own head
            const seg = s2Snake[i];
            if (Math.hypot(headX - seg.x, headY - seg.y) < headThickness/2 + 10) {
                return true;
            }
        }
    }
    // check against all bots
    for (const bot of s2Bots) {
        if (!bot.alive) continue;
        if (excludeSelf === bot.id) continue;
        const botHead = bot.snake[0];
        if (Math.hypot(headX - botHead.x, headY - botHead.y) > 300) continue; // quick distance cull
        for (let i = 3; i < bot.snake.length; i += 3) { // skip near-head segments, check every other
            const seg = bot.snake[i];
            if (Math.hypot(headX - seg.x, headY - seg.y) < headThickness/2 + 10) {
                return true;
            }
        }
    }
    return false;
}

document.querySelector('#s2RestartBtn').addEventListener('click', () => {
    document.querySelector('#s2GameoverPopup').classList.add('hidden');
    s2PlayerKills = 0;
    initSnake2();
});

document.querySelector('#s2HomeBtn').addEventListener('click', () => {
    document.querySelector('#s2GameoverPopup').classList.add('hidden');
    document.querySelector('#snake2container').classList.add('hidden');
    document.querySelector('#homescreen').classList.remove('hidden');
});