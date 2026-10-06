function s2SpawnBigFood() {
    if (s2Mode === 'hunt' || s2BigFoods.length >= S2_BIG_FOOD_COUNT) return;
    let x, y, tooClose;
    do {
        x = Math.random() * WORLD_SIZE;
        y = Math.random() * WORLD_SIZE;
        tooClose = s2Foods.some(f => Math.hypot(f.x - x, f.y - y) < 60)
            || s2BigFoods.some(f => Math.hypot(f.x - x, f.y - y) < 60);
    } while (tooClose);
    s2BigFoods.push({ x, y, color: `hsl(${Math.floor(Math.random()*360)},90%,60%)`, ox: x, oy: y, orbitA: Math.random()*Math.PI*2 });
}

function s2InitBigFood() {
    s2BigFoods = [];
    for (let i = 0; i < S2_BIG_FOOD_COUNT; i++) s2SpawnBigFood();
}

function s2SpawnFood() {
    if (s2Mode === 'hunt' || s2Foods.length >= S2_FOOD_COUNT) return;
    let x, y, tooClose;
    do {
        x = Math.random() * WORLD_SIZE;
        y = Math.random() * WORLD_SIZE;
        tooClose = s2Foods.some(f => Math.hypot(f.x - x, f.y - y) < 50)
            || s2BigFoods.some(f => Math.hypot(f.x - x, f.y - y) < 50);
    } while (tooClose);
    s2Foods.push({ x, y, color: `hsl(${Math.floor(Math.random()*360)},90%,60%)`, ox: x, oy: y, orbitA: Math.random()*Math.PI*2 });
}

function s2InitFood() {
    s2Foods = [];
    for (let i = 0; i < S2_FOOD_COUNT; i++) s2SpawnFood();
}

function s2DropFoodTrail(snakeArr) {
    const bigChance = Math.min(0.02 + (snakeArr.length / 600), 0.25);
    for (let i = 0; i < snakeArr.length; i += 4) {
        if (s2Foods.length + s2BigFoods.length >= S2_MAX_FOOD) break;
        const p = snakeArr[i];
        const food = { x: p.x, y: p.y, color: `hsl(${Math.floor(Math.random()*360)},90%,60%)`, ox: p.x, oy: p.y, orbitA: Math.random()*Math.PI*2 };
        (Math.random() < bigChance ? s2BigFoods : s2Foods).push(food);
    }
}
