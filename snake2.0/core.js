function s2SetupMode() {
    clearInterval(s2ZoneShrinkInterval);
    if (s2Mode === 'battleroyale') {
        s2ZoneRadius = WORLD_SIZE * 0.6;
        s2ZoneCenter = { x: WORLD_SIZE/2, y: WORLD_SIZE/2 };
        s2ZoneShrinkInterval = setInterval(() => {
            if (s2ZoneRadius > 250) s2ZoneRadius -= 40;
        }, 4000);
    }
    if (s2Mode === 'timeattack') s2LastKillTime = Date.now();
    if (s2Mode === 'hunt') {
        s2HuntTimeLeft = 600; // 10 minutes
        clearInterval(s2HuntInterval);
        s2HuntInterval = setInterval(() => {
            s2HuntTimeLeft--;
            const el = document.querySelector('#s2TimeNum');
            if (el) el.textContent = s2HuntTimeLeft;
            if (s2HuntTimeLeft <= 0) {
                clearInterval(s2HuntInterval);
                s2Running = false;
                document.exitPointerLock();
                document.querySelector('#s2FinalLength').textContent = s2Snake.length;
                document.querySelector('#s2FinalKills').textContent = s2PlayerKills;
                document.querySelector('#s2GameoverPopup').classList.remove('hidden');
            }
        }, 1000);
    }
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
    if (s2Mode === 'hunt') { s2Foods = []; s2BigFoods = []; }
        else { s2InitFood(); s2InitBigFood(); }
        s2InitBots();
        document.querySelector('#s2TimerDisplay').classList.toggle('hidden', s2Mode !== 'hunt');
        s2SetupBoostButton();
        s2SetupMode();
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
        const turnStrength = Math.abs(clampedTurn) / myTurnRate;
        if (turnStrength > 0.6) s2CircleAmount = Math.min(1, s2CircleAmount + 0.015);
        else s2CircleAmount = Math.max(0, s2CircleAmount - 0.02);
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
    if (s2CircleAmount > 0) {
        for (let i = 1; i < s2Snake.length; i++) {
            const segT = i / s2Snake.length; // near head = weak pull, near tail = strong pull
            const pull = 0.02 * s2CircleAmount * segT;
            s2Snake[i].x += (newHead.x - s2Snake[i].x) * pull;
            s2Snake[i].y += (newHead.y - s2Snake[i].y) * pull;
        }
    }
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
    // --- mode-specific death conditions ---
    if (s2Mode === 'battleroyale') {
        const distFromCenter = Math.hypot(newHead.x - s2ZoneCenter.x, newHead.y - s2ZoneCenter.y);
        if (distFromCenter > s2ZoneRadius && s2Snake.length > 5) {
            s2Snake.pop(); s2Snake.pop(); // shrink fast outside zone
        }
        if (s2Snake.length <= 5) {
            s2Running = false;
            document.exitPointerLock();
            document.querySelector('#s2FinalLength').textContent = s2Snake.length;
            document.querySelector('#s2FinalKills').textContent = s2PlayerKills;
            document.querySelector('#s2GameoverPopup').classList.remove('hidden');
            return;
        }
    }
    if (s2Mode === 'timeattack' && Date.now() - s2LastKillTime > 60000) {
        s2Running = false;
        document.exitPointerLock();
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
    s2CheckEncirclement();
    const aliveBotCount = s2Bots.filter(b => b.alive).length;
    document.querySelector('#s2ScoreNum').textContent = s2Snake.length;
    document.querySelector('#s2AliveNum').textContent = aliveBotCount + 1; // +1 for player
    document.querySelector('#s2KillNum').textContent = s2PlayerKills;
    s2Draw();
    requestAnimationFrame(s2Loop);
}

function s2PointInPolygon(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y;
        const xj = poly[j].x, yj = poly[j].y;
        const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function s2CheckHeadCollision(headX, headY, headThickness, excludeSelf) {
    // check against player
    if (!excludeSelf || excludeSelf !== 'player') {
        for (let i = 15; i < s2Snake.length; i++) { // skip first few segments near own head
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
        if (Math.hypot(headX - botHead.x, headY - botHead.y) > 300) continue;
        for (let i = 3; i < bot.snake.length; i += 3) {
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