// src/particles.js — Dust, solar wind particles, reactor steam, exhaust effects
import * as THREE from 'three';

export class ParticleManager {
  constructor(sceneManager) {
    this.sm = sceneManager;
    this.scene = sceneManager.scene;
    this.dustSystem = null;
    this.solarWindSystem = null;
    this.dustTime = 0;
  }

  async init() {
    this._createDustParticles();
    this._createSolarWind();
    this._createAmbientStardust();
  }

  _createDustParticles() {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this._resetDustParticle(positions, velocities, alphas, i);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xc8b89a,
      size: 0.3,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.dustSystem = new THREE.Points(geo, mat);
    this.dustSystem.name = 'dust';
    this._dustPositions = positions;
    this._dustVelocities = velocities;
    this._dustAlphas = alphas;
    this._dustCount = count;
    this.scene.add(this.dustSystem);
  }

  _resetDustParticle(pos, vel, alpha, i) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 100;
    pos[i * 3]     = Math.cos(angle) * radius;
    pos[i * 3 + 1] = Math.random() * 3;
    pos[i * 3 + 2] = Math.sin(angle) * radius;
    vel[i * 3]     = (Math.random() - 0.5) * 0.5;
    vel[i * 3 + 1] = Math.random() * 1.5;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    alpha[i] = Math.random();
  }

  _createSolarWind() {
    const count = 500;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = 50 + Math.random() * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffee88,
      size: 0.5,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.solarWindSystem = new THREE.Points(geo, mat);
    this._solarPositions = positions;
    this.scene.add(this.solarWindSystem);
  }

  _createAmbientStardust() {
    // Floating cosmic dust high up
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 600;
      positions[i * 3 + 1] = 100 + Math.random() * 300;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 600;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.2, transparent: true, opacity: 0.05,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.scene.add(new THREE.Points(geo, mat));
  }

  update(delta, lunarTime) {
    this.dustTime += delta;

    // Update dust particles
    if (this.dustSystem) {
      const pos = this._dustPositions;
      const vel = this._dustVelocities;
      const count = this._dustCount;

      for (let i = 0; i < count; i++) {
        pos[i * 3]     += vel[i * 3]     * delta * 0.5;
        pos[i * 3 + 1] += vel[i * 3 + 1] * delta * 0.3;
        pos[i * 3 + 2] += vel[i * 3 + 2] * delta * 0.5;

        // Reset if too high or too far
        if (pos[i * 3 + 1] > 20 || Math.abs(pos[i * 3]) > 150 || Math.abs(pos[i * 3 + 2]) > 150) {
          this._resetDustParticle(pos, vel, this._dustAlphas, i);
        }
      }
      this.dustSystem.geometry.attributes.position.needsUpdate = true;

      // Fade dust during night (less thermal activity)
      const angle = lunarTime * Math.PI * 2;
      const dayness = Math.max(0, Math.sin(angle));
      this.dustSystem.material.opacity = 0.1 + dayness * 0.2;
    }

    // Drift solar wind particles
    if (this.solarWindSystem) {
      const pos = this._solarPositions;
      for (let i = 0; i < 500; i++) {
        pos[i * 3] += delta * 2;
        if (pos[i * 3] > 200) pos[i * 3] = -200;
      }
      this.solarWindSystem.geometry.attributes.position.needsUpdate = true;
    }
  }
}
