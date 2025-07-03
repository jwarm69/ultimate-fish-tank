import * as THREE from 'three';
import { Component, Capabilities } from '../core/types';

export interface EnvironmentSystemConfig {
  scene: THREE.Scene;
  capabilities: Capabilities;
  debug: boolean;
}

export class EnvironmentSystem implements Component {
  private scene: THREE.Scene;
  private capabilities: Capabilities;
  private debug: boolean;
  private tank!: THREE.Group;
  private lighting!: THREE.Group;
  private backgroundElements: THREE.Object3D[] = [];

  constructor(config: EnvironmentSystemConfig) {
    this.scene = config.scene;
    this.capabilities = config.capabilities;
    this.debug = config.debug;
  }

  async init(): Promise<void> {
    this.createTank();
    this.createLighting();
    this.createBackground();

    if (this.debug) {
      console.log('🌊 Environment system initialized');
    }
  }

  private createTank(): void {
    this.tank = new THREE.Group();

    const tankSize = { width: 10, height: 6, depth: 6 };

    // Glass panels
    const glassGeometry = new THREE.PlaneGeometry(tankSize.width, tankSize.height);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.1,
      transmission: 0.4, // Reduced from 0.98 for clarity
      transparent: true,
      opacity: 0.1,
      thickness: 0.1,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });

    // Front panel
    const frontPanel = new THREE.Mesh(glassGeometry, glassMaterial);
    frontPanel.position.z = tankSize.depth / 2;
    this.tank.add(frontPanel);

    // Back panel
    const backPanel = new THREE.Mesh(glassGeometry, glassMaterial.clone());
    backPanel.position.z = -tankSize.depth / 2;
    backPanel.rotation.y = Math.PI;
    this.tank.add(backPanel);

    // Side panels
    const sideGeometry = new THREE.PlaneGeometry(tankSize.depth, tankSize.height);

    const leftPanel = new THREE.Mesh(sideGeometry, glassMaterial.clone());
    leftPanel.position.x = -tankSize.width / 2;
    leftPanel.rotation.y = Math.PI / 2;
    this.tank.add(leftPanel);

    const rightPanel = new THREE.Mesh(sideGeometry, glassMaterial.clone());
    rightPanel.position.x = tankSize.width / 2;
    rightPanel.rotation.y = -Math.PI / 2;
    this.tank.add(rightPanel);

    // Bottom panel
    const bottomGeometry = new THREE.PlaneGeometry(tankSize.width, tankSize.depth);
    const bottomPanel = new THREE.Mesh(bottomGeometry, glassMaterial.clone());
    bottomPanel.position.y = -tankSize.height / 2;
    bottomPanel.rotation.x = -Math.PI / 2;
    this.tank.add(bottomPanel);

    // Tank frame
    this.createTankFrame(tankSize);

    // Water
    this.createWater(tankSize);

    // Tank decorations
    this.createDecorations(tankSize);

    this.scene.add(this.tank);
  }

  private createTankFrame(tankSize: any): void {
    const frameColor = 0x333333;
    const frameThickness = 0.05;

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: frameColor,
      metalness: 0.8,
      roughness: 0.2,
    });

    // Horizontal frame pieces
    const hFrameGeometry = new THREE.BoxGeometry(
      tankSize.width + frameThickness * 2,
      frameThickness,
      tankSize.depth + frameThickness * 2
    );

    // Top frame
    const topFrame = new THREE.Mesh(hFrameGeometry, frameMaterial);
    topFrame.position.y = tankSize.height / 2 + frameThickness / 2;
    this.tank.add(topFrame);

    // Bottom frame
    const bottomFrame = new THREE.Mesh(hFrameGeometry, frameMaterial.clone());
    bottomFrame.position.y = -tankSize.height / 2 - frameThickness / 2;
    this.tank.add(bottomFrame);

    // Vertical frame pieces
    const vFrameGeometry = new THREE.BoxGeometry(frameThickness, tankSize.height, frameThickness);

    const framePositions = [
      [-tankSize.width / 2, 0, -tankSize.depth / 2],
      [tankSize.width / 2, 0, -tankSize.depth / 2],
      [-tankSize.width / 2, 0, tankSize.depth / 2],
      [tankSize.width / 2, 0, tankSize.depth / 2],
    ];

    framePositions.forEach(pos => {
      const frame = new THREE.Mesh(vFrameGeometry, frameMaterial.clone());
      frame.position.set(pos[0], pos[1], pos[2]);
      this.tank.add(frame);
    });
  }

  private createWater(tankSize: any): void {
    const waterGeometry = new THREE.BoxGeometry(
      tankSize.width - 0.02,
      tankSize.height - 0.02,
      tankSize.depth - 0.02
    );

    const waterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x006994,
      metalness: 0,
      roughness: 0,
      transmission: 0.3, // Reduced from 0.8 for clarity
      transparent: true,
      opacity: 0.8,
      thickness: 2,
      ior: 1.33,
      clearcoat: 0.5,
      clearcoatRoughness: 0.1,
    });

    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.position.y = -0.2; // Slightly below tank top
    this.tank.add(water);
  }

  private createDecorations(tankSize: any): void {
    // Substrate/sand
    const substrateGeometry = new THREE.BoxGeometry(
      tankSize.width - 0.1,
      0.3,
      tankSize.depth - 0.1
    );
    const substrateMaterial = new THREE.MeshStandardMaterial({
      color: 0xc4a168,
      roughness: 0.9,
      metalness: 0,
    });

    const substrate = new THREE.Mesh(substrateGeometry, substrateMaterial);
    substrate.position.y = -tankSize.height / 2 + 0.15;
    this.tank.add(substrate);

    // Plants
    this.createPlants(tankSize);

    // Rocks
    this.createRocks(tankSize);

    // Bubbles (decorative)
    this.createBubbleGenerator(tankSize);
  }

  private createPlants(tankSize: any): void {
    const plantPositions = [
      [-3, -2.5, -2],
      [3, -2.5, 2],
      [-2, -2.5, 2.5],
      [2.5, -2.5, -2.5],
    ];

    plantPositions.forEach((pos, index) => {
      const plant = new THREE.Group();

      // Plant stem
      const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, 1.5 + Math.random() * 0.5);
      const stemMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d5016,
        roughness: 0.8,
      });
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.y = stemGeometry.parameters.height / 2;
      plant.add(stem);

      // Plant leaves
      for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
        const leafGeometry = new THREE.PlaneGeometry(
          0.3 + Math.random() * 0.2,
          0.6 + Math.random() * 0.3
        );
        const leafMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(
            0.3,
            0.6 + Math.random() * 0.3,
            0.3 + Math.random() * 0.2
          ),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });

        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.y = 0.5 + i * 0.3;
        leaf.position.x = (Math.random() - 0.5) * 0.2;
        leaf.rotation.y = Math.random() * Math.PI * 2;
        leaf.rotation.z = (Math.random() - 0.5) * 0.3;
        plant.add(leaf);
      }

      plant.position.set(pos[0], pos[1], pos[2]);
      this.tank.add(plant);
      this.backgroundElements.push(plant);
    });
  }

  private createRocks(tankSize: any): void {
    const rockPositions = [
      [1, -2.7, 0],
      [-1.5, -2.7, -1],
      [0.5, -2.7, 2],
    ];

    rockPositions.forEach(pos => {
      const rockGeometry = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.2);
      const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.9,
        metalness: 0,
      });

      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(pos[0], pos[1], pos[2]);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      this.tank.add(rock);
      this.backgroundElements.push(rock);
    });
  }

  private createBubbleGenerator(tankSize: any): void {
    // This would create a bubble particle system
    // For now, we'll create a simple bubbler decoration
    const bubblerGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.3);
    const bubblerMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.7,
      roughness: 0.3,
    });

    const bubbler = new THREE.Mesh(bubblerGeometry, bubblerMaterial);
    bubbler.position.set(2, -2.5, -1);
    this.tank.add(bubbler);
    this.backgroundElements.push(bubbler);
  }

  private createLighting(): void {
    this.lighting = new THREE.Group();

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.lighting.add(ambientLight);

    // Main aquarium light (top)
    const mainLight = new THREE.RectAreaLight(0xffffff, 0.8, 8, 4);
    mainLight.position.set(0, 4, 0);
    mainLight.lookAt(0, 0, 0);
    this.lighting.add(mainLight);

    // LED strip lighting
    const ledLight1 = new THREE.DirectionalLight(0x00ffff, 0.8);
    ledLight1.position.set(-5, 2, 3);
    ledLight1.target.position.set(0, 0, 0);
    ledLight1.castShadow = true;
    ledLight1.shadow.mapSize.width = 1024;
    ledLight1.shadow.mapSize.height = 1024;
    this.lighting.add(ledLight1);
    this.lighting.add(ledLight1.target);

    const ledLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    ledLight2.position.set(5, 3, -2);
    ledLight2.target.position.set(0, 0, 0);
    this.lighting.add(ledLight2);
    this.lighting.add(ledLight2.target);

    // Underwater effect light
    const underwaterLight = new THREE.PointLight(0x4080ff, 0.3);
    underwaterLight.position.set(0, -1, 0);
    this.lighting.add(underwaterLight);

    this.scene.add(this.lighting);
  }

  private createBackground(): void {
    // Create a gradient background
    const bgGeometry = new THREE.SphereGeometry(50, 32, 16);
    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077be) },
        bottomColor: { value: new THREE.Color(0x001e3c) },
        offset: { value: 33 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });

    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    this.scene.add(background);
    this.backgroundElements.push(background);
  }

  update(deltaTime: number): void {
    // Animate background elements (gentle swaying plants, etc.)
    const time = Date.now() * 0.001;

    this.backgroundElements.forEach((element, index) => {
      if (element.userData.isPlant) {
        // Gentle swaying motion for plants
        element.rotation.z = Math.sin(time * 0.5 + index) * 0.05;
      }
    });
  }

  getTank(): THREE.Group {
    return this.tank;
  }

  destroy(): void {
    if (this.tank) {
      this.scene.remove(this.tank);
    }

    if (this.lighting) {
      this.scene.remove(this.lighting);
    }

    this.backgroundElements.forEach(element => {
      this.scene.remove(element);
    });
    this.backgroundElements = [];
  }
}
