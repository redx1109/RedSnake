// RedSnake animated menu background:
// crisp glowing orbs + tiny snakes that wander, chase the orbs and grow.
// Touch/mouse pushes orbs away; a tap drops a burst of food the snakes rush to eat.
(() => {
    const c = document.createElement('canvas');
    c.id = 'bgfx';
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
    document.body.prepend(c);
    const g = c.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);   // sharp on phones

    const colors = ['#9AC606', '#FA3604', '#7ADFFF', '#FFE55C', '#B07CFF'];
    const sprites = colors.map(col => {                       // solid core + soft halo
        const s = document.createElement('canvas');
        s.width = s.height = 64;
        const x = s.getContext('2d');
        const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, col);
        gr.addColorStop(0.3, col);
        gr.addColorStop(0.42, col + '99');
        gr.addColorStop(1, col + '00');
        x.fillStyle = gr;
        x.fillRect(0, 0, 64, 64);
        return s;
    });

    let W = 0, H = 0, mx = -999, my = -999;
    function resize() {
        W = innerWidth; H = innerHeight;
        c.width = W * DPR; c.height = H * DPR;
        g.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    addEventListener('resize', resize);

    // ---------- orbs (food) ----------
    const P = [];
    function orb(fromBottom) {
        return {
            x: Math.random() * W,
            y: fromBottom ? H + 30 : Math.random() * H,
            vx: (Math.random() - 0.5) * 0.25,
            vy: -(0.15 + Math.random() * 0.35),
            r: 7 + Math.random() * 9,
            s: Math.floor(Math.random() * sprites.length),
            a: 0.55 + Math.random() * 0.4,
            life: Infinity
        };
    }
    for (let i = 0; i < 34; i++) P.push(orb(false));

    // ---------- little snakes ----------
    const SP = 9;                                             // segment spacing
    const snakes = [];
    function makeSnake(i) {
        const x = Math.random() * W, y = Math.random() * H;
        const seg = [];
        for (let k = 0; k < 14; k++) seg.push({ x, y });
        return { seg, ang: Math.random() * 6.28, spd: 0.9 + Math.random() * 0.6, th: 12 + Math.random() * 6,
                 col: colors[i % colors.length], grow: 0, ph: Math.random() * 10 };
    }
    for (let i = 0; i < 4; i++) snakes.push(makeSnake(i));

    function turnToward(s, tx, ty, amt) {
        const h = s.seg[0];
        let d = Math.atan2(ty - h.y, tx - h.x) - s.ang;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        s.ang += Math.max(-amt, Math.min(amt, d));
    }

    function moveSnake(s, k, t) {
        const h = s.seg[0];
        let best = null, bd = 240 * 240;                      // nearest orb in sight
        for (const p of P) {
            const d2 = (p.x - h.x) ** 2 + (p.y - h.y) ** 2;
            if (d2 < bd && p.y > 0 && p.y < H) { bd = d2; best = p; }
        }
        if (h.x < 70 || h.x > W - 70 || h.y < 70 || h.y > H - 70) turnToward(s, W / 2, H / 2, 0.07 * k);
        else if (best) turnToward(s, best.x, best.y, 0.06 * k);
        else s.ang += (Math.sin(t * 0.0012 + s.ph) * 0.03 + (Math.random() - 0.5) * 0.08) * k;

        h.x += Math.cos(s.ang) * s.spd * k;
        h.y += Math.sin(s.ang) * s.spd * k;

        if (best && bd < (s.th + best.r) ** 2 * 0.6) {        // ate it!
            if (best.life === Infinity) P[P.indexOf(best)] = orb(true); else P.splice(P.indexOf(best), 1);
            s.grow += 2;
        }
        if (s.grow > 0 && s.seg.length < 34) {
            const l = s.seg[s.seg.length - 1];
            s.seg.push({ x: l.x, y: l.y });
            s.grow--;
        }
        for (let i = 1; i < s.seg.length; i++) {              // body follows head
            const a = s.seg[i - 1], b = s.seg[i];
            const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
            b.x = a.x + dx / d * SP;
            b.y = a.y + dy / d * SP;
        }
    }

    function drawSnake(s) {
        g.lineJoin = g.lineCap = 'round';
        g.beginPath();
        s.seg.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
        g.strokeStyle = s.col;
        g.globalAlpha = 0.28;
        g.lineWidth = s.th;
        g.stroke();
        g.globalAlpha = 0.18;                                 // lighter core = a bit of depth
        g.strokeStyle = '#ffffff';
        g.lineWidth = s.th * 0.3;
        g.stroke();
        const h = s.seg[0], dx = Math.cos(s.ang), dy = Math.sin(s.ang);
        g.globalAlpha = 0.85;
        g.fillStyle = '#16181c';
        for (const sg of [1, -1]) {                           // eyes
            g.beginPath();
            g.arc(h.x + dx * s.th * 0.2 - dy * s.th * 0.26 * sg, h.y + dy * s.th * 0.2 + dx * s.th * 0.26 * sg, s.th * 0.13, 0, 6.28);
            g.fill();
        }
        g.globalAlpha = 1;
    }

    // ---------- input ----------
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
    addEventListener('pointerleave', () => { mx = my = -999; });
    addEventListener('pointerdown', e => {                    // tap = burst of food
        for (let i = 0; i < 8; i++) {
            const a = Math.random() * 6.28, sp = 1 + Math.random() * 2;
            P.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                     r: 6 + Math.random() * 6, s: Math.floor(Math.random() * sprites.length), a: 0.95, life: 120 });
        }
    });

    function gameOn() {
        const a = document.querySelector('#gamecontainer'), b = document.querySelector('#snake2container');
        return (a && !a.classList.contains('hidden')) || (b && !b.classList.contains('hidden'));
    }

    let last = 0;
    function frame(t) {
        requestAnimationFrame(frame);
        const k = Math.min((t - last) / 16.7, 2.5) || 1;      // same speed on 60Hz and 120Hz
        last = t;
        if (document.hidden || gameOn()) return;
        g.clearRect(0, 0, W, H);

        for (let i = P.length - 1; i >= 0; i--) {
            const p = P[i];
            const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
            if (d2 < 14400 && d2 > 1) {                       // finger/mouse pushes orbs away
                const d = Math.sqrt(d2), f = (120 - d) / 120 * 1.4 * k;
                p.x += dx / d * f;
                p.y += dy / d * f;
            }
            p.x += p.vx * k;
            p.y += p.vy * k;
            let alpha = p.a;
            if (p.life !== Infinity) {                        // burst food slows down, then fades
                p.life -= k;
                p.vx *= 0.95;
                p.vy *= 0.95;
                alpha *= Math.min(1, p.life / 40);
                if (p.life <= 0) { P.splice(i, 1); continue; }
            } else if (p.y < -40 || p.x < -40 || p.x > W + 40) {
                P[i] = orb(true);
                continue;
            }
            g.globalAlpha = alpha;
            g.drawImage(sprites[p.s], p.x - p.r * 1.6, p.y - p.r * 1.6, p.r * 3.2, p.r * 3.2);
        }
        g.globalAlpha = 1;
        snakes.forEach(s => { moveSnake(s, k, t); drawSnake(s); });
    }
    requestAnimationFrame(frame);
})();