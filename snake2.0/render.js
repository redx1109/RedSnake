const s2SpriteCache = new Map();
const S2_MARGIN = 100; // extra area outside the screen
function s2FoodSprite(color, r, blur) {
    const key = color + r;
    let c = s2SpriteCache.get(key);
    if (c) return c;
    const size = (r + 16) * 2;
    c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.shadowColor = color; g.shadowBlur = blur;
    g.fillStyle = color;
    g.beginPath(); g.arc(size / 2, size / 2, r, 0, Math.PI * 2); g.fill();
    s2SpriteCache.set(key, c);
    return c;
}

function s2Draw() {
    s2ctx.fillStyle = '#16181c';
    s2ctx.fillRect(0, 0, s2canvas.width, s2canvas.height);
    drawGridLines(s2ctx, s2canvas.width, s2canvas.height, 40, -s2CameraX, -s2CameraY);
    s2ctx.save();
    s2ctx.translate(s2canvas.width/2, s2canvas.height/2);
    s2ctx.scale(s2Zoom, s2Zoom);
    s2ctx.translate(-s2canvas.width/2, -s2canvas.height/2);

    const thickness = Math.min(24 + s2Snake.length * 0.05, 60); // grows with length, caps at 60
    const start = hexToRgb(snakeHeadColor || '#9AC606');

    s2Foods.forEach(f => {
        const sx = f.x - s2CameraX, sy = f.y - s2CameraY;
        if (sx < -S2_MARGIN || sx > s2canvas.width+S2_MARGIN || sy < -S2_MARGIN || sy > s2canvas.height+S2_MARGIN) return;
        const sp = s2FoodSprite(f.color, 6, 14);
        s2ctx.drawImage(sp, sx - sp.width / 2, sy - sp.height / 2);
    });
    s2BigFoods.forEach(f => {
        const sx = f.x - s2CameraX, sy = f.y - s2CameraY;
        if (sx < -S2_MARGIN || sx > s2canvas.width+S2_MARGIN || sy < -S2_MARGIN || sy > s2canvas.height+S2_MARGIN) return;
        const sp = s2FoodSprite(f.color, 10, 10);
        s2ctx.drawImage(sp, sx - sp.width / 2, sy - sp.height / 2);
    });
    s2Bots.forEach(bot => {
        if (!bot.alive) return;
        const bStart = hexToRgb(bot.color);
        const botThicknessNow = Math.min(24 + bot.snake.length * 0.05, 60);
        s2ctx.save();
        s2ctx.lineJoin = 'round';
        s2ctx.lineCap = 'round';
        let botVisible = false;
        for (let i = 0; i < bot.snake.length; i += 4) {
            const vx = bot.snake[i].x - s2CameraX, vy = bot.snake[i].y - s2CameraY;
            if (vx > -S2_MARGIN && vx < s2canvas.width + S2_MARGIN && vy > -S2_MARGIN && vy < s2canvas.height + S2_MARGIN) { botVisible = true; break; }
        }
        if (!botVisible) { s2ctx.restore(); return; }

        const bDrawStep = bot.snake.length > 150 ? Math.ceil(bot.snake.length/150) : 1;
        s2ctx.beginPath();
        let started = false;
        bot.snake.forEach((p, i) => {
            if (i !== 0 && i !== bot.snake.length-1 && i % bDrawStep !== 0) return;
            const sx = p.x - s2CameraX, sy = p.y - s2CameraY;
            if (sx < -S2_MARGIN || sx > s2canvas.width+S2_MARGIN || sy < -S2_MARGIN || sy > s2canvas.height+S2_MARGIN) { started = false; return; }
            if (!started) { s2ctx.moveTo(sx, sy); started = true; } else { s2ctx.lineTo(sx, sy); }
        });
        s2ctx.strokeStyle = '#16181c';
        s2ctx.lineWidth = botThicknessNow + 4;
        s2ctx.stroke();
        s2ctx.strokeStyle = `rgb(${bStart.r},${bStart.g},${bStart.b})`;
        s2ctx.lineWidth = botThicknessNow;
        s2ctx.stroke();
        s2ctx.restore();
        // eyes on bot head
        const bHead = bot.snake[0];
        const bx = bHead.x - s2CameraX, by = bHead.y - s2CameraY;
        if (bx > -S2_MARGIN && bx < s2canvas.width+S2_MARGIN && by > -S2_MARGIN && by < s2canvas.height+S2_MARGIN) {
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

    s2ctx.save();
    s2ctx.lineJoin = 'round';
    s2ctx.lineCap = 'round';
    const pDrawStep = s2Snake.length > 300 ? Math.ceil(s2Snake.length/300) : 1;
    s2ctx.beginPath();
    s2Snake.forEach((p, i) => {
        if (i !== 0 && i !== s2Snake.length-1 && i % pDrawStep !== 0) return;
        const sx = p.x - s2CameraX, sy = p.y - s2CameraY;
        if (i === 0) s2ctx.moveTo(sx, sy); else s2ctx.lineTo(sx, sy);
    });
    s2ctx.strokeStyle = '#16181c';
    s2ctx.lineWidth = thickness + 4;
    s2ctx.stroke();
    s2ctx.strokeStyle = `rgb(${start.r},${start.g},${start.b})`;
    s2ctx.lineWidth = thickness;
    s2ctx.stroke();
    s2ctx.restore();

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
    if (s2Mode === 'battleroyale') {
        const zx = s2ZoneCenter.x - s2CameraX, zy = s2ZoneCenter.y - s2CameraY;
        s2ctx.strokeStyle = 'rgba(255,60,60,0.6)';
        s2ctx.lineWidth = 6;
        s2ctx.beginPath();
        s2ctx.arc(zx, zy, s2ZoneRadius, 0, Math.PI*2);
        s2ctx.stroke();
    }
    s2ctx.restore();
    s2DrawMinimap();
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
