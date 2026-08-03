let s2canvas, s2ctx;
let s2Snake = []; // array of {x,y} points along the trail
let s2Angle = 0; // current heading in radians
let s2TargetAngle = 0;
let s2Mode = 'endless';
let s2Speed = 2.5; // pixels per frame
let s2SegmentSpacing = 6;
let s2Length = 40; // number of trail points to keep
let s2Running = false;
let s2UsingKeyboard = false;
const WORLD_SIZE = 6000; // world is much bigger than any screen
let s2CameraX = 0, s2CameraY = 0;
const S2_MAX_FOOD = 400; // hard cap on combined food + big food count
let s2Foods = []; // array of {x, y}
const S2_FOOD_COUNT = 30; // scattered across the world at once
const S2_BIG_FOOD_COUNT = 10;
let s2PointerLocked = false;
let s2Boosting = false;
const s2NormalSpeed = 2.5;
const s2BoostSpeed = 5;
let s2BoostDrainTimer = null;
const botThickness = 24;
let killedByPlayer = false;
let s2PlayerKills = 0;
let s2BigFoods = [];
let s2ZoneRadius = WORLD_SIZE * 0.6;
let s2ZoneCenter = { x: WORLD_SIZE/2, y: WORLD_SIZE/2 };
let s2ZoneShrinkInterval = null;
let s2LastKillTime = 0;
const S2_MAX_TURN_RATE = 0.15; // max radians a snake can turn per frame — smaller = wider turning radius
let s2HuntTimeLeft = 0;
let s2HuntInterval = null;

let s2JoystickX = 0, s2JoystickY = 0; // accumulated offset from center, clamped
let s2JoystickActive = false;
let s2JoystickCenterX = 0, s2JoystickCenterY = 0;
let s2Bots = [];
const S2_BOT_COUNT = 99;
let s2CircleAmount = 0;