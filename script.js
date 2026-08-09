const gameboard = document.querySelector('#gamescreen');
const ctx = gameboard.getContext('2d');
const scoretext = document.querySelector('#scoree');
let myUsername = localStorage.getItem('rs_username') || '';
let onlineMode = false;
let soundOn = localStorage.getItem('rs_sound') !== 'false';
const eatSound = new Audio('food-eating.mp3'); // change to .wav if that's your file type
let lastEatSoundTime = 0;
let snakeSkin = localStorage.getItem('rs_skin') || 'classic';
let slowRevertTimer = null;
let gameGen = 0;

function playEatSound() {
    if (!soundOn) return;
    const now = Date.now();
    if (now - lastEatSoundTime < 80) return;
    lastEatSoundTime = now;
    eatSound.currentTime = 0;
    eatSound.play().catch(() => {});
}
let snakeHeadColor = localStorage.getItem('rs_color') || '#9AC606';

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
let scoreModeStartTime = 0;
function getHighKey(mode) { return 'rs_high_' + mode; }
function getHighScore(mode) {
    return Number(localStorage.getItem(getHighKey(mode))) || 0;
}
function setHighScore(mode, value) {
    localStorage.setItem(getHighKey(mode), value);
}
let nextX = size, nextY = 0;
let running = true;
let x=size;
let y=0;
let fx, fy; 
let bfx = null, bfy = null; // blue bonus food (null = not spawned)
let blueFruitActive = false;
let blueFruitFlashing = false;
let score = 0;
let speed = 125;
let snake = [
    {x:size*4, y:0},
    {x:size*3, y:0},
    {x:size*2, y:0},
    {x:size, y:0},
    {x:0, y:0},
];
let gfx = null, gfy = null; // gold +5 bonus fruit
let goldFruitActive = false;
let goldFruitFlashing = false;
let tx, ty;
let eatPulse = -1;
let foodType = 'normal';
let slowActive = false;
let comboCount = 0;
let comboTimer = null;
let slowFruitCooldown = false;
let matchMode = 'rounds';
let soloLivesLeft = 3;
let soloBestScore = 0;
let timeTroubleInterval = null;
let timeLeftSeconds = 60;
let foodRespawnTimer = null;
let soloTotalScore = 0;
let soloRoundNum = 1;
gameboard.addEventListener('touchstart', e => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
}, {passive:true});

gameboard.addEventListener('touchmove', e => {
    e.preventDefault();
    const dx = e.touches[0].clientX - tx;
    const dy = e.touches[0].clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)){
        if (dx > 0 &&  nextX!= -size){ nextX=size; nextY=0; }
        else if (dx < 0 && nextX != size){ nextX=-size; nextY=0; }
    } else {
        if (dy > 0 && nextY != -size){ nextX=0; nextY=size; }
        else if (dy < 0 && nextY!= size){ nextX=0; nextY=-size; }
    }
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
}, {passive:false});
