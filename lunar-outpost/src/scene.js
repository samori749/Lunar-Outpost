// src/scene.js — Three.js Scene, Renderer, Camera, Lighting
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.orbitControls = null;
    this.sunLight = null;
    this.ambientLight = null;
    this.earthGlow = null;
    this.clock = new THREE.Clock();
  }

  async init() {
    this._createRenderer();
    this._createScene();
    this._createCamera();
    this._createLighting();
    this._createOrbitControls();
    this._createPostProcessing();
    this._setupResize();
  }

  _createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _createScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000005, 0.0015);
  }

  _createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      55, window.innerWidth / window.innerHeight, 0.1, 5000
    );
    this.camera.position.set(0, 80, 160);
    this.camera.lookAt(0, 0, 0);
  }

  _createLighting() {
    // Ambient — represents indirect light from stars/regolith bounce
    this.ambientLight = new THREE.AmbientLight(0x1a2a4a, 0.4);
    this.scene.add(this.ambientLight);

    // Sun (directional) — simulates solar illumination
    this.sunLight = new THREE.DirectionalLight(0xfff8e7, 3.5);
    this.sunLight.position.set(200, 150, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(4096, 4096);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1000;
    this.sunLight.shadow.camera.left = -200;
    this.sunLight.shadow.camera.right = 200;
    this.sunLight.shadow.camera.top = 200;
    this.sunLight.shadow.camera.bottom = -200;
    this.sunLight.shadow.bias = -0.001;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // Hemisphere light — lunar sky vs ground bounce
    this.hemiLight = new THREE.HemisphereLight(0x0d1b3e, 0x3d2b1f, 0.5);
    this.scene.add(this.hemiLight);

    // Earth glow (reflected earthshine)
    this.earthGlow = new THREE.PointLight(0x4488ff, 0.6, 500);
    this.earthGlow.position.set(-300, 200, -400);
    this.scene.add(this.earthGlow);
  }

  _createOrbitControls() {
    this.orbitControls = new OrbitControls(this.camera, this.canvas);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.06;
    this.orbitControls.minDistance = 30;
    this.orbitControls.maxDistance = 600;
    this.orbitControls.maxPolarAngle = Math.PI / 2.1;
    this.orbitControls.target.set(0, 0, 0);
    this.orbitControls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
  }

  _createPostProcessing() {
    const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(size, 0.5, 0.4, 0.85);
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  _setupResize() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
    });
  }

  // Update sun position based on lunar time (0–1)
  updateSunPosition(lunarTime) {
    const angle = lunarTime * Math.PI * 2;
    const radius = 300;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.5 + 50;
    const z = Math.sin(angle * 0.7) * 100;

    this.sunLight.position.set(x, y, z);

    const isDay = y > 0;
    const intensity = Math.max(0, Math.sin(angle)) * 3.5;
    this.sunLight.intensity = intensity;
    this.renderer.toneMappingExposure = isDay ? 1.2 : 0.4;

    // Sky color during lunar day/night
    if (isDay) {
      this.scene.fog = new THREE.FogExp2(0x000005, 0.0015);
      this.ambientLight.intensity = 0.4;
    } else {
      this.scene.fog = new THREE.FogExp2(0x000002, 0.001);
      this.ambientLight.intensity = 0.15;
    }
  }

  getSunDirection() {
    return this.sunLight.position.clone().normalize();
  }

  get(key) {
    return this[key];
  }

  render() {
    this.orbitControls.update();
    this.composer.render();
  }
}
