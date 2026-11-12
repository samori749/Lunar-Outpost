// src/base.js — Building placement, management, and 3D interaction
import * as THREE from 'three';
import { BUILDING_DEFS, createBuildingMesh } from './buildings.js';

export class BaseManager {
  constructor(game, sceneManager, terrainManager) {
    this.game = game;
    this.sm = sceneManager;
    this.scene = sceneManager.scene;
    this.terrain = terrainManager;

    this.buildings = [];      // { id, type, mesh, x, z, def, powered, damaged }
    this.ghostMesh = null;
    this.buildMode = null;    // current type being placed

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.ghostPos = new THREE.Vector3();

    this.selectedBuilding = null;
    this._nextId = 1;
  }

  async init() {
    this._setupBuildButtons();
  }

  _setupBuildButtons() {
    document.querySelectorAll('.build-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        if (this.buildMode === type) {
          this.cancelBuildMode();
        } else {
          this.enterBuildMode(type);
        }
      });
    });

    document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-demolish')?.addEventListener('click', () => {
      if (this.selectedBuilding) this.demolish(this.selectedBuilding.id);
      this.closeModal();
    });

    // ESC cancels build mode
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.cancelBuildMode();
    });
  }

  enterBuildMode(type) {
    if (!BUILDING_DEFS[type]) return;

    // Check budget
    const def = BUILDING_DEFS[type];
    if (this.game.budget < def.cost) {
      this.game.managers.ui.showAlert(`⚠️ Not enough budget! Need 💰${def.cost}`);
      return;
    }

    this.buildMode = type;
    document.querySelectorAll('.build-btn').forEach(b =>
      b.classList.toggle('active-build', b.dataset.type === type)
    );

    // Show ghost
    this._createGhost(type);

    const indicator = document.getElementById('build-indicator');
    indicator.classList.remove('hidden');
    document.getElementById('bi-text').textContent = `Placing ${def.name} — ESC to cancel`;
    document.getElementById('bi-info').textContent =
      `Cost: 💰${def.cost} | ${def.powerDraw ? '⚡-' + def.powerDraw + 'kW ' : ''}${def.powerGen ? '⚡+' + def.powerGen + 'kW' : ''}`;

    this.game.managers.controls.setBuildMode(true);
  }

  cancelBuildMode() {
    this.buildMode = null;
    document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active-build'));
    document.getElementById('build-indicator').classList.add('hidden');
    this._removeGhost();
    this.game.managers.controls.setBuildMode(false);
  }

  _createGhost(type) {
    this._removeGhost();
    this.ghostMesh = createBuildingMesh(type);
    this.ghostMesh.traverse(child => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.45;
        child.material.color.set(0x4fc3f7);
      }
    });
    this.ghostMesh.name = 'ghost';
    this.scene.add(this.ghostMesh);
  }

  _removeGhost() {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh.traverse(c => { if (c.isMesh) c.geometry.dispose(); });
      this.ghostMesh = null;
    }
  }

  updateGhostPosition(ndc, camera) {
    if (!this.ghostMesh) return;
    const ray = new THREE.Ray();
    this.raycaster.setFromCamera(ndc, camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, target);

    if (target) {
      const y = this.terrain.getHeightAt(target.x, target.z) + 0.1;
      this.ghostMesh.position.set(target.x, y, target.z);
      this.ghostPos.copy(target);

      // Color feedback
      const canBuild = this.terrain.canBuildAt(target.x, target.z);
      this.ghostMesh.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.color.set(canBuild ? 0x4fc3f7 : 0xff5252);
          child.material.opacity = canBuild ? 0.5 : 0.35;
        }
      });
    }
  }

  placeBuilding(ndc, camera) {
    if (!this.buildMode) return;
    const ray = new THREE.Ray();
    this.raycaster.setFromCamera(ndc, camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, target);
    if (!target) return;

    const x = target.x, z = target.z;

    if (!this.terrain.canBuildAt(x, z)) {
      this.game.managers.ui.showAlert('⛔ Cannot build here — outside zone or occupied');
      return;
    }

    const def = BUILDING_DEFS[this.buildMode];
    if (!this.game.spendBudget(def.cost)) {
      this.game.managers.ui.showAlert(`⚠️ Insufficient budget! Need 💰${def.cost}`);
      return;
    }

    const y = this.terrain.getHeightAt(x, z);
    const mesh = createBuildingMesh(this.buildMode);
    mesh.position.set(x, y, z);

    // Landing animation
    mesh.scale.set(0.1, 0.1, 0.1);
    mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    this.scene.add(mesh);

    // Animate scale up
    this._animateScale(mesh, { x: 1, y: 1, z: 1 }, 600);

    const building = {
      id: this._nextId++,
      type: this.buildMode,
      mesh,
      x, z,
      def: { ...def },
      powered: true,
      damaged: false,
      damagedFactor: 1.0,
      constructed: this.game.sol,
    };

    this.buildings.push(building);
    this.terrain.occupyCell(x, z);
    this.game.managers.resources.onBuildingAdded(building);
    this.game.managers.ui.addLog(`🏗️ Built ${def.name} at (${Math.round(x)}, ${Math.round(z)})`, 'success');

    // Type: keep build mode for rapid placement
    this.cancelBuildMode();
  }

  _animateScale(mesh, target, duration) {
    const start = performance.now();
    const startScale = { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z };
    const anim = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease out
      mesh.scale.set(
        startScale.x + (target.x - startScale.x) * ease,
        startScale.y + (target.y - startScale.y) * ease,
        startScale.z + (target.z - startScale.z) * ease
      );
      if (t < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }

  demolish(id) {
    const idx = this.buildings.findIndex(b => b.id === id);
    if (idx < 0) return;
    const b = this.buildings[idx];

    // Animate collapse
    this._animateScale(b.mesh, { x: 0.01, y: 0.01, z: 0.01 }, 400);
    setTimeout(() => {
      this.scene.remove(b.mesh);
      b.mesh.traverse(c => { if (c.isMesh) { c.geometry.dispose(); } });
    }, 450);

    this.terrain.freeCell(b.x, b.z);
    this.game.managers.resources.onBuildingRemoved(b);
    this.buildings.splice(idx, 1);

    // Partial refund
    const refund = Math.floor(b.def.cost * 0.4);
    this.game.gainBudget(refund);
    this.game.managers.ui.addLog(`💔 Demolished ${b.def.name} (+💰${refund} salvage)`, 'warn');
  }

  demolishAll() {
    [...this.buildings].forEach(b => {
      this.scene.remove(b.mesh);
    });
    this.buildings = [];
    this.terrain.reset();
  }

  // Click-to-select building
  selectBuildingAt(ndc, camera) {
    this.raycaster.setFromCamera(ndc, camera);
    const meshes = [];
    this.buildings.forEach(b => b.mesh.traverse(c => { if (c.isMesh) meshes.push(c); }));
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;

    // Find parent building
    let obj = hits[0].object;
    while (obj.parent && obj.parent.type !== 'Scene') obj = obj.parent;
    const building = this.buildings.find(b => b.mesh === obj || b.mesh.children.includes(obj));
    if (building) {
      this.selectedBuilding = building;
      this.openModal(building);
    }
    return building;
  }

  openModal(b) {
    const modal = document.getElementById('building-modal');
    document.getElementById('modal-title').textContent = b.def.name;
    document.getElementById('modal-icon').textContent = b.def.icon;

    const def = b.def;
    const stats = [];
    if (def.powerGen)             stats.push({ k: '⚡ Power Generated',   v: `+${def.powerGen} kW`,    cls: 'pos' });
    if (def.powerDraw)            stats.push({ k: '⚡ Power Consumed',     v: `-${def.powerDraw} kW`,   cls: 'neg' });
    if (def.o2Gen)                stats.push({ k: '💨 O₂ Generated',       v: `+${def.o2Gen} kg/day`,   cls: 'pos' });
    if (def.o2Draw)               stats.push({ k: '💨 O₂ Consumed',        v: `-${def.o2Draw} kg/day`,  cls: 'neg' });
    if (def.waterGen)             stats.push({ k: '💧 Water Generated',     v: `+${def.waterGen} L/day`, cls: 'pos' });
    if (def.waterDraw)            stats.push({ k: '💧 Water Consumed',      v: `-${def.waterDraw} L/day',cls: 'neg' });
    if (def.foodGen)              stats.push({ k: '🌱 Food Generated',      v: `+${def.foodGen} crew-d`, cls: 'pos' });
    if (def.radiationReduction)   stats.push({ k: '🛡️ Radiation Shield',    v: `-${def.radiationReduction} mSv/d`, cls: 'pos' });
    if (def.radiationAdd)         stats.push({ k: '☢️ Radiation Added',     v: `+${def.radiationAdd} mSv/d`, cls: 'neg' });
    if (def.moraleBoost)          stats.push({ k: '😊 Morale',              v: `+${def.moraleBoost}%/d`, cls: 'pos' });
    if (def.budgetGen)            stats.push({ k: '💰 Income',              v: `+${def.budgetGen}/sol`, cls: 'pos' });
    if (def.crewCapacity)         stats.push({ k: '👥 Crew Capacity',       v: `${def.crewCapacity} people`, cls: '' });
    if (def.storageCapacity)      stats.push({ k: '🔋 Storage',             v: `${def.storageCapacity} kWh`, cls: '' });

    stats.push({ k: '📅 Built on Sol', v: `${b.constructed}`, cls: '' });
    stats.push({ k: '🔧 Condition',    v: b.damaged ? '⚠️ DAMAGED' : '✅ Operational', cls: b.damaged ? 'warn' : 'pos' });
    stats.push({ k: '⚡ Powered',      v: b.powered ? 'Yes' : '❌ Offline', cls: b.powered ? 'pos' : 'neg' });

    document.getElementById('modal-stats').innerHTML = stats.map(s =>
      `<div class="stat-row"><span class="stat-key">${s.k}</span><span class="stat-val ${s.cls}">${s.v}</span></div>`
    ).join('');

    document.getElementById('modal-edu').textContent = def.edu;

    modal.classList.remove('hidden');
  }

  closeModal() {
    document.getElementById('building-modal').classList.add('hidden');
    this.selectedBuilding = null;
  }

  update(delta) {
    // Animate buildings (subtle floating, blinking lights)
    const t = performance.now() * 0.001;
    this.buildings.forEach(b => {
      // Slow Y-rotation for comms dish
      if (b.type === 'comms') b.mesh.rotation.y += delta * 0.3;
      // Pulsing glow (PointLights)
      b.mesh.traverse(child => {
        if (child.isPointLight) {
          child.intensity = child.intensity * 0.95 + (0.8 + Math.sin(t * 2 + b.id) * 0.3) * 0.05;
        }
      });
    });
  }

  reset() {
    this.demolishAll();
    this.cancelBuildMode();
    this._nextId = 1;
  }

  getBuildingCount() { return this.buildings.length; }

  getBuildingsByType(type) { return this.buildings.filter(b => b.type === type); }

  damageBuilding(id) {
    const b = this.buildings.find(b => b.id === id);
    if (!b) return;
    b.damaged = true;
    b.damagedFactor = 0.3;
    // Visual damage: tint mesh red
    b.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color(0.4, 0, 0);
        child.material.emissiveIntensity = 0.5;
      }
    });
    this.game.managers.ui.addLog(`💥 ${b.def.name} damaged!`, 'danger');
  }

  repairBuilding(id) {
    const b = this.buildings.find(b => b.id === id);
    if (!b || !b.damaged) return;
    b.damaged = false;
    b.damagedFactor = 1.0;
    b.mesh.traverse(child => {
      if (child.isMesh && child.material && child.material.emissive) {
        child.material.emissive.set(0, 0, 0);
        child.material.emissiveIntensity = 0;
      }
    });
    this.game.managers.ui.addLog(`🔧 ${b.def.name} repaired`, 'success');
  }
}
