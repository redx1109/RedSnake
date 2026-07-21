const gameboard = document.querySelector('#gamescreen');
const ctx = gameboard.getContext('2d');
const scoretext = document.querySelector('#scoree');

gameboard.width = gameboard.clientWidth;
gameboard.height = gameboard.clientHeight;
function wscreen(){ return gameboard.width; }
function hscreen(){ return gameboard.height; }
const snakecolor = '#8fae7c';
const snakebordercolor = '#16181c';
const screenbackground = '#16181c';
const foodcolor = '#FA3604';
const size = Math.max(15, Math.round(Math.min(gameboard.clientWidth, gameboard.clientHeight) / 20 / 10) * 10);
let ate = false;
let highscore = Number(localStorage.getItem('rs_high')) || 0;
let nextX = size, nextY = 0;
let running = true;
let x=size;
let y=0;
let fx;
let fy;
let score = 0;
let snake = [
    {x:size*4, y:0},
    {x:size*3, y:0},
    {x:size*2, y:0},
    {x:size, y:0},
    {x:0, y:0},
];
let tx, ty;
let eatPulse = -1;
gameboard.addEventListener('touchstart', e => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
});
gameboard.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)){
        if (dx > 0 &&  nextX!= -size){ nextX=size; nextY=0; }
        else if (dx < 0 && nextX != size){ nextX=-size; nextY=0; }
    } else {
        if (dy > 0 && nextY != -size){ nextX=0; nextY=size; }
        else if (dy < 0 && nextY!= size){ nextX=0; nextY=-size; }
    }
});
window.addEventListener("keydown", changedirection);

document.querySelector('#homebtn').addEventListener('click', () => {
    document.querySelector('#gameoverpopup').classList.add('hidden');
    document.querySelector('#gamecontainer').classList.add('hidden');
    document.querySelector('#homescreen').classList.remove('hidden');
});
document.querySelector('#restartbtn').addEventListener('click', () => {
    document.querySelector('#gameoverpopup').classList.add('hidden');
    restartgame();
});
document.querySelector('#gamecontainer').classList.add('hidden');
document.querySelector('#playbtn').addEventListener('click', () => {
    document.querySelector('#homescreen').classList.add('hidden');
    document.querySelector('#gamecontainer').classList.remove('hidden');
    resizeCanvas();   
    restartgame();
});

window.addEventListener('resize', resizeCanvas);
function resizeCanvas(){
    gameboard.width = gameboard.clientWidth;
    gameboard.height = gameboard.clientHeight;
}

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
    };
};
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
        const start = { r: 190, g: 220, b: 9 };   // #BEDC09
        const end   = { r: 154, g: 198, b: 6 };   // #9AC606

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
        },100)
    }
    else{
        dgameover();
    }
};
function movesnake(){
    x = nextX; y = nextY;
    const head = {x: snake[0].x + x,
                  y: snake[0].y + y};
    snake.unshift(head);
    if (snake[0].x == fx && snake[0].y == fy){
        score+=1;
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
    const grad = ctx.createRadialGradient(
        fx + size * 0.35,
        fy + size * 0.35,
        2,
        fx + size / 2,
        fy + size / 2,
        size / 2
    );

    grad.addColorStop(0, "#FF7A1A");
    grad.addColorStop(1, "#FA3604");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fx + size/2, fy + size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
};

function spawnfood(){
    function random(min,max){
        const rn = Math.round((Math.random()*(max-min)+min)/size)*size;
        return rn;
    }
    let onSnake;
    do {
        fx = random(0,wscreen() - size);
        fy = random(0,hscreen() - size);
        onSnake = snake.some(part => part.x === fx && part.y === fy);
    } while (onSnake);
};

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
};

function dgameover(){
    gameboard.classList.add('shake');
    setTimeout(()=>{
        document.querySelector('#finalscore').textContent = `${score} (Best: ${highscore})`;
        document.querySelector('#gameoverpopup').classList.remove('hidden');
        gameboard.classList.remove('shake');
    }, 300);
    running = false;
};

function restartgame(){
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
