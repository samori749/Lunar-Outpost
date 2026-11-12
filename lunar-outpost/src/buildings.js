// src/buildings.js — Building definitions + 3D model factories
import * as THREE from 'three';

// ─── BUILDING DEFINITIONS ───
// All real-ish numbers based on NASA/ESA literature
export const BUILDING_DEFS = {
  habitat: {
    name: 'Habitat Module',
    icon: '🏠',
    cost: 500,
    size: 7,
    crewCapacity: 4,
    powerDraw: 15,       // kW
    o2Draw: 0.84,        // kg/day per person → converted in resources
    waterDraw: 3.5,      // L/day per person
    foodDraw: 0,
    radiationReduction: 5,  // mSv/day inside shielding
    color: 0x4a90d9,
    edu: 'Lunar habitat modules use multi-layer insulation (MLI) blankets and radiation-hardened structures. ' +
         'Each crew member needs ~15 kW average power, 0.84 kg O₂/day, and 3.5 L water/day at minimum. ' +
         'NASA\'s Lunar Gateway uses a similar power budget.',
  },
  solarpanel: {
    name: 'Solar Array',
    icon: '☀️',
    cost: 200,
    size: 10,
    powerGen: 25,        // kW (at peak, ~1361 W/m² at lunar orbit)
    dayOnly: true,
    color: 0x1565c0,
    edu: 'At the Moon\'s distance, solar irradiance is 1,361 W/m². Modern solar cells achieve ~30% efficiency. ' +
         'A 10m² array generates ~4 kW. The challenge: 14-day lunar nights require massive battery storage ' +
         'or nuclear backup — the core engineering trade-off for lunar power systems.',
  },
  reactor: {
    name: 'Nuclear Fission Reactor',
    icon: '⚛️',
    cost: 1200,
    size: 8,
    powerGen: 40,        // kW (NASA Kilopower = 10kW; scaled here)
    radiationAdd: 3,     // mSv/day if unshielded
    color: 0xff6d00,
    edu: 'NASA\'s Kilopower project (KRUSTY) demonstrated a 1–10 kW fission reactor. ' +
         'Reactors provide steady power through lunar night — critical for survival. ' +
         'Trade-off: radiation shielding adds mass; radiators for heat rejection add complexity. ' +
         'The Stirling engine converts fission heat to electricity at ~25% efficiency.',
  },
  battery: {
    name: 'Battery Storage',
    icon: '🔋',
    cost: 300,
    size: 4,
    storageCapacity: 500, // kWh
    powerDraw: 1,
    color: 0x558b2f,
    edu: 'Energy storage is critical during the 14-Earth-day lunar night. ' +
         'State-of-art Li-ion batteries hold ~300 Wh/kg. Storing enough for 14 days would require ' +
         'hundreds of tons — making nuclear the preferred choice. Batteries serve as buffer/backup.',
  },
  greenhouse: {
    name: 'Greenhouse Module',
    icon: '🌿',
    cost: 600,
    size: 9,
    foodGen: 0.5,        // crew-days of food per game-day
    powerDraw: 20,        // LED grow lights + HVAC
    waterDraw: 10,        // L/day for plants
    co2Draw: 0.5,         // recycles CO₂ from habitat
    color: 0x2e7d32,
    edu: 'NASA\'s VEGGIE and Advanced Plant Habitat experiments on ISS proved plants grow in microgravity. ' +
         'On the Moon, grow lights must replace sunlight (LED efficiency ~50%). ' +
         'Each m² of growing area can produce ~5–10 g protein/day. ISRU CO₂ recycling closes the loop, ' +
         'reducing resupply mass — a key sustainability enabler.',
  },
  o2generator: {
    name: 'Oxygen Generator',
    icon: '💨',
    cost: 400,
    size: 5,
    o2Gen: 2.0,          // kg O₂/day via electrolysis
    powerDraw: 10,
    waterDraw: 2.25,      // 2.25 L water → 2 kg O₂ (electrolysis ratio)
    color: 0x00838f,
    edu: 'Water electrolysis: 2H₂O → 2H₂ + O₂. Each kg of O₂ requires ~9 L of water and ~15 kWh. ' +
         'The ISS uses a similar system (OGS – Oxygen Generation System). ' +
         'On the Moon, water from polar ice (ISRU) is the upstream resource — linking power, water, and air.',
  },
  isru: {
    name: 'ISRU Water Miner',
    icon: '💧',
    cost: 450,
    size: 6,
    waterGen: 20,        // L/day from regolith ice
    powerDraw: 18,
    color: 0x006064,
    edu: 'In-Situ Resource Utilization (ISRU) extracts water ice confirmed at lunar poles by LCROSS (2009). ' +
         'The ice is thermally extracted, then electrolyzed. ISRU dramatically reduces Earth-launch mass: ' +
         '1 kg of water from Earth costs ~$10,000–50,000 to deliver — making ISRU an economic necessity.',
  },
  radioshield: {
    name: 'Radiation Shield',
    icon: '🛡️',
    cost: 700,
    size: 12,
    radiationReduction: 20, // mSv/day global reduction
    powerDraw: 0,
    color: 0x37474f,
    edu: 'Without Earth\'s magnetosphere, lunar surface receives ~380 mSv/year (10× Earth average). ' +
         'Solar energetic particles (SEPs) during flares can deliver 1 Sv in hours — lethal. ' +
         'Solutions: 2–3m of regolith (mass shielding), water walls (H-rich), or polyethylene panels. ' +
         'NASA\'s limit: 50 mSv/year occupational; 1 Sv career limit for astronauts.',
  },
  medibay: {
    name: 'Medical Bay',
    icon: '🏥',
    cost: 350,
    size: 6,
    moraleBoost: 10,     // morale per day
    radiationTreatment: 5, // reduces accumulated dose effects
    powerDraw: 8,
    color: 0xc62828,
    edu: 'Autonomous medical capability is essential beyond Earth\'s 1–3 day emergency return window. ' +
         'The Moon is 3 days away; Mars is 6–9 months. Telemedicine, robotic surgery aids, ' +
         'and radiation countermeasures (amifostine, G-CSF) form the core of a lunar medical kit. ' +
         'Crew health directly impacts mission success probability.',
  },
  comms: {
    name: 'Communications Array',
    icon: '📡',
    cost: 350,
    size: 7,
    moraleBoost: 5,
    budgetGen: 50,       // mission support credits per sol
    powerDraw: 5,
    color: 0x6a1b9a,
    edu: 'Lunar communications use the NASA Near Space Network and Lunar Reconnaissance Orbiter relay. ' +
         'Signal delay: 1.3 seconds one-way (vs 20 min for Mars). Maintaining contact with Earth ' +
         'improves crew psychological health, enables remote diagnosis, and allows mission science data uplink. ' +
         'The LunaNet architecture proposes a permanent lunar internet infrastructure.',
  },
};

// ─── 3D MODEL BUILDERS ───

function addGlow(mesh, color, intensity = 1, distance = 15) {
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(0, 2, 0);
  mesh.add(light);
}

export function buildHabitatMesh() {
  const group = new THREE.Group();

  // Main cylinder base
  const bodyGeo = new THREE.CylinderGeometry(3, 3.2, 4, 24);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xd4d8e0, roughness: 0.4, metalness: 0.6,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 2;
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);

  // Dome top
  const domeGeo = new THREE.SphereGeometry(3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xc8dff0, roughness: 0.1, metalness: 0.1,
    transparent: true, opacity: 0.75,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 4;
  dome.castShadow = true;
  group.add(dome);

  // Regolith shielding (outer layer)
  const shieldGeo = new THREE.CylinderGeometry(3.5, 3.6, 3, 24);
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 1, metalness: 0 });
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  shield.position.y = 1.5;
  shield.castShadow = true; shield.receiveShadow = true;
  group.add(shield);

  // Airlock
  const lockGeo = new THREE.BoxGeometry(1.2, 2, 1.2);
  const lockMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5, metalness: 0.8 });
  const lock = new THREE.Mesh(lockGeo, lockMat);
  lock.position.set(3.2, 1, 0);
  lock.castShadow = true;
  group.add(lock);

  // Window glow
  const windowGeo = new THREE.CircleGeometry(0.5, 16);
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffe082, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const win = new THREE.Mesh(windowGeo, windowMat);
    const angle = i * Math.PI / 2;
    win.position.set(Math.cos(angle) * 3.01, 2.5, Math.sin(angle) * 3.01);
    win.lookAt(Math.cos(angle) * 10, 2.5, Math.sin(angle) * 10);
    group.add(win);
  }

  addGlow(group, 0xffe082, 0.8, 12);
  return group;
}

export function buildSolarPanelMesh() {
  const group = new THREE.Group();

  // Central mast
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 5, 8),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.2 })
  );
  mast.position.y = 2.5;
  mast.castShadow = true;
  group.add(mast);

  // Solar panels (3 rows × 2 columns)
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1a237e, metalness: 0.3, roughness: 0.5,
    emissive: 0x0a0a3a, emissiveIntensity: 0.3,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.05, 1.5), panelMat);
      panel.position.set((c - 1) * 3, 5, r === 0 ? -1.5 : 1.5);
      panel.castShadow = true; panel.receiveShadow = true;
      group.add(panel);

      // Grid lines on panel
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.06, 1.6), frameMat);
      frame.position.copy(panel.position);
      frame.position.y -= 0.03;
      group.add(frame);
    }
  }

  // Tracking arm
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 10),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 })
  );
  arm.position.y = 5;
  group.add(arm);

  return group;
}

export function buildReactorMesh() {
  const group = new THREE.Group();

  // Core cylinder
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x546e7a, metalness: 0.8, roughness: 0.3,
  });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 5, 16), coreMat);
  core.position.y = 2.5;
  core.castShadow = true;
  group.add(core);

  // Radiator fins
  const finMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.7, roughness: 0.4 });
  for (let i = 0; i < 8; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4, 2), finMat);
    const angle = (i / 8) * Math.PI * 2;
    fin.position.set(Math.cos(angle) * 3.5, 2, Math.sin(angle) * 3.5);
    fin.rotation.y = angle;
    fin.castShadow = true;
    group.add(fin);
  }

  // Glow top
  const capGeo = new THREE.CylinderGeometry(2.2, 2.5, 0.5, 16);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xff6d00, emissive: 0xff4500, emissiveIntensity: 1.5, metalness: 0.5, roughness: 0.3,
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 5.3;
  group.add(cap);

  // Heat pipes
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.9, roughness: 0.1 });
  for (let i = 0; i < 4; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 8), pipeMat);
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
    pipe.position.set(Math.cos(angle) * 2, 4, Math.sin(angle) * 2);
    group.add(pipe);
  }

  addGlow(group, 0xff4500, 2, 20);
  return group;
}

export function buildGreenhouseMesh() {
  const group = new THREE.Group();

  // Base structure
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1, 7),
    new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.5, roughness: 0.6 })
  );
  base.position.y = 0.5;
  base.castShadow = true; base.receiveShadow = true;
  group.add(base);

  // Glass dome / tunnel
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x80cbc4, transparent: true, opacity: 0.35,
    metalness: 0.1, roughness: 0.05, side: THREE.DoubleSide,
  });
  const tunnel = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 10, 24, 1, false, 0, Math.PI),
    glassMat
  );
  tunnel.rotation.z = Math.PI / 2;
  tunnel.rotation.x = Math.PI / 2;
  tunnel.position.y = 3.5;
  group.add(tunnel);

  // Frame arches
  const archMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, metalness: 0.8, roughness: 0.3 });
  for (let i = 0; i < 6; i++) {
    const archGeo = new THREE.TorusGeometry(3, 0.1, 8, 16, Math.PI);
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(-4 + i * 1.6, 1, 0);
    arch.rotation.x = Math.PI / 2;
    arch.castShadow = true;
    group.add(arch);
  }

  // Plants inside (simple green cubes)
  const plantMat = new THREE.MeshStandardMaterial({
    color: 0x2e7d32, roughness: 0.9, emissive: 0x1b5e20, emissiveIntensity: 0.3,
  });
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const plant = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8 + Math.random() * 0.5, 1.2), plantMat);
      plant.position.set(-3.5 + c * 2.3, 1.5, r === 0 ? -1.5 : 1.5);
      group.add(plant);
    }
  }

  // LED grow light strip
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xff69b4 });
  const led = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 0.1), ledMat);
  led.position.y = 3.5;
  group.add(led);

  addGlow(group, 0x69f0ae, 0.6, 15);
  return group;
}

export function buildO2GeneratorMesh() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x006064, metalness: 0.7, roughness: 0.3 });

  // Main box
  const body = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 2.5), bodyMat);
  body.position.y = 2;
  body.castShadow = true;
  group.add(body);

  // Electrolysis cells stack
  const cellMat = new THREE.MeshStandardMaterial({
    color: 0x00838f, metalness: 0.5, roughness: 0.5,
    emissive: 0x004d5a, emissiveIntensity: 0.4,
  });
  for (let i = 0; i < 3; i++) {
    const cell = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), cellMat);
    cell.position.set(-0.8 + i * 0.8, 1.5 + i * 0.1, 1.5);
    group.add(cell);
  }

  // Output pipes
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xaaa, metalness: 0.9, roughness: 0.1 });
  ['O2', 'H2'].forEach((_, i) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 8), pipeMat);
    pipe.position.set(2 + i * 0.4, 3, i - 0.5);
    group.add(pipe);
  });

  // Water input pipe
  const waterPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2, 8), pipeMat);
  waterPipe.rotation.z = Math.PI / 2;
  waterPipe.position.set(-2.5, 1, 0);
  group.add(waterPipe);

  addGlow(group, 0x4fc3f7, 0.8, 10);
  return group;
}

export function buildISRUMesh() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.8, roughness: 0.4 });

  // Drill tower
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 8, 8), bodyMat);
  tower.position.y = 4;
  tower.castShadow = true;
  group.add(tower);

  // Mining platform
  const platform = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 5), bodyMat);
  platform.position.y = 0.25;
  platform.receiveShadow = true;
  group.add(platform);

  // Heat extractor dome
  const extractor = new THREE.Mesh(
    new THREE.SphereGeometry(2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x006064, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.8 })
  );
  extractor.position.y = 0.5;
  group.add(extractor);

  // Storage tanks
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.7, roughness: 0.3 });
  [-2, 2].forEach(x => {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3, 16), tankMat);
    tank.position.set(x, 1.5, 2.5);
    tank.castShadow = true;
    group.add(tank);
  });

  // Water output indicator glow
  addGlow(group, 0x40c4ff, 0.6, 12);
  return group;
}

export function buildRadioShieldMesh() {
  const group = new THREE.Group();

  // Hemispherical radiation dome (open — covers area)
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x455a64, metalness: 0.3, roughness: 0.7,
    transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    wireframe: false,
  });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(10, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.5),
    domeMat
  );
  dome.position.y = 0.5;
  group.add(dome);

  // Regolith wall segments (more realistic shielding)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x6d6050, roughness: 1, metalness: 0 });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3, 0.8), wallMat);
    wall.position.set(Math.cos(angle) * 8, 1.5, Math.sin(angle) * 8);
    wall.rotation.y = angle + Math.PI / 2;
    wall.castShadow = true; wall.receiveShadow = true;
    group.add(wall);
  }

  // EM field glow
  addGlow(group, 0x7c4dff, 0.3, 25);
  return group;
}

export function buildMediBayMesh() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(5, 3.5, 4),
    new THREE.MeshStandardMaterial({ color: 0xeceff1, metalness: 0.3, roughness: 0.5 })
  );
  body.position.y = 1.75;
  body.castShadow = true;
  group.add(body);

  // Red cross sign
  const crossH = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.4, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xff1744 })
  );
  crossH.position.set(0, 3.2, 2.03);
  group.add(crossH);
  const crossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 1.5, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xff1744 })
  );
  crossV.position.set(0, 3.2, 2.04);
  group.add(crossV);

  // UV sanitizer blue glow
  addGlow(group, 0xff1744, 0.5, 10);
  return group;
}

export function buildBatteryMesh() {
  const group = new THREE.Group();

  const batMat = new THREE.MeshStandardMaterial({ color: 0x558b2f, metalness: 0.6, roughness: 0.5 });

  // Battery stack
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.5, 1), batMat);
      cell.position.set(-1.2 + i * 1.3, 1.5, j - 0.5);
      cell.castShadow = true;
      group.add(cell);
    }
  }

  // Terminal connectors
  const termMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.9, roughness: 0.1 });
  const term = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), termMat);
  term.position.set(0, 2.9, 0);
  group.add(term);

  addGlow(group, 0xaeea00, 0.4, 8);
  return group;
}

export function buildCommsMesh() {
  const group = new THREE.Group();

  // Mast
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x9e9e9e, metalness: 0.9, roughness: 0.2 })
  );
  mast.position.y = 5;
  mast.castShadow = true;
  group.add(mast);

  // Parabolic dish (approximated with ring of triangles)
  const dishPoints = [];
  const dishSegments = 20;
  for (let i = 0; i <= dishSegments; i++) {
    const t = i / dishSegments;
    dishPoints.push(new THREE.Vector2(t * 3, t * t * 1.5));
  }
  const dishGeo = new THREE.LatheGeometry(dishPoints, 32);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xd0d0d0, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide,
  });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.y = 10;
  dish.rotation.x = Math.PI / 3;
  dish.castShadow = true;
  group.add(dish);

  // Signal emitter glow
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff })
  );
  beacon.position.y = 10.5;
  group.add(beacon);

  addGlow(group, 0x00e5ff, 1.5, 20);
  return group;
}

// ─── MESH FACTORY ───
export function createBuildingMesh(type) {
  switch (type) {
    case 'habitat':     return buildHabitatMesh();
    case 'solarpanel':  return buildSolarPanelMesh();
    case 'reactor':     return buildReactorMesh();
    case 'greenhouse':  return buildGreenhouseMesh();
    case 'o2generator': return buildO2GeneratorMesh();
    case 'isru':        return buildISRUMesh();
    case 'radioshield': return buildRadioShieldMesh();
    case 'medibay':     return buildMediBayMesh();
    case 'battery':     return buildBatteryMesh();
    case 'comms':       return buildCommsMesh();
    default: {
      // Fallback generic box
      const g = new THREE.Group();
      g.add(new THREE.Mesh(
        new THREE.BoxGeometry(3, 3, 3),
        new THREE.MeshStandardMaterial({ color: 0x888888 })
      ));
      return g;
    }
  }
}
