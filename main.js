// ==========================================================
//  NORTH & SOUTH — THE SEVERED SOULS: ASCENSION
//  A cooperative gravity-flipped platformer
// ==========================================================

let gameState = "START";
let level = 1;
const MAX_LEVELS = 3;
let lives = 3;
let score = 0;
let combo = 0;
let comboTimer = 0;

let p1, p2, boss;
let enemies = [];
let platforms = [];
let hazards = [];
let collectibles = [];
let particles = [];
let stars = [];
let trails = [];
let scorePopups = [];
let keys = {};

let shakeMag = 0;
let transitionAlpha = 0;
let flashColor = null;
let frameCounter = 0;
let levelStartFrame = 0;
let hitStop = 0;
let paused = false;
let muted = false;

// Forgiving equator detection
let p1EquatorTimer = 0;
let p2EquatorTimer = 0;
const EQUATOR_WINDOW = 35;

// Background music
let musicTimer = 0;
let musicNoteIdx = 0;
const MUSIC_NOTES_PLAY = [220, 277, 330, 277, 220, 330, 392, 330];
const MUSIC_NOTES_BOSS = [110, 138, 165, 196, 165, 138, 110, 92];

// Audio
let audioCtx = null;
let masterGain = null;

function setupAudio() {
  // Modern browsers suspend any AudioContext created before a user gesture.
  // If we already have a context, resume it now (we're being called from a
  // user-gesture handler) so audio actually plays.
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 0.6;
    masterGain.connect(audioCtx.destination);
  } catch (e) {}
}

function beep(freq, dur, type = 'square', vol = 0.08, slide = 0.5) {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(masterGain);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t); osc.stop(t + dur);
}

function bgNote(freq, dur, vol = 0.025) {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(masterGain);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t); osc.stop(t + dur);
}

function sJump(grav)   { beep(grav > 0 ? 280 : 380, 0.09, 'triangle', 0.06, 1.4); }
function sDeath()      { beep(180, 0.4, 'sawtooth', 0.18, 0.3); setTimeout(() => beep(90, 0.4, 'sawtooth', 0.15, 0.4), 80); }
function sLevelUp()    { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'sine', 0.12, 1), i * 90)); }
function sBossHit()    { beep(70 + Math.random()*30, 0.12, 'square', 0.1, 0.5); }
function sWin()        { [392, 523, 659, 784, 988, 1318].forEach((f, i) => setTimeout(() => beep(f, 0.4, 'sine', 0.15, 1), i * 140)); }
function sCharge()     { beep(440, 0.3, 'sine', 0.08, 2); }
function sCollect()    { beep(800, 0.08, 'sine', 0.1, 1.3); setTimeout(() => beep(1200, 0.1, 'sine', 0.08, 1.2), 50); }
function sPause()      { beep(440, 0.05, 'square', 0.06, 1); }
function sTelegraph()  { beep(660, 0.12, 'sine', 0.05, 1); }

function updateMusic() {
  if (!audioCtx || muted) return;
  if (gameState !== 'PLAY' && gameState !== 'BOSS') return;
  if (paused) return;

  musicTimer++;
  let interval = gameState === 'BOSS' ? 22 : 30;
  if (musicTimer % interval === 0) {
    let notes = gameState === 'BOSS' ? MUSIC_NOTES_BOSS : MUSIC_NOTES_PLAY;
    let f = notes[musicNoteIdx % notes.length];
    bgNote(f, 0.4, 0.018);
    if (musicNoteIdx % 4 === 0) bgNote(f * 0.5, 0.6, 0.012);
    musicNoteIdx++;
  }
}

// ---- SETUP ----
function setup() {
  const c = createCanvas(800, 800);
  // Mount the canvas into the `<div id="game-canvas">` inside our page so
  // it sits cleanly inside the styled game-frame rather than being appended
  // to the bottom of <body>.
  c.parent('game-canvas');
  noStroke();
  textAlign(CENTER, CENTER);
  frameRate(60);
  setupAudio(); // Initialize audio context early

  for (let i = 0; i < 140; i++) {
    stars.push({
      x: random(width), y: random(height),
      r: random(0.4, 2.2),
      bright: random(80, 240),
      speed: random(0.01, 0.06),
      offset: random(TWO_PI)
    });
  }
  initLevel();
}

function draw() {
  // Hit-stop pause for impact
  if (hitStop > 0) {
    hitStop--;
    push();
    translate(random(-3, 3), random(-3, 3));
    drawBackground();
    drawStars();
    if (gameState === 'PLAY') drawPlayState();
    else if (gameState === 'BOSS') drawBossState();
    drawOverlays();
    pop();
    return;
  }

  if (paused && (gameState === 'PLAY' || gameState === 'BOSS')) {
    drawBackground();
    drawStars();
    if (gameState === 'PLAY') drawPlayState();
    else drawBossState();
    drawPauseOverlay();
    return;
  }

  frameCounter++;
  updateMusic();
  if (comboTimer > 0) comboTimer--; else combo = 0;

  // Screen shake
  let sx = 0, sy = 0;
  if (shakeMag > 0.2) {
    sx = random(-shakeMag, shakeMag);
    sy = random(-shakeMag, shakeMag);
    shakeMag *= 0.82;
  } else { shakeMag = 0; }

  push();
  translate(sx, sy);

  drawBackground();
  drawStars();

  if (gameState === "START")        drawStartScreen();
  else if (gameState === "PLAY")    runPlay();
  else if (gameState === "BOSS")    runBoss();
  else if (gameState === "GAMEOVER") drawGameOverScreen();
  else if (gameState === "WIN")     drawWinScreen();

  drawOverlays();
  pop();
}

function drawOverlays() {
  if (flashColor) {
    fill(flashColor.r, flashColor.g, flashColor.b, flashColor.a);
    rect(-20, -20, width + 40, height + 40);
    flashColor.a -= 12;
    if (flashColor.a <= 0) flashColor = null;
  }
  if (transitionAlpha > 0) {
    fill(255, 255, 255, transitionAlpha);
    rect(-20, -20, width + 40, height + 40);
    transitionAlpha = max(0, transitionAlpha - 8);
  }
}

function runPlay() {
  updatePlayers();
  updateEnemies();
  updateCollectibles();
  updateParticles();
  updateTrails();
  updateScorePopups();

  drawSafeZones();
  drawHazards();
  drawPlatforms();
  drawEquator();
  drawCollectibles();
  drawTrails();
  drawAuras();
  drawEnemies();
  drawPlayers();
  drawParticles();
  drawScorePopups();
  drawHUD();
  drawEquatorMarkers();

  checkLevelComplete();
}

function runBoss() {
  updatePlayers();
  updateBoss();
  updateParticles();
  updateTrails();
  updateScorePopups();

  drawSafeZones();
  drawPlatforms();
  drawEquator();
  drawTrails();
  drawAuras();
  drawPlayers();
  drawBoss();
  drawParticles();
  drawScorePopups();
  drawBossUI();
  drawHUD();
}

function drawPlayState() {
  drawSafeZones();
  drawHazards();
  drawPlatforms();
  drawEquator();
  drawCollectibles();
  drawTrails();
  drawAuras();
  drawEnemies();
  drawPlayers();
  drawParticles();
  drawHUD();
}

function drawBossState() {
  drawSafeZones();
  drawPlatforms();
  drawEquator();
  drawTrails();
  drawAuras();
  drawPlayers();
  drawBoss();
  drawParticles();
  drawBossUI();
  drawHUD();
}

// ---- BACKGROUND ----
function drawBackground() {
  for (let y = 0; y < height; y += 4) {
    let t = y / height;
    let r = lerp(40, 10, t);
    let g = lerp(10, 25, t);
    let b = lerp(35, 60, t);
    if (t > 0.5) {
      r = lerp(20, 8, (t - 0.5) * 2);
      g = lerp(15, 20, (t - 0.5) * 2);
      b = lerp(50, 70, (t - 0.5) * 2);
    }
    fill(r, g, b);
    rect(0, y, width, 4);
  }
}

function drawStars() {
  for (let s of stars) {
    let tw = s.bright + sin(frameCounter * s.speed * 4 + s.offset) * 50;
    fill(tw, tw, tw + 25, 200);
    ellipse(s.x, s.y, s.r * 2);
  }
}

// ---- LEVEL INIT ----
function initLevel() {
  p1 = new Player(width / 2 - 11, 50, color(255, 70, 70), 0.6, 'NORTH');
  p2 = new Player(width / 2 - 11, 728, color(70, 150, 255), -0.6, 'SOUTH');

  enemies = [];
  platforms = [];
  hazards = [];
  collectibles = [];
  particles = [];
  trails = [];
  scorePopups = [];
  p1EquatorTimer = 0;
  p2EquatorTimer = 0;
  levelStartFrame = frameCounter;

  createPlatform(330, 95, 140, 14);

  if (level === 1) {
    createPlatform(140, 175, 140, 14);
    createPlatform(520, 235, 140, 14);
    createPlatform(290, 305, 220, 14);
    addStar(210, 155);
    addStar(590, 215);
    addStar(400, 285);
  } else if (level === 2) {
    createPlatform(70, 170, 90, 14);
    createHazard(160, 170, 50, 14);
    createPlatform(210, 170, 90, 14);

    createPlatform(580, 240, 90, 14);
    createHazard(470, 240, 110, 14);
    createPlatform(370, 240, 100, 14);

    createPlatform(380, 315, 80, 14);
    createPlatform(240, 315, 80, 14);
    createHazard(320, 315, 60, 14);
    addStar(115, 150);
    addStar(625, 220);
    addStar(280, 295);
  } else if (level >= 3) {
    createPlatform(40, 150, 50, 14);
    createHazard(90, 150, 140, 14);
    createPlatform(230, 150, 50, 14);

    createPlatform(580, 215, 60, 14);
    createPlatform(430, 275, 60, 14);
    createHazard(490, 275, 140, 14);
    createPlatform(150, 215, 60, 14);

    createPlatform(190, 340, 50, 14);
    createHazard(240, 340, 280, 14);
    createPlatform(520, 340, 50, 14);
    addStar(65, 130);
    addStar(610, 195);
    addStar(545, 320);
  }

  let count = 3 + level * 3;
  let attempts = 0;
  while (enemies.length < count && attempts < 100) {
    let e = makeEnemy(enemies.length === count - 1 && level >= 2 ? 'hunter' : 'bounce');
    let cx1 = p1.x + p1.size / 2, cy1 = p1.y + p1.size / 2;
    let cx2 = p2.x + p2.size / 2, cy2 = p2.y + p2.size / 2;
    if (dist(e.x, e.y, cx1, cy1) > 100 && dist(e.x, e.y, cx2, cy2) > 100) {
      enemies.push(e);
    }
    attempts++;
  }
}

function addStar(x, y) {
  collectibles.push({ x, y, r: 10, taken: false, spin: random(TWO_PI), bob: random(TWO_PI) });
  collectibles.push({ x, y: height - y, r: 10, taken: false, spin: random(TWO_PI), bob: random(TWO_PI) });
}

function makeEnemy(type) {
  let speed = 1.4 + level * 0.25;
  if (type === 'hunter') {
    return {
      type: 'hunter',
      x: random(80, width - 80),
      y: random(140, height - 140),
      vx: 0, vy: 0,
      size: 22,
      eyeAng: 0,
      pulse: random(TWO_PI)
    };
  }
  return {
    type: 'bounce',
    x: random(80, width - 80),
    y: random(140, height - 140),
    vx: random([-1, 1]) * random(speed, speed + 1.2),
    vy: random([-1, 1]) * random(speed, speed + 1.2),
    size: 18,
    eyeAng: 0,
    pulse: random(TWO_PI)
  };
}

function initBoss() {
  boss = {
    x: width / 2,
    y: height / 2,
    size: 64,
    hp: 150,        // was 220 — easier final fight
    maxHp: 150,
    phase: 1,
    color: color(170, 30, 240),
    vx: 0, vy: 0,
    attackTimer: 0,
    telegraphTimer: 0,
    projectiles: [],
    hitFlash: 0
  };
  enemies = [];
  platforms = [];
  hazards = [];
  particles = [];
  collectibles = [];
  scorePopups = [];

  createPlatform(40, 200, 110, 14);
  createPlatform(650, 200, 110, 14);
  createPlatform(310, 290, 180, 14);
  createPlatform(60, 320, 80, 14);
  createPlatform(660, 320, 80, 14);
}

function createPlatform(x, y, w, h) {
  platforms.push({ x, y, w, h });
  platforms.push({ x, y: height - y - h, w, h });
}

function createHazard(x, y, w, h) {
  hazards.push({ x, y, w, h, offset: random(TWO_PI) });
  hazards.push({ x, y: height - y - h, w, h, offset: random(TWO_PI) });
}

// ---- PLAYER ----
class Player {
  constructor(x, y, col, grav, name) {
    this.x = x; this.y = y;
    this.size = 22;
    this.color = col;
    this.vx = 0; this.vy = 0;
    this.gravity = grav;
    this.speed = 5.5;
    this.jumpForce = grav > 0 ? -14 : 14;
    this.onGround = false;
    this.facing = 1;
    this.name = name;
    this.invincible = 0;
    this.squash = 1;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpHeld = false;
    this.hadJump = false;
  }

  update(leftKey, rightKey, jumpKey) {
    if (this.invincible > 0) this.invincible--;
    if (this.coyote > 0) this.coyote--;
    if (this.jumpBuffer > 0) this.jumpBuffer--;

    if (keys[leftKey])       { this.vx = -this.speed; this.facing = -1; }
    else if (keys[rightKey]) { this.vx =  this.speed; this.facing =  1; }
    else                     this.vx = 0;

    this.x += this.vx;
    this.x = constrain(this.x, 0, width - this.size);

    if (abs(this.vx) > 0.5 || abs(this.vy) > 1) {
      if (frameCounter % 3 === 0) {
        trails.push({
          x: this.x + this.size / 2,
          y: this.y + this.size / 2,
          col: this.color,
          life: 18, maxLife: 18,
          size: this.size * 0.7
        });
      }
    }

    // Track jump key state for variable jump
    let jumpPressed = keys[jumpKey];
    if (jumpPressed && !this.jumpHeld) {
      this.jumpBuffer = 7;
      this.jumpHeld = true;
    }
    if (!jumpPressed) this.jumpHeld = false;

    // Jump (with coyote time + buffer)
    if (this.jumpBuffer > 0 && (this.onGround || this.coyote > 0)) {
      this.vy = this.jumpForce;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.hadJump = true;
      this.squash = 0.6;
      sJump(this.gravity);
      spawnDust(this.x + this.size / 2, this.gravity > 0 ? this.y + this.size : this.y, this.gravity);
    }

    // Variable jump height (cut velocity if released early)
    if (!jumpPressed && this.hadJump) {
      if (this.gravity > 0 && this.vy < -4) this.vy *= 0.55;
      if (this.gravity < 0 && this.vy > 4) this.vy *= 0.55;
      this.hadJump = false;
    }

    let prevOnGround = this.onGround;
    this.vy += this.gravity;
    this.vy = constrain(this.vy, -18, 18);
    let nextY = this.y + this.vy;
    this.onGround = false;

    for (let p of platforms) {
      if (this.x + this.size > p.x && this.x < p.x + p.w) {
        if (this.gravity > 0 && this.vy >= 0 &&
            this.y + this.size <= p.y + 2 && nextY + this.size >= p.y) {
          nextY = p.y - this.size;
          this.vy = 0; this.onGround = true;
          if (this.squash < 1) this.squash = min(1, this.squash + 0.15);
        }
        if (this.gravity < 0 && this.vy <= 0 &&
            this.y >= p.y + p.h - 2 && nextY <= p.y + p.h) {
          nextY = p.y + p.h;
          this.vy = 0; this.onGround = true;
          if (this.squash < 1) this.squash = min(1, this.squash + 0.15);
        }
      }
    }

    const eqY = 390, eqH = 20;
    if (this.gravity > 0 && this.vy >= 0 &&
        this.y + this.size <= eqY + 2 && nextY + this.size >= eqY) {
      nextY = eqY - this.size; this.vy = 0; this.onGround = true;
    }
    if (this.gravity < 0 && this.vy <= 0 &&
        this.y >= eqY + eqH - 2 && nextY <= eqY + eqH) {
      nextY = eqY + eqH; this.vy = 0; this.onGround = true;
    }

    if (this.gravity > 0 && nextY < 0) { nextY = 0; this.vy = 0; }
    if (this.gravity < 0 && nextY + this.size > height) { nextY = height - this.size; this.vy = 0; }

    // Coyote time: if was on ground last frame and isn't now (and not jumping up)
    if (prevOnGround && !this.onGround && (this.gravity > 0 ? this.vy >= 0 : this.vy <= 0)) {
      this.coyote = 7;
    }

    this.y = nextY;
    this.squash = lerp(this.squash, 1, 0.2);

    if (this.invincible > 0) return;

    for (let h of hazards) {
      if (this.x < h.x + h.w && this.x + this.size > h.x &&
          this.y < h.y + h.h && this.y + this.size > h.y) {
        triggerDeath('lava');
        return;
      }
    }
  }
}

function updatePlayers() {
  p1.update(65, 68, 87);
  p2.update(37, 39, 38);
}

// ---- ENEMIES ----
function updateEnemies() {
  for (let e of enemies) {
    e.pulse += 0.1;

    if (e.type === 'hunter') {
      let near = dist(p1.x, p1.y, e.x, e.y) < dist(p2.x, p2.y, e.x, e.y) ? p1 : p2;
      let cx = near.x + near.size / 2, cy = near.y + near.size / 2;
      let ang = atan2(cy - e.y, cx - e.x);
      let speed = 1.0 + level * 0.15;
      e.vx = lerp(e.vx, cos(ang) * speed, 0.04);
      e.vy = lerp(e.vy, sin(ang) * speed, 0.04);
      e.eyeAng = atan2(e.vy, e.vx);
    } else {
      e.eyeAng = atan2(e.vy, e.vx);
    }

    e.x += e.vx;
    e.y += e.vy;

    if (e.x < 50)               { e.x = 50; e.vx = abs(e.vx); }
    if (e.x > width - 50)       { e.x = width - 50; e.vx = -abs(e.vx); }
    if (e.y < 110)              { e.y = 110; e.vy = abs(e.vy); }
    if (e.y > height - 110)     { e.y = height - 110; e.vy = -abs(e.vy); }

    if (e.type === 'bounce') {
      for (let p of platforms) {
        if (e.x + 9 > p.x && e.x - 9 < p.x + p.w &&
            e.y + 9 > p.y && e.y - 9 < p.y + p.h) {
          let cx = p.x + p.w / 2, cy = p.y + p.h / 2;
          let dx = e.x - cx, dy = e.y - cy;
          if (abs(dx / p.w) > abs(dy / p.h)) e.vx = -e.vx;
          else e.vy = -e.vy;
          e.x += e.vx; e.y += e.vy;
        }
      }
    }

    let cx1 = p1.x + p1.size / 2, cy1 = p1.y + p1.size / 2;
    let cx2 = p2.x + p2.size / 2, cy2 = p2.y + p2.size / 2;

    if ((p1.invincible <= 0 && dist(cx1, cy1, e.x, e.y) < (p1.size / 2 + e.size / 2)) ||
        (p2.invincible <= 0 && dist(cx2, cy2, e.x, e.y) < (p2.size / 2 + e.size / 2))) {
      triggerDeath('enemy');
      return;
    }
  }
}

// ---- COLLECTIBLES ----
function updateCollectibles() {
  for (let c of collectibles) {
    if (c.taken) continue;
    c.spin += 0.1;
    c.bob += 0.05;
    let cx1 = p1.x + p1.size / 2, cy1 = p1.y + p1.size / 2;
    let cx2 = p2.x + p2.size / 2, cy2 = p2.y + p2.size / 2;
    let drawY = c.y + sin(c.bob) * 3;

    // Ensure collectible position is valid
    if (c.x < 0 || c.x > width || c.y < 0 || c.y > height) {
      c.taken = true; continue;
    }

    if (dist(cx1, cy1, c.x, drawY) < p1.size / 2 + c.r ||
        dist(cx2, cy2, c.x, drawY) < p2.size / 2 + c.r) {
      c.taken = true;
      combo++;
      comboTimer = 90;
      let pts = 50 * combo;
      score += pts;
      addScorePopup(c.x, c.y, '+' + pts);
      spawnParticles(c.x, c.y, 14, color(255, 230, 80));
      sCollect();
      // brief invincibility
      p1.invincible = max(p1.invincible, 30);
      p2.invincible = max(p2.invincible, 30);
    }
  }
}

function drawCollectibles() {
  for (let c of collectibles) {
    if (c.taken) continue;
    let drawY = c.y + sin(c.bob) * 3;
    push();
    translate(c.x, drawY);
    rotate(c.spin);
    // glow
    fill(255, 230, 80, 60);
    star(0, 0, 14, 7, 5);
    fill(255, 230, 80);
    star(0, 0, c.r, c.r * 0.5, 5);
    fill(255, 255, 200);
    star(0, 0, c.r * 0.7, c.r * 0.35, 5);
    pop();
  }
}

function star(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

// ---- BOSS ----
function updateBoss() {
  if (!boss || gameState !== "BOSS") return;
  boss.attackTimer++;
  if (boss.hitFlash > 0) boss.hitFlash--;
  if (boss.telegraphTimer > 0) boss.telegraphTimer--;

  if (boss.hp < boss.maxHp * 0.35 && boss.phase === 1) {
    // Enrage at 35% HP instead of 50% — gives players more time in the
    // easier first phase before things heat up.
    boss.phase = 2;
    boss.color = color(255, 60, 60);
    boss.size = 70;   // was 76 — smaller hitbox so unfair touches are rarer
    shakeMag = 18;
    flash(255, 100, 100, 120);
    sCharge();
    spawnParticles(boss.x, boss.y, 40, color(255, 100, 50));
    hitStop = 12;
    // Brief grace-frame invincibility so the boss "growing" into a player
    // who's already touching doesn't cause an instant unfair death.
    p1.invincible = max(p1.invincible, 35);
    p2.invincible = max(p2.invincible, 35);
  }

  // Slower boss so players can position and chase. (was 1.7 / 2.8)
  let speed = boss.phase === 1 ? 1.3 : 2.1;
  let cx1 = p1.x + p1.size / 2, cy1 = p1.y + p1.size / 2;
  let cx2 = p2.x + p2.size / 2, cy2 = p2.y + p2.size / 2;
  let d1 = dist(boss.x, boss.y, cx1, cy1);
  let d2 = dist(boss.x, boss.y, cx2, cy2);
  let tx = d1 < d2 ? cx1 : cx2;
  let ty = d1 < d2 ? cy1 : cy2;
  let ang = atan2(ty - boss.y, tx - boss.x);
  boss.vx = lerp(boss.vx, cos(ang) * speed, 0.04);
  boss.vy = lerp(boss.vy, sin(ang) * speed, 0.04);
  boss.x += boss.vx; boss.y += boss.vy;
  boss.x = constrain(boss.x, 60, width - 60);
  boss.y = constrain(boss.y, 130, height - 130);

  // Telegraph attack 90 frames before firing (was 60) — more warning.
  let attackInterval = 140;             // was 100 — slower attack cadence
  let telegraphPoint = attackInterval - 90;
  if (boss.phase === 2 && boss.attackTimer % attackInterval === telegraphPoint) {
    boss.telegraphTimer = 90;
    sTelegraph();
  }

  if (boss.phase === 2 && boss.attackTimer % attackInterval === 0 && boss.attackTimer > 0) {
    let count = 5;                      // was 7 — fewer projectiles per volley
    let baseAng = random(TWO_PI);
    for (let i = 0; i < count; i++) {
      let a = baseAng + (TWO_PI / count) * i;
      boss.projectiles.push({
        x: boss.x, y: boss.y,
        vx: cos(a) * 2.7, vy: sin(a) * 2.7,   // was 3.6 — slower, easier to dodge
        life: 200
      });
    }
    sCharge();
    spawnParticles(boss.x, boss.y, 18, color(255, 80, 200));
    boss.telegraphTimer = 0;
  }

  for (let i = boss.projectiles.length - 1; i >= 0; i--) {
    let pr = boss.projectiles[i];
    pr.x += pr.vx; pr.y += pr.vy; pr.life--;
    if (pr.life <= 0 || pr.x < -20 || pr.x > width + 20 || pr.y < -20 || pr.y > height + 20) {
      boss.projectiles.splice(i, 1); continue;
    }
    if ((p1.invincible <= 0 && dist(pr.x, pr.y, cx1, cy1) < p1.size / 2 + 8) ||
        (p2.invincible <= 0 && dist(pr.x, pr.y, cx2, cy2) < p2.size / 2 + 8)) {
      boss.projectiles.splice(i, 1);
      triggerDeath('proj');
      return;
    }
  }

  let pd = dist(cx1, cy1, cx2, cy2);
  let powered = pd < 170;              // was 130 — more forgiving "stay close" radius

  let touching =
    dist(boss.x, boss.y, cx1, cy1) < boss.size / 2 + p1.size / 2 ||
    dist(boss.x, boss.y, cx2, cy2) < boss.size / 2 + p2.size / 2;

  if (touching) {
    if (powered) {
      // Higher per-hit damage so the fight ends in fewer touches.
      // (was 1.2 / 0.8)
      let dmg = boss.phase === 1 ? 1.8 : 1.3;
      boss.hp -= dmg;
      boss.hitFlash = 6;
      boss.x += random(-4, 4);
      boss.y += random(-4, 4);
      shakeMag = max(shakeMag, 5);
      if (frameCounter % 5 === 0) {
        sBossHit();
        spawnParticles(boss.x + random(-15, 15), boss.y + random(-15, 15), 4, color(255, 200, 100));
        addScorePopup(boss.x, boss.y - 30, '+' + (boss.phase === 1 ? 5 : 8));
        score += boss.phase === 1 ? 5 : 8;
      }
    } else {
      triggerDeath('boss');
      return;
    }
  }

  if (boss.hp <= 0) {
    spawnParticles(boss.x, boss.y, 60, color(255, 200, 100));
    spawnParticles(boss.x, boss.y, 30, color(255, 100, 200));
    flash(255, 220, 200, 220);
    sWin();
    score += 1000;
    hitStop = 30;
    gameState = "WIN";
  }
}

// ---- DEATH ----
function triggerDeath(reason) {
  if (p1.invincible > 0 || p2.invincible > 0) return;
  if (gameState === "GAMEOVER" || gameState === "WIN") return; // Prevent double-death

  spawnParticles(p1.x + p1.size / 2, p1.y + p1.size / 2, 18, p1.color);
  spawnParticles(p2.x + p2.size / 2, p2.y + p2.size / 2, 18, p2.color);
  shakeMag = 24;
  flash(255, 50, 50, 160);
  sDeath();
  hitStop = 14;

  lives--;
  if (lives <= 0) {
    gameState = "GAMEOVER";
    return;
  }

  // Reset players
  p1.x = width / 2 - 11; p1.y = 50;
  p1.vx = 0; p1.vy = 0; p1.invincible = 90;
  p1.onGround = false; p1.coyote = 0; p1.jumpBuffer = 0;
  p2.x = width / 2 - 11; p2.y = 728;
  p2.vx = 0; p2.vy = 0; p2.invincible = 90;
  p2.onGround = false; p2.coyote = 0; p2.jumpBuffer = 0;

  // Clear projectiles and state
  if (boss) boss.projectiles = [];
  p1EquatorTimer = 0;
  p2EquatorTimer = 0;
  transitionAlpha = 200;
}

// ---- PARTICLES & TRAILS ----
function spawnParticles(x, y, count, col) {
  for (let i = 0; i < count; i++) {
    let ang = random(TWO_PI);
    let spd = random(2, 8);
    particles.push({
      x, y,
      vx: cos(ang) * spd, vy: sin(ang) * spd,
      life: random(30, 70), maxLife: 70,
      col, r: random(3, 8), gravity: random(-0.05, 0.05)
    });
  }
}

function spawnDust(x, y, grav) {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: x + random(-8, 8), y,
      vx: random(-1.5, 1.5), vy: random(0.5, 1.5) * (grav > 0 ? -1 : 1),
      life: 22, maxLife: 22,
      col: color(200, 200, 220), r: random(2, 4), gravity: 0
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.94; p.vy *= 0.94;
    p.vy += p.gravity;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (let p of particles) {
    let a = map(p.life, 0, p.maxLife, 0, 230);
    fill(red(p.col), green(p.col), blue(p.col), a);
    let s = p.r * (p.life / p.maxLife);
    ellipse(p.x, p.y, s * 2);
  }
}

function updateTrails() {
  for (let i = trails.length - 1; i >= 0; i--) {
    trails[i].life--;
    if (trails[i].life <= 0) trails.splice(i, 1);
  }
}

function drawTrails() {
  for (let t of trails) {
    let a = map(t.life, 0, t.maxLife, 0, 80);
    let c = t.col;
    fill(red(c), green(c), blue(c), a);
    let s = t.size * (t.life / t.maxLife);
    ellipse(t.x, t.y, s);
  }
}

function flash(r, g, b, a) {
  flashColor = { r, g, b, a };
}

function addScorePopup(x, y, text) {
  scorePopups.push({ x, y, text, life: 50, maxLife: 50, vy: -1 });
}

function updateScorePopups() {
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    let p = scorePopups[i];
    p.y += p.vy;
    p.vy *= 0.96;
    p.life--;
    if (p.life <= 0) scorePopups.splice(i, 1);
  }
}

function drawScorePopups() {
  textAlign(CENTER, CENTER);
  for (let p of scorePopups) {
    let a = map(p.life, 0, p.maxLife, 0, 255);
    let scale = 1 + (1 - p.life / p.maxLife) * 0.3;
    fill(0, 0, 0, a * 0.7);
    textSize(14 * scale);
    text(p.text, p.x + 1, p.y + 1);
    fill(255, 230, 80, a);
    text(p.text, p.x, p.y);
  }
}

// ---- DRAWING WORLD ----
function drawSafeZones() {
  fill(80, 200, 255, 14);
  rect(0, 0, width, 110);
  rect(0, height - 110, width, 110);
  stroke(120, 200, 255, 60);
  strokeWeight(1);
  line(0, 110, width, 110);
  line(0, height - 110, width, height - 110);
  noStroke();

  fill(255, 100, 100, 40);
  textSize(38);
  textAlign(LEFT, TOP);
  text('N', 12, 8);
  fill(100, 150, 255, 40);
  textAlign(LEFT, BOTTOM);
  text('S', 12, height - 6);
  textAlign(CENTER, CENTER);
}

function drawPlatforms() {
  for (let p of platforms) {
    fill(0, 0, 0, 70);
    rect(p.x + 3, p.y + 3, p.w, p.h, 4);
    fill(70, 150, 80);
    rect(p.x, p.y, p.w, p.h, 4);
    fill(130, 220, 130, 200);
    rect(p.x + 2, p.y + 2, p.w - 4, 3, 2);
    fill(40, 90, 50, 180);
    rect(p.x + 2, p.y + p.h - 4, p.w - 4, 2, 2);
  }
}

function drawHazards() {
  for (let h of hazards) {
    let pulse = sin(frameCounter * 0.12 + h.offset) * 25;
    fill(255, 80 + pulse, 0, 50);
    rect(h.x - 5, h.y - 5, h.w + 10, h.h + 10, 6);
    fill(220, 50 + pulse * 0.5, 0);
    rect(h.x, h.y, h.w, h.h, 4);
    fill(255, 200 + pulse, 80, 230);
    rect(h.x + 2, h.y + 2, h.w - 4, 3, 2);
    if (frameCounter % 4 === 0 && Math.random() < 0.4) {
      particles.push({
        x: h.x + random(h.w),
        y: h.y + h.h / 2,
        vx: random(-0.4, 0.4),
        vy: random(-1.2, -0.4),
        life: 20, maxLife: 20,
        col: color(255, 180, 50), r: 2.5, gravity: 0
      });
    }
  }
}

function drawEquator() {
  fill(255, 200, 0, 25);
  rect(0, 380, width, 40);
  fill(180, 140, 0);
  rect(0, 390, width, 20);
  for (let i = -1; i < width / 30 + 1; i++) {
    let x = (i * 30 + (frameCounter * 0.5) % 30);
    fill(220, 180, 30, 100);
    quad(x, 392, x + 10, 392, x + 18, 408, x + 8, 408);
  }
  fill(255, 230, 80, 220);
  rect(0, 398, width, 4);

  fill(0, 0, 0, 220);
  textAlign(CENTER, CENTER);
  textSize(11);
  text('EQUATOR — REUNITE HERE', width / 2, 401);
}

function drawEquatorMarkers() {
  // Show check icons when each player is at the equator
  if (p1EquatorTimer > 0) {
    let a = map(p1EquatorTimer, 0, EQUATOR_WINDOW, 0, 255);
    fill(120, 255, 130, a);
    let cx = p1.x + p1.size / 2;
    ellipse(cx, 385, 16);
    fill(0, 80, 0, a);
    textSize(11);
    textAlign(CENTER, CENTER);
    text('✓', cx, 385);
  }
  if (p2EquatorTimer > 0) {
    let a = map(p2EquatorTimer, 0, EQUATOR_WINDOW, 0, 255);
    fill(120, 255, 130, a);
    let cx = p2.x + p2.size / 2;
    ellipse(cx, 415, 16);
    fill(0, 80, 0, a);
    textSize(11);
    textAlign(CENTER, CENTER);
    text('✓', cx, 415);
  }
}

function drawAuras() {
  let cx1 = p1.x + p1.size / 2, cy1 = p1.y + p1.size / 2;
  let cx2 = p2.x + p2.size / 2, cy2 = p2.y + p2.size / 2;
  let d = dist(cx1, cy1, cx2, cy2);

  // Visual "bond" beam between players — kept in sync with the
  // boss-fight `powered` radius (170) so you can see when you're close
  // enough to deal damage.
  if (d < 170) {
    let alpha = map(d, 0, 170, 180, 30);
    fill(255, 255, 255, alpha);
    let mr = map(d, 0, 170, 90, 220) + sin(frameCounter * 0.1) * 8;
    ellipse((cx1 + cx2) / 2, (cy1 + cy2) / 2, mr);
    stroke(255, 255, 255, alpha);
    strokeWeight(2);
    line(cx1, cy1, cx2, cy2);
    noStroke();
  } else {
    fill(255, 50, 50, 35);  ellipse(cx1, cy1, 80 + sin(frameCounter * 0.08) * 8);
    fill(50, 150, 255, 35); ellipse(cx2, cy2, 80 + cos(frameCounter * 0.08) * 8);
  }
}

function drawPlayers() {
  drawPlayerShape(p1, 1);
  drawPlayerShape(p2, -1);
}

function drawPlayerShape(p, gravDir) {
  let cx = p.x + p.size / 2, cy = p.y + p.size / 2;
  let blink = p.invincible > 0 && (frameCounter % 6 < 3);
  if (blink) return;

  let c = p.color;
  fill(red(c), green(c), blue(c), 60);
  ellipse(cx, cy, p.size * 2.4);

  let sx = lerp(1.2, 1, p.squash);
  let sy = p.squash;

  push();
  translate(cx, cy);
  scale(sx, sy);

  fill(c);
  rect(-p.size / 2, -p.size / 2, p.size, p.size, 5);

  fill(255, 255, 255, 70);
  rect(-p.size / 2 + 3, -p.size / 2 + 3, p.size - 6, 4, 2);

  fill(255);
  let eyeY = gravDir > 0 ? -2 : 2;
  ellipse(-5, eyeY, 6, 6);
  ellipse(5, eyeY, 6, 6);
  fill(0);
  let pupilOff = constrain(p.vx * 0.3, -2, 2);
  ellipse(-5 + pupilOff, eyeY, 3, 3);
  ellipse(5 + pupilOff, eyeY, 3, 3);

  pop();

  fill(255, 255, 255, 130);
  let ay = gravDir > 0 ? p.y + p.size + 6 : p.y - 8;
  triangle(cx - 4, ay, cx + 4, ay, cx, ay + 5 * gravDir);

  fill(255, 255, 255, 150);
  textSize(9);
  let labelY = gravDir > 0 ? p.y - 6 : p.y + p.size + 12;
  text(p.name, cx, labelY);
}

function drawEnemies() {
  for (let e of enemies) {
    let pulse = sin(e.pulse) * 4;
    if (e.type === 'hunter') {
      fill(255, 80, 80, 35);
      ellipse(e.x, e.y, e.size + pulse + 22);
      fill(180, 30, 30);
      ellipse(e.x, e.y, e.size + pulse);
      // spikes
      for (let i = 0; i < 6; i++) {
        let a = e.pulse * 0.3 + (TWO_PI / 6) * i;
        let r1 = e.size / 2 + 2;
        let r2 = e.size / 2 + 6 + sin(e.pulse * 2 + i) * 2;
        fill(220, 40, 40);
        triangle(
          e.x + cos(a - 0.2) * r1, e.y + sin(a - 0.2) * r1,
          e.x + cos(a + 0.2) * r1, e.y + sin(a + 0.2) * r1,
          e.x + cos(a) * r2, e.y + sin(a) * r2
        );
      }
      fill(255, 220, 0);
      let ex = cos(e.eyeAng) * 3, ey = sin(e.eyeAng) * 3;
      ellipse(e.x + ex, e.y + ey, 7);
      fill(0);
      ellipse(e.x + ex, e.y + ey, 4);
    } else {
      fill(0, 255, 100, 30);
      ellipse(e.x, e.y, e.size + pulse + 18);
      fill(20, 180, 90);
      ellipse(e.x, e.y, e.size + pulse);
      fill(120, 255, 150, 180);
      ellipse(e.x - 4, e.y - 4, 6, 4);
      let near = dist(p1.x, p1.y, e.x, e.y) < dist(p2.x, p2.y, e.x, e.y) ? p1 : p2;
      let eAng = atan2(near.y - e.y, near.x - e.x);
      let ex = cos(eAng) * 3, ey = sin(eAng) * 3;
      fill(255, 60, 60);
      ellipse(e.x + ex - 3, e.y + ey - 1, 5);
      ellipse(e.x + ex + 3, e.y + ey - 1, 5);
      fill(0);
      ellipse(e.x + ex - 3, e.y + ey - 1, 2.4);
      ellipse(e.x + ex + 3, e.y + ey - 1, 2.4);
    }
  }
}

function drawBoss() {
  if (!boss) return;
  let pulse = sin(frameCounter * 0.1) * 5;
  let phase2 = boss.phase === 2;

  // telegraph ring (warning before attack)
  if (boss.telegraphTimer > 0) {
    let prog = 1 - boss.telegraphTimer / 60;
    let r = boss.size + 80 + prog * 200;
    let a = (1 - prog) * 180;
    noFill();
    stroke(255, 80, 80, a);
    strokeWeight(3);
    ellipse(boss.x, boss.y, r);
    noStroke();
    if (boss.telegraphTimer % 8 < 4) {
      fill(255, 80, 80, 100);
      ellipse(boss.x, boss.y, boss.size + 30);
    }
  }

  let glow = phase2 ? color(255, 0, 50, 50) : color(150, 0, 255, 50);
  fill(glow);
  ellipse(boss.x, boss.y, boss.size + pulse + 50);

  noFill();
  stroke(phase2 ? color(255, 80, 80, 120) : color(180, 80, 255, 120));
  strokeWeight(2);
  ellipse(boss.x, boss.y, boss.size + 25 + sin(frameCounter * 0.13) * 14);
  ellipse(boss.x, boss.y, boss.size + 45 + cos(frameCounter * 0.09) * 10);
  noStroke();

  let bc = boss.color;
  if (boss.hitFlash > 0) bc = color(255, 255, 255);
  fill(bc);
  ellipse(boss.x, boss.y, boss.size + pulse);

  fill(255, 220, 60);
  ellipse(boss.x, boss.y, 24);
  fill(180, 140, 0);
  ellipse(boss.x, boss.y, 16);
  let cx1 = p1.x + p1.size / 2, cy1 = p1.y + p1.size / 2;
  let cx2 = p2.x + p2.size / 2, cy2 = p2.y + p2.size / 2;
  let d1 = dist(boss.x, boss.y, cx1, cy1);
  let near = d1 < dist(boss.x, boss.y, cx2, cy2) ? { x: cx1, y: cy1 } : { x: cx2, y: cy2 };
  let pa = atan2(near.y - boss.y, near.x - boss.x);
  fill(0);
  ellipse(boss.x + cos(pa) * 4, boss.y + sin(pa) * 4, 8);

  for (let pr of boss.projectiles) {
    let a = map(pr.life, 0, 200, 0, 255);
    fill(255, 80, 200, a * 0.5);
    ellipse(pr.x, pr.y, 22);
    fill(255, 150, 255, a);
    ellipse(pr.x, pr.y, 12);
    fill(255, 255, 255, a);
    ellipse(pr.x, pr.y, 5);
  }
}

function drawBossUI() {
  let bx = width / 2 - 170, by = 20, bw = 340, bh = 22;
  fill(0, 0, 0, 200);
  rect(bx - 4, by - 4, bw + 8, bh + 8, 6);
  fill(50, 0, 0);
  rect(bx, by, bw, bh, 4);
  let r = boss.hp / boss.maxHp;
  let barCol = boss.phase === 2 ? color(255, 60, 60) : color(170, 80, 240);
  fill(barCol);
  rect(bx, by, bw * r, bh, 4);
  for (let i = 1; i < 10; i++) {
    fill(0, 0, 0, 80);
    rect(bx + (bw / 10) * i - 1, by, 1, bh);
  }
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(11);
  text('THE DEMON KING' + (boss.phase === 2 ? ' — ENRAGED' : ''), width / 2, by + bh / 2 + 1);

  let cx1 = p1.x + p1.size / 2, cy1 = p1.y + p1.size / 2;
  let cx2 = p2.x + p2.size / 2, cy2 = p2.y + p2.size / 2;
  let pd = dist(cx1, cy1, cx2, cy2);
  let powered = pd < 130;
  textSize(13);
  if (powered) {
    fill(120, 255, 130);
    text('★ POWERED UP — TOUCH THE BOSS ★', width / 2, 60);
  } else {
    fill(255, 200, 80);
    text('⚠ STAY CLOSE TO POWER UP ⚠', width / 2, 60);
  }
}

function drawHUD() {
  textAlign(LEFT, TOP);
  fill(255);
  textSize(14);
  if (gameState === 'BOSS') text('BOSS', 14, 14);
  else text('LEVEL ' + level, 14, 14);

  fill(220);
  textSize(11);
  text('LIVES', 14, 36);
  for (let i = 0; i < 3; i++) {
    if (i < lives) {
      fill(255, 80, 90);
      ellipse(60 + i * 18, 41, 12);
      fill(255, 180, 200, 200);
      ellipse(58 + i * 18, 39, 4);
    } else {
      fill(60, 30, 30);
      ellipse(60 + i * 18, 41, 12);
    }
  }

  // Score
  fill(255, 220, 80);
  textSize(13);
  textAlign(LEFT, TOP);
  text('SCORE  ' + score, 14, 56);
  if (combo > 1) {
    fill(255, 180, 80, 200);
    textSize(11);
    text('×' + combo + ' COMBO', 14, 73);
  }

  let cx1 = p1.x + p1.size / 2, cy1 = p1.y + p1.size / 2;
  let cx2 = p2.x + p2.size / 2, cy2 = p2.y + p2.size / 2;
  let d = dist(cx1, cy1, cx2, cy2);
  let bond = constrain(1 - d / (height * 0.8), 0, 1);
  let bw = 130, bh = 10;
  let bx = width - bw - 14, by = 18;
  fill(0, 0, 0, 160);
  rect(bx - 3, by - 3, bw + 6, bh + 6, 4);
  fill(40, 20, 20);
  rect(bx, by, bw, bh, 3);
  let bondCol = bond > 0.6 ? color(120, 255, 150) :
                bond > 0.3 ? color(255, 220, 80) :
                             color(255, 110, 110);
  fill(bondCol);
  rect(bx, by, bw * bond, bh, 3);
  fill(255);
  textAlign(RIGHT, TOP);
  textSize(11);
  text('BOND', width - 14, 32);

  // Mute / Pause hint
  textAlign(RIGHT, BOTTOM);
  fill(180, 180, 200, 140);
  textSize(10);
  text('P pause   M ' + (muted ? 'unmute' : 'mute'), width - 14, height - 6);
}

// ---- LEVEL COMPLETE (forgiving) ----
function checkLevelComplete() {
  let p1AtEq = p1.onGround && p1.y + p1.size >= 388 && p1.y + p1.size <= 392;
  let p2AtEq = p2.onGround && p2.y >= 408 && p2.y <= 412;

  if (p1AtEq) p1EquatorTimer = EQUATOR_WINDOW;
  else if (p1EquatorTimer > 0) p1EquatorTimer--;
  if (p2AtEq) p2EquatorTimer = EQUATOR_WINDOW;
  else if (p2EquatorTimer > 0) p2EquatorTimer--;

  if (p1EquatorTimer > 0 && p2EquatorTimer > 0) {
    transitionAlpha = 255;
    flash(255, 255, 200, 200);
    spawnParticles(width / 2, 400, 40, color(255, 230, 80));
    spawnParticles(p1.x + p1.size / 2, p1.y + p1.size / 2, 20, p1.color);
    spawnParticles(p2.x + p2.size / 2, p2.y + p2.size / 2, 20, p2.color);
    sLevelUp();
    let timeBonus = max(0, 5000 - (frameCounter - levelStartFrame) * 5);
    score += 100 * level + timeBonus;
    addScorePopup(width / 2, 360, '+' + (100 * level) + ' LEVEL');
    if (timeBonus > 0) addScorePopup(width / 2, 440, '+' + timeBonus + ' TIME');
    level++;
    hitStop = 8;

    if (level > MAX_LEVELS) {
      gameState = "BOSS";
      initBoss();
    } else {
      initLevel();
    }
  }
}

// ---- SCREENS ----
function drawStartScreen() {
  let bob = sin(frameCounter * 0.04) * 6;
  textAlign(CENTER, CENTER);

  fill(180, 180, 220);
  textSize(13);
  text('WED GAME JAM  •  THEME: BETTER TOGETHER', width / 2, 130);

  push();
  translate(width / 2, 220 + bob);
  fill(255, 60, 60, 220);
  textSize(58);
  textStyle(BOLD);
  text('NORTH', 0, 0);
  pop();

  fill(255, 220, 80);
  textSize(22);
  text('and', width / 2, 270 + bob);

  push();
  translate(width / 2, 320 + bob);
  fill(80, 160, 255, 220);
  textSize(58);
  textStyle(BOLD);
  text('SOUTH', 0, 0);
  pop();
  textStyle(NORMAL);

  fill(220, 180, 255);
  textSize(15);
  text('THE SEVERED SOULS: ASCENSION', width / 2, 370);

  stroke(120, 100, 180, 120);
  strokeWeight(1);
  line(220, 400, 580, 400);
  noStroke();

  fill(220);
  textSize(13);
  text('— CONTROLS —', width / 2, 425);

  fill(255, 110, 110);
  textSize(13);
  text('NORTH (Red)    A / D move    W jump  (hold for higher)', width / 2, 450);
  fill(110, 170, 255);
  text('SOUTH (Blue)   ← / →  move    ↑ jump  (hold for higher)', width / 2, 472);
  fill(200, 200, 220);
  textSize(11);
  text('P pause     M mute     R restart', width / 2, 494);

  fill(255, 180, 100);
  textSize(12);
  text('Avoid green monsters and red lava. Beware the red Hunters!', width / 2, 525);
  fill(255, 220, 80);
  text('Collect ★ stars for score and brief invincibility.', width / 2, 543);
  fill(220, 230, 255);
  text('Reach the EQUATOR together to ascend.', width / 2, 561);
  fill(180, 255, 180);
  text('In the boss fight, STAY CLOSE to deal damage.', width / 2, 579);

  let pulse = (sin(frameCounter * 0.08) + 1) * 0.5;
  fill(255, 230, 80, 150 + pulse * 100);
  textSize(18);
  text('▶  CLICK GAME, THEN PRESS SPACE  ◀', width / 2, 625);

  let py = 685 + sin(frameCounter * 0.06) * 4;
  fill(255, 70, 70);
  rect(width / 2 - 80, py, 22, 22, 4);
  fill(255, 255, 255);
  ellipse(width / 2 - 74, py + 8, 5);
  ellipse(width / 2 - 64, py + 8, 5);
  fill(0);
  ellipse(width / 2 - 74, py + 8, 2.5);
  ellipse(width / 2 - 64, py + 8, 2.5);

  let py2 = 685 - sin(frameCounter * 0.06) * 4;
  fill(70, 150, 255);
  rect(width / 2 + 58, py2, 22, 22, 4);
  fill(255, 255, 255);
  ellipse(width / 2 + 64, py2 + 14, 5);
  ellipse(width / 2 + 74, py2 + 14, 5);
  fill(0);
  ellipse(width / 2 + 64, py2 + 14, 2.5);
  ellipse(width / 2 + 74, py2 + 14, 2.5);

  fill(255, 100, 200, 150 + sin(frameCounter * 0.1) * 80);
  textSize(20);
  text('♥', width / 2, 695);

  // demo star
  push();
  translate(width / 2, 740);
  rotate(frameCounter * 0.05);
  fill(255, 230, 80);
  star(0, 0, 12, 6, 5);
  pop();
}

function drawGameOverScreen() {
  textAlign(CENTER, CENTER);
  let pulse = sin(frameCounter * 0.04) * 30 + 200;

  fill(0, 0, 0, 180);
  rect(0, 0, width, height);

  fill(40, 0, 0, 200);
  rect(120, height / 2 - 130, 560, 260, 12);

  fill(255, 50, 50, pulse);
  textSize(56);
  textStyle(BOLD);
  text('YOU DIED', width / 2, height / 2 - 50);
  textStyle(NORMAL);

  fill(220);
  textSize(16);
  text('Both souls have fallen into the void...', width / 2, height / 2 + 10);

  fill(255, 220, 80);
  textSize(15);
  text('Final Score: ' + score, width / 2, height / 2 + 40);

  let pp = sin(frameCounter * 0.1) * 60 + 180;
  fill(255, 220, 100, pp);
  textSize(15);
  text('Press R to try again', width / 2, height / 2 + 80);
}

function drawWinScreen() {
  textAlign(CENTER, CENTER);

  if (frameCounter % 3 === 0) {
    spawnParticles(
      random(width), random(100, height - 100), 2,
      color(random(150, 255), random(150, 255), random(150, 255))
    );
  }

  fill(0, 30, 0, 160);
  rect(0, 0, width, height);

  fill(0, 50, 30, 200);
  rect(80, height / 2 - 150, 640, 300, 12);

  let pulse = sin(frameCounter * 0.05) * 30 + 220;
  fill(80, 255, 130, pulse);
  textSize(54);
  textStyle(BOLD);
  text('EARTH IS FREED', width / 2, height / 2 - 70);
  textStyle(NORMAL);

  fill(255, 230, 180);
  textSize(18);
  text('North and South are reunited at last.', width / 2, height / 2 - 10);
  fill(220);
  textSize(15);
  text('The Demon King has fallen.', width / 2, height / 2 + 20);

  fill(255, 220, 100);
  textSize(18);
  text('Final Score: ' + score, width / 2, height / 2 + 65);

  let pp = sin(frameCounter * 0.1) * 60 + 180;
  fill(255, 220, 100, pp);
  textSize(14);
  text('Press R to play again', width / 2, height / 2 + 110);
}

function drawPauseOverlay() {
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(48);
  text('PAUSED', width / 2, height / 2 - 30);
  textStyle(NORMAL);

  fill(220);
  textSize(14);
  text('Press P to resume', width / 2, height / 2 + 20);
  text('Press M to ' + (muted ? 'unmute' : 'mute'), width / 2, height / 2 + 45);
}

// ---- INPUT ----
function keyPressed() {
  if (keyCode >= 0 && keyCode <= 255) keys[keyCode] = true;

  if (gameState === "START" && (key === ' ' || key === 'Enter')) {
    setupAudio();
    gameState = "PLAY";
    transitionAlpha = 220;
    levelStartFrame = frameCounter;
  }
  if ((gameState === "GAMEOVER" || gameState === "WIN") && (key === 'r' || key === 'R')) {
    level = 1;
    lives = 3;
    score = 0;
    combo = 0;
    musicTimer = 0;
    musicNoteIdx = 0;
    setupAudio();
    gameState = "PLAY";
    initLevel();
    transitionAlpha = 220;
    paused = false;
  }

  if ((gameState === "PLAY" || gameState === "BOSS") && (key === 'p' || key === 'P')) {
    paused = !paused;
    sPause();
  }

  if (key === 'm' || key === 'M') {
    muted = !muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.6;
    sPause();
  }

  return false; // Prevent page scroll on spacebar
}

function keyReleased() {
  if (keyCode >= 0 && keyCode <= 255) keys[keyCode] = false;
  return false;
}

function mousePressed() {
  setupAudio();
}
