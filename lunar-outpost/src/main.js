// src/main.js — Entry Point
import { SceneManager } from './scene.js';
import { TerrainManager } from './terrain.js';
import { SkyManager } from './sky.js';
import { BaseManager } from './base.js';
import { ResourceManager } from './resources.js';
import { EventManager } from './events.js';
import { UIManager } from './ui.js';
import { ControlsManager } from './controls.js';
import { ParticleManager } from './particles.js';

class LunarOutpostGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.difficulty = 'normal';
    this.gameState = 'loading'; // loading | start | playing | paused | gameover | win
    this.timeSpeed = 0; // 0=paused, 1=normal, 2=fast, 4=vfast
    this.sol = 1;
    this.lunarTime = 0; // 0–1 (full lunar day ~29.5 Earth days, we compress to game time)
    this.totalSols = 0;
    this.budget = 3000;
    this.selectedDifficulty = 'normal';
    this.frameCount = 0;

    this.managers = {};
  }

  async init() {
    // Loading sequence
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');

    const steps = [
      { pct: 10, msg: 'Initializing Three.js renderer...' },
      { pct: 25, msg: 'Generating lunar terrain...' },
      { pct: 45, msg: 'Building starfield & skybox...' },
      { pct: 60, msg: 'Preparing building assets...' },
      { pct: 75, msg: 'Calibrating resource systems...' },
      { pct: 90, msg: 'Linking mission control...' },
      { pct: 100, msg: 'Ready for launch!' },
    ];

    const advance = async (step) => {
      bar.style.width = step.pct + '%';
      txt.textContent = step.msg;
      await new Promise(r => setTimeout(r, 300));
    };

    await advance(steps[0]);

    // Init scene
    this.managers.scene = new SceneManager(this.canvas);
    await this.managers.scene.init();
    await advance(steps[1]);

    // Init terrain
    this.managers.terrain = new TerrainManager(this.managers.scene);
    await this.managers.terrain.init();
    await advance(steps[2]);

    // Init sky
    this.managers.sky = new SkyManager(this.managers.scene);
    await this.managers.sky.init();
    await advance(steps[3]);

    // Init particles
    this.managers.particles = new ParticleManager(this.managers.scene);
    await this.managers.particles.init();
    await advance(steps[4]);

    // Init resources
    this.managers.resources = new ResourceManager(this);
    await advance(steps[5]);

    // Init base (buildings)
    this.managers.base = new BaseManager(this, this.managers.scene, this.managers.terrain);
    await this.managers.base.init();

    // Init events
    this.managers.events = new EventManager(this);

    // Init controls
    this.managers.controls = new ControlsManager(this, this.managers.scene, this.managers.base);

    // Init UI
    this.managers.ui = new UIManager(this);
    await advance(steps[5]);
    await advance(steps[6]);

    // Fade out loading screen
    const loadScreen = document.getElementById('loading-screen');
    loadScreen.classList.add('fade-out');
    setTimeout(() => { loadScreen.style.display = 'none'; }, 900);

    this.gameState = 'start';

    // Setup start screen events
    this.setupStartScreen();

    // Start render loop
    this.renderLoop();
  }

  setupStartScreen() {
    const startScreen = document.getElementById('start-screen');
    const btnStart = document.getElementById('btn-start');
    const diffBtns = document.querySelectorAll('.diff-btn');

    diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedDifficulty = btn.dataset.diff;
      });
    });

    btnStart.addEventListener('click', () => {
      startScreen.style.display = 'none';
      this.startGame(this.selectedDifficulty);
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => this.restartGame());
    document.getElementById('btn-restart-win')?.addEventListener('click', () => this.restartGame());
  }

  startGame(difficulty) {
    this.difficulty = difficulty;
    this.gameState = 'playing';
    this.sol = 1;
    this.lunarTime = 0.3; // start in daytime
    this.totalSols = 0;
    this.frameCount = 0;

    // Difficulty settings
    const diffs = {
      easy:   { budget: 5000, crewCount: 2, eventFreq: 0.5 },
      normal: { budget: 3000, crewCount: 3, eventFreq: 1.0 },
      hard:   { budget: 2000, crewCount: 4, eventFreq: 1.8 },
    };
    const cfg = diffs[difficulty] || diffs.normal;
    this.budget = cfg.budget;

    this.managers.resources.reset(cfg.crewCount);
    this.managers.base.reset();
    this.managers.events.reset(cfg.eventFreq);
    this.managers.ui.reset();
    this.managers.ui.show();

    // Set speed to paused initially
    this.setSpeed(0);

    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');

    this.managers.ui.addLog('Mission started. Build your outpost!', 'success');
    this.managers.ui.addLog('⚠️ Your crew needs O₂, water, food and protection from radiation.', 'warn');
  }

  restartGame() {
    this.managers.base.demolishAll();
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    document.getElementById('start-screen').style.display = 'flex';
    this.gameState = 'start';
  }

  setSpeed(speed) {
    this.timeSpeed = speed;
    const labels = { 0: 'PAUSED', 1: 'NORMAL', 2: 'FAST', 4: 'VERY FAST' };
    document.getElementById('speed-label').textContent = labels[speed] || 'PAUSED';
    ['btn-pause','btn-play','btn-fast','btn-vfast'].forEach((id,i) => {
      const speeds = [0,1,2,4];
      document.getElementById(id)?.classList.toggle('active', speeds[i] === speed);
    });
  }

  spendBudget(amount) {
    if (this.budget < amount) return false;
    this.budget -= amount;
    this.managers.ui.updateBudget(this.budget);
    return true;
  }

  gainBudget(amount) {
    this.budget += amount;
    this.managers.ui.updateBudget(this.budget);
  }

  triggerGameOver(reason) {
    if (this.gameState === 'gameover') return;
    this.gameState = 'gameover';
    this.setSpeed(0);
    const screen = document.getElementById('gameover-screen');
    screen.classList.remove('hidden');
    document.getElementById('go-title').textContent = '💀 MISSION FAILED';
    document.getElementById('go-reason').textContent = reason;
    document.getElementById('go-stats').innerHTML = `
      <div>Sols Survived: <strong>${this.sol}</strong></div>
      <div>Buildings Constructed: <strong>${this.managers.base.getBuildingCount()}</strong></div>
      <div>Difficulty: <strong>${this.difficulty.toUpperCase()}</strong></div>
    `;
  }

  triggerWin() {
    if (this.gameState === 'win') return;
    this.gameState = 'win';
    this.setSpeed(0);
    const screen = document.getElementById('win-screen');
    screen.classList.remove('hidden');
    document.getElementById('win-stats').innerHTML = `
      Survived <strong>${this.sol} sols</strong> on the Moon!<br>
      Buildings: <strong>${this.managers.base.getBuildingCount()}</strong> |
      Difficulty: <strong>${this.difficulty.toUpperCase()}</strong><br>
      <em>Your colony is self-sustaining. Mission accomplished!</em>
    `;
  }

  // ─── GAME UPDATE (called every frame) ───
  update(deltaTime) {
    if (this.gameState !== 'playing') return;

    const speedFactor = this.timeSpeed;
    if (speedFactor === 0) return;

    // Advance lunar time
    // A full lunar cycle = 29.5 Earth days = ~4 mins real time at speed 1
    // lunarTime 0→1 = one full lunar cycle
    // At normal speed: 1 real second = ~0.0004 luna cycle
    const lunarRate = 0.00008 * speedFactor;
    this.lunarTime = (this.lunarTime + lunarRate * deltaTime * 60) % 1;

    // Sol counter (each full 24h game-day equivalent)
    this.totalSols += lunarRate * deltaTime * 60 * 29.5;
    const newSol = Math.floor(this.totalSols) + 1;
    if (newSol !== this.sol) {
      this.sol = newSol;
      this.managers.ui.updateSol(this.sol);
      // Win condition: survive 100 sols
      if (this.sol >= 100) {
        this.triggerWin();
        return;
      }
      // Periodic budget income (mission support drops)
      if (this.sol % 10 === 0) {
        const income = 300 + Math.floor(Math.random() * 200);
        this.gainBudget(income);
        this.managers.ui.addLog(`📦 Mission supply drop: +💰${income} budget`, 'success');
      }
    }

    // Update all managers
    this.managers.sky.update(this.lunarTime, deltaTime);
    this.managers.resources.update(deltaTime, speedFactor, this.lunarTime);
    this.managers.events.update(deltaTime, speedFactor);
    this.managers.base.update(deltaTime);
    this.managers.particles.update(deltaTime, this.lunarTime);
    this.managers.ui.update(deltaTime);
    this.frameCount++;
  }

  // ─── RENDER LOOP ───
  renderLoop() {
    let lastTime = performance.now();
    const loop = (now) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1); // cap at 100ms
      lastTime = now;

      this.managers.controls.update(delta);
      this.update(delta);
      this.managers.scene.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Bootstrap
const game = new LunarOutpostGame();
game.init().catch(err => {
  console.error('Failed to initialize game:', err);
  document.getElementById('loading-text').textContent = 'Error: ' + err.message;
});

// Expose globally for UI callbacks
window.GAME = game;
