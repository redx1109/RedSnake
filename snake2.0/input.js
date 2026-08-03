function s2SetupBoostButton() {
    const btn = document.querySelector('#s2BoostBtn');

    // clear any leftover interval from a previous round
    clearInterval(s2BoostDrainTimer);
    s2Boosting = false;
    s2Speed = s2NormalSpeed;

    // remove old listeners before adding new ones (prevents duplicate stacking on restart)
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    function startBoost(e) {
        e.preventDefault();
        if (s2Snake.length <= s2Length) return;
        s2Boosting = true;
        s2Speed = s2BoostSpeed;
        s2BoostDrainTimer = setInterval(() => {
            if (s2Snake.length > s2Length) {
                const dropped = s2Snake.pop();
                if (s2Foods.length + s2BigFoods.length < S2_MAX_FOOD) {
                    s2Foods.push({ x: dropped.x, y: dropped.y });
                }
            } else {
                stopBoost();
            }
        }, 150);
    }
    function stopBoost() {
        s2Boosting = false;
        s2Speed = s2NormalSpeed;
        clearInterval(s2BoostDrainTimer);
    }
    newBtn.addEventListener('mousedown', startBoost);
    newBtn.addEventListener('mouseup', stopBoost);
    newBtn.addEventListener('mouseleave', stopBoost);
    newBtn.addEventListener('touchstart', startBoost, { passive: false });
    newBtn.addEventListener('touchend', stopBoost);
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !s2Boosting && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.querySelector('#s2BoostBtn').dispatchEvent(new Event('mousedown'));
    }
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        document.querySelector('#s2BoostBtn').dispatchEvent(new Event('mouseup'));
    }
});

function s2HandleMouse(e) {
    if (!s2PointerLocked) return;
    s2JoystickX += e.movementX;
    s2JoystickY += e.movementY;
    const maxOffset = 150;
    const dist = Math.hypot(s2JoystickX, s2JoystickY);
    if (dist > maxOffset) {
        s2JoystickX = (s2JoystickX/dist) * maxOffset;
        s2JoystickY = (s2JoystickY/dist) * maxOffset;
    }
}

document.addEventListener('pointerlockchange', () => {
    s2PointerLocked = document.pointerLockElement === s2canvas;
    document.querySelector('#s2ClickHint').style.display = s2PointerLocked ? 'none' : 'block';
});

function s2HandleKeydown(e) {
    const key = e.key.toLowerCase();
    if (['arrowleft','a'].includes(key)) { s2UsingKeyboard = true; s2TargetAngle = Math.PI; }
    else if (['arrowright','d'].includes(key)) { s2UsingKeyboard = true; s2TargetAngle = 0; }
    else if (['arrowup','w'].includes(key)) { s2UsingKeyboard = true; s2TargetAngle = -Math.PI/2; }
    else if (['arrowdown','s'].includes(key)) { s2UsingKeyboard = true; s2TargetAngle = Math.PI/2; }
}

function s2SetupJoystick() {
    const container = document.querySelector('#snake2container');
    const joy = document.querySelector('#s2Joystick');
    const knob = document.querySelector('#s2JoystickKnob');
    const maxKnobOffset = 30;
    const maxOffset = 150;

    function start(e) {
        const t = e.touches[0];
        s2JoystickCenterX = t.clientX;
        s2JoystickCenterY = t.clientY;
        joy.style.left = s2JoystickCenterX + 'px';
        joy.style.top = s2JoystickCenterY + 'px';
        joy.style.display = 'block';
        s2JoystickActive = true;
        knob.style.left = '30px';
        knob.style.top = '30px';
    }

    function move(e) {
        if (!s2JoystickActive) return;
        e.preventDefault();
        const t = e.touches[0];
        let dx = t.clientX - s2JoystickCenterX;
        let dy = t.clientY - s2JoystickCenterY;
        const dist = Math.hypot(dx, dy);
        const clamped = Math.min(dist, maxKnobOffset);
        if (dist > 0) {
            dx = (dx/dist) * clamped;
            dy = (dy/dist) * clamped;
        }
        knob.style.left = (30 + dx) + 'px';
        knob.style.top = (30 + dy) + 'px';

        if (dist > 5) {
            s2JoystickX = (dx/clamped) * maxOffset;
            s2JoystickY = (dy/clamped) * maxOffset;
        }
    }

    function end() {
        s2JoystickActive = false;
        joy.style.display = 'none';
        s2JoystickX = 0;
        s2JoystickY = 0;
    }

    container.addEventListener('touchstart', start, { passive: true });
    container.addEventListener('touchmove', move, { passive: false });
    container.addEventListener('touchend', end);
}