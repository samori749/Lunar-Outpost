// src/sky.js — Skybox, Stars, Earth, Moon surface view, Sun disc
import * as THREE from 'three';

export class SkyManager {
  constructor(sceneManager) {
    this.sm = sceneManager;
    this.scene = sceneManager.scene;
    this.sunMesh = null;
    this.earthMesh = null;
    this.starField = null;
    this.sunHalo = null;
    this.lunarTime = 0;
  }

  async init() {
    this._createStarfield();
    this._createEarth();
    this._createSun();
    this._createMilkyWay();
  }

  _createStarfield() {
    const starCount = 8000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Random sphere distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1800 + Math.random() * 200;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.7 + r * 0.3; // bias upward
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Star color variation (blue-white-yellow-orange)
      const temp = Math.random();
      if (temp < 0.1) { colors[i*3]=0.6; colors[i*3+1]=0.7; colors[i*3+2]=1.0; }       // blue
      else if (temp < 0.5) { colors[i*3]=1.0; colors[i*3+1]=1.0; colors[i*3+2]=1.0; }  // white
      else if (temp < 0.8) { colors[i*3]=1.0; colors[i*3+1]=0.95; colors[i*3+2]=0.8; } // yellow-white
      else { colors[i*3]=1.0; colors[i*3+1]=0.7; colors[i*3+2]=0.4; }                   // orange

      sizes[i] = 0.5 + Math.random() * 2.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('size',     new THREE.Float32BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 1.2, sizeAttenuation: true,
      vertexColors: true, transparent: true, opacity: 1.0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });

    this.starField = new THREE.Points(geo, mat);
    this.scene.add(this.starField);
  }

  _createEarth() {
    // Earth as a glowing sphere in the sky
    const geo = new THREE.SphereGeometry(28, 64, 64);

    // Procedural earth material using shader-like approach
    const mat = new THREE.MeshPhongMaterial({
      color: 0x1a6fa8,
      emissive: 0x0a2a4a,
      emissiveIntensity: 0.3,
      specular: 0x4499cc,
      shininess: 30,
    });

    this.earthMesh = new THREE.Mesh(geo, mat);

    // Position Earth in the sky (it's always in roughly the same position from lunar surface)
    this.earthMesh.position.set(-280, 220, -380);
    this.scene.add(this.earthMesh);

    // Add atmosphere glow
    const atmoGeo = new THREE.SphereGeometry(31, 32, 32);
    const atmoMat = new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.FrontSide,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    this.earthMesh.add(atmo);

    // Cloud layer visual
    const cloudGeo = new THREE.SphereGeometry(29.5, 32, 32);
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff, transparent: true, opacity: 0.25,
    });
    this.earthClouds = new THREE.Mesh(cloudGeo, cloudMat);
    this.earthMesh.add(this.earthClouds);

    // Green continents hint
    const landGeo = new THREE.SphereGeometry(28.2, 32, 32);
    const landMat = new THREE.MeshLambertMaterial({
      color: 0x2d7a2d, transparent: true, opacity: 0.4,
    });
    const land = new THREE.Mesh(landGeo, landMat);
    this.earthMesh.add(land);
  }

  _createSun() {
    // Sun disc
    const geo = new THREE.SphereGeometry(12, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfffde7,
      transparent: false,
    });
    this.sunMesh = new THREE.Mesh(geo, mat);

    // Corona / halo
    const haloGeo = new THREE.SphereGeometry(20, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffee88,
      transparent: true, opacity: 0.15,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.sunHalo = new THREE.Mesh(haloGeo, haloMat);
    this.sunMesh.add(this.sunHalo);

    this.scene.add(this.sunMesh);
  }

  _createMilkyWay() {
    // Milky way band — dense star cluster
    const count = 5000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 0.6;
      const r = 1900;
      const bandAngle = t;
      const phi = Math.PI / 2 + spread; // equatorial band

      positions[i*3]     = r * Math.sin(phi + spread * 0.3) * Math.cos(bandAngle);
      positions[i*3+1]   = r * Math.cos(phi + spread * 0.3) + 400;
      positions[i*3+2]   = r * Math.sin(phi + spread * 0.3) * Math.sin(bandAngle);

      const brightness = 0.3 + Math.random() * 0.5;
      colors[i*3] = brightness * 0.9;
      colors[i*3+1] = brightness * 0.85;
      colors[i*3+2] = brightness;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.8, vertexColors: true,
      transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });

    this.scene.add(new THREE.Points(geo, mat));
  }

  update(lunarTime, delta) {
    this.lunarTime = lunarTime;

    // Sun position tracks lunar day/night cycle
    const angle = lunarTime * Math.PI * 2;
    const radius = 700;
    const sx = Math.cos(angle) * radius;
    const sy = Math.sin(angle) * 350;
    const sz = Math.sin(angle * 0.7) * 200;

    this.sunMesh.position.set(sx, sy, sz);
    this.sunMesh.visible = sy > -50;

    // Update scene manager sun light
    this.sm.updateSunPosition(lunarTime);

    // Rotate Earth slowly
    if (this.earthClouds) this.earthClouds.rotation.y += delta * 0.02;
    this.earthMesh.rotation.y += delta * 0.005;

    // Dim stars during lunar day
    const dayness = Math.max(0, Math.sin(angle));
    if (this.starField) {
      this.starField.material.opacity = Math.max(0.1, 1 - dayness * 0.3);
    }
  }

  // Returns temperature based on lunar time (°C)
  getSurfaceTemp(lunarTime) {
    const angle = lunarTime * Math.PI * 2;
    const isDay = Math.sin(angle) > 0;
    if (isDay) {
      return Math.round(121 * Math.sin(angle));
    } else {
      return Math.round(-173 * Math.abs(Math.sin(angle)));
    }
  }
}
