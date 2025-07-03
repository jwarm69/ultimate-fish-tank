import * as THREE from 'three';
import { Component } from './types';

export interface CameraConfig {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
}

export class Camera implements Component {
  private camera!: THREE.PerspectiveCamera;
  private config: CameraConfig;
  private isOrbiting = false;
  private mousePos = { x: 0, y: 0 };
  private targetRotation = { x: 0, y: 0 };
  private currentRotation = { x: 0, y: 0 };
  private radius = 12;
  private height = 8;

  constructor(config: CameraConfig) {
    this.config = config;
  }

  init(): void {
    // Create perspective camera
    this.camera = new THREE.PerspectiveCamera(
      75, // fov
      window.innerWidth / window.innerHeight, // aspect
      0.1, // near
      1000 // far
    );

    // Set initial position (outside the tank looking in)
    this.camera.position.set(0, this.height, this.radius);
    this.camera.lookAt(0, 0, 0);

    // Setup mouse controls
    this.setupControls();

    console.log('📷 Camera initialized');
  }

  private setupControls(): void {
    const canvas = this.config.renderer.domElement;

    canvas.addEventListener('mousedown', event => {
      if (event.button === 0) {
        // Left mouse button
        this.isOrbiting = true;
        this.mousePos.x = event.clientX;
        this.mousePos.y = event.clientY;
        canvas.style.cursor = 'grabbing';
      }
    });

    canvas.addEventListener('mousemove', event => {
      if (this.isOrbiting) {
        const deltaX = event.clientX - this.mousePos.x;
        const deltaY = event.clientY - this.mousePos.y;

        this.targetRotation.y += deltaX * 0.01;
        this.targetRotation.x += deltaY * 0.01;

        // Clamp vertical rotation
        this.targetRotation.x = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 3, this.targetRotation.x)
        );

        this.mousePos.x = event.clientX;
        this.mousePos.y = event.clientY;
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.isOrbiting = false;
      canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.radius += event.deltaY * 0.01;
      this.radius = Math.max(8, Math.min(20, this.radius));
    });

    // Set initial cursor
    canvas.style.cursor = 'grab';
  }

  update(deltaTime: number): void {
    // Smooth camera rotation
    const lerpFactor = 1 - Math.exp(-8 * deltaTime);
    this.currentRotation.x = THREE.MathUtils.lerp(
      this.currentRotation.x,
      this.targetRotation.x,
      lerpFactor
    );
    this.currentRotation.y = THREE.MathUtils.lerp(
      this.currentRotation.y,
      this.targetRotation.y,
      lerpFactor
    );

    // Update camera position based on rotation
    const x = Math.sin(this.currentRotation.y) * Math.cos(this.currentRotation.x) * this.radius;
    const y = Math.sin(this.currentRotation.x) * this.radius + this.height;
    const z = Math.cos(this.currentRotation.y) * Math.cos(this.currentRotation.x) * this.radius;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  destroy(): void {
    // Cleanup event listeners if needed
    const canvas = this.config.renderer.domElement;
    canvas.style.cursor = 'default';
  }
}
