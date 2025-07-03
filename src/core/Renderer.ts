import * as THREE from 'three';
import { Component } from './types';

export interface RendererConfig {
  container: HTMLElement;
  enableWebGL: boolean;
  debug: boolean;
}

export class Renderer implements Component {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private config: RendererConfig;

  constructor(config: RendererConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x001122);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.physicallyCorrectLights = true;

    // Append to container
    this.config.container.appendChild(this.renderer.domElement);

    if (this.config.debug) {
      console.log('🎨 Renderer initialized');
    }
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  update(deltaTime: number): void {
    // Renderer doesn't need per-frame updates
  }

  destroy(): void {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }

    if (this.scene) {
      this.scene.clear();
    }
  }
}
