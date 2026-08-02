window.addEventListener("keydown", changedirection);

window.addEventListener('resize', resizeCanvas);

function resizeCanvas(){
    gameboard.width = gameboard.clientWidth;
    gameboard.height = gameboard.clientHeight;
    const opp = document.querySelector('#oppscreen');
    if (opp) { opp.width = opp.clientWidth; opp.height = opp.clientHeight; }
}

function restartgame(){
    speed = 125;
    score = 0;
    x = size;
    y = 0;
    nextX = size;
    nextY = 0;
    snake = [
    {x:size*4, y:0},
    {x:size*3, y:0},
    {x:size*2, y:0},
    {x:size, y:0},
    {x:0, y:0},
    ];
    gamestart();
};  

function gamestart(){
    running=true;
    scoretext.textContent = score;
    spawnfood();
    food();
    time();
};
function clearscreen(){
    ctx.fillStyle = screenbackground;
    ctx.fillRect(0,0,wscreen(),hscreen());

};

function changedirection(event){
    const keypressed = event.keyCode;
    const left = 37;
    const up = 38;
    const right = 39;
    const down = 40;
    const a = 65;
    const w = 87;
    const d = 68;
    const s = 83;
    const goleft = (x == -size);
    const goup = (y == -size);
    const goright = (x == size);
    const godown = (y == size);

    switch(true){
        case(keypressed == left && !goright):
            nextX = -size; nextY = 0;
            break;
        case(keypressed == up && !godown):
            nextX = 0; nextY = -size;
            break;
        case(keypressed == right && !goleft):
            nextX = size; nextY = 0;
            break;
        case(keypressed == down && !goup):
            nextX = 0; nextY = size;                    
            break;
        case(keypressed == a && !goright):
            nextX = -size; nextY = 0;
            break;
        case(keypressed == w && !godown):
            nextX = 0; nextY = -size;
            break;
        case(keypressed == d && !goleft):
            nextX = size; nextY = 0;
            break;
        case(keypressed == s && !goup):
            nextX = 0; nextY = size;
            break;
    };
};

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function dsnake(){
    snake.forEach((snakePart, i) => {
        let scale = 1;
        if (eatPulse >= 0){
            const offset = eatPulse - i;
            if (offset === 0) scale = 1.6;
            else if (offset === 1) scale = 1.3;
            else if (offset === 2) scale = 1.1;
        }
        const s = size * scale;
        const cx = snakePart.x + size/2 - s/2;
        const cy = snakePart.y + size/2 - s/2;
        const start = hexToRgb(snakeHeadColor);
        const end = { r: start.r * 0.8, g: start.g * 0.8, b: start.b * 0.8 };

        const t = Math.min(i / (snake.length - 1), 1);

        const r = Math.round(start.r + (end.r - start.r) * t);
        const g = Math.round(start.g + (end.g - start.g) * t);
        const b = Math.round(start.b + (end.b - start.b) * t);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.roundRect(cx, cy, s, s, 6);
        
        ctx.fill();
        ctx.strokeStyle = "#16181c";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (i === 0 && Math.floor(Date.now()/300) % 2 === 0) {
            const dx = x/size, dy = y/size;
            const tipx = cx + s/2 + dx*s*0.75;
            const tipy = cy + s/2 + dy*s*0.75;
            const px = -dy, py = dx;
            ctx.strokeStyle = "#FA3604";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx+s/2+dx*s*0.5, cy+s/2+dy*s*0.5);
            ctx.lineTo(tipx, tipy);
            ctx.moveTo(tipx, tipy);
            ctx.lineTo(tipx+dx*s*0.15+px*s*0.12, tipy+dy*s*0.15+py*s*0.12);
            ctx.moveTo(tipx, tipy);
            ctx.lineTo(tipx+dx*s*0.15-px*s*0.12, tipy+dy*s*0.15-py*s*0.12);
            ctx.stroke();
        }
        if (i === 0) {
            const dx = x/size, dy = y/size;
            const px = -dy, py = dx;
            const ex = cx + s/2 + dx*s*0.2;
            const ey = cy + s/2 + dy*s*0.2;
            const off = s*0.22;
            ctx.fillStyle = "#111";
            ctx.beginPath();
            ctx.arc(ex + px*off, ey + py*off, 2.5, 0, Math.PI*2);
            ctx.arc(ex - px*off, ey - py*off, 2.5, 0, Math.PI*2);
            ctx.fill();
            const distToFood = Math.hypot((cx+s/2)-(fx+size/2), (cy+s/2)-(fy+size/2));
            if (distToFood < size * 1.5) {
                const dx = x/size, dy = y/size;
                const px = -dy, py = dx;
                const mx = cx + s/2 + dx*s*0.45;
                const my = cy + s/2 + dy*s*0.45;
                ctx.fillStyle = "#111";
                ctx.beginPath();
                ctx.moveTo(mx + px*s*0.18, my + py*s*0.18);
                ctx.lineTo(mx + dx*s*0.25, my + dy*s*0.25);
                ctx.lineTo(mx - px*s*0.18, my - py*s*0.18);
                ctx.closePath();
                ctx.fill();
            }
        }
    })
    if(!ate){ snake.pop(); }
    ate = false;
    if (eatPulse >= 0){
        eatPulse+=2;
        if (eatPulse > snake.length + 2) eatPulse = -1;
    }
};
function time(){
    if(running){
        setTimeout(()=>{
            clearscreen();
            food();
            movesnake();
            dsnake();
            gameover(); 
            time();
        },speed)
    }
    else{
        dgameover();
    }
};

function movesnake(){
    x = nextX; y = nextY;
    const head = {x: snake[0].x + x, y: snake[0].y + y};
    snake.unshift(head);
    sendMyState();
    // blue fruit eaten
    if (blueFruitActive && head.x === bfx && head.y === bfy) {
        playEatSound();
        blueFruitActive = false;
        bfx = null; bfy = null;
        if (!slowActive) {
            slowActive = true;
            const oldSpeed = speed;
            speed += 60;
            setTimeout(() => { speed = oldSpeed; slowActive = false; }, 10000);
        }
    }
    if (goldFruitActive && head.x === gfx && head.y === gfy) {
        playEatSound();
        goldFruitActive = false;
        goldFruitFlashing = false;
        gfx = null; gfy = null;
        score += 5;
        scoretext.textContent = score;
        if (score > highscore){
            highscore = score;
            localStorage.setItem('rs_high', highscore);
        }
        const popup = document.querySelector('#scorePopup');
        popup.classList.remove('show');
        void popup.offsetWidth;
        popup.classList.remove('hidden');
        popup.classList.add('show');
        setTimeout(() => popup.classList.add('hidden'), 800);
    }
    // normal food eaten
    if (head.x == fx && head.y == fy){
        clearTimeout(foodRespawnTimer);
        score+=1;
        if (matchMode === 'score' && score >= 10) {
            running = false;
        }
        playEatSound();
        if (speed > 75 && !slowActive) speed--;

        comboCount++;
        clearTimeout(comboTimer);
        if (comboCount >= 5) {
            comboCount = 0;
            document.querySelector('#comboIndicator').classList.add('hidden');
            spawnGoldFruit();
        } else {
            let timeLeft = 5;
            document.querySelector('#comboIndicator').classList.remove('hidden');
            const indicator = document.querySelector('#comboIndicator');
            indicator.classList.remove('pulse');
            void indicator.offsetWidth; // force reflow so animation replays
            indicator.classList.add('pulse');
            document.querySelector('#comboCount').textContent = comboCount;
            document.querySelector('#comboTimeLeft').textContent = timeLeft;
            clearInterval(window.comboCountdownInterval);
            window.comboCountdownInterval = setInterval(() => {
                timeLeft--;
                document.querySelector('#comboTimeLeft').textContent = timeLeft;
                if (timeLeft <= 0) clearInterval(window.comboCountdownInterval);
            }, 1000);
            comboTimer = setTimeout(() => {
                comboCount = 0;
                document.querySelector('#comboIndicator').classList.add('hidden');
                clearInterval(window.comboCountdownInterval);
            }, 5000);
        }

        scoretext.textContent = score;
        if (score > highscore){
            highscore = score;
            localStorage.setItem('rs_high', highscore);
        }
        spawnfood();
        ate = true;
        eatPulse = 0;
    }
};

function food(){
    drawFruit(fx, fy, "#FF7A1A", "#FA3604");
    if (blueFruitActive && bfx !== null) {
        const flash = blueFruitFlashing && Math.floor(Date.now()/200) % 2 === 0;
        drawFruit(bfx, bfy, flash ? "#ffffff" : "#7ADFFF", flash ? "#cccccc" : "#1AA7FA");
    }
    if (goldFruitActive && gfx !== null) {
        drawFruit(gfx, gfy, "#FFE55C", "#FFC107");
    }
};

function spawnGoldFruit(){
    let onSnake;
    do {
        gfx = Math.round((Math.random()*(wscreen()-size))/size)*size;
        gfy = Math.round((Math.random()*(hscreen()-size))/size)*size;
        onSnake = snake.some(part => part.x === gfx && part.y === gfy)
            || (gfx === fx && gfy === fy)
            || (blueFruitActive && gfx === bfx && gfy === bfy);
    } while (onSnake);

    goldFruitActive = true;
    goldFruitFlashing = false;
    setTimeout(() => { goldFruitFlashing = true; }, 2000); // flash in last 3s
    setTimeout(() => {
        goldFruitActive = false;
        goldFruitFlashing = false;
        gfx = null; gfy = null;
    }, 5000);
}

function drawFruit(px, py, c1, c2){
    const grad = ctx.createRadialGradient(
        px + size * 0.35, py + size * 0.35, 2,
        px + size / 2, py + size / 2, size / 2
    );
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px + size/2, py + size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
}

function spawnfood(){
    function random(min,max){
        const rn = Math.round((Math.random()*(max-min)+min)/size)*size;
        return rn;
    }
    let onSnake;
    do {
        fx = random(0,wscreen() - size);
        fy = random(0,hscreen() - size);
        onSnake = snake.some(part => part.x === fx && part.y === fy) || (bfx === fx && bfy === fy);
    } while (onSnake);

    maybeSpawnBlueFruit();

    clearTimeout(foodRespawnTimer);
    if (matchMode === 'score') {
        foodRespawnTimer = setTimeout(() => {
            if (running) spawnfood();
        }, 3000);
    }
};

function maybeSpawnBlueFruit(){
    if (blueFruitActive || slowFruitCooldown) return;
    if (Math.random() < 0.15) {
        let onSnake;
        do {
            bfx = Math.round((Math.random()*(wscreen()-size))/size)*size;
            bfy = Math.round((Math.random()*(hscreen()-size))/size)*size;
            onSnake = snake.some(part => part.x === bfx && part.y === bfy) || (bfx === fx && bfy === fy);
        } while (onSnake);

        blueFruitActive = true;
        slowFruitCooldown = true;
        blueFruitFlashing = false;
        setTimeout(() => { blueFruitFlashing = true; }, 1500); // flash warning in last 1.5s
        setTimeout(() => {
            blueFruitActive = false;
            blueFruitFlashing = false;
            bfx = null; bfy = null;
        }, 3000);
        setTimeout(() => { slowFruitCooldown = false; }, 30000);
    }
}

function gameover(){
    switch(true){
        case(snake[0].x < 0):
            running = false;
            break;
        case(snake[0].x >= wscreen()):
            running = false;
            break;
        case(snake[0].y < 0):
            running = false;
            break;
        case(snake[0].y >= hscreen()):
            running = false;
            break;
    }
    for(let i = 1; i < snake.length; i+=1){
        if (snake[i].x == snake[0].x && snake[i].y == snake[0].y){
            running = false;
            break;
        }
    }
    if (!running) reportMyDeath();
};

function dgameover(){
    gameboard.classList.add('shake');
    clearInterval(timeTroubleInterval);
    setTimeout(()=>{
        gameboard.classList.remove('shake');
        if (onlineMode) return; // online handled elsewhere

        if (matchMode === 'score' && score >= 10) {
            document.querySelector('#finalscore').textContent = `You won! Score: ${score}`;
            document.querySelector('#gameoverpopup').classList.remove('hidden');
        } else if (matchMode === 'rounds') {
            soloBestScore = Math.max(soloBestScore, score);
            soloLivesLeft--;
            if (soloLivesLeft > 0) {
                document.querySelector('#finalscore').textContent = `Round lost. Score: ${score} — ${soloLivesLeft} lives left`;
                document.querySelector('#gameoverpopup').classList.remove('hidden');
            } else {
                document.querySelector('#finalscore').textContent = `Out of lives! Best score: ${soloBestScore}`;
                document.querySelector('#gameoverpopup').classList.remove('hidden');
            }
        } else {
            // survival or timetrouble default
            document.querySelector('#finalscore').textContent = `${score} (Best: ${highscore})`;
            document.querySelector('#gameoverpopup').classList.remove('hidden');
        }
    }, 300);
    running = false;
};

function startSoloMode() {
    if (matchMode === 'rounds') {
        soloLivesLeft = 3;
        soloBestScore = 0;
    }
    restartgame();
    if (matchMode === 'timetrouble') startTimeTrouble();
}

function startTimeTrouble() {
    clearInterval(timeTroubleInterval);
    timeLeftSeconds = 60;
    document.querySelector('#roundScore').classList.remove('hidden');
    document.querySelector('#roundScore').innerHTML = `Time: <span id="timeLeftDisplay">60</span>s`;
    timeTroubleInterval = setInterval(() => {
        timeLeftSeconds--;
        const el = document.querySelector('#timeLeftDisplay');
        if (el) el.textContent = timeLeftSeconds;
        if (timeLeftSeconds <= 0) {
            clearInterval(timeTroubleInterval);
            running = false;
        }
    }, 1000);
}