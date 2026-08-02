document.querySelector('#onlinebtn').addEventListener('click', () => {
    document.querySelector('#modeselect').classList.add('hidden');
    if (!myUsername) {
        document.querySelector('#nameModal').classList.remove('hidden');
    } else {
        startMatchmaking();
    }
});

document.querySelector('#confirmNameBtn').addEventListener('click', () => {
    const val = document.querySelector('#usernameInput').value.trim();
    if (!val) return;
    myUsername = val;
    localStorage.setItem('rs_username', myUsername);
    document.querySelector('#nameModal').classList.add('hidden');
    startMatchmaking();
});


document.querySelector('#homebtn').addEventListener('click', () => {
    document.querySelector('#gameoverpopup').classList.add('hidden');
    document.querySelector('#gamecontainer').classList.add('hidden');
    document.querySelector('#homescreen').classList.remove('hidden');
    document.querySelector('#oppscreen').classList.add('hidden');
});
document.querySelector('#restartbtn').addEventListener('click', () => {
    document.querySelector('#gameoverpopup').classList.add('hidden');
    restartgame();
});
document.querySelector('#gamecontainer').classList.add('hidden');

document.querySelector('#playbtn').addEventListener('click', () => {
    document.querySelector('#homescreen').classList.add('hidden');
    document.querySelector('#gameselect').classList.remove('hidden');
});
document.querySelector('#classiccard').addEventListener('click', () => {
    document.querySelector('#gameselect').classList.add('hidden');
    document.querySelector('#modeselect').classList.remove('hidden');
});
document.querySelector('#snake2card').addEventListener('click', () => {
    document.querySelector('#gameselect').classList.add('hidden');
    alert('Snake 2.0 coming soon!'); // placeholder
});

document.querySelector('#backfromodebtn').addEventListener('click', () => {
    document.querySelector('#modeselect').classList.add('hidden');
    document.querySelector('#gameselect').classList.remove('hidden');
});

document.querySelector('#challengebtn').addEventListener('click', () => {
    document.querySelector('#modeselect').classList.add('hidden');
    document.querySelector('#challengeChoiceModal').classList.remove('hidden');
});
document.querySelector('#createChallengeBtn').addEventListener('click', () => {
    document.querySelector('#challengeChoiceModal').classList.add('hidden');
    createChallenge();
});
document.querySelector('#joinChallengeBtn').addEventListener('click', () => {
    document.querySelector('#challengeChoiceModal').classList.add('hidden');
    document.querySelector('#joinModal').classList.remove('hidden');
});

document.querySelector('#confirmJoinBtn').addEventListener('click', () => {
    const code = document.querySelector('#joinCodeInput').value.trim().toUpperCase();
    if (!code) return;
    document.querySelector('#joinModal').classList.add('hidden');
    joinChallenge(code);
});

document.querySelector('#offlinebtn').addEventListener('click', () => {
    document.querySelector('#modeselect').classList.add('hidden');
    document.querySelector('#gamecontainer').classList.remove('hidden');
    document.querySelector('#gamecontainer').classList.remove('online');
    resizeCanvas();
    startSoloMode();
});

document.querySelector('#backfromgameselectbtn').addEventListener('click', () => {
    document.querySelector('#gameselect').classList.add('hidden');
    document.querySelector('#homescreen').classList.remove('hidden');
});
document.querySelector('#onlinebtn').addEventListener('click', () => {
    document.querySelector('#modeselect').classList.add('hidden');
    if (!myUsername) {
        document.querySelector('#nameModal').classList.remove('hidden');
    } else {
        startMatchmaking();
    }
});

const modes = [
    { key: 'rounds', title: '3 Rounds', desc: 'Best of 3 — first to die loses each round.' },
    { key: 'survival', title: 'Survival', desc: 'One life, no rounds — last one standing wins.' },
    { key: 'timetrouble', title: 'Time Trouble', desc: '60 seconds on the clock — highest score wins.' },
    { key: 'score', title: 'First to 10', desc: 'Race to 10 points — no time limit.' }
];
let modeIndex = 0;

function updateModeCard() {
    const m = modes[modeIndex];
    matchMode = m.key;
    document.querySelector('#modeCardTitle').textContent = m.title;
    document.querySelector('#modeCardDesc').textContent = m.desc;
    document.querySelectorAll('.modeTab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === m.key);
    });
}

document.querySelector('#modeArrowLeft').addEventListener('click', () => {
    modeIndex = (modeIndex - 1 + modes.length) % modes.length;
    updateModeCard();
});
document.querySelector('#modeArrowRight').addEventListener('click', () => {
    modeIndex = (modeIndex + 1) % modes.length;
    updateModeCard();
});
document.querySelectorAll('.modeTab').forEach((tab, i) => {
    tab.addEventListener('click', () => {
        modeIndex = i;
        updateModeCard();
    });
});

document.querySelector('#restartbtn').addEventListener('click', () => {
    document.querySelector('#gameoverpopup').classList.add('hidden');
    if (matchMode === 'rounds' && soloLivesLeft <= 0) {
        document.querySelector('#homebtn').click();
        return;
    }
    startSoloMode();
});

updateModeCard(); // initialize on load