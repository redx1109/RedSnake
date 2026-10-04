// RedSnake animated menu background v3:
// glowing orbs + little snakes that look like the real game snakes
// (2 "classic" block snakes on a grid, 3 "Snake 2.0" smooth snakes).
// They chase orbs and grow. If a head touches another snake's body it dies,
// drops its body as food for the others, and respawns a moment later.
// Touch/mouse pushes orbs away; a tap drops a burst of food.
(() => {
    const c = document.createElement('canvas');
    c.id = 'bgfx';
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
    document.body.prepend(c);
    const g = c.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const BG = '#16181c';
    const colors = ['#9AC606', '#FA3604', '#7ADFFF', '#FFE55C', '#B07CFF'];
    const hexrgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

    const sprites = colors.map(col => {
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
            x: Math.random() * W, y: fromBottom ? H + 30 : Math.random() * H,
            vx: (Math.random() - 0.5) * 0.25, vy: -(0.15 + Math.random() * 0.35),
            r: 7 + Math.random() * 9, s: Math.floor(Math.random() * sprites.length),
            a: 0.55 + Math.random() * 0.4, life: Infinity
        };
    }
    for (let i = 0; i < 34; i++) P.push(orb(false));

    function nearestOrb(x, y, maxd) {
        let best = null, bd = maxd * maxd;
        for (const p of P) {
            const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
            if (d2 < bd && p.y > 0 && p.y < H) { bd = d2; best = p; }
        }
        return best;
    }
    function eatNear(s, x, y, rad) {
        for (let i = 0; i < P.length; i++) {
            const p = P[i];
            if ((p.x - x) ** 2 + (p.y - y) ** 2 < (rad + p.r * 0.3) ** 2) {
                if (p.life === Infinity) P[i] = orb(true); else P.splice(i, 1);
                s.grow += 2;
                return;
            }
        }
    }

    // ---------- snakes ----------
    const TYPES = ['c', 's', 'c', 's', 's'];
    const snakes = [];

    function make(i) {
        const ci = i % colors.length, col = colors[ci];
        if (TYPES[i] === 'c') {                                   // classic: grid + block segments
            const cs = W < 600 ? 18 : 24;
            const D = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
            const dir = D[Math.floor(Math.random() * 4)];
            const gx = 4 + Math.floor(Math.random() * Math.max(1, W / cs - 8));
            const gy = 4 + Math.floor(Math.random() * Math.max(1, H / cs - 8));
            const cells = [];
            for (let k = 0; k < 7; k++) cells.push({ x: gx - dir.x * k, y: gy - dir.y * k });
            return { type: 'c', ci, col, cs, cells, prev: cells.map(q => ({ ...q })), dir, acc: 0,
                     tick: 140 + Math.random() * 30, grow: 0, dead: false, safe: 90, skill: Math.random() };
        }
        const x = 80 + Math.random() * Math.max(1, W - 160), y = 80 + Math.random() * Math.max(1, H - 160);
        const seg = [];
        for (let k = 0; k < 12; k++) seg.push({ x, y });
        return { type: 's', ci, col, seg, ang: Math.random() * 6.28, spd: 0.9 + Math.random() * 0.6,
                 th: 18 + Math.random() * 4, grow: 0, ph: Math.random() * 10, dead: false, safe: 90, skill: Math.random() };
    }
    for (let i = 0; i < TYPES.length; i++) snakes.push(make(i));

    // --- classic (grid) ---
    function classicPts(s) {
        const t = Math.min(s.acc / s.tick, 1), cs = s.cs;
        return s.cells.map((q, i) => {
            const p = s.prev[i] || q;
            return { x: (p.x + (q.x - p.x) * t) * cs + cs / 2, y: (p.y + (q.y - p.y) * t) * cs + cs / 2 };
        });
    }
    function pickDir(s) {
        const D = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
        const i = D.findIndex(d => d.x === s.dir.x && d.y === s.dir.y);
        const cands = [D[i], D[(i + 1) % 4], D[(i + 3) % 4]];
        const h = s.cells[0], cs = s.cs, px = h.x * cs + cs / 2, py = h.y * cs + cs / 2;
        const target = nearestOrb(px, py, 260);
        const foes = s.skill > 0.45 ? snakes.filter(o => o !== s && !o.dead).flatMap(ptsOf) : [];  // skilled snakes dodge
        let best = cands[0], bs = -1e9;
        for (const d of cands) {
            const nx = h.x + d.x, ny = h.y + d.y, npx = nx * cs + cs / 2, npy = ny * cs + cs / 2;
            let sc = Math.random() * 0.6 + (d === cands[0] ? 0.5 : 0);
            if (foes.some(q => (q.x - npx) ** 2 + (q.y - npy) ** 2 < (cs * 1.1) ** 2)) sc -= 50;
            if (npx < 20 || npx > W - 20 || npy < 20 || npy > H - 20) sc -= 100;
            if (s.cells.some(q => q.x === nx && q.y === ny)) sc -= 100;
            if (target) sc += (Math.hypot(px - target.x, py - target.y) - Math.hypot(npx - target.x, npy - target.y)) * 0.05;
            if (sc > bs) { bs = sc; best = d; }
        }
        s.dir = best;
    }
    function stepClassic(s, dtms) {
        s.acc += dtms;
        while (s.acc >= s.tick) {
            s.acc -= s.tick;
            s.prev = s.cells.map(q => ({ x: q.x, y: q.y }));
            pickDir(s);
            const h = s.cells[0];
            s.cells.unshift({ x: h.x + s.dir.x, y: h.y + s.dir.y });
            if (s.grow > 0 && s.cells.length < 22) s.grow--; else s.cells.pop();
        }
        const hp = classicPts(s)[0];
        eatNear(s, hp.x, hp.y, s.cs * 0.8);
    }
    function drawClassic(s) {
        const pts = classicPts(s), n = pts.length, cs = s.cs, col = hexrgb(s.col);
        g.lineWidth = 2;
        g.strokeStyle = BG;
        for (let i = n - 1; i >= 0; i--) {                        // tail first, head on top
            const t = n > 1 ? i / (n - 1) : 0, k = 1 - 0.2 * t;
            g.fillStyle = `rgb(${col[0] * k | 0},${col[1] * k | 0},${col[2] * k | 0})`;
            g.beginPath();
            g.roundRect(pts[i].x - cs / 2, pts[i].y - cs / 2, cs, cs, 5);
            g.fill();
            g.stroke();
        }
        const h = pts[0], d = s.dir, ppx = -d.y, ppy = d.x;
        g.fillStyle = '#111';
        for (const sg of [1, -1]) {
            g.beginPath();
            g.arc(h.x + d.x * cs * 0.2 + ppx * cs * 0.22 * sg, h.y + d.y * cs * 0.2 + ppy * cs * 0.22 * sg, cs * 0.1, 0, 6.28);
            g.fill();
        }
        if (Math.floor(Date.now() / 300) % 2 === 0) {             // tongue flick like the game
            const bx = h.x + d.x * cs * 0.5, by = h.y + d.y * cs * 0.5;
            const tx = h.x + d.x * cs * 0.75, ty = h.y + d.y * cs * 0.75;
            g.strokeStyle = '#FA3604';
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(bx, by); g.lineTo(tx, ty);
            g.moveTo(tx, ty); g.lineTo(tx + d.x * cs * 0.15 + ppx * cs * 0.12, ty + d.y * cs * 0.15 + ppy * cs * 0.12);
            g.moveTo(tx, ty); g.lineTo(tx + d.x * cs * 0.15 - ppx * cs * 0.12, ty + d.y * cs * 0.15 - ppy * cs * 0.12);
            g.stroke();
        }
    }

    // --- Snake 2.0 style (smooth) ---
    const SP = 9;
    function turnToward(s, tx, ty, amt) {
        const h = s.seg[0];
        let d = Math.atan2(ty - h.y, tx - h.x) - s.ang;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        s.ang += Math.max(-amt, Math.min(amt, d));
    }
    function stepSmooth(s, k, t) {
        const h = s.seg[0], best = nearestOrb(h.x, h.y, 240);
        let danger = null;                                        // skilled snakes steer away from other bodies
        if (s.skill > 0.45) {
            let dd = (s.th * 3.2) ** 2;
            for (const o of snakes) {
                if (o === s || o.dead) continue;
                const op = ptsOf(o);
                for (let j = 1; j < op.length; j++) {
                    const d2 = (op[j].x - h.x) ** 2 + (op[j].y - h.y) ** 2;
                    if (d2 < dd) { dd = d2; danger = op[j]; }
                }
            }
        }
        if (h.x < 70 || h.x > W - 70 || h.y < 70 || h.y > H - 70) turnToward(s, W / 2, H / 2, 0.07 * k);
        else if (danger) turnToward(s, h.x + (h.x - danger.x), h.y + (h.y - danger.y), 0.12 * k);
        else if (best) turnToward(s, best.x, best.y, 0.06 * k);
        else s.ang += (Math.sin(t * 0.0012 + s.ph) * 0.03 + (Math.random() - 0.5) * 0.08) * k;
        h.x += Math.cos(s.ang) * s.spd * k;
        h.y += Math.sin(s.ang) * s.spd * k;
        eatNear(s, h.x, h.y, s.th * 0.8);
        if (s.grow > 0 && s.seg.length < 34) {
            const l = s.seg[s.seg.length - 1];
            s.seg.push({ x: l.x, y: l.y });
            s.grow--;
        }
        for (let i = 1; i < s.seg.length; i++) {
            const a = s.seg[i - 1], b = s.seg[i];
            const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
            b.x = a.x + dx / d * SP;
            b.y = a.y + dy / d * SP;
        }
    }
    function drawSmooth(s) {
        g.lineJoin = g.lineCap = 'round';
        g.beginPath();
        s.seg.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
        g.strokeStyle = BG;                                       // dark outline, then colour (same as Snake 2.0)
        g.lineWidth = s.th + 4;
        g.stroke();
        g.strokeStyle = s.col;
        g.lineWidth = s.th;
        g.stroke();
        const h = s.seg[0], dx = Math.cos(s.ang), dy = Math.sin(s.ang), px = -dy, py = dx;
        g.fillStyle = '#111';
        for (const sg of [1, -1]) {
            g.beginPath();
            g.arc(h.x + dx * s.th * 0.17 + px * s.th * 0.17 * sg, h.y + dy * s.th * 0.17 + py * s.th * 0.17 * sg, s.th * 0.1, 0, 6.28);
            g.fill();
        }
    }

    // --- collisions: head touches another snake's body = dead ---
    const ptsOf = s => s.type === 'c' ? classicPts(s) : s.seg;
    const radOf = s => s.type === 'c' ? s.cs / 2 : s.th / 2;
    function kill(s) {
        ptsOf(s).forEach((p, i) => {                              // body turns into food
            if (i % 2) return;
            P.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
                     r: 6 + Math.random() * 5, s: s.ci, a: 0.95, life: 700 });
        });
        s.dead = true;
        s.wait = 150 + Math.random() * 150;
    }
    function checkDeaths() {
        const alive = snakes.filter(s => !s.dead);
        const pts = new Map(alive.map(s => [s, ptsOf(s)]));
        const doomed = new Set();
        for (const a of alive) {
            if (a.safe > 0) continue;
            const h = pts.get(a)[0], ra = radOf(a);
            for (const b of alive) {
                if (a === b) continue;
                const bp = pts.get(b), lim = (ra + radOf(b)) * 0.8;
                for (let j = 1; j < bp.length; j++) {
                    if ((h.x - bp[j].x) ** 2 + (h.y - bp[j].y) ** 2 < lim * lim) { doomed.add(a); break; }
                }
                if (doomed.has(a)) break;
            }
        }
        doomed.forEach(kill);
    }

    // ---------- input ----------
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
    addEventListener('pointerleave', () => { mx = my = -999; });
    addEventListener('pointerdown', e => {
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
        const dtms = Math.min(t - last, 50) || 16.7;
        last = t;
        const k = dtms / 16.7;
        if (document.hidden || gameOn()) return;
        g.clearRect(0, 0, W, H);

        for (let i = P.length - 1; i >= 0; i--) {
            const p = P[i];
            const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
            if (d2 < 14400 && d2 > 1) {
                const d = Math.sqrt(d2), f = (120 - d) / 120 * 1.4 * k;
                p.x += dx / d * f;
                p.y += dy / d * f;
            }
            p.x += p.vx * k;
            p.y += p.vy * k;
            let alpha = p.a;
            if (p.life !== Infinity) {
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

        g.globalAlpha = 0.6;                                      // snakes sit softly behind the menu
        snakes.forEach((s, i) => {
            if (s.dead) {
                s.wait -= k;
                if (s.wait <= 0) snakes[i] = make(i);
                return;
            }
            if (s.safe > 0) s.safe -= k;
            if (s.type === 'c') { stepClassic(s, dtms); drawClassic(s); }
            else { stepSmooth(s, k, t); drawSmooth(s); }
        });
        g.globalAlpha = 1;
        checkDeaths();
    }
    requestAnimationFrame(frame);
})();
