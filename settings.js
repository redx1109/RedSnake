document.querySelector('#settingsbtn').addEventListener('click', () => {
    document.querySelector('#homescreen').classList.add('hidden');
    document.querySelector('#settingsscreen').classList.remove('hidden');
    document.querySelector('#settingsUsername').value = myUsername;
    document.querySelector('#soundToggle').checked = soundOn;
    document.querySelectorAll('.colorSwatch').forEach(el => {
        el.classList.toggle('selected', el.dataset.color === snakeHeadColor);
    });
    document.querySelectorAll('.skinSwatch').forEach(el => {
        el.classList.toggle('selected', el.dataset.skin === snakeSkin);
    });
});

document.querySelectorAll('.colorSwatch').forEach(el => {
    el.addEventListener('click', () => {
        document.querySelectorAll('.colorSwatch').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        snakeHeadColor = el.dataset.color;
    });
});

document.querySelectorAll('.skinSwatch').forEach(el => {
    el.addEventListener('click', () => {
        document.querySelectorAll('.skinSwatch').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        snakeSkin = el.dataset.skin;
    });
});

document.querySelector('#saveSettingsBtn').addEventListener('click', () => {
    myUsername = document.querySelector('#settingsUsername').value.trim() || myUsername;
    soundOn = document.querySelector('#soundToggle').checked;
    localStorage.setItem('rs_username', myUsername);
    localStorage.setItem('rs_sound', soundOn);
    localStorage.setItem('rs_color', snakeHeadColor);
    document.querySelector('#settingsscreen').classList.add('hidden');
    document.querySelector('#homescreen').classList.remove('hidden');
});

document.querySelector('#backHomeBtn').addEventListener('click', () => {
    document.querySelector('#settingsscreen').classList.add('hidden');
    document.querySelector('#homescreen').classList.remove('hidden');
});
