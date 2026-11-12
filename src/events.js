// src/events.js — Random mission events (solar flares, equipment failures, etc.)
export class EventManager {
  constructor(game) {
    this.game = game;
    this.eventFreq = 1.0;
    this.timer = 0;
    this.nextEvent = this._randomInterval();
    this.activeAlerts = new Set();

    this.events = this._buildEventList();
  }

  reset(freq) {
    this.eventFreq = freq;
    this.timer = 0;
    this.nextEvent = this._randomInterval();
    this.activeAlerts.clear();
  }

  _randomInterval() {
    // Between 20–60 real seconds (adjusted by freq and speed)
    return (20 + Math.random() * 40) / this.eventFreq;
  }

  _buildEventList() {
    return [
      // ─── POSITIVE ───
      {
        id: 'supply_drop',
        type: 'success',
        prob: 0.15,
        title: '📦 Supply Drop!',
        msg: 'Earth mission control sent an emergency supply pod. +💰500 budget.',
        effect: (g) => { g.gainBudget(500); },
      },
      {
        id: 'water_discovery',
        type: 'success',
        prob: 0.1,
        title: '💧 Ice Vein Discovered!',
        msg: 'Subsurface ice vein found. ISRU production boosted for 5 sols.',
        effect: (g) => { g.managers.resources.waterReservoir = Math.min(200, g.managers.resources.waterReservoir + 60); },
      },
      {
        id: 'favorable_sun',
        type: 'info',
        prob: 0.1,
        title: '🌞 High Solar Activity',
        msg: 'Solar panels operating at 115% efficiency for 24 hours.',
        effect: () => {},  // handled in power sim via event flag
      },
      {
        id: 'morale_boost',
        type: 'success',
        prob: 0.08,
        title: '📡 Contact with Earth!',
        msg: 'Video call from home! Crew morale boosted by 20%.',
        effect: (g) => { g.managers.resources.morale.level = Math.min(100, g.managers.resources.morale.level + 20); },
      },

      // ─── NEGATIVE ───
      {
        id: 'solar_flare_minor',
        type: 'warn',
        prob: 0.18,
        title: '☀️ Solar Flare — M-class',
        msg: 'M-class solar flare detected. Radiation elevated for 6 hours. Seek shelter!',
        effect: (g) => {
          g.managers.resources.accumulatedDose += 50;
          g.managers.ui.addLog('☢️ Radiation spike: +50 mSv absorbed by crew!', 'danger');
        },
      },
      {
        id: 'solar_flare_major',
        type: 'danger',
        prob: 0.07,
        title: '☀️ SOLAR FLARE — X-class!',
        msg: 'SEVERE X-class solar flare! All unshielded crew absorbing dangerous radiation!',
        effect: (g) => {
          const shield = g.managers.resources.radiation.shield;
          const dose = Math.max(100, 400 - shield * 20);
          g.managers.resources.accumulatedDose += dose;
          g.managers.ui.addLog(`☢️ X-flare! +${Math.round(dose)} mSv absorbed! BUILD MORE SHIELDING!`, 'danger');
        },
      },
      {
        id: 'micrometeorite',
        type: 'warn',
        prob: 0.12,
        title: '☄️ Micrometeorite Impact!',
        msg: 'A micrometeorite struck the base! One building is damaged.',
        effect: (g) => {
          const buildings = g.managers.base.buildings;
          if (buildings.length > 0) {
            const target = buildings[Math.floor(Math.random() * buildings.length)];
            g.managers.base.damageBuilding(target.id);
            setTimeout(() => {
              if (Math.random() < 0.6) { // auto-repair after some time
                g.managers.base.repairBuilding(target.id);
                g.managers.ui.addLog('🔧 Crew repaired the damage.', 'success');
              }
            }, 15000);
          }
        },
      },
      {
        id: 'power_fault',
        type: 'warn',
        prob: 0.1,
        title: '⚡ Electrical Fault',
        msg: 'Power surge tripped a circuit. Reactors and solar arrays at 70% for 1 hour.',
        effect: (g) => {
          g.managers.base.getBuildingsByType('solarpanel').forEach(b => { b.damagedFactor = 0.7; });
          g.managers.base.getBuildingsByType('reactor').forEach(b => { b.damagedFactor = 0.7; });
          setTimeout(() => {
            g.managers.base.getBuildingsByType('solarpanel').forEach(b => { b.damagedFactor = 1; });
            g.managers.base.getBuildingsByType('reactor').forEach(b => { b.damagedFactor = 1; });
            g.managers.ui.addLog('⚡ Power systems restored to normal.', 'success');
          }, 30000);
        },
      },
      {
        id: 'o2_leak',
        type: 'danger',
        prob: 0.08,
        title: '💨 O₂ Leak Detected!',
        msg: 'Oxygen leak in habitat seal! Emergency repair needed. O₂ draining fast!',
        effect: (g) => {
          g.managers.resources.oxygen.level = Math.max(0, g.managers.resources.oxygen.level - 20);
          g.managers.ui.addLog('💨 Oxygen: -20%! Check habitat seals.', 'danger');
        },
      },
      {
        id: 'dust_storm',
        type: 'warn',
        prob: 0.1,
        title: '🌪️ Lunar Dust Storm',
        msg: 'Electrostatic dust storm coating solar panels. 40% power reduction for 2 hours.',
        effect: (g) => {
          g.managers.base.getBuildingsByType('solarpanel').forEach(b => { b.damagedFactor = 0.6; });
          setTimeout(() => {
            g.managers.base.getBuildingsByType('solarpanel').forEach(b => { b.damagedFactor = 1; });
            g.managers.ui.addLog('☀️ Dust settled. Solar panels back to full power.', 'info');
          }, 20000);
        },
      },
      {
        id: 'water_recycler_fail',
        type: 'warn',
        prob: 0.09,
        title: '💧 Water Recycler Malfunction',
        msg: 'Water recycling system clogged with regolith. Water reserves -30L.',
        effect: (g) => {
          g.managers.resources.waterReservoir = Math.max(0, g.managers.resources.waterReservoir - 30);
        },
      },
      {
        id: 'crew_illness',
        type: 'warn',
        prob: 0.07,
        title: '🤒 Crew Member Ill',
        msg: 'One crew member fell ill (space adaptation syndrome). Morale -15%.',
        effect: (g) => {
          g.managers.resources.morale.level = Math.max(0, g.managers.resources.morale.level - 15);
          g.managers.ui.addLog('🤒 MediBay treating sick crew member.', 'warn');
        },
      },
      {
        id: 'comms_blackout',
        type: 'warn',
        prob: 0.06,
        title: '📡 Comms Blackout',
        msg: 'Lunar horizon blocked transmission for 48 hours. Morale -10%.',
        effect: (g) => {
          g.managers.resources.morale.level = Math.max(0, g.managers.resources.morale.level - 10);
        },
      },
      {
        id: 'isru_discovery',
        type: 'success',
        prob: 0.06,
        title: '🔬 Rich Ice Deposit Found!',
        msg: 'ISRU sensors detected a high-concentration ice deposit. Water gen +50% for 3 sols.',
        effect: (g) => {
          g.managers.base.getBuildingsByType('isru').forEach(b => { b.damagedFactor = 1.5; });
          setTimeout(() => {
            g.managers.base.getBuildingsByType('isru').forEach(b => { b.damagedFactor = 1; });
          }, 45000);
        },
      },
    ];
  }

  update(delta, speedFactor) {
    if (this.game.gameState !== 'playing') return;
    this.timer += delta * speedFactor;

    if (this.timer >= this.nextEvent) {
      this.timer = 0;
      this.nextEvent = this._randomInterval();
      this._triggerRandomEvent();
    }
  }

  _triggerRandomEvent() {
    // Weighted random selection
    const totalWeight = this.events.reduce((s, e) => s + e.prob, 0);
    let rand = Math.random() * totalWeight;

    for (const ev of this.events) {
      rand -= ev.prob;
      if (rand <= 0) {
        this._fireEvent(ev);
        return;
      }
    }
  }

  _fireEvent(ev) {
    const ui = this.game.managers.ui;
    ui?.addLog(`${ev.title}: ${ev.msg}`, ev.type);
    ui?.showAlert(ev.title, ev.type);

    try {
      ev.effect(this.game);
    } catch (err) {
      console.warn('Event effect error:', err);
    }
  }
}
