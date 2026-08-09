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
        grad.addColorStop(0, f.color);
        grad.addColorStop(1, f.color);
        s2ctx.fillStyle = grad;
        s2ctx.shadowColor = f.color;
        s2ctx.shadowBlur = 14;
        s2ctx.beginPath();
        s2ctx.arc(sx, sy, 6, 0, Math.PI*2);
        s2ctx.fill();
        s2ctx.shadowBlur = 0; 
    });
    s2BigFoods.forEach(f => {
        const sx = f.x - s2CameraX, sy = f.y - s2CameraY;
        if (sx < -20 || sx > s2canvas.width+20 || sy < -20 || sy > s2canvas.height+20) return;
        const grad = s2ctx.createRadialGradient(sx+2, sy+2, 1, sx, sy, 10);
        grad.addColorStop(0, f.color);
        grad.addColorStop(1, f.color);
        s2ctx.fillStyle = grad;
        s2ctx.shadowColor = f.color;
        s2ctx.shadowBlur = 10;
        s2ctx.beginPath();
        s2ctx.arc(sx, sy, 10, 0, Math.PI*2);
        s2ctx.fill();
        s2ctx.shadowBlur = 0; 
    });
    s2Bots.forEach(bot => {
        if (!bot.alive) return;
        const bStart = hexToRgb(bot.color);
        const botThicknessNow = Math.min(24 + bot.snake.length * 0.05, 60);
        const botStep = bot.snake.length > 200 ? 4 : 2;
        for (let i = bot.snake.length - 1; i >= 0; i -= botStep) {
            const sx = bot.snake[i].x - s2CameraX;
            const sy = bot.snake[i].y - s2CameraY;
            if (sx < -30 || sx > s2canvas.width+30 || sy < -30 || sy > s2canvas.height+30) continue;
            const t = i / bot.snake.length;
            const br = Math.round(bStart.r*(1-t*0.35)), bg = Math.round(bStart.g*(1-t*0.35)), bb = Math.round(bStart.b*(1-t*0.35));
            const bGrad = s2ctx.createRadialGradient(sx-botThicknessNow*0.15, sy-botThicknessNow*0.15, 1, sx, sy, botThicknessNow/2);
            bGrad.addColorStop(0, `rgb(${Math.min(255,br+40)},${Math.min(255,bg+40)},${Math.min(255,bb+40)})`);
            bGrad.addColorStop(1, `rgb(${br},${bg},${bb})`);
            s2ctx.fillStyle = bGrad;
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

    const drawStep = s2Snake.length > 200 ? 3 : 1;
    for (let i = s2Snake.length - 1; i >= 0; i -= drawStep) {
        const t = i / s2Snake.length;
        const r = Math.round(start.r * (1 - t*0.35));
        const g = Math.round(start.g * (1 - t*0.35));
        const b = Math.round(start.b * (1 - t*0.35));
        const sx = s2Snake[i].x - s2CameraX, sy = s2Snake[i].y - s2CameraY;
        const grad = s2ctx.createRadialGradient(sx-thickness*0.15, sy-thickness*0.15, 1, sx, sy, thickness/2);
        grad.addColorStop(0, `rgb(${Math.min(255,r+40)},${Math.min(255,g+40)},${Math.min(255,b+40)})`);
        grad.addColorStop(1, `rgb(${r},${g},${b})`);
        s2ctx.fillStyle = grad;
        s2ctx.beginPath();
        s2ctx.arc(sx, sy, thickness/2, 0, Math.PI*2);
        s2ctx.fill();
        s2ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        s2ctx.lineWidth = 1;
        s2ctx.stroke();
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
    if (s2Mode === 'battleroyale') {
        const zx = s2ZoneCenter.x - s2CameraX, zy = s2ZoneCenter.y - s2CameraY;
        s2ctx.strokeStyle = 'rgba(255,60,60,0.6)';
        s2ctx.lineWidth = 6;
        s2ctx.beginPath();
        s2ctx.arc(zx, zy, s2ZoneRadius, 0, Math.PI*2);
        s2ctx.stroke();
    }
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
