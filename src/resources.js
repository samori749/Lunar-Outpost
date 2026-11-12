// src/resources.js — Resource simulation engine (physically grounded)
// Based on NASA life support budgets, solar physics, and ISS data

export class ResourceManager {
  constructor(game) {
    this.game = game;
    this.crewCount = 3;

    // Resource pools
    this.power = { gen: 0, draw: 0, stored: 500, maxStored: 500, net: 0 };
    this.oxygen = { level: 100, gen: 0, draw: 0 };       // % (100 = full, 0 = dead)
    this.water  = { level: 100, gen: 0, draw: 0 };        // L stored
    this.food   = { days: 30, gen: 0, draw: 0 };          // crew-days of food
    this.radiation = { level: 1.04, shield: 0 };          // mSv/day baseline on lunar surface
    this.morale = { level: 100, boost: 0, decay: 1 };     // %

    // Accumulated radiation dose
    this.accumulatedDose = 0;  // mSv total

    // Crisis timers (seconds until consequence)
    this.crisisO2 = 0;
    this.crisisWater = 0;
    this.crisisFood = 0;
    this.crisisPower = 0;

    // Water reservoir
    this.waterReservoir = 200;  // L
    this.maxWaterReservoir = 200;

    this.initialized = false;
  }

  reset(crewCount) {
    this.crewCount = crewCount;
    this.oxygen.level = 100;
    this.water.level = 100;
    this.waterReservoir = 200;
    this.food.days = 30;
    this.radiation.level = 1.04;
    this.morale.level = 85;
    this.accumulatedDose = 0;
    this.crisisO2 = this.crisisWater = this.crisisFood = this.crisisPower = 0;
    this.power.stored = 100;
    this.power.maxStored = 100;
    this.initialized = true;
  }

  // ─── Called every frame ───
  update(delta, speedFactor, lunarTime) {
    if (!this.initialized) return;
    const game = this.game;
    const base = game.managers.base;
    if (!base) return;

    // Time scaling: 1 "game-day" = 1 sol = compressed into real time
    // At speed 1: ~1 real minute = 1 sol
    const solsPerSec = 0.00008 * speedFactor * 60; // sols per second
    const dayFraction = delta * solsPerSec;         // fraction of day elapsed

    // ─── 1. POWER SYSTEM ───
    this._simulatePower(base, lunarTime, dayFraction);

    // ─── 2. OXYGEN SYSTEM ───
    this._simulateOxygen(base, dayFraction);

    // ─── 3. WATER SYSTEM ───
    this._simulateWater(base, dayFraction);

    // ─── 4. FOOD SYSTEM ───
    this._simulateFood(base, dayFraction);

    // ─── 5. RADIATION ───
    this._simulateRadiation(base, dayFraction);

    // ─── 6. MORALE ───
    this._simulateMorale(base, dayFraction);

    // ─── 7. CRISIS CHECKS ───
    this._checkCrises(delta, speedFactor);

    // ─── 8. BUDGET from comms ───
    this._updateBudget(base, dayFraction);

    // ─── UPDATE UI ───
    game.managers.ui?.updateResources(this);
  }

  _simulatePower(base, lunarTime, dayFraction) {
    const angle = lunarTime * Math.PI * 2;
    const solarFactor = Math.max(0, Math.sin(angle)); // 0 at night, 1 at noon

    let gen = 0, draw = 0;
    let batteryCapacity = 100; // baseline battery from initial equipment

    base.buildings.forEach(b => {
      if (!b.powered) return;
      const eff = b.damagedFactor;
      const def = b.def;

      if (def.powerGen) {
        if (def.dayOnly) {
          gen += def.powerGen * solarFactor * eff;
        } else {
          gen += def.powerGen * eff;
        }
      }
      if (def.powerDraw) draw += def.powerDraw * eff;
      if (def.storageCapacity) batteryCapacity += def.storageCapacity;
    });

    // Crew life support baseline draw (always on)
    draw += this.crewCount * 2; // 2 kW per person baseline

    this.power.gen = gen;
    this.power.draw = draw;
    this.power.net = gen - draw;
    this.power.maxStored = batteryCapacity;

    // Charge/discharge battery
    this.power.stored = Math.max(0, Math.min(batteryCapacity,
      this.power.stored + this.power.net * dayFraction * 24 // kWh per day
    ));

    // Power offline logic
    const totalAvail = gen + (this.power.stored > 0 ? gen : 0);
    const powered = gen > 0 || this.power.stored > 1;

    if (!powered) {
      this.crisisPower += dayFraction;
    } else {
      this.crisisPower = 0;
    }

    // Auto power-down non-essentials when in deficit
    if (this.power.net < -5 && this.power.stored < 50) {
      this.game.managers.ui?.addLog('⚡ Power deficit! Battery depleting fast.', 'warn');
    }
  }

  _simulateOxygen(base, dayFraction) {
    // O₂ generation from O₂ generators
    let o2Gen = 0, o2Draw = 0;

    base.buildings.forEach(b => {
      if (!b.powered) return;
      const eff = b.damagedFactor;
      if (b.def.o2Gen) o2Gen += b.def.o2Gen * eff;
      if (b.def.co2Draw) o2Gen += b.def.co2Draw * eff * 0.5; // greenhouse recycles some CO₂
    });

    // Crew O₂ consumption: 0.84 kg/person/day = ~0.84% of tank per person per day
    // (abstracting tank capacity as percentage)
    o2Draw = this.crewCount * 0.84 * 2; // normalized to % per day

    // O₂ gen contribution
    const o2GenPct = o2Gen * 1.5; // scale gen to %/day
    const netO2 = (o2GenPct - o2Draw) * dayFraction;
    this.oxygen.level = Math.max(0, Math.min(100, this.oxygen.level + netO2));
    this.oxygen.gen = o2Gen;
    this.oxygen.draw = o2Draw;
  }

  _simulateWater(base, dayFraction) {
    let waterGen = 0, waterDraw = 0;

    base.buildings.forEach(b => {
      if (!b.powered) return;
      const eff = b.damagedFactor;
      if (b.def.waterGen) waterGen += b.def.waterGen * eff;
      if (b.def.waterDraw) waterDraw += b.def.waterDraw * eff;
    });

    // Crew water consumption: 3.5 L/person/day minimum
    waterDraw += this.crewCount * 3.5;

    const netWater = (waterGen - waterDraw) * dayFraction;
    this.waterReservoir = Math.max(0, Math.min(this.maxWaterReservoir, this.waterReservoir + netWater));
    this.water.level = (this.waterReservoir / this.maxWaterReservoir) * 100;
    this.water.gen = waterGen;
    this.water.draw = waterDraw;
  }

  _simulateFood(base, dayFraction) {
    let foodGen = 0;

    base.buildings.forEach(b => {
      if (!b.powered) return;
      if (b.def.foodGen) foodGen += b.def.foodGen * b.damagedFactor;
    });

    // Crew food consumption: 1 crew-day per person per day
    const foodDraw = this.crewCount * dayFraction;
    const foodGenDay = foodGen * dayFraction;

    this.food.days = Math.max(0, this.food.days - foodDraw + foodGenDay);
    this.food.gen = foodGen;
    this.food.draw = this.crewCount;
  }

  _simulateRadiation(base, dayFraction) {
    // Baseline: 1.04 mSv/day on lunar surface (NASA data)
    let rad = 1.04;
    let shield = 0;

    base.buildings.forEach(b => {
      const eff = b.damagedFactor;
      if (b.def.radiationReduction) shield += b.def.radiationReduction * eff;
      if (b.def.radiationAdd && b.powered) rad += b.def.radiationAdd * eff;
    });

    this.radiation.shield = shield;
    this.radiation.level = Math.max(0.1, rad - shield * 0.3);

    // Accumulate dose
    this.accumulatedDose += this.radiation.level * dayFraction;
  }

  _simulateMorale(base, dayFraction) {
    let boost = 0;
    let decay = 2; // base decay per day

    base.buildings.forEach(b => {
      if (!b.powered) return;
      if (b.def.moraleBoost) boost += b.def.moraleBoost * b.damagedFactor;
    });

    // Morale drops when resources critical
    if (this.oxygen.level < 20)   decay += 15;
    if (this.water.level < 20)    decay += 10;
    if (this.food.days < 5)       decay += 20;
    if (this.radiation.level > 5) decay += 5;
    if (this.power.stored < 10 && this.power.net < 0) decay += 8;

    // Boosts
    if (this.oxygen.level > 80 && this.food.days > 20) boost += 3;

    const netMorale = (boost - decay) * dayFraction;
    this.morale.level = Math.max(0, Math.min(100, this.morale.level + netMorale));
    this.morale.boost = boost;
    this.morale.decay = decay;
  }

  _checkCrises(delta, speedFactor) {
    const game = this.game;
    const ui = game.managers.ui;

    // O₂ crisis
    if (this.oxygen.level <= 0) {
      this.crisisO2 += delta;
      if (Math.floor(this.crisisO2 * 10) % 50 === 0) {
        ui?.addLog('💀 CREW SUFFOCATING — No oxygen!', 'danger');
      }
      if (this.crisisO2 > 15 / speedFactor) {
        game.triggerGameOver('The crew suffocated due to oxygen depletion.');
      }
    } else {
      this.crisisO2 = 0;
    }

    // Water crisis
    if (this.water.level <= 0) {
      this.crisisWater += delta;
      if (Math.floor(this.crisisWater * 10) % 100 === 0) {
        ui?.addLog('💀 CREW DEHYDRATING — No water!', 'danger');
      }
      if (this.crisisWater > 30 / speedFactor) {
        game.triggerGameOver('The crew died from dehydration.');
      }
    } else {
      this.crisisWater = 0;
    }

    // Food crisis
    if (this.food.days <= 0) {
      this.crisisFood += delta;
      if (Math.floor(this.crisisFood * 10) % 200 === 0) {
        ui?.addLog('💀 CREW STARVING — No food reserves!', 'danger');
      }
      if (this.crisisFood > 60 / speedFactor) {
        game.triggerGameOver('The crew starved to death. Build a greenhouse!');
      }
    } else {
      this.crisisFood = 0;
    }

    // Radiation death: >6 Sv accumulated = acute radiation syndrome
    if (this.accumulatedDose > 6000) {
      game.triggerGameOver(`Crew received fatal radiation dose (${Math.round(this.accumulatedDose)} mSv). Build radiation shields!`);
    }

    // Morale collapse
    if (this.morale.level <= 0) {
      game.triggerGameOver('Crew morale collapsed. The team abandoned the mission.');
    }

    // Warning alerts (throttled)
    const sol = game.sol;
    if (this.oxygen.level < 25 && sol % 1 === 0) {
      if (Math.random() < 0.01) ui?.addLog('⚠️ LOW OXYGEN — Build an O₂ generator!', 'warn');
    }
    if (this.food.days < 10) {
      if (Math.random() < 0.005) ui?.addLog('⚠️ LOW FOOD — Build a greenhouse!', 'warn');
    }
    if (this.power.stored < 20 && this.power.net < 0) {
      if (Math.random() < 0.005) ui?.addLog('⚡ POWER CRITICAL — Add solar panels or reactor!', 'warn');
    }
    if (this.radiation.level > 3) {
      if (Math.random() < 0.003) ui?.addLog('☢️ HIGH RADIATION — Build a radiation shield!', 'warn');
    }
  }

  _updateBudget(base, dayFraction) {
    base.buildings.forEach(b => {
      if (b.powered && b.def.budgetGen) {
        const income = b.def.budgetGen * dayFraction;
        this.game.budget += income;
      }
    });
    this.game.managers.ui?.updateBudget(Math.floor(this.game.budget));
  }

  onBuildingAdded(building) {
    // Extend water reservoir if storage
    if (building.def.storageCapacity) {
      this.maxWaterReservoir += 50;
    }
  }

  onBuildingRemoved(building) {
    if (building.def.storageCapacity) {
      this.maxWaterReservoir = Math.max(100, this.maxWaterReservoir - 50);
    }
  }

  // Public accessors for UI
  getPowerPct()     { return this.power.maxStored > 0 ? (this.power.stored / this.power.maxStored) * 100 : 0; }
  getOxygenPct()    { return this.oxygen.level; }
  getWaterPct()     { return this.water.level; }
  getFoodPct()      { return Math.min(100, (this.food.days / 60) * 100); }
  getRadiationPct() { return Math.min(100, (this.radiation.level / 10) * 100); }
  getMoralePct()    { return this.morale.level; }
}
