// src/terrain.js — Procedural Lunar Terrain with craters
import * as THREE from 'three';

// Simple pseudo-random noise (no external deps)
function hash(x, y) {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix+1, iy);
  const c = hash(ix, iy+1), d = hash(ix+1, iy+1);
  return a + (b-a)*ux + (c-a)*uy + (d-a)*ux*uy - (b-a)*ux - (c-a)*uy + (a - b - c + d) * ux * uy
    + (b-a)*ux + (c-a)*uy + (d + a - b - c) * ux * uy;
}

function fbm(x, y, octaves = 6) {
  let val = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    max += amp; amp *= 0.5; freq *= 2.1;
  }
  return val / max;
}

export class TerrainManager {
  constructor(sceneManager) {
    this.sm = sceneManager;
    this.scene = sceneManager.scene;
    this.terrain = null;
    this.groundMesh = null;
    this.SIZE = 500;
    this.SEGMENTS = 256;
    this.craterData = [];
    this.buildGrid = new Map(); // key='x,z' → occupied
  }

  async init() {
    this._generateTerrain();
    this._addRocks();
    this._addDustLayers();
    this._markBuildZone();
  }

  _generateTerrain() {
    const geo = new THREE.PlaneGeometry(
      this.SIZE, this.SIZE,
      this.SEGMENTS, this.SEGMENTS
    );
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const count = pos.count;

    // ─── Height field generation ───
    // Craters (pre-defined + procedural)
    this.craterData = this._generateCraters(25);

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Base FBM terrain
      let h = fbm(x * 0.004, z * 0.004) * 12 - 3;
      h += fbm(x * 0.015, z * 0.015) * 4;
      h += fbm(x * 0.05,  z * 0.05)  * 1.5;

      // Flatten central build zone (radius 60)
      const dCenter = Math.sqrt(x*x + z*z);
      const flatFactor = Math.min(1, Math.max(0, (dCenter - 50) / 40));
      h *= flatFactor;

      // Crater deformation
      for (const c of this.craterData) {
        const dx = x - c.x, dz = z - c.z;
        const d = Math.sqrt(dx*dx + dz*dz);
        const r = c.radius;
        if (d < r * 2.5) {
          const nd = d / r;
          if (nd < 1) {
            // Bowl interior
            h -= c.depth * (1 - nd * nd) * 0.8;
          } else if (nd < 1.5) {
            // Rim
            const rim = Math.sin((nd - 1) / 0.5 * Math.PI);
            h += c.depth * 0.4 * rim;
          }
        }
      }

      pos.setY(i, h);
    }

    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    // ─── Material: lunar regolith ───
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x9e9b8f),
      roughness: 0.98,
      metalness: 0.0,
    });

    // Vertex color variation
    const colors = [];
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
      const n = fbm(x * 0.03, z * 0.03);
      const r = 0.6 + n * 0.15;
      const g = 0.59 + n * 0.14;
      const b = 0.55 + n * 0.12;
      colors.push(r, g, b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    mat.vertexColors = true;

    this.groundMesh = new THREE.Mesh(geo, mat);
    this.groundMesh.receiveShadow = true;
    this.groundMesh.name = 'terrain';
    this.scene.add(this.groundMesh);

    this.terrain = { geometry: geo, material: mat };
  }

  _generateCraters(count) {
    const craters = [];
    // Central area has no craters (build zone)
    for (let i = 0; i < count; i++) {
      let x, z;
      do {
        x = (Math.random() - 0.5) * 400;
        z = (Math.random() - 0.5) * 400;
      } while (Math.sqrt(x*x + z*z) < 70);

      craters.push({
        x, z,
        radius: 8 + Math.random() * 30,
        depth: 2 + Math.random() * 8,
      });
    }
    // A few large craters far out
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + Math.random() * 0.5;
      const dist = 160 + Math.random() * 80;
      craters.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        radius: 40 + Math.random() * 30,
        depth: 10 + Math.random() * 12,
      });
    }
    return craters;
  }

  _addRocks() {
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x7a7870,
      roughness: 1.0, metalness: 0.0,
    });

    const instanced = new THREE.InstancedMesh(rockGeo, rockMat, 300);
    instanced.castShadow = true;
    instanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < 300; i++) {
      let x, z;
      do {
        x = (Math.random() - 0.5) * 460;
        z = (Math.random() - 0.5) * 460;
      } while (Math.sqrt(x*x + z*z) < 65);

      const y = this.getHeightAt(x, z) + Math.random() * 0.5;
      const s = 0.3 + Math.random() * 2.5;
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.set(s, s * (0.4 + Math.random() * 0.6), s);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
    this.scene.add(instanced);
  }

  _addDustLayers() {
    // Subtle flat dust plains
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.CircleGeometry(20 + Math.random() * 40, 32);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xb8b4a8, roughness: 1, metalness: 0,
        transparent: true, opacity: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 160;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      mesh.position.set(x, this.getHeightAt(x, z) + 0.05, z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
  }

  _markBuildZone() {
    // Visual ring showing build area
    const ring = new THREE.RingGeometry(58, 60, 64);
    ring.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ring, ringMat);
    ringMesh.position.y = 0.5;
    this.scene.add(ringMesh);
    this.buildZoneRing = ringMesh;

    // Grid helper (subtle)
    const gridHelper = new THREE.GridHelper(120, 20, 0x1a3a5c, 0x0d2035);
    gridHelper.position.y = 0.3;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    this.scene.add(gridHelper);
  }

  // Raycast-based height sampling (approximate)
  getHeightAt(wx, wz) {
    const geo = this.terrain?.geometry;
    if (!geo) return 0;
    const pos = geo.attributes.position;
    const seg = this.SEGMENTS;
    const half = this.SIZE / 2;

    // Normalize to grid
    const gx = ((wx + half) / this.SIZE) * seg;
    const gz = ((wz + half) / this.SIZE) * seg;
    const ix = Math.max(0, Math.min(seg - 1, Math.floor(gx)));
    const iz = Math.max(0, Math.min(seg - 1, Math.floor(gz)));
    const idx = iz * (seg + 1) + ix;
    return pos.getY(idx) || 0;
  }

  // Check if build position is valid (in build zone, not occupied)
  canBuildAt(x, z) {
    const d = Math.sqrt(x*x + z*z);
    if (d > 55) return false;
    const key = `${Math.round(x/5)},${Math.round(z/5)}`;
    return !this.buildGrid.has(key);
  }

  occupyCell(x, z) {
    const key = `${Math.round(x/5)},${Math.round(z/5)}`;
    this.buildGrid.set(key, true);
  }

  freeCell(x, z) {
    const key = `${Math.round(x/5)},${Math.round(z/5)}`;
    this.buildGrid.delete(key);
  }

  reset() {
    this.buildGrid.clear();
  }
}
