
/* ============================
   ELEMENTS
   ============================ */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const welcomeScreen = document.getElementById("welcomeScreen");
const enterGameBtn = document.getElementById("enterGameBtn");

const vehicleScreen = document.getElementById("vehicleScreen");
const confirmVehicleBtn = document.getElementById("confirmVehicleBtn");

const modeScreen = document.getElementById("modeScreen");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const levelCompleteScreen = document.getElementById("levelCompleteScreen");

const nextLevelBtn = document.getElementById("nextLevelBtn");
const restartBtn = document.getElementById("restartBtn");
const menuBtn = document.getElementById("menuBtn");
const startBtn = document.getElementById("startBtn");

const completedMissionTitle = document.getElementById("completedMissionTitle");
const missionTitle = document.getElementById("missionTitle");
const missionDesc = document.getElementById("missionDesc");
const missionStatus = document.getElementById("missionStatus");

const scoreBox = document.getElementById("scoreBox");
const finalScoreEl = document.getElementById("finalScore");
const bestScoreEl = document.getElementById("bestScore");


/* ============================
   GLOBALS
   ============================ */

let selectedVehicle = "car";
let gameMode = "";
let currentMission = 0;

let enemyCars = [];
let coins = [];
let car, speed, score, distance, timeAlive, dodged;
let spawnInterval, coinInterval, animationId;

let gameState = "menu";

/* ============================
   HYBRID CONTROL (BUTTON + TILT)
   ============================ */

let tiltX = 0;
let motionEnabled = false;

/* ============================
   LANES (UPDATED)
   ============================ */

const lanes = [50, 140, 230]; // PERFECT 3-lane spacing
const laneShift = 90; // movement per left/right press


/* ============================
   RANK SYSTEM
   ============================ */

let rank = "Bronze";

function updateRank(score, distance) {
  let points = Math.floor(score + distance);

  if (points >= 2000) rank = "Master";
  else if (points >= 1200) rank = "Diamond";
  else if (points >= 700) rank = "Gold";
  else if (points >= 400) rank = "Silver";
  else rank = "Bronze";
}


/* ============================
   WEATHER SYSTEM
   ============================ */

let weather = "clear";
let weatherTimer = 0;

function randomWeather() {
  const types = ["clear", "rain", "fog", "night"];
  weather = types[Math.floor(Math.random() * types.length)];
}

function drawRain() {
  ctx.fillStyle = "#ffffff66";
  for (let i = 0; i < 30; i++) {
    ctx.fillRect(Math.random() * 300, Math.random() * 500, 2, 12);
  }
}

function drawFog() {
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(0, 0, 300, 500);
}

function drawNight() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, 300, 500);

  ctx.fillStyle = "rgba(255,255,200,0.3)";
  ctx.beginPath();
  ctx.moveTo(car.x + car.width/2, car.y);
  ctx.lineTo(car.x - 80, 500);
  ctx.lineTo(car.x + 160, 500);
  ctx.fill();
}


/* ============================
   MISSIONS
   ============================ */

const missions = {
  story: [
    { title: "Story 1", desc: "Collect 10 coins", goal: g => g.coins >= 10 },
    { title: "Story 2", desc: "Travel 300m", goal: g => g.dist >= 300 },
    { title: "Story 3", desc: "Survive 30s", goal: g => g.time >= 30 },
  ],

  linear: [
    { title: "Level 1", desc: "Score 50 points", goal: g => g.score >= 50 },
    { title: "Level 2", desc: "Dodge 10 cars", goal: g => g.dodged >= 10 },
    { title: "Level 3", desc: "Travel 500m", goal: g => g.dist >= 500 },
  ],

  free: [
    { title: "Free Mission", desc: "Collect 20 coins", goal: g => g.coins >= 20 },
    { title: "Free Mission", desc: "Travel 200m", goal: g => g.dist >= 200 },
    { title: "Free Mission", desc: "Score 150", goal: g => g.score >= 150 },
  ],

  season: [
    { title: "Season 1", desc: "Score 100", goal: g => g.score >= 100 },
    { title: "Season 2", desc: "Survive 40s", goal: g => g.time >= 40 },
    { title: "Season 3", desc: "Collect 30 coins", goal: g => g.coins >= 30 },
  ]
};


/* ============================
   RESET GAME + VEHICLE CONFIG
   ============================ */

function resetGame() {

  if (selectedVehicle === "car") {
    car = { x: 140, y: 420, width: 40, height: 60, targetX: 140 };
    speed = 7;
  }

  if (selectedVehicle === "bike") {
    car = { x: 140, y: 430, width: 25, height: 50, targetX: 140 };
    speed = 9;
  }

  if (selectedVehicle === "truck") {
    car = { x: 130, y: 400, width: 60, height: 90, targetX: 140 };
    speed = 5;
  }

  enemyCars = [];
  coins = [];
  score = 0;
  distance = 0;
  timeAlive = 0;
  dodged = 0;
}


/* ============================
   LOAD MISSION
   ============================ */

function loadMission() {
  const m = missions[gameMode][currentMission];
  missionTitle.innerText = m.title;
  missionDesc.innerText = m.desc;
}


/* ============================
   START GAME
   ============================ */
if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
  enableMotionControl();
}

function startGame() {
  resetGame();
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");

  spawnInterval = setInterval(createEnemy, 900);
  coinInterval = setInterval(createCoin, 1200);

  animationId = requestAnimationFrame(gameLoop);
  gameState = "playing";
}


/* ============================
   STOP EVERYTHING
   ============================ */

function stopAll() {
  clearInterval(spawnInterval);
  clearInterval(coinInterval);
  cancelAnimationFrame(animationId);
}


/* ============================
   DRAW ROAD
   ============================ */

let roadOffset = 0;

function drawRoad() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 300, 500);

  ctx.strokeStyle = "#fff4";
  ctx.lineWidth = 4;

  for (let y = -50; y < 600; y += 60) {
    ctx.beginPath();
    ctx.moveTo(150, y + roadOffset);
    ctx.lineTo(150, y + 30 + roadOffset);
    ctx.stroke();
  }

  roadOffset += 6;
  if (roadOffset >= 60) roadOffset = 0;
}


/* ============================
   SPAWN ENEMY + COINS
   ============================ */

function createEnemy() {
  const lane = lanes[Math.floor(Math.random() * 3)];

  enemyCars.push({
    x: lane,
    y: -80,
    w: 40,
    h: 60,
    speed: speed * 1.7
  });
}

function createCoin() {
  coins.push({
    x: lanes[Math.floor(Math.random() * 3)],
    y: -20,
    size: 12
  });
}


/* ============================
   INPUT CONTROL
   ============================ */

document.addEventListener("keydown", e => {
  if (gameState !== "playing") return;

  if (e.key === "ArrowLeft" && car.targetX > 50)
    car.targetX -= laneShift;

  if (e.key === "ArrowRight" && car.targetX < 230)
    car.targetX += laneShift;
});


/* ============================
   MAIN GAME LOOP
   ============================ */

function gameLoop() {

  drawRoad();

  // WEATHER
  weatherTimer++;
  if (weatherTimer > 600) {
    randomWeather();
    weatherTimer = 0;
  }

  if (weather === "rain") drawRain();
  if (weather === "fog") drawFog();
  if (weather === "night") drawNight();

  // CAR MOVEMENT
  // BUTTON / KEYBOARD (lane based)
car.x += (car.targetX - car.x) * 0.2;

// MOTION CONTROL (fine movement)
if (motionEnabled && Math.abs(tiltX) > 5) {
  car.x += tiltX * 0.4; // sensitivity
}

// BOUNDARY
if (car.x < 30) car.x = 30;
if (car.x > 230) car.x = 230;


  ctx.fillStyle = "cyan";
  ctx.fillRect(car.x, car.y, car.width, car.height);

  distance += 0.15;
  timeAlive += 0.016;

  updateScoreUI();

  // COINS
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];

    ctx.fillStyle = "gold";
    ctx.beginPath();
    ctx.arc(c.x + 10, c.y + 10, c.size, 0, Math.PI * 2);
    ctx.fill();

    c.y += speed;

    if (c.y > 600) coins.splice(i, 1);

    if (hit(car, c)) {
      score += 5;
      coins.splice(i, 1);
    }
  }

  // ENEMIES
  for (let i = enemyCars.length - 1; i >= 0; i--) {
    const e = enemyCars[i];

    ctx.fillStyle = "red";
    ctx.fillRect(e.x, e.y, e.w, e.h);

    e.y += speed * 1.5;

    if (e.y > 600) {
      enemyCars.splice(i, 1);
      dodged++;
    }

    if (hit(car, e)) {
      endMission(false);
      return;
    }
  }


  // MISSION CHECK
  const g = {
    score,
    coins: score / 5,
    dist: distance,
    time: timeAlive,
    dodged
  };

  if (missions[gameMode][currentMission].goal(g)) {
    endMission(true);
    return;
  }

  animationId = requestAnimationFrame(gameLoop);
}


/* ============================
   COLLISION CHECK
   ============================ */

function hit(a, b) {
  return (
    a.x < b.x + (b.w || 20) &&
    a.x + a.width > b.x &&
    a.y < b.y + (b.h || 20) &&
    a.y + a.height > b.y
  );
}


/* ============================
   END MISSION
   ============================ */

function endMission(success) {
  stopAll();
  gameState = "over";

  updateRank(score, distance);

  if (success) {
    const m = missions[gameMode][currentMission];

    completedMissionTitle.innerText =
      m.title + " Completed! | Rank: " + rank;

    levelCompleteScreen.classList.remove("hidden");

    currentMission++;
    if (currentMission >= missions[gameMode].length)
      currentMission = 0;

  } else {
    missionStatus.innerText = "MISSION FAILED | Rank: " + rank;

    finalScoreEl.innerText = "Score: " + Math.floor(score);

    const prev = localStorage.getItem("best") || 0;
    if (score > prev) localStorage.setItem("best", score);
    bestScoreEl.innerText =
      "High Score: " + Math.max(prev, score);

    gameOverScreen.classList.remove("hidden");
  }
}


/* ============================
   SCORE UI UPDATE
   ============================ */

function updateScoreUI() {
  scoreBox.innerText =
    "Score: " + Math.floor(score) +
    " | Dist: " + Math.floor(distance) +
    "m | Rank: " + rank;
}


/* ============================
   MODE SELECT
   ============================ */

document.querySelectorAll(".modeBtn").forEach(btn => {
  btn.onclick = () => {
    gameMode = btn.dataset.mode;
    currentMission = 0;

    modeScreen.classList.add("hidden");
    vehicleScreen.classList.remove("hidden"); // SHOW VEHICLE SELECT
  };
});


/* ============================
   VEHICLE SELECT
   ============================ */

document.querySelectorAll(".vehicleBtn").forEach(btn => {
  btn.onclick = () => {
    selectedVehicle = btn.dataset.vehicle;
  };
});

confirmVehicleBtn.onclick = () => {
  vehicleScreen.classList.add("hidden");
  loadMission();
  startScreen.classList.remove("hidden");
};


/* ============================
   BUTTONS
   ============================ */

startBtn.onclick = startGame;
startBtn.onclick = () => {
  enableMotionControl();   // 👈 ADD THIS LINE
  startGame();
};

restartBtn.onclick = () => {
  loadMission();
  startScreen.classList.remove("hidden");
  gameOverScreen.classList.add("hidden");
};

menuBtn.onclick = () => location.reload();

nextLevelBtn.onclick = () => {
  levelCompleteScreen.classList.add("hidden");
  loadMission();
  startScreen.classList.remove("hidden");
};


/* ============================
   WELCOME → MODE
   ============================ */

enterGameBtn.onclick = () => {
  welcomeScreen.classList.add("hidden");

  document.getElementById("title").classList.remove("hidden");
  document.getElementById("scoreBox").classList.remove("hidden");
  document.getElementById("gameCanvas").classList.remove("hidden");

  modeScreen.classList.remove("hidden");
};
function enableMotionControl() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    // iOS
    DeviceOrientationEvent.requestPermission()
      .then(res => {
        if (res === "granted") {
          startMotion();
        }
      })
      .catch(console.error);
  } else {
    // Android
    startMotion();
  }
}

function startMotion() {
  motionEnabled = true;

  window.addEventListener("deviceorientation", (e) => {
    tiltX = e.gamma || 0; // left-right tilt
  });
}
/* ============================
   MOBILE TOUCH BUTTONS (JS ONLY)
   ============================ */

if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {

  const leftBtn = document.createElement("div");
  const rightBtn = document.createElement("div");

  leftBtn.innerHTML = "◀";
  rightBtn.innerHTML = "▶";

  document.body.appendChild(leftBtn);
  document.body.appendChild(rightBtn);

  const btnStyle = `
    position: fixed;
    bottom: 80px;
    width: 70px;
    height: 70px;
    background: rgba(0, 234, 255, 0.25);
    border: 2px solid #00eaff;
    border-radius: 50%;
    color: #00eaff;
    font-size: 32px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    user-select: none;
    backdrop-filter: blur(6px);
  `;

  leftBtn.style.cssText = btnStyle + "left: 20px;";
  rightBtn.style.cssText = btnStyle + "right: 20px;";

  /* TOUCH EVENTS */
  leftBtn.addEventListener("touchstart", () => {
    if (gameState === "playing" && car.targetX > 50) {
      car.targetX -= laneShift;
    }
  });

  rightBtn.addEventListener("touchstart", () => {
    if (gameState === "playing" && car.targetX < 230) {
      car.targetX += laneShift;
    }
  });
}
