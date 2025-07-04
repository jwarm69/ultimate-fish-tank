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
    this.createRoomEnvironment();
    this.createTank();
    this.createLighting();
    this.createBackground();

    if (this.debug) {
      console.log('🌊 Environment system initialized');
    }
  }

  private createRoomEnvironment(): void {
    console.log('🏠 Creating room environment...');
    
    this.createRoomStructure();
    this.createTankStand();
    
    console.log('✅ Room environment created');
  }

  private createWoodMaterial(): THREE.MeshStandardMaterial {
    // Create a bright, realistic oak wood texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Light oak colors - much brighter
    const baseColor = '#E8DCC6';    // Light oak base
    const darkGrain = '#D2B48C';    // Tan for grain lines
    const lightGrain = '#F5E6D3';   // Cream highlights
    const plankEdge = '#C8B99C';    // Darker plank edges
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);
    
    // Horizontal wood planks (more realistic)
    const plankHeight = 80;
    for (let y = 0; y < 512; y += plankHeight) {
      // Plank edge/seam
      ctx.fillStyle = plankEdge;
      ctx.fillRect(0, y, 512, 3);
      ctx.fillRect(0, y + plankHeight - 3, 512, 3);
      
      // Wood grain within each plank - horizontal lines
      for (let i = 0; i < 12; i++) {
        const grainY = y + 10 + i * 5 + Math.random() * 8;
        const waveAmplitude = 3 + Math.random() * 5;
        
        ctx.strokeStyle = i % 2 === 0 ? darkGrain : lightGrain;
        ctx.lineWidth = 0.5 + Math.random() * 1.5;
        ctx.globalAlpha = 0.4 + Math.random() * 0.5;
        
        ctx.beginPath();
        ctx.moveTo(0, grainY);
        
        for (let px = 0; px < 512; px += 8) {
          const waveY = grainY + Math.sin(px * 0.02) * waveAmplitude;
          ctx.lineTo(px, waveY);
        }
        ctx.stroke();
      }
      
      // Random wood knots
      if (Math.random() > 0.6) {
        const knotX = Math.random() * 512;
        const knotY = y + 20 + Math.random() * (plankHeight - 40);
        
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = darkGrain;
        ctx.beginPath();
        ctx.ellipse(knotX, knotY, 4 + Math.random() * 6, 2 + Math.random() * 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1;
    
    // Create texture from canvas
    const woodTexture = new THREE.CanvasTexture(canvas);
    woodTexture.wrapS = THREE.RepeatWrapping;
    woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(3, 2); // More repetition for detailed grain
    
    // Enhanced normal map for visible wood grain
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = 512;
    normalCanvas.height = 512;
    const normalCtx = normalCanvas.getContext('2d')!;
    
    normalCtx.fillStyle = '#8080ff'; // Neutral normal
    normalCtx.fillRect(0, 0, 512, 512);
    
    // Strong normal variations for wood grain depth
    for (let y = 0; y < 512; y += plankHeight) {
      // Plank seams - deeper
      normalCtx.fillStyle = '#4040ff';
      normalCtx.fillRect(0, y, 512, 3);
      
      // Grain lines
      for (let i = 0; i < 8; i++) {
        const grainY = y + 10 + i * 8;
        normalCtx.strokeStyle = '#6060ff';
        normalCtx.lineWidth = 1;
        normalCtx.beginPath();
        normalCtx.moveTo(0, grainY);
        normalCtx.lineTo(512, grainY);
        normalCtx.stroke();
      }
    }
    
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(3, 2);
    
    return new THREE.MeshStandardMaterial({
      color: 0xF5DEB3, // Wheat/light wood color - much brighter
      map: woodTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.8, 0.8), // More pronounced grain
      roughness: 0.6,
      metalness: 0.02,
      emissive: new THREE.Color(0x4A3D2A),
      emissiveIntensity: 0.05, // Slight warm glow
    });
  }

  private createRoomStructure(): void {
    // Wood floor with realistic texture
    const floorGeometry = new THREE.PlaneGeometry(80, 80);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Saddle brown
      roughness: 0.8,
      metalness: 0.1
    });
    
    // Create wood grain pattern procedurally
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Base wood color
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, 512, 512);
    
    // Wood grain lines
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 25 + Math.random() * 10);
      ctx.lineTo(512, i * 25 + Math.random() * 10);
      ctx.stroke();
    }
    
    // Create texture from canvas
    const woodTexture = new THREE.CanvasTexture(canvas);
    woodTexture.wrapS = THREE.RepeatWrapping;
    woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(8, 8);
    
    floorMaterial.map = woodTexture;
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -12;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.backgroundElements.push(floor);
    
    // Create realistic wood wall materials
    const wallMaterial = this.createWoodMaterial();
    
    // Back wall - increased height and lowered position to eliminate blue spaces
    const backWallGeometry = new THREE.PlaneGeometry(80, 45);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 6, -35);
    backWall.receiveShadow = true;
    this.scene.add(backWall);
    this.backgroundElements.push(backWall);
    
    // Side walls - same height and position adjustments
    const leftWall = new THREE.Mesh(backWallGeometry, wallMaterial.clone());
    leftWall.position.set(-35, 6, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);
    this.backgroundElements.push(leftWall);
    
    const rightWall = new THREE.Mesh(backWallGeometry, wallMaterial.clone());
    rightWall.position.set(35, 6, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);
    this.backgroundElements.push(rightWall);
    
    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(80, 80);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xF0F8FF, // Alice blue - subtle ceiling color
      roughness: 0.8
    });
    
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 28;
    this.scene.add(ceiling);
    this.backgroundElements.push(ceiling);
  }

  private createTankStand(): void {
    // Wooden tank stand/cabinet
    const standWidth = 28;
    const standHeight = 8;
    const standDepth = 20;
    
    const standMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Matching wood color
      roughness: 0.6,
      metalness: 0.1
    });
    
    // Main cabinet body
    const standGeometry = new THREE.BoxGeometry(standWidth, standHeight, standDepth);
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.set(0, -12 + standHeight/2, 0);
    stand.castShadow = true;
    stand.receiveShadow = true;
    this.scene.add(stand);
    this.backgroundElements.push(stand);
    
    // Cabinet legs
    const legGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2);
    const legPositions = [
      [-standWidth/2 + 2, -12 - 1, -standDepth/2 + 2],
      [standWidth/2 - 2, -12 - 1, -standDepth/2 + 2],
      [-standWidth/2 + 2, -12 - 1, standDepth/2 - 2],
      [standWidth/2 - 2, -12 - 1, standDepth/2 - 2]
    ];
    
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, standMaterial.clone());
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      this.scene.add(leg);
      this.backgroundElements.push(leg);
    });
    
    // Cabinet doors (decorative) - lowered to align with cabinet body
    const doorGeometry = new THREE.BoxGeometry(10.5, 6, 0.5);
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321, // Darker wood
      roughness: 0.7
    });
    
    const leftDoor = new THREE.Mesh(doorGeometry, doorMaterial);
    leftDoor.position.set(-6.75, -8, standDepth/2 + 0.3);
    this.scene.add(leftDoor);
    this.backgroundElements.push(leftDoor);
    
    const rightDoor = new THREE.Mesh(doorGeometry, doorMaterial.clone());
    rightDoor.position.set(6.75, -8, standDepth/2 + 0.3);
    this.scene.add(rightDoor);
    this.backgroundElements.push(rightDoor);
    
    // Door handles
    const handleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700, // Gold
      metalness: 0.8,
      roughness: 0.2
    });
    
    const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    leftHandle.position.set(-2, -8, standDepth/2 + 0.8);
    leftHandle.rotation.z = Math.PI / 2;
    this.scene.add(leftHandle);
    this.backgroundElements.push(leftHandle);
    
    const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial.clone());
    rightHandle.position.set(2, -8, standDepth/2 + 0.8);
    rightHandle.rotation.z = Math.PI / 2;
    this.scene.add(rightHandle);
    this.backgroundElements.push(rightHandle);
  }

  private createTank(): void {
    this.tank = new THREE.Group();

    const tankSize = { width: 20, height: 8, depth: 12 };

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
      color: 0x0088CC, // Beautiful aqua blue
      metalness: 0,
      roughness: 0.05,
      transmission: 0.85, // Much more transparent
      transparent: true,
      opacity: 0.3, // Very transparent
      thickness: 0.5,
      ior: 1.33, // Water refractive index
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.5,
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
      [-6, -3, -4],
      [6, -3, 4],
      [-4, -3, 5],
      [5, -3, -5],
      [0, -3, -3],
      [-7, -3, 0],
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
      [2, -3.5, 0],
      [-3, -3.5, -2],
      [1, -3.5, 4],
      [-5, -3.5, 3],
      [4, -3.5, -3],
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
    bubbler.position.set(4, -3.5, -2);
    this.tank.add(bubbler);
    this.backgroundElements.push(bubbler);
  }

  private createLighting(): void {
    this.lighting = new THREE.Group();

    // Much brighter ambient light for overall room illumination
    const ambientLight = new THREE.AmbientLight(0xf4f1de, 0.8);
    this.lighting.add(ambientLight);

    // Bright ceiling lights to illuminate wood walls
    const ceilingLight1 = new THREE.DirectionalLight(0xffeaa7, 1.2);
    ceilingLight1.position.set(-15, 25, 10);
    ceilingLight1.target.position.set(0, 0, 0);
    ceilingLight1.castShadow = true;
    ceilingLight1.shadow.mapSize.width = 2048;
    ceilingLight1.shadow.mapSize.height = 2048;
    this.lighting.add(ceilingLight1);
    this.lighting.add(ceilingLight1.target);

    const ceilingLight2 = new THREE.DirectionalLight(0xffeaa7, 1.2);
    ceilingLight2.position.set(15, 25, -10);
    ceilingLight2.target.position.set(0, 0, 0);
    this.lighting.add(ceilingLight2);
    this.lighting.add(ceilingLight2.target);

    // Main aquarium light (top) - brighter
    const mainLight = new THREE.RectAreaLight(0xffffff, 1.5, 12, 8);
    mainLight.position.set(0, 6, 0);
    mainLight.lookAt(0, 0, 0);
    this.lighting.add(mainLight);

    // LED strip lighting - more realistic
    const ledLight1 = new THREE.DirectionalLight(0x87ceeb, 0.6);
    ledLight1.position.set(-8, 4, 4);
    ledLight1.target.position.set(0, 0, 0);
    this.lighting.add(ledLight1);
    this.lighting.add(ledLight1.target);

    const ledLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    ledLight2.position.set(8, 5, -3);
    ledLight2.target.position.set(0, 0, 0);
    this.lighting.add(ledLight2);
    this.lighting.add(ledLight2.target);

    // Warm side lighting to show wood grain
    const sideLight1 = new THREE.PointLight(0xffd07b, 0.8);
    sideLight1.position.set(-25, 10, 15);
    this.lighting.add(sideLight1);

    const sideLight2 = new THREE.PointLight(0xffd07b, 0.8);
    sideLight2.position.set(25, 10, -15);
    this.lighting.add(sideLight2);

    // Underwater effect light - softer
    const underwaterLight = new THREE.PointLight(0x87ceeb, 0.4);
    underwaterLight.position.set(0, -1, 0);
    this.lighting.add(underwaterLight);

    this.scene.add(this.lighting);
  }

  private createBackground(): void {
    // Create a gradient background
    const bgGeometry = new THREE.SphereGeometry(50, 32, 16);
    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x87ceeb) }, // Sky blue
        bottomColor: { value: new THREE.Color(0xddeeff) }, // Very light blue
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
