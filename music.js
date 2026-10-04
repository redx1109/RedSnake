// RedSnake background music v2: chill lo-fi loop generated live with WebAudio (0 KB of audio files).
const M_VOL = 0.8;          // <-- overall volume. Louder: 1.2 / 1.6   Quieter: 0.5
let musicOn = localStorage.getItem('rs_music') !== 'false';
let mCtx = null, mMaster = null, mPadBus = null, mEchoSend = null, mNoise = null;
let mTimer = null, mStep = 0, mNext = 0;

const M_STEP = 60 / 92 / 2;                                   // 92 BPM, eighth notes
const M_PADS = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 64, 67], [50, 55, 59, 62]]; // Am7 Fmaj7 Cmaj7 G
const M_BASS = [45, 41, 48, 43];
const M_MEL = [                                                // 4 bars x 8 steps, -1 = rest
    76, -1, -1, 74, 72, -1, 69, -1,
    72, -1, 76, -1, 74, 72, -1, -1,
    79, -1, 76, -1, 74, -1, 72, 74,
    76, -1, 74, -1, 72, -1, -1, -1
];
const mHz = n => 440 * Math.pow(2, (n - 69) / 12);

function mTone(freq, t, dur, vol, type, echo) {
    const o = mCtx.createOscillator(), g = mCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(mMaster);
    if (echo) g.connect(mEchoSend);
    o.start(t);
    o.stop(t + dur + 0.05);
}

function mPad(freq, t, dur, vol) {                            // warm detuned saw pad
    [-6, 6].forEach(det => {
        const o = mCtx.createOscillator(), g = mCtx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        o.detune.value = det;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.5);
        g.gain.linearRampToValueAtTime(vol * 0.8, t + dur - 0.4);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(mPadBus);
        o.start(t);
        o.stop(t + dur + 0.05);
    });
}

function mKick(t) {
    const o = mCtx.createOscillator(), g = mCtx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g);
    g.connect(mMaster);
    o.start(t);
    o.stop(t + 0.3);
}

function mNoiseHit(t, dur, vol, type, freq) {                 // soft clap / hi-hat
    const s = mCtx.createBufferSource(), f = mCtx.createBiquadFilter(), g = mCtx.createGain();
    s.buffer = mNoise;
    f.type = type;
    f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(mMaster);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
}

function mSchedule() {
    while (mNext < mCtx.currentTime + 0.3) {
        const s = mStep % 32, bar = Math.floor(s / 8), beat = s % 8, t = mNext;
        const pad = M_PADS[bar];
        if (beat === 0) pad.forEach(n => mPad(mHz(n), t, M_STEP * 8, 0.035));
        if (beat === 0 || beat === 4) mTone(mHz(M_BASS[bar]), t, M_STEP * 3.5, 0.28, 'triangle');
        if (beat === 3 || beat === 7) mTone(mHz(M_BASS[bar] + 12), t, M_STEP * 1.2, 0.1, 'triangle');
        if (beat % 2 === 0) mTone(mHz(pad[(beat / 2) % 4] + 12), t, M_STEP * 1.5, 0.045, 'triangle', true);
        if (M_MEL[s] > 0) mTone(mHz(M_MEL[s]), t, M_STEP * 2.2, 0.11, 'sine', true);
        if (beat === 0 || beat === 4) mKick(t);
        if (beat === 2 || beat === 6) mNoiseHit(t, 0.12, 0.1, 'bandpass', 1800);
        mNoiseHit(t, 0.04, beat % 2 ? 0.035 : 0.02, 'highpass', 7000);
        mStep++;
        mNext += M_STEP;
    }
}

function startMusic() {
    if (!musicOn || mTimer) return;
    if (!mCtx) {
        mCtx = new (window.AudioContext || window.webkitAudioContext)();
        const comp = mCtx.createDynamicsCompressor();             // keeps loud parts from clipping
        comp.threshold.value = -14;
        comp.ratio.value = 4;
        mMaster = mCtx.createGain();
        mMaster.gain.value = M_VOL;
        mMaster.connect(comp);
        comp.connect(mCtx.destination);

        mPadBus = mCtx.createBiquadFilter();
        mPadBus.type = 'lowpass';
        mPadBus.frequency.value = 900;
        mPadBus.connect(mMaster);

        const delay = mCtx.createDelay(1), fb = mCtx.createGain(), wet = mCtx.createGain();
        delay.delayTime.value = M_STEP * 1.5;                     // dotted-eighth echo
        fb.gain.value = 0.38;
        wet.gain.value = 0.5;
        mEchoSend = mCtx.createGain();
        mEchoSend.gain.value = 0.6;
        mEchoSend.connect(delay);
        delay.connect(fb);
        fb.connect(delay);
        delay.connect(wet);
        wet.connect(mMaster);

        const len = mCtx.sampleRate;                              // 1s of noise for drums
        mNoise = mCtx.createBuffer(1, len, mCtx.sampleRate);
        const d = mNoise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    mCtx.resume();
    mNext = mCtx.currentTime + 0.1;
    mTimer = setInterval(mSchedule, 100);
}

function stopMusic() {
    clearInterval(mTimer);
    mTimer = null;
    if (mCtx) mCtx.suspend();
}

function setMusic(on) {
    musicOn = on;
    on ? startMusic() : stopMusic();
}

// browsers only allow audio after a tap/click, so start on the first one
document.addEventListener('pointerdown', startMusic, { once: true });

// pause when the tab is hidden (saves battery)
document.addEventListener('visibilitychange', () => {
    if (!mCtx || !musicOn) return;
    if (document.hidden) stopMusic(); else startMusic();
});