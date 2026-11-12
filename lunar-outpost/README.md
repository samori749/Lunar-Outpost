# 🌙 Lunar Outpost — NASA Hackathon Entry

> **Build a sustainable human presence on the Moon.**  
> Balance power, life support, food, water and radiation to keep your crew alive for 100 sols.

---

## 🚀 Live Demo

**[▶ Play Now](https://YOUR_USERNAME.github.io/lunar-outpost/)** ← _replace with your GitHub Pages URL_

---

## 🎮 Gameplay

You are mission commander of Humanity's first permanent lunar outpost.  
Build and balance **10 different module types** while managing **6 critical resources**  
against a realistic lunar environment with day/night cycles and random events.

### Resource Systems

| Resource | Challenge |
|---|---|
| ⚡ **Power** | Solar arrays shut down during the 14-Earth-day lunar night — plan ahead! |
| 💨 **Oxygen** | Electrolysis needs power AND water — cascading dependencies |
| 💧 **Water** | ISRU extraction from polar ice is power-hungry but mission-critical |
| 🌱 **Food** | Greenhouses need power, water, CO₂ — the full closed-loop challenge |
| ☢️ **Radiation** | 380 mSv/year baseline; X-class solar flares can be lethal |
| 😊 **Morale** | Isolation, illness, and resource scarcity all hurt crew performance |

### Buildings

| Building | Role | Key Trade-off |
|---|---|---|
| 🏠 Habitat | Houses crew | Power consumer; needs O₂ & water |
| ☀️ Solar Array | Cheap power | Zero output during 14-day night |
| ⚛️ Nuclear Reactor | 24/7 power | Expensive; adds radiation if unshielded |
| 🔋 Battery | Energy buffer | Limited capacity — not viable alone for night |
| 🌿 Greenhouse | Food & CO₂ recycling | Needs power + water + light |
| 💨 O₂ Generator | Breathable air | Needs power + water (electrolysis) |
| 💧 ISRU Miner | Water from regolith | Power-hungry; polar sites only |
| 🛡️ Radiation Shield | Crew protection | Mandatory for long missions |
| 🏥 Medical Bay | Crew health | Treats radiation & boosts morale |
| 📡 Comms Array | Mission support | Earth contact income + morale |

### Random Events

- ☀️ **Solar Flares** (M and X class) — real dose calculations
- ☄️ **Micrometeorite Impacts** — building damage
- 🌪️ **Dust Storms** — solar power reduction
- ⚡ **Power Faults** — electrical grid disruptions
- 💧 **Ice Vein Discovery** — ISRU bonus
- 📦 **Supply Drops** — budget bonuses

---

## 🔬 Scientific Accuracy

All numbers are grounded in real NASA data:

- **Solar irradiance** at Moon: 1,361 W/m²
- **Crew O₂ consumption**: 0.84 kg/person/day (ISS standard)
- **Water electrolysis**: 2H₂O → 2H₂ + O₂ (9 L water → 1 kg O₂)
- **Lunar surface radiation**: 1.04 mSv/day (≈380 mSv/year, 10× Earth)
- **X-class flare dose**: up to 1 Sv in hours without shielding
- **Crew food**: 1.8 kg food/person/day (NASA deep space budget)
- **Lunar day/night cycle**: 29.5 Earth days
- **Surface temperature range**: +121°C (day) to −173°C (night)
- **NASA Kilopower reactor**: 1–10 kW fission output
- **Water from ISRU**: confirmed by LCROSS impact (2009)

---

## 🖥️ Controls

| Input | Action |
|---|---|
| **Left drag** | Rotate camera |
| **Scroll wheel** | Zoom in/out |
| **Right drag** | Pan camera |
| **Click building** | Inspect & demolish |
| **Build panel** | Select structure to place |
| **ESC** | Cancel placement |
| **Space** | Pause / Resume |
| **1/2/3/4** | Speed: Pause/Normal/Fast/Very Fast |
| **R** | Reset camera |

---

## 🛠️ Tech Stack

- **Three.js r158** — 3D engine with WebGL renderer
- **ACES Filmic** tone mapping + Bloom post-processing
- **PCF Soft Shadow Maps** — 4K shadow resolution
- **Procedural terrain** — FBM noise with crater deformation
- **ES Modules** — no bundler required
- **Vanilla CSS** — zero framework dependencies
- **GitHub Pages ready** — single HTML entry point

---

## 📂 Project Structure

```
lunar-outpost/
├── index.html          # Entry point
├── css/
│   └── style.css       # UI styles
├── src/
│   ├── main.js         # Game loop & state
│   ├── scene.js        # Three.js setup, lighting, post-FX
│   ├── terrain.js      # Procedural lunar terrain & craters
│   ├── sky.js          # Stars, Earth, Sun, Milky Way
│   ├── buildings.js    # 3D building models & definitions
│   ├── base.js         # Placement, selection, demolition
│   ├── resources.js    # Physics-based resource simulation
│   ├── events.js       # Random mission events
│   ├── ui.js           # HUD, logs, alerts
│   ├── controls.js     # Mouse/keyboard input
│   └── particles.js    # Dust & solar wind particles
└── README.md
```

---

## 🚀 Running Locally

```bash
# Option 1: Python (no install needed)
python -m http.server 8080
# then open http://localhost:8080

# Option 2: Node.js
npx serve .

# Option 3: VS Code
# Install "Live Server" extension → Right-click index.html → Open with Live Server
```

> ⚠️ **Must run from a local server** (not `file://`) due to ES module CORS policy.

---

## 📡 Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "🚀 Initial launch"
git remote add origin https://github.com/YOUR_USERNAME/lunar-outpost.git
git push -u origin main
# In GitHub repo settings → Pages → Source: main branch / (root)
```

---

## 🏆 NASA Hackathon

This project was developed for the **NASA Space Apps Challenge** to demonstrate  
how interactive simulation can make complex aerospace engineering trade-offs  
accessible and engaging for students.

The core insight: **every resource depends on every other**.  
Power → Electrolysis → Oxygen & Water → Food & Crew survival → More power needed.  
This interdependency is the real engineering challenge of long-duration space exploration.

---

*Built with ❤️ for humanity's future among the stars*
