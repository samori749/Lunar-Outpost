// src/controls.js — Camera and input handling (mouse, keyboard, touch)
import * as THREE from 'three';

export class ControlsManager {
  constructor(game, sceneManager, baseManager) {
    this.game = game;
    this.sm = sceneManager;
    this.base = baseManager;
    this.camera = sceneManager.camera;
    this.canvas = sceneManager.canvas;
    this.orbitControls = sceneManager.orbitControls;

    this.inBuildMode = false;
    this.mouse = new THREE.Vector2();
    this.ndc = new THREE.Vector2();

    this._setupEvents();
  }

  setBuildMode(active) {
    this.inBuildMode = active;
    this.canvas.style.cursor = active ? 'crosshair' : 'default';
    // Disable orbit on drag in build mode
    this.orbitControls.enableRotate = !active;
  }

  _setupEvents() {
    const canvas = this.canvas;

    canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    canvas.addEventListener('click',     e => this._onClick(e));
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); });
    document.addEventListener('keydown', e => this._onKeyDown(e));

    // Touch support (basic)
    canvas.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      this._processClick(t.clientX, t.clientY);
    });
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.ndc.x = (this.mouse.x / rect.width) * 2 - 1;
    this.ndc.y = -(this.mouse.y / rect.height) * 2 + 1;

    if (this.inBuildMode) {
      this.base.updateGhostPosition(this.ndc, this.camera);
    }
  }

  _onClick(e) {
    if (e.target !== this.canvas) return;
    this._processClick(e.clientX, e.clientY);
  }

  _processClick(cx, cy) {
    if (this.game.gameState !== 'playing') return;

    const rect = this.canvas.getBoundingClientRect();
    const nx = ((cx - rect.left) / rect.width) * 2 - 1;
    const ny = -((cy - rect.top) / rect.height) * 2 + 1;
    const ndc = new THREE.Vector2(nx, ny);

    if (this.inBuildMode) {
      this.base.placeBuilding(ndc, this.camera);
    } else {
      this.base.selectBuildingAt(ndc, this.camera);
    }
  }

  _onKeyDown(e) {
    switch (e.key) {
      case 'Escape':
        this.base.cancelBuildMode();
        this.base.closeModal();
        break;
      case ' ':
        e.preventDefault();
        // Toggle pause
        this.game.setSpeed(this.game.timeSpeed === 0 ? 1 : 0);
        break;
      case '1': this.game.setSpeed(0); break;
      case '2': this.game.setSpeed(1); break;
      case '3': this.game.setSpeed(2); break;
      case '4': this.game.setSpeed(4); break;
      case 'r': case 'R':
        this._resetCamera();
        break;
    }
  }

  _resetCamera() {
    this.camera.position.set(0, 80, 160);
    this.orbitControls.target.set(0, 0, 0);
  }

  update(delta) {
    // Orbit controls update handled in SceneManager.render()
  }
}
