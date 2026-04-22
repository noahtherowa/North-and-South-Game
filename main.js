// North Boy and South Girl - Prototype
let gameState = 'START'; // START, PLAYING, GAMEOVER, BOSS, WIN
let turn = 'NORTH'; // 'NORTH' or 'SOUTH'

// 0 = Polar Circle, 1 = Tropic, 2 = Equator
let northLevel = 0; 
let southLevel = 0; 

// Y-coordinates for the map lines
const ARCTIC_Y = 100;
const CANCER_Y = 225;
const EQUATOR_Y = 350;
const CAPRICORN_Y = 475;
const ANTARCTIC_Y = 600;

let msgText = "An evil demon separated you! Press ENTER to Start.";

function setup() {
  createCanvas(800, 700);
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
}

function draw() {
  background(40, 120, 200); // Ocean background
  
  drawAbstractMap();
  drawLatitudeLines();
  
  if (gameState !== 'START') {
    drawCharacters();
  }
  
  drawUI();
}

function drawAbstractMap() {
  noStroke();
  fill(100, 180, 100, 150);
  ellipse(200, 250, 300, 400);
  ellipse(600, 200, 400, 300); 
  ellipse(550, 450, 250, 300); 
  ellipse(750, 500, 150, 150);
  
  // Ice caps
  fill(240);
  rect(width/2, 20, width, 60); // North Pole
  rect(width/2, height - 20, width, 60); // South Pole
}

function drawLatitudeLines() {
  stroke(255);
  strokeWeight(2);
  
  // Lines
  line(0, ARCTIC_Y, width, ARCTIC_Y);
  line(0, CANCER_Y, width, CANCER_Y);
  line(0, EQUATOR_Y, width, EQUATOR_Y);
  line(0, CAPRICORN_Y, width, CAPRICORN_Y);
  line(0, ANTARCTIC_Y, width, ANTARCTIC_Y);
  
  // Labels
  noStroke();
  fill(255);
  textSize(16);
  textStyle(BOLD);
  text("Arctic Circle", width / 2, ARCTIC_Y - 15);
  text("Tropic of Cancer", width / 2, CANCER_Y - 15);
  text("Equator", width / 2, EQUATOR_Y - 15);
  text("Tropic of Capricorn", width / 2, CAPRICORN_Y - 15);
  text("Antarctic Circle", width / 2, ANTARCTIC_Y - 15);
}

function drawCharacters() {
  // Calculate Y positions based on level
  let nY = ARCTIC_Y + (northLevel * (CANCER_Y - ARCTIC_Y));
  if (northLevel === 2) nY = EQUATOR_Y - 20; 
  
  let sY = ANTARCTIC_Y - (southLevel * (ANTARCTIC_Y - CAPRICORN_Y));
  if (southLevel === 2) sY = EQUATOR_Y + 20;

  // Energy Auras (Grow stronger as they get closer)
  noStroke();
  fill(0, 200, 255, 50 + (northLevel * 50));
  ellipse(350, nY, 40 + (northLevel * 30));
  
  fill(255, 100, 200, 50 + (southLevel * 50));
  ellipse(450, sY, 40 + (southLevel * 30));

  // Draw North Boy (Blue Square)
  fill(0, 150, 255);
  stroke(255);
  strokeWeight(2);
  rect(350, nY, 20, 20);
  
  // Draw South Girl (Pink Circle)
  fill(255, 100, 150);
  ellipse(450, sY, 20, 20);
  
  // Active Turn Indicator
  if (gameState === 'PLAYING') {
    fill(255, 255, 0);
    noStroke();
    textSize(24);
    if (turn === 'NORTH') {
      text("▼", 350, nY - 40);
    } else {
      text("▲", 450, sY + 40);
    }
  }
}

function drawUI() {
  // Bottom UI Panel
  fill(0, 200);
  noStroke();
  rect(width/2, height - 35, width, 70);
  
  fill(255);
  textSize(20);
  textStyle(NORMAL);
  text(msgText, width/2, height - 50);
  
  textSize(14);
  if (gameState === 'START') {
    text("Press [ENTER] to begin.", width/2, height - 20);
  } else if (gameState === 'PLAYING') {
    text(`Current POV: ${turn === 'NORTH' ? 'North Boy' : 'South Girl'} | Press [SPACE] to fight monster and advance. | Press [R] to Restart.`, width/2, height - 20);
  } else if (gameState === 'BOSS') {
    text("Press [SPACE] to fight the King Demon! | Press [R] to Restart.", width/2, height - 20);
  } else {
    text("Press [R] to Restart from the beginning.", width/2, height - 20);
  }
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    resetGame();
    return;
  }
  
  if (keyCode === ENTER && gameState === 'START') {
    gameState = 'PLAYING';
    msgText = "North Boy's turn. Fight through the Arctic monsters!";
  }
  
  if (key === ' ' && gameState === 'PLAYING') {
    attemptAdvance();
  } else if (key === ' ' && gameState === 'BOSS') {
    fightBoss();
  }
}

function attemptAdvance() {
  // 80% chance to beat the monsters
  let winChance = random(); 
  
  if (winChance > 0.2) {
    if (turn === 'NORTH') {
      northLevel++;
      msgText = "North Boy defeated the monsters! POV shifts to South Girl.";
      turn = 'SOUTH';
    } else {
      southLevel++;
      msgText = "South Girl defeated the monsters! POV shifts to North Boy.";
      turn = 'NORTH';
    }
    
    // Check if both reached the equator
    if (northLevel === 2 && southLevel === 2) {
      gameState = 'BOSS';
      msgText = "Your energies have combined at the Equator! The Demon King appears!";
    }
  } else {
    gameState = 'GAMEOVER';
    msgText = `The monsters were too strong... ${turn === 'NORTH' ? 'North Boy' : 'South Girl'} has fallen.`;
  }
}

function fightBoss() {
  // 50/50 chance to beat the final boss
  let winChance = random();
  
  if (winChance > 0.5) {
    gameState = 'WIN';
    msgText = "VICTORY! You defeated the King Demon and saved the Earth!";
  } else {
    gameState = 'GAMEOVER';
    msgText = "The King Demon was too powerful. You died trying to save the Earth.";
  }
}

function resetGame() {
  gameState = 'START';
  turn = 'NORTH';
  northLevel = 0;
  southLevel = 0;
  msgText = "An evil demon separated you! Press ENTER to Start.";
}



