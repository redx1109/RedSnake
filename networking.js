const MATCH_SERVER = 'wss://redsnake.redchess.workers.dev/';
let matchSocket, myId, opponentId, opponentName, pc, dataChannel;
let botFallbackTimer;
let myRoundWins = 0, oppRoundWins = 0, currentRound = 1;
let roundEnded = false;
let myScore = 0, oppScore = 0;

function resetMatch() {
    myRoundWins = 0;
    oppRoundWins = 0;
    currentRound = 1;
}

function onOpponentDied() {
    if (roundEnded) return;
    roundEnded = true;
    running = false;
    if (matchMode === 'rounds') {
        myRoundWins++;
        showRoundResult(true);
    } else {
        endMatch(true); // survival, score, timetrouble: dying = losing immediately
    }
}

function reportMyDeath() {
    if (!onlineMode || roundEnded) return;
    roundEnded = true;
    if (dataChannel && dataChannel.readyState === 'open') dataChannel.send(JSON.stringify({ type: 'died' }));
    if (matchMode === 'rounds') {
        oppRoundWins++;
        showRoundResult(false);
    } else {
        endMatch(false);
    }
}

function checkOnlineWinConditions() {
    if (!onlineMode || roundEnded) return;
    if (matchMode === 'score' && score >= 10) {
        roundEnded = true;
        running = false;
        if (dataChannel && dataChannel.readyState === 'open') dataChannel.send(JSON.stringify({ type: 'died' })); // reuse died as "match over" signal for opponent to see final state
        endMatch(true);
    }
}

function showRoundResult(won) {
    document.querySelector('#gameoverpopup').classList.remove('hidden');
    document.querySelector('#finalscore').textContent =
        `Round ${currentRound}: ${won ? 'You won!' : 'You lost.'} (${myRoundWins}-${oppRoundWins})`;

    if (currentRound >= 3) {
        setTimeout(() => endMatch(myRoundWins > oppRoundWins), 2000);
    } else {
        setTimeout(() => {
            currentRound++;
            roundEnded = false;
            document.querySelector('#gameoverpopup').classList.add('hidden');
            restartgame();
        }, 2000);
    }
}

function endMatch(iWon) {
    let msg;
    if (matchMode === 'rounds') {
        msg = iWon ? `You won the match! (${myRoundWins}-${oppRoundWins})` : `You lost the match. (${myRoundWins}-${oppRoundWins})`;
    } else {
        msg = iWon ? `You won! (Your score: ${score} vs ${oppScore})` : `You lost. (Your score: ${score} vs ${oppScore})`;
    }
    document.querySelector('#finalscore').textContent = msg;
    document.querySelector('#restartbtn').classList.add('hidden');
    document.querySelector('#homebtn').onclick = () => {
        document.querySelector('#gameoverpopup').classList.add('hidden');
        document.querySelector('#gamecontainer').classList.add('hidden');
        document.querySelector('#oppscreen').classList.add('hidden');
        document.querySelector('#homescreen').classList.remove('hidden');
        resetMatch();
    };
}

function connectMatchServer() {
    console.log('connectMatchServer called, connecting to', MATCH_SERVER);
    matchSocket = new WebSocket(MATCH_SERVER);
    matchSocket.onmessage = handleMatchMessage;
}

function handleMatchMessage(event) {
    console.log('received:', event.data);
    const data = JSON.parse(event.data);

    if (data.type === 'yourId') {
        myId = data.id;
        return;
    }
    if (data.type === 'matched') {
        clearTimeout(botFallbackTimer);
        opponentId = data.opponentId;
        opponentName = data.opponentName;
        matchMode = data.mode || 'rounds';
        const isInitiator = myId < opponentId;
        beginConnection(isInitiator);
        runCountdown();
        return;
    }
    if (data.type === 'roomCreated') {
        document.querySelector('#waitingscreen').innerHTML = `<p>Share this code:</p><h2>${data.code}</h2>`;
        return;
    }
    if (data.type === 'roomJoinFailed') {
        alert("Code doesn't exist or already full.");
        document.querySelector('#waitingscreen').classList.add('hidden');
        document.querySelector('#homescreen').classList.remove('hidden');
        return;
    }
    if (data.type === 'signal') {
        handleSignal(data.from, data.signal);
        return;
    }
    if (data.type === 'gameState') {
        renderOpponent(data);
        return;
    }
    if (data.type === 'died') {
        onOpponentDied();
        return;
    }
}

function runCountdown() {
    let n = 3;
    document.querySelector('#waitingscreen').innerHTML = `<h1 id="countdownNum">${n}</h1>`;
    const iv = setInterval(() => {
        n--;
        if (n <= 0) {
            clearInterval(iv);
            document.querySelector('#waitingscreen').classList.add('hidden');
        } else {
            document.querySelector('#countdownNum').textContent = n;
        }
    }, 1000);
}

function startMatchmaking() {
    console.log('startMatchmaking called');
    document.querySelector('#homescreen').classList.add('hidden');
    document.querySelector('#waitingscreen').classList.remove('hidden');
    connectMatchServer();
    matchSocket.onopen = () => {
        matchSocket.send(JSON.stringify({ type: 'joinRandom', name: myUsername, mode: matchMode }));
    };
    botFallbackTimer = setTimeout(() => {
        document.querySelector('#waitingscreen').classList.add('hidden');
        opponentName = 'Bot';
        startOnlineGame(true); // true = vs bot, no real connection
    }, 10000);
}

function beginConnection(isInitiator) {
    pc = new RTCPeerConnection({ iceServers: [
        { urls: 'stun:stun.relay.metered.ca:80' },
        { urls: 'turn:global.relay.metered.ca:80', username: 'e8a3d1a26cb6910f8914a67d', credential: '0U4TpK+1hCt9sqIc' },
        { urls: 'turn:global.relay.metered.ca:443?transport=tcp', username: 'e8a3d1a26cb6910f8914a67d', credential: '0U4TpK+1hCt9sqIc' }
    ] });
    pc.onicecandidate = e => {
        if (e.candidate) matchSocket.send(JSON.stringify({ type: 'signal', to: opponentId, signal: { candidate: e.candidate } }));
    };
    if (isInitiator) {
        dataChannel = pc.createDataChannel('game', { ordered: false, maxRetransmits: 0 });
        setupChannel();
        pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            matchSocket.send(JSON.stringify({ type: 'signal', to: opponentId, signal: { sdp: offer } }));
        });
    } else {
        pc.ondatachannel = e => { dataChannel = e.channel; setupChannel(); };
    }
}

function setupChannel() {
    dataChannel.onopen = () => startOnlineGame(false);
    dataChannel.onmessage = e => {
        const data = JSON.parse(e.data);
        if (data.type === 'died') {
            onOpponentDied();
        } else {
            renderOpponent(data);
        }
    };
}

async function handleSignal(from, signal) {
    if (!pc) { opponentId = from; beginConnection(false); }
    if (signal.sdp) {
        await pc.setRemoteDescription(signal.sdp);
        if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            matchSocket.send(JSON.stringify({ type: 'signal', to: from, signal: { sdp: answer } }));
        }
    } else if (signal.candidate) {
        pc.addIceCandidate(signal.candidate).catch(() => {});
    }
}

function renderOpponent(data) {
    window.opponentState = data;
    if (data.score !== undefined) oppScore = data.score;
    if (!oppCtx || !data?.snake) return;
    oppCtx.fillStyle = '#16181c';
    oppCtx.fillRect(0, 0, oppCanvas.width, oppCanvas.height);

    const oppSize = size; // keep same visual cell size as your own snake

    if (data.fx !== undefined) drawFruitOn(oppCtx, data.fx * oppCanvas.width, data.fy * oppCanvas.height, "#FF7A1A", "#FA3604", oppSize);
    if (data.blueFruitActive) drawFruitOn(oppCtx, data.bfx * oppCanvas.width, data.bfy * oppCanvas.height, "#7ADFFF", "#1AA7FA", oppSize);
    if (data.goldFruitActive) drawFruitOn(oppCtx, data.gfx * oppCanvas.width, data.gfy * oppCanvas.height, "#FFE55C", "#FFC107", oppSize);

    const start = hexToRgb(data.color || '#C60676');
    data.snake.forEach((part, i) => {
        const px = part.x * oppCanvas.width;
        const py = part.y * oppCanvas.height;
        const t = Math.min(i / (data.snake.length - 1), 1);
        const r = Math.round(start.r * (1 - t*0.3));
        const g = Math.round(start.g * (1 - t*0.3));
        const b = Math.round(start.b * (1 - t*0.3));
        oppCtx.fillStyle = `rgb(${r},${g},${b})`;
        oppCtx.beginPath();
        oppCtx.roundRect(px, py, oppSize, oppSize, 6);
        oppCtx.fill();
        oppCtx.strokeStyle = "#16181c";
        oppCtx.lineWidth = 2;
        oppCtx.stroke();

        if (i === 0 && data.dirX !== undefined) {
            const dx = data.dirX, dy = data.dirY;
            const pxp = -dy, pyp = dx;
            const ex = px + oppSize/2 + dx*oppSize*0.2;
            const ey = py + oppSize/2 + dy*oppSize*0.2;
            const off = oppSize*0.22;
            oppCtx.fillStyle = "#111";
            oppCtx.beginPath();
            oppCtx.arc(ex + pxp*off, ey + pyp*off, 2.5, 0, Math.PI*2);
            oppCtx.arc(ex - pxp*off, ey - pyp*off, 2.5, 0, Math.PI*2);
            oppCtx.fill();
        }
    });

    const pillText = 'Opponent Score';
    oppCtx.font = 'bold 14px -apple-system, sans-serif';
    const textWidth = oppCtx.measureText(pillText).width;
    const pillW = textWidth + 40;
    const pillX = oppCanvas.width/2 - pillW/2;
    oppCtx.fillStyle = 'rgba(255,255,255,0.08)';
    oppCtx.beginPath();
    oppCtx.roundRect(pillX, 14, pillW, 32, 20);
    oppCtx.fill();
    oppCtx.fillStyle = '#ece7de';
    oppCtx.textAlign = 'center';
    oppCtx.textBaseline = 'middle';
    oppCtx.fillText(pillText, oppCanvas.width/2, 30);
    oppCtx.textAlign = 'left';
    oppCtx.textBaseline = 'alphabetic';
}

function drawFruitOn(context, px, py, c1, c2, s){
    const grad = context.createRadialGradient(
        px + s*0.35, py + s*0.35, 2, px + s/2, py + s/2, s/2
    );
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    context.fillStyle = grad;
    context.beginPath();
    context.arc(px + s/2, py + s/2, s/2, 0, Math.PI*2);
    context.fill();
}

function startOnlineGame(vsBot) {
    resetMatch();
    roundEnded = false;
    myScore = 0; oppScore = 0;
    document.querySelector('#gamecontainer').classList.remove('hidden');
    document.querySelector('#gamecontainer').classList.add('online');
    document.querySelector('#oppscreen').classList.remove('hidden');
    resizeCanvas();
    restartgame();
    onlineMode = true;
    if (matchMode === 'timetrouble') startOnlineTimeTrouble();
}

function startOnlineTimeTrouble() {
    let t = 60;
    document.querySelector('#roundScore').classList.remove('hidden');
    document.querySelector('#roundScore').innerHTML = `Time: <span id="onlineTimeLeft">60</span>s`;
    const iv = setInterval(() => {
        t--;
        const el = document.querySelector('#onlineTimeLeft');
        if (el) el.textContent = t;
        if (t <= 0) {
            clearInterval(iv);
            if (!roundEnded) {
                roundEnded = true;
                running = false;
                endMatch(score > oppScore);
            }
        }
    }, 1000);
}

function sendMyState() {

    if (!onlineMode) return;
    checkOnlineWinConditions();
    const payload = {
        type: 'gameState', to: opponentId,
        snake: snake.map(p => ({ x: p.x / wscreen(), y: p.y / hscreen() })),
        color: snakeHeadColor, dirX: x/size, dirY: y/size,
        fx: fx/wscreen(), fy: fy/hscreen(),
        bfx: bfx !== null ? bfx/wscreen() : null, bfy: bfy !== null ? bfy/hscreen() : null,
        blueFruitActive,
        gfx: gfx !== null ? gfx/wscreen() : null, gfy: gfy !== null ? gfy/hscreen() : null,
        goldFruitActive,
        score: score
    };
    if (dataChannel && dataChannel.readyState === 'open') dataChannel.send(JSON.stringify(payload));
}

const oppCanvas = document.querySelector('#oppscreen');
const oppCtx = oppCanvas.getContext('2d');

function createChallenge() {
    matchMode = 'rounds';
    document.querySelector('#homescreen').classList.add('hidden');
    document.querySelector('#waitingscreen').innerHTML = '<p>Creating room...</p>';
    document.querySelector('#waitingscreen').classList.remove('hidden');
    connectMatchServer();
    matchSocket.onopen = () => {
        matchSocket.send(JSON.stringify({ type: 'createRoom', name: myUsername, mode: matchMode }));
    };
}

function joinChallenge(code) {
    document.querySelector('#homescreen').classList.add('hidden');
    document.querySelector('#waitingscreen').innerHTML = '<p>Joining room...</p>';
    document.querySelector('#waitingscreen').classList.remove('hidden');
    connectMatchServer();
    matchSocket.onopen = () => {
        matchSocket.send(JSON.stringify({ type: 'joinRoom', code, name: myUsername }));
    };
}
