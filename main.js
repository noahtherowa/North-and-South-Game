let gameState = "START";
let level = 1;
let maxLevels = 3;

let p1, p2, boss;
let enemies = [];
let platforms = [];
let hazards = []; // New deadly obstacles
let keys = {};

function setup() {
  createCanvas(800, 800); // Scaled up canvas
  noStroke();
  initLevel();
}

function draw() {
  background(20, 30, 50);

  if (gameState === "START") {
    drawStartScreen();
  } else if (gameState === "PLAY") {
    updatePlayers();
    updateEnemies();
    
    drawSafeZones();
    drawHazards();
    drawPlatforms();
    drawEquator();
    drawAuras();
    drawPlayers();
    drawEnemies();
    
    checkLevelComplete();
  } else if (gameState === "BOSS") {
    updatePlayers();
    updateBoss();
    
    drawSafeZones();
    drawHazards();
    drawPlatforms();
    drawEquator();
    drawAuras();
    drawPlayers();
    drawBoss();
  } else if (gameState === "GAMEOVER") {
    drawGameOverScreen();
  } else if (gameState === "WIN") {
    drawWinScreen();
  }
}

// --- INITIALIZATION ---
function initLevel() {
  // P1 spawns top, P2 spawns bottom
  p1 = new Player(390, 40, color(255, 50, 50), 0.6);
  p2 = new Player(390, 740, color(50, 150, 255), -0.6);
  
  enemies = [];
  platforms = [];
  hazards = [];

  // Generate Safe Starting Platforms (Y: 80 and Y: 705)
  createPlatform(350, 80, 100, 15);

  // Generate Level Layouts
  if (level === 1) {
    createPlatform(150, 180, 150, 15);
    createPlatform(500, 250, 150, 15);
    createPlatform(300, 320, 200, 15);
  } else if (level === 2) {
    // Introduction of hazards
    createPlatform(100, 180, 80, 15);
    createHazard(180, 180, 40, 15); 
    createPlatform(220, 180, 80, 15);
    
    createPlatform(600, 250, 80, 15);
    createHazard(500, 250, 100, 15);
    
    createPlatform(400, 320, 80, 15);
    createPlatform(250, 320, 80, 15);
    createHazard(330, 320, 70, 15);
  } else if (level >= 3) {
    // Hard platforming
    createPlatform(50, 150, 50, 15);
    createHazard(100, 150, 150, 15);
    createPlatform(250, 150, 50, 15);
    
    createPlatform(600, 220, 60, 15);
    createPlatform(450, 280, 60, 15);
    createHazard(510, 280, 150, 15);
    
    createPlatform(200, 340, 50, 15);
    createHazard(250, 340, 300, 15);
    createPlatform(550, 340, 50, 15);

    if (level > maxLevels) {
      boss = { x: 400, y: 400, size: 50, hp: 150, color: color(150, 0, 255) };
    }
  }

  // Generate more enemies, moving slightly faster
  if (level <= maxLevels) {
    let enemyCount = level * 6 + 4; // Scales harder
    for (let i = 0; i < enemyCount; i++) {
      enemies.push({
        x: random(100, 700), 
        y: random(130, 670), // Danger Zone
        vx: random(-3, 3), 
        vy: random(-3, 3),
        size: 15
      });
    }
  }
}

function createPlatform(x, y, w, h) {
  platforms.push({ x: x, y: y, w: w, h: h }); 
  platforms.push({ x: x, y: height - y - h, w: w, h: h }); 
}

function createHazard(x, y, w, h) {
  hazards.push({ x: x, y: y, w: w, h: h });
  hazards.push({ x: x, y: height - y - h, w: w, h: h });
}

// --- PLAYER CLASS ---
class Player {
  constructor(x, y, col, grav) {
    this.x = x;
    this.y = y;
    this.size = 20;
    this.color = col;
    this.vx = 0;
    this.vy = 0;
    this.gravity = grav;
    this.speed = 5; // Faster to cover 800px width
    this.jumpForce = grav > 0 ? -14 : 14; // Stronger jump
    this.onGround = false;
  }

  update(leftKey, rightKey, jumpKey) {
    // Horizontal Movement
    if (keys[leftKey]) this.vx = -this.speed;
    else if (keys[rightKey]) this.vx = this.speed;
    else this.vx = 0;

    this.x += this.vx;
    
    if (this.x < 0) this.x = 0;
    if (this.x + this.size > width) this.x = width - this.size;

    // Jumping
    if (keys[jumpKey] && this.onGround) {
      this.vy = this.jumpForce;
      this.onGround = false;
    }

    // Apply Gravity
    this.vy += this.gravity;
    let nextY = this.y + this.vy;
    this.onGround = false;

    // Jump-Through Platform Collisions
    for (let p of platforms) {
      if (this.x + this.size > p.x && this.x < p.x + p.w) {
        if (this.gravity > 0 && this.vy > 0) {
          if (this.y + this.size <= p.y && nextY + this.size >= p.y) {
            nextY = p.y - this.size;
            this.vy = 0;
            this.onGround = true;
          }
        }
        if (this.gravity < 0 && this.vy < 0) {
          if (this.y >= p.y + p.h && nextY <= p.y + p.h) {
            nextY = p.y + p.h;
            this.vy = 0;
            this.onGround = true;
          }
        }
      }
    }
    
    // Equator collision (Central block at Y: 390 to 410)
    let eqY = 390; let eqH = 20;
    if (this.x + this.size > 0 && this.x < width) {
        if (this.gravity > 0 && this.vy > 0 && this.y + this.size <= eqY && nextY + this.size >= eqY) {
            nextY = eqY - this.size;
            this.vy = 0;
            this.onGround = true;
        }
        if (this.gravity < 0 && this.vy < 0 && this.y >= eqY + eqH && nextY <= eqY + eqH) {
            nextY = eqY + eqH;
            this.vy = 0;
            this.onGround = true;
        }
    }

    // Screen bounds (Y) 
    if (this.gravity > 0 && nextY < 0) nextY = 0;
    if (this.gravity < 0 && nextY + this.size > height) nextY = height - this.size;

    this.y = nextY;

    // Hazard Collisions
    for (let h of hazards) {
      if (this.x < h.x + h.w && this.x + this.size > h.x &&
          this.y < h.y + h.h && this.y + this.size > h.y) {
        gameState = "GAMEOVER";
      }
    }
  }
}

// --- ENTITY UPDATES ---
function updatePlayers() {
  p1.update(65, 68, 87); // A, D, W
  p2.update(37, 39, 38); // Left, Right, Up
}

function updateEnemies() {
  for (let e of enemies) {
    e.x += e.vx; e.y += e.vy;

    if (e.x < 0 || e.x > width) e.vx *= -1;
    
    // Enemies bounce off safe zones (Top 100px, Bottom 100px)
    if (e.y < 100 || e.y > 700) e.vy *= -1;

    // Check collision with players
    if (dist(p1.x + p1.size/2, p1.y + p1.size/2, e.x, e.y) < (p1.size/2 + e.size/2) ||
        dist(p2.x + p2.size/2, p2.y + p2.size/2, e.x, e.y) < (p2.size/2 + e.size/2)) {
      gameState = "GAMEOVER";
    }
  }
}

function updateBoss() {
  let d1 = dist(boss.x, boss.y, p1.x, p1.y);
  let d2 = dist(boss.x, boss.y, p2.x, p2.y);
  let target = d1 < d2 ? p1 : p2;

  let angle = atan2(target.y - boss.y, target.x - boss.x);
  boss.x += cos(angle) * 2; // Faster boss
  boss.y += sin(angle) * 2;

  let playerDist = dist(p1.x, p1.y, p2.x, p2.y);
  let isPoweredUp = playerDist < 100; // Require them to be close

  if (dist(p1.x + p1.size/2, p1.y + p1.size/2, boss.x, boss.y) < (p1.size/2 + boss.size/2) ||
      dist(p2.x + p2.size/2, p2.y + p2.size/2, boss.x, boss.y) < (p2.size/2 + boss.size/2)) {
    if (isPoweredUp) boss.hp -= 1.5;
    else gameState = "GAMEOVER";
  }

  if (boss.hp <= 0) gameState = "WIN";
}

// --- DRAWING ---
function drawSafeZones() {
  fill(255, 255, 255, 10);
  rect(0, 0, width, 100);
  rect(0, 700, width, 100);
}

function drawPlatforms() {
  fill(100, 150, 100);
  for (let p of platforms) rect(p.x, p.y, p.w, p.h, 5);
}

function drawHazards() {
  fill(255, 50, 0); // Neon Lava Orange/Red
  for (let h of hazards) rect(h.x, h.y, h.w, h.h, 5);
}

function drawEquator() {
  fill(255, 200, 0);
  rect(0, 390, width, 20);
  fill(0); textAlign(CENTER); textSize(12);
  text("EQUATOR", width / 2, 405);
  
  if (gameState === "PLAY") {
    fill(255); textAlign(LEFT); textSize(16);
    text("Level: " + level, 10, 20);
  }
}

function drawAuras() {
  let cx1 = p1.x + p1.size/2; let cy1 = p1.y + p1.size/2;
  let cx2 = p2.x + p2.size/2; let cy2 = p2.y + p2.size/2;
  let d = dist(cx1, cy1, cx2, cy2);
  let auraRadius = map(d, 0, height, 120, 30);
  
  if (d < 100) {
    fill(255, 255, 255, 120); 
    ellipse((cx1 + cx2)/2, (cy1 + cy2)/2, auraRadius * 2);
  } else {
    fill(255, 50, 50, 50); ellipse(cx1, cy1, auraRadius);
    fill(50, 150, 255, 50); ellipse(cx2, cy2, auraRadius);
  }
}

function drawPlayers() {
  fill(p1.color); rect(p1.x, p1.y, p1.size, p1.size, 3);
  fill(p2.color); rect(p2.x, p2.y, p2.size, p2.size, 3);
}

function drawEnemies() {
  fill(30, 200, 100);
  for (let e of enemies) ellipse(e.x, e.y, e.size);
}

function drawBoss() {
  fill(boss.color); ellipse(boss.x, boss.y, boss.size);
  fill(255, 0, 0); rect(boss.x - 40, boss.y - 45, 80, 5);
  fill(0, 255, 0); rect(boss.x - 40, boss.y - 45, map(boss.hp, 0, 150, 0, 80), 5);
}

// --- GAME LOGIC ---
function checkLevelComplete() {
  if (p1.y + p1.size === 390 && p2.y === 410) {
    level++;
    if (level > maxLevels) gameState = "BOSS";
    else initLevel();
  }
}

// --- MENUS & INPUT ---
function drawStartScreen() {
  textAlign(CENTER); fill(255);
  textSize(32); text("THE SEVERED SOULS: ASCENSION", width / 2, 300);
  textSize(18);
  text("P1 (Red): A, D to move, W to Jump", width / 2, 350);
  text("P2 (Blue): Left, Right to move, Up Arrow to Jump", width / 2, 380);
  fill(255, 100, 100); text("Avoid Green Monsters and Red Lava Blocks.", width / 2, 420);
  fill(255, 200, 0); text("Click canvas, then Press SPACE to Start", width / 2, 500);
}

function drawGameOverScreen() {
  textAlign(CENTER); fill(255, 50, 50);
  textSize(40); text("YOU DIED", width / 2, height / 2);
  fill(255); textSize(18); text("Press 'R' to Restart", width / 2, height / 2 + 50);
}

function drawWinScreen() {
  textAlign(CENTER); fill(50, 255, 50);
  textSize(40); text("EARTH IS FREED", width / 2, height / 2);
  fill(255); textSize(18); text("Press 'R' to Play Again", width / 2, height / 2 + 50);
}

function keyPressed() {
  keys[keyCode] = true;
  if (gameState === "START" && key === ' ') gameState = "PLAY";
  if ((gameState === "GAMEOVER" || gameState === "WIN") && (key === 'r' || key === 'R')) {
    level = 1; gameState = "PLAY"; initLevel();
  }
}
function keyReleased() { keys[keyCode] = false; }
