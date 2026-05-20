# North and South: The Severed Souls: Ascension

A cooperative 2-player platformer for the WED Game Jam (Theme: "Better Together").

## 🎮 How to Play

**Open `index.html` in your web browser** or visit it on GitHub Pages.

### Controls

| Player | Left | Right | Jump |
|--------|------|-------|------|
| **North (Red)** | A | D | W |
| **South (Blue)** | ← Arrow | → Arrow | ↑ Arrow |

### Gameplay

- **Two separated souls** — North has normal gravity (top), South has inverted gravity (bottom)
- **Reach the Equator together** — Both players must land on the yellow equator band simultaneously to progress
- **Collect stars** — Golden ★ power-ups grant score (with combo multiplier) and temporary invincibility
- **Avoid hazards:**
  - 🟢 Green bouncing enemies
  - 🔴 Red spiked Hunters (home toward you)
  - 🔥 Red lava blocks (instant death)
- **3 levels** leading to the boss fight

### Boss Fight

- **Stay close** (white bond aura) to power up
- **Touch the boss while powered up** to damage it
- **Phase 2** (50% HP): Boss enrages, fires projectiles, gets faster
- **Telegraph warning** (red expanding ring) 60 frames before attacks

### Controls During Game

| Key | Action |
|-----|--------|
| **P** | Pause/Resume |
| **M** | Mute/Unmute audio |
| **R** | Restart (from game over/win screen) |
| **Space** | Start game (from title screen) |

## 🎯 Features

- **Physics:** Coyote time (jump grace window), jump buffering, variable jump height
- **Particles:** Explosions, dust effects, lava bubbles, collectible sparkles
- **Visual polish:** Screen shake, hit-stop, screen flash, animated backgrounds
- **Sound:** 8-bit style SFX (jump, death, level up, boss hit, win) + background music
- **HUD:** Lives display, score/combo tracker, bond meter, equator-ready indicators
- **Forgiving controls:** 35-frame equator window so both players don't need pixel-perfect timing

## 🛠️ Technical

- Built with **p5.js** (Processing library for JavaScript)
- Pure vanilla JavaScript (no external dependencies beyond p5.js)
- All graphics rendered in real-time
- Web Audio API for sound

## 📦 Files

- `index.html` — Entry point
- `main.js` — Complete game logic (~1500 lines)
- `style.css` — Styling and custom fonts
- `PORKYS_.TTF`, `PORKH___.TTF` — Custom fonts
- `South.png` — Asset reference
- `Angels.ttf` — Font file

## 🚀 To Deploy on GitHub Pages

1. Create a new GitHub repo: `North-and-South-Game`
2. Upload all files to `main` branch
3. Go to repo **Settings** → **Pages**
4. Select `main` branch as source
5. Game runs at: `https://YOUR_USERNAME.github.io/North-and-South-Game/`

## 🎨 Credits
- Audio from AudioContext Webkit
- Help from ClaudeAI
- **Created for WED Game Jam**  
Theme: Better Together  
Cooperative gravity-flipped platformer exploring what it means to work together despite opposing forces.

---

**Enjoy!** 🎮♥
