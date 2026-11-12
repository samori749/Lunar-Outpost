// src/ui.js — HUD updates, event log, alerts
export class UIManager {
  constructor(game) {
    this.game = game;
    this.alertQueue = [];
    this.alertTimer = 0;
    this.showingAlert = false;
    this.logEntries = 0;
    this.maxLog = 50;
  }

  reset() {
    document.getElementById('event-entries').innerHTML = '';
    this.logEntries = 0;
    this.alertQueue = [];
  }

  show() {
    document.getElementById('hud').classList.remove('hidden');
    this.updateBudget(this.game.budget);
    this.setupSpeedControls();
    this.updateSol(1);
    this.updateCrew(this.game.managers.resources.crewCount);
  }

  setupSpeedControls() {
    const game = this.game;
    document.getElementById('btn-pause').onclick = () => game.setSpeed(0);
    document.getElementById('btn-play').onclick  = () => game.setSpeed(1);
    document.getElementById('btn-fast').onclick  = () => game.setSpeed(2);
    document.getElementById('btn-vfast').onclick = () => game.setSpeed(4);
  }

  updateResources(res) {
    const clamp = (v, min=0, max=100) => Math.max(min, Math.min(max, v));
    const setBar = (id, pct, danger) => {
      const bar = document.getElementById(id);
      if (!bar) return;
      bar.style.width = clamp(pct) + '%';
      if (pct < 25) {
        bar.style.boxShadow = `0 0 8px ${danger || '#ff5252'}`;
        bar.classList.add('danger');
      } else {
        bar.classList.remove('danger');
      }
    };

    // Power
    const powerPct = res.getPowerPct();
    setBar('bar-power', powerPct);
    document.getElementById('val-power').textContent =
      `${res.power.stored.toFixed(0)}/${res.power.maxStored} kWh (${res.power.net >= 0 ? '+' : ''}${res.power.net.toFixed(1)} kW)`;

    // Oxygen
    setBar('bar-oxygen', res.oxygen.level);
    document.getElementById('val-oxygen').textContent = `${res.oxygen.level.toFixed(1)} %`;

    // Water
    setBar('bar-water', res.water.level);
    document.getElementById('val-water').textContent = `${res.waterReservoir.toFixed(0)} L`;

    // Food
    const foodPct = res.getFoodPct();
    setBar('bar-food', foodPct);
    document.getElementById('val-food').textContent = `${res.food.days.toFixed(1)} days`;

    // Radiation — HIGHER is worse
    const radPct = Math.min(100, (res.radiation.level / 10) * 100);
    const radBar = document.getElementById('bar-radiation');
    if (radBar) {
      radBar.style.width = radPct + '%';
      if (res.radiation.level > 3) radBar.classList.add('danger');
    }
    document.getElementById('val-radiation').textContent = `${res.radiation.level.toFixed(2)} mSv/d`;

    // Morale
    setBar('bar-morale', res.morale.level);
    document.getElementById('val-morale').textContent = `${res.morale.level.toFixed(0)} %`;

    // Mission info
    this.updateCycle(this.game.lunarTime);
    this.updateTemp();
    document.getElementById('mi-crew').textContent = res.crewCount;
  }

  updateSol(sol) {
    document.getElementById('mi-sol').textContent = sol;
    this.updateBudgetButtons();
  }

  updateCycle(lunarTime) {
    const angle = lunarTime * Math.PI * 2;
    const isDay = Math.sin(angle) > 0;
    const hourInCycle = Math.floor(lunarTime * 24 * 29.5) % 24;
    document.getElementById('mi-cycle').textContent = isDay
      ? `🌞 DAY (${hourInCycle}h)` : `🌙 NIGHT (${hourInCycle}h)`;
  }

  updateTemp() {
    const sky = this.game.managers.sky;
    if (!sky) return;
    const temp = sky.getSurfaceTemp(this.game.lunarTime);
    const el = document.getElementById('mi-temp');
    if (el) el.textContent = `${temp > 0 ? '+' : ''}${temp}°C`;
  }

  updateCrew(count) {
    document.getElementById('mi-crew').textContent = count;
  }

  updateBudget(amount) {
    const el = document.getElementById('budget-val');
    if (el) el.textContent = Math.floor(amount).toLocaleString();
    this.updateBudgetButtons();
  }

  updateBudgetButtons() {
    const budget = this.game.budget;
    document.querySelectorAll('.build-btn').forEach(btn => {
      const type = btn.dataset.type;
      const defs = window._BUILDING_DEFS || {};
      // Can't directly import here — check cost from DOM (cost in .build-cost)
      const costText = btn.querySelector('.build-cost')?.textContent || '';
      const cost = parseInt(costText.replace(/[^0-9]/g, ''));
      if (!isNaN(cost)) {
        btn.classList.toggle('disabled-btn', budget < cost);
      }
    });
  }

  addLog(msg, type = 'info') {
    const container = document.getElementById('event-entries');
    if (!container) return;

    const entry = document.createElement('div');
    entry.className = `event-entry ${type}`;
    const time = `Sol ${this.game.sol}`;
    entry.innerHTML = `<span class="event-time">[${time}]</span>${msg}`;
    container.prepend(entry);

    // Limit log length
    this.logEntries++;
    if (this.logEntries > this.maxLog) {
      const kids = container.children;
      if (kids.length > this.maxLog) container.removeChild(kids[kids.length - 1]);
    }
  }

  showAlert(text, type = 'danger') {
    this.alertQueue.push({ text, type });
    if (!this.showingAlert) this._nextAlert();
  }

  _nextAlert() {
    if (this.alertQueue.length === 0) { this.showingAlert = false; return; }
    this.showingAlert = true;
    const { text, type } = this.alertQueue.shift();

    const existing = document.querySelectorAll('.hud-alert');
    existing.forEach(el => el.remove());

    const el = document.createElement('div');
    el.className = 'hud-alert';
    el.textContent = text;
    if (type === 'success') el.style.background = 'rgba(0, 150, 50, 0.9)';
    if (type === 'warn')    el.style.background = 'rgba(200, 130, 0, 0.9)';
    if (type === 'info')    el.style.background = 'rgba(0, 100, 200, 0.9)';
    document.body.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.5s';
      setTimeout(() => { el.remove(); this._nextAlert(); }, 500);
    }, 2500);
  }

  update(delta) {
    // Nothing heavy per-frame; handled via updateResources
  }
}
