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

        const lcx = Math.floor(lookX/S2_CELL), lcy = Math.floor(lookY/S2_CELL);
        outer:
        for (let gx = lcx-1; gx <= lcx+1; gx++) {
            for (let gy = lcy-1; gy <= lcy+1; gy++) {
                const cell = s2Grid.get(gx+','+gy);
                if (!cell) continue;
                for (const item of cell) {
                    if (item.owner === bot.id) continue;
                    if (checkDanger(item.x, item.y)) { avoiding = true; break outer; }
                }
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
    const baseTurn = Math.max(0.05, S2_MAX_TURN_RATE - (bot.snake.length * 0.0004));
    const maxTurn = avoiding ? baseTurn * 1.8 : baseTurn;
    const clampedDiff = Math.max(-maxTurn, Math.min(maxTurn, diff));
    bot.angle += clampedDiff;

    const newHead = {
        x: Math.max(0, Math.min(WORLD_SIZE, head.x + Math.cos(bot.angle)*bot.speed)),
        y: Math.max(0, Math.min(WORLD_SIZE, head.y + Math.sin(bot.angle)*bot.speed))
    };
    bot.snake.unshift(newHead);
    bot.snake.pop();

    const k = Math.floor(newHead.x/S2_CELL)+','+Math.floor(newHead.y/S2_CELL);
    if (!s2Grid.has(k)) s2Grid.set(k, []);
    s2Grid.get(k).push({x: newHead.x, y: newHead.y, owner: bot.id});

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
    const kcx = Math.floor(newHead.x/S2_CELL), kcy = Math.floor(newHead.y/S2_CELL);
    outerK:
    for (let gx = kcx-1; gx <= kcx+1; gx++) {
        for (let gy = kcy-1; gy <= kcy+1; gy++) {
            const cell = s2Grid.get(gx+','+gy);
            if (!cell) continue;
            for (const item of cell) {
                if (item.owner !== 'player') continue;
                if (Math.hypot(newHead.x - item.x, newHead.y - item.y) < botThicknessForCollision/2 + 10) { killedByPlayer = true; break outerK; }
            }
        }
    }
    if (killedByPlayer || s2CheckHeadCollision(newHead.x, newHead.y, botThicknessForCollision, bot.id)) {
        s2DropFoodTrail(bot.snake, bot.color);
        bot.alive = false;
        if (killedByPlayer) { s2PlayerKills++; s2LastKillTime = Date.now(); }
        return;
    }
}

function s2CheckEncirclement() {
    s2Bots.forEach(bot => {
        if (!bot.alive) return;
        bot.trapped = s2IsBotEncircled(bot);
        if (bot.trapped) {
            s2DropFoodTrail(bot.snake, bot.color);
            bot.alive = false;
            s2PlayerKills++;
            s2LastKillTime = Date.now();
        }
    });
}

function s2IsBotEncircled(bot) {
    const head = bot.snake[0];
    const radius = 150;
    const bins = 12;
    const covered = new Array(bins).fill(false);
    const cx = Math.floor(head.x/S2_CELL), cy = Math.floor(head.y/S2_CELL);
    const span = Math.ceil(radius/S2_CELL);
    for (let gx = cx-span; gx <= cx+span; gx++) {
        for (let gy = cy-span; gy <= cy+span; gy++) {
            const cell = s2Grid.get(gx+','+gy);
            if (!cell) continue;
            for (const item of cell) {
                if (item.owner === bot.id) continue; 
                const dx = item.x - head.x, dy = item.y - head.y;
                if (Math.hypot(dx, dy) < radius) {
                    const bin = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2*Math.PI)) * bins) % bins;
                    covered[bin] = true;
                }
            }
        }
    }
    return covered.every(c => c);
}
