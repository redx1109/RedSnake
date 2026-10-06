function s2CreateBot(id) {
    let startX, startY;
    do {   // never spawn near the player or another bot
        startX = 300 + Math.random() * (WORLD_SIZE - 600);
        startY = 300 + Math.random() * (WORLD_SIZE - 600);
    } while ((s2Snake.length && Math.hypot(startX - s2Snake[0].x, startY - s2Snake[0].y) < 900)
          || s2Bots.some(b => b.alive && Math.hypot(startX - b.snake[0].x, startY - b.snake[0].y) < 350));
    const angle = Math.random() * Math.PI * 2;
    const len = 15 + Math.floor(Math.random() * 60);
    const trail = [];
    for (let i = 0; i < len; i++) {   // body trails BEHIND the head
        trail.push({ x: startX - Math.cos(angle) * i * 6, y: startY - Math.sin(angle) * i * 6 });
    }
    return {
        id,
        snake: trail,
        angle,
        speed: 2 + Math.random() * 0.8,
        color: ['#9AC606','#06C6C6','#C60676','#C6A006'][Math.floor(Math.random()*4)],
        alive: true,
        name: 'Bot' + id,
    };
}

function s2InitBots() {
    s2Bots = [];
    for (let i = 0; i < S2_BOT_COUNT; i++) {
        s2Bots.push(s2CreateBot(i));
    }
}

function s2BotDanger(x, y, botId, r) {
    const cx = Math.floor(x / S2_CELL), cy = Math.floor(y / S2_CELL);
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const cell = s2Grid.get(gx * 1000 + gy);
            if (!cell) continue;
            for (const it of cell) {
                if (it.owner !== botId && Math.hypot(x - it.x, y - it.y) < r) return true;
            }
        }
    }
    return false;
}

// false if the food sits inside the bot's turning circle (it would orbit it forever)
function s2BotCanReach(bot, head, f, R) {
    const c = Math.cos(bot.angle), s = Math.sin(bot.angle);
    const rx = f.x - head.x, ry = f.y - head.y;
    const fwd = rx * c + ry * s, lat = -rx * s + ry * c;
    return Math.hypot(fwd, lat - R) > R * 0.85 && Math.hypot(fwd, lat + R) > R * 0.85;
}

function s2CoastBot(bot) {
    const h = bot.snake[0];
    if (h.x < 150 || h.y < 150 || h.x > WORLD_SIZE - 150 || h.y > WORLD_SIZE - 150)
        bot.angle = Math.atan2(WORLD_SIZE/2 - h.y, WORLD_SIZE/2 - h.x);   // turn back inward
    else if (Math.random() < 0.02) bot.angle += (Math.random() - 0.5);
    bot.steerA = bot.angle;
    bot.snake.unshift({ x: h.x + Math.cos(bot.angle) * bot.speed, y: h.y + Math.sin(bot.angle) * bot.speed });
    bot.snake.pop();
}

function s2UpdateBot(bot) {
    if (!bot.alive) return;
    bot.age = (bot.age || 0) + 1;
    const head = bot.snake[0];
    const baseTurn = Math.max(0.025, 0.06 - bot.snake.length * 0.00005);
    const R = bot.speed / baseTurn;                       // turning radius in px
    const thick = Math.min(24 + bot.snake.length * 0.05, 60);
    const tick = bot.age + bot.id;                        // staggers work between bots

    // 1) food target: sticky, only reachable + safe food
    if (bot.breakout > 0) bot.breakout--;
    if (bot.target && !s2Foods.includes(bot.target) && !s2BigFoods.includes(bot.target)) bot.target = null;
    if (bot.target && tick % 20 === 0) {
        const t = bot.target;
        if (!s2BotCanReach(bot, head, t, R) || s2BotDanger(t.x, t.y, bot.id, 60)) bot.target = null;
    }
    if (!bot.target && !(bot.breakout > 0) && tick % 5 === 0) {
        let best = null, bestScore = 700;
        const consider = (f, bonus) => {
            if (f === bot.badTarget && bot.age < bot.badUntil) return;
            if (f.x < 120 || f.y < 120 || f.x > WORLD_SIZE - 120 || f.y > WORLD_SIZE - 120) return;   // skip wall food
            const cl = f.claim;   // someone else already going for it? pick another
            if (cl !== undefined && cl !== bot.id && s2Bots[cl] && s2Bots[cl].alive && s2Bots[cl].target === f) return;
            const score = Math.hypot(head.x - f.x, head.y - f.y) - bonus + Math.random() * 120;
            if (score < bestScore && s2BotCanReach(bot, head, f, R) && !s2BotDanger(f.x, f.y, bot.id, 60)) { best = f; bestScore = score; }
        };
        s2Foods.forEach(f => consider(f, 0));
        s2BigFoods.forEach(f => consider(f, 200));
        bot.target = best;
        if (best) best.claim = bot.id;
    }

    // 2) where do we WANT to go
    let desired;
    if (bot.target) {
        desired = Math.atan2(bot.target.y - head.y, bot.target.x - head.x);
    } else {
        if (!(bot.wanderTimer > 0)) {
            bot.wanderAngle = bot.angle + (Math.random() - 0.5) * 1.5;
            bot.wanderTimer = 40 + Math.random() * 60;
        }
        bot.wanderTimer--;
        desired = bot.wanderAngle;
    }

    // 3) feelers: test headings around 'desired', take the safest one closest to it
    if (tick % 3 === 0) for (let i = s2Foods.length - 1; i >= 0; i--) {
        const look = [R * 0.8 + 20, R * 1.6 + 20, R * 2.6 + 20];
        const safeR = thick / 2 + 16;
        let bestA = desired, bestScore = -Infinity;
        for (const off of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2, Math.PI]) {
            const a = desired + off;
            let danger = 0;
            for (let i = 0; i < 3; i++) {
                const px = head.x + Math.cos(a) * look[i], py = head.y + Math.sin(a) * look[i];
                if (px < 40 || py < 40 || px > WORLD_SIZE - 40 || py > WORLD_SIZE - 40 || s2BotDanger(px, py, bot.id, safeR)) danger += 3 - i;
            }
            const turnCost = Math.abs(Math.atan2(Math.sin(a - bot.angle), Math.cos(a - bot.angle)));
            const score = -danger * 10 - Math.abs(off) - turnCost * 0.3;
            if (score > bestScore) { bestScore = score; bestA = a; }
        }
        bot.steerA = bestA;
    }

    // 4) turn (same limited rate as the player)
    let diff = bot.steerA - bot.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = Math.max(-baseTurn, Math.min(baseTurn, diff));
    bot.angle += turn;

    // 5) anti-circling: lots of one-way turning with no result = break out straight
    bot.spin = (bot.spin || 0) * 0.998 + turn;
    if (Math.abs(bot.spin) > 7) {
        bot.spin = 0;
        bot.badTarget = bot.target; bot.badUntil = bot.age + 600;
        bot.target = null;
        bot.breakout = 90;
        bot.wanderAngle = bot.angle; bot.wanderTimer = 90;
    }

    const newHead = {
        x: Math.max(0, Math.min(WORLD_SIZE, head.x + Math.cos(bot.angle)*bot.speed)),
        y: Math.max(0, Math.min(WORLD_SIZE, head.y + Math.sin(bot.angle)*bot.speed))
    };
    bot.snake.unshift(newHead);
    bot.snake.pop();

    s2GridAdd(newHead.x, newHead.y, bot.id);

    // bot eats food too
    for (let i = s2Foods.length - 1; i >= 0; i--) {
        const f = s2Foods[i];
        if (Math.hypot(newHead.x - f.x, newHead.y - f.y) < thick / 2 + 6) {
            s2Foods.splice(i, 1);
            s2SpawnFood();
            const tail = bot.snake[bot.snake.length - 1];
            for (let g = 0; g < 3; g++) bot.snake.push({ x: tail.x, y: tail.y });
        }
    }
    for (let i = s2BigFoods.length - 1; i >= 0; i--) {
        const f = s2BigFoods[i];
        if (Math.hypot(newHead.x - f.x, newHead.y - f.y) <  thick / 2 + 10) {
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
            const cell = s2Grid.get(gx*1000+gy);
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
        if (killedByPlayer) { s2PlayerKills++; s2LastKillTime = Date.now(); s2ShowKillToast(bot.name); }
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
            if (bot.ringHasPlayer) { s2PlayerKills++; s2LastKillTime = Date.now(); s2ShowKillToast(bot.name, true); }
        }
    });
}

function s2ShowKillToast(name, trapped) {
    const el = document.querySelector('#s2KillToast');
    el.textContent = trapped ? `Trapped ${name}!` : `Eliminated ${name}!`;
    el.classList.remove('hidden');
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(window.s2ToastTimer);
    window.s2ToastTimer = setTimeout(() => el.classList.add('hidden'), 1800);
}

function s2IsBotEncircled(bot) {
    const head = bot.snake[0];
    const radius = 150;
    const bins = 12;
    const covered = new Array(bins).fill(false);
    bot.ringHasPlayer = false;
    const cx = Math.floor(head.x/S2_CELL), cy = Math.floor(head.y/S2_CELL);
    const span = Math.ceil(radius/S2_CELL);
    for (let gx = cx-span; gx <= cx+span; gx++) {
        for (let gy = cy-span; gy <= cy+span; gy++) {
            const cell = s2Grid.get(gx*1000+gy);
            if (!cell) continue;
            for (const item of cell) {
                if (item.owner === bot.id) continue; 
                const dx = item.x - head.x, dy = item.y - head.y;
                if (Math.hypot(dx, dy) < radius) {
                    if (item.owner === 'player') bot.ringHasPlayer = true;
                    const bin = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2*Math.PI)) * bins) % bins;
                    covered[bin] = true;
                }
            }
        }
    }
    return covered.every(c => c);
}
