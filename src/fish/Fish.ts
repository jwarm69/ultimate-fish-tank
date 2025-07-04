import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FishData, BehaviorState, Component } from '../core/types';

export class Fish implements Component {
  private data: FishData;
  private scene: THREE.Scene;
  private world?: CANNON.World;
  private mesh!: THREE.Group;
  private body?: CANNON.Body;
  private id: string;
  private isSelected = false;
  private behaviorState: BehaviorState;
  private lastUpdateTime = Date.now();
  private selectionGlow?: THREE.Mesh;
  private feedParticles: THREE.Points[] = [];

  constructor(data: FishData, scene: THREE.Scene, world?: CANNON.World) {
    this.data = { ...data };
    this.scene = scene;
    this.world = world;
    this.id = Math.random().toString(36).substr(2, 9);

    // Initialize behavior state
    this.behaviorState = {
      speed: data.config.speed,
      direction: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2
      ).normalize(),
    };

    // Store original values for health effects
    this.data.originalSpeed = data.config.speed;
    this.data.originalEmissive = 0.03;
  }

  init(): void {
    this.createMesh();
    this.createPhysicsBody();
    this.randomizePosition();
  }

  private createMesh(): void {
    const group = new THREE.Group();

    // Create realistic fish body with proper anatomy
    const bodyMesh = this.createRealisticFishBody();
    group.add(bodyMesh);

    // Create realistic fins
    const fins = this.createRealisticFins();
    fins.forEach(fin => group.add(fin));


    // Create realistic eyes
    const eyes = this.createRealisticEyes();
    eyes.forEach(eye => group.add(eye));

    this.mesh = group;
    this.scene.add(this.mesh);

    // Create selection glow (initially hidden)
    this.createSelectionGlow();
  }

  private createRealisticFishBody(): THREE.Mesh {
    // Create custom fish body geometry with proper fish anatomy
    const bodyGeometry = new THREE.BufferGeometry();
    const size = this.data.config.size;
    
    // Define fish body shape points (more realistic torpedo/oval shape)
    const segments = 32;
    const rings = 16;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    // Create fish body with tapering from head to tail
    for (let i = 0; i <= rings; i++) {
      const v = i / rings;
      const y = (v - 0.5) * size * 2.5; // Length of fish
      
      // Fish body profile - wider in middle, tapered at ends
      let radius;
      if (v < 0.3) {
        // Head area - gradual taper
        radius = size * (0.2 + 0.6 * (v / 0.3));
      } else if (v < 0.7) {
        // Body area - full width
        radius = size * 0.8;
      } else {
        // Tail area - rapid taper
        radius = size * 0.8 * (1 - (v - 0.7) / 0.3);
      }
      
      for (let j = 0; j <= segments; j++) {
        const u = j / segments;
        const theta = u * Math.PI * 2;
        
        // Slightly flatten the fish (not perfectly round)
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius * 0.7; // Flattened
        
        positions.push(x, y, z);
        
        // Calculate normals
        const normal = new THREE.Vector3(x, 0, z).normalize();
        normals.push(normal.x, normal.y, normal.z);
        
        // UV coordinates
        uvs.push(u, v);
      }
    }
    
    // Create indices for faces
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * (segments + 1) + j;
        const b = a + segments + 1;
        const c = a + 1;
        const d = b + 1;
        
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }
    
    bodyGeometry.setIndex(indices);
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    bodyGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    bodyGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    
    // Rotate to face forward
    bodyGeometry.rotateZ(Math.PI / 2);
    
    // Create realistic fish material with scales
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: this.data.config.bodyColor,
      map: this.createFishScaleTexture(),
      normalMap: this.createScaleNormalMap(),
      metalness: 0.1,
      roughness: 0.2,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      sheen: 0.8,
      sheenColor: new THREE.Color(0xffffff),
      iridescence: this.data.config.iridescent ? 1.0 : 0.3,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 800],
      transmission: this.data.config.translucent ? 0.1 : 0,
      transparent: this.data.config.translucent,
      opacity: this.data.config.translucent ? 0.9 : 1,
    });
    
    return new THREE.Mesh(bodyGeometry, bodyMaterial);
  }
  
  private createFishScaleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base fish color
    const baseColor = `#${this.data.config.bodyColor.getHexString()}`;
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 256);
    
    // Create fish scale pattern
    const scaleSize = 12;
    const scaleRows = Math.ceil(256 / (scaleSize * 0.8));
    const scaleCols = Math.ceil(512 / scaleSize);
    
    for (let row = 0; row < scaleRows; row++) {
      for (let col = 0; col < scaleCols; col++) {
        const x = col * scaleSize + (row % 2) * (scaleSize / 2);
        const y = row * scaleSize * 0.8;
        
        // Scale outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, scaleSize / 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Scale highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(x - scaleSize / 4, y - scaleSize / 4, scaleSize / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    
    return texture;
  }
  
  private createScaleNormalMap(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Neutral normal (blue)
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 512, 256);
    
    // Scale bumps
    const scaleSize = 12;
    const scaleRows = Math.ceil(256 / (scaleSize * 0.8));
    const scaleCols = Math.ceil(512 / scaleSize);
    
    for (let row = 0; row < scaleRows; row++) {
      for (let col = 0; col < scaleCols; col++) {
        const x = col * scaleSize + (row % 2) * (scaleSize / 2);
        const y = row * scaleSize * 0.8;
        
        // Create subtle normal variation for each scale
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, scaleSize / 2);
        gradient.addColorStop(0, '#9090ff');
        gradient.addColorStop(1, '#7070ff');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, scaleSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    
    return texture;
  }
  
  private createRealisticFins(): THREE.Mesh[] {
    const fins: THREE.Mesh[] = [];
    const size = this.data.config.size;
    
    // Fin material
    const finMaterial = new THREE.MeshPhysicalMaterial({
      color: this.data.config.finColor,
      transparent: true,
      opacity: 0.8,
      metalness: 0.0,
      roughness: 0.3,
      clearcoat: 0.5,
      transmission: 0.3,
      side: THREE.DoubleSide,
    });
    
    // Tail fin - realistic fan shape
    const tailGeometry = this.createTailFinGeometry(size);
    const tailFin = new THREE.Mesh(tailGeometry, finMaterial.clone());
    tailFin.position.set(-size * 1.3, 0, 0);
    fins.push(tailFin);
    
    // Dorsal fin
    const dorsalGeometry = this.createDorsalFinGeometry(size);
    const dorsalFin = new THREE.Mesh(dorsalGeometry, finMaterial.clone());
    dorsalFin.position.set(-size * 0.3, size * 0.6, 0);
    fins.push(dorsalFin);
    
    // Pectoral fins
    const pectoralGeometry = this.createPectoralFinGeometry(size);
    const leftPectoral = new THREE.Mesh(pectoralGeometry, finMaterial.clone());
    leftPectoral.position.set(size * 0.2, -size * 0.1, size * 0.5);
    leftPectoral.rotation.set(0, 0, Math.PI / 6);
    fins.push(leftPectoral);
    
    const rightPectoral = new THREE.Mesh(pectoralGeometry, finMaterial.clone());
    rightPectoral.position.set(size * 0.2, -size * 0.1, -size * 0.5);
    rightPectoral.rotation.set(0, 0, -Math.PI / 6);
    fins.push(rightPectoral);
    
    // Anal fin
    const analGeometry = this.createAnalFinGeometry(size);
    const analFin = new THREE.Mesh(analGeometry, finMaterial.clone());
    analFin.position.set(-size * 0.5, -size * 0.4, 0);
    fins.push(analFin);
    
    return fins;
  }
  
  private createTailFinGeometry(size: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    
    // Create fan-shaped tail
    const centerX = 0;
    const centerY = 0;
    const radius = size * 0.8;
    const segments = 16;
    
    // Center point
    positions.push(centerX, centerY, 0);
    
    // Fan points
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 1.4 - Math.PI * 0.7;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      positions.push(x, y, 0);
    }
    
    // Create triangular faces
    for (let i = 0; i < segments; i++) {
      indices.push(0, i + 1, i + 2);
    }
    
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  private createDorsalFinGeometry(size: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(size * 0.3, size * 0.4, size * 0.6, size * 0.3);
    shape.quadraticCurveTo(size * 0.8, size * 0.2, size, 0);
    shape.lineTo(0, 0);
    
    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
  }
  
  private createPectoralFinGeometry(size: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(size * 0.2, size * 0.3, size * 0.4, size * 0.2);
    shape.quadraticCurveTo(size * 0.3, 0, 0, 0);
    
    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
  }
  
  private createAnalFinGeometry(size: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(size * 0.2, -size * 0.2, size * 0.4, -size * 0.1);
    shape.lineTo(size * 0.3, 0);
    shape.lineTo(0, 0);
    
    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
  }
  
  private createRealisticEyes(): THREE.Mesh[] {
    const eyes: THREE.Mesh[] = [];
    const size = this.data.config.size;
    
    // Eye positions
    const eyePositions = [
      [size * 0.8, size * 0.15, size * 0.25],  // Left eye
      [size * 0.8, size * 0.15, -size * 0.25]  // Right eye
    ];
    
    eyePositions.forEach(pos => {
      const eyeGroup = new THREE.Group();
      
      // Eye white (sclera)
      const scleraGeometry = new THREE.SphereGeometry(size * 0.12, 12, 8);
      const scleraMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        clearcoat: 1,
        clearcoatRoughness: 0,
        roughness: 0.1,
      });
      const sclera = new THREE.Mesh(scleraGeometry, scleraMaterial);
      eyeGroup.add(sclera);
      
      // Iris
      const irisGeometry = new THREE.SphereGeometry(size * 0.08, 12, 8);
      const irisColor = this.data.species === 'goldfish' ? 0x333333 : 0x000088;
      const irisMaterial = new THREE.MeshPhysicalMaterial({
        color: irisColor,
        roughness: 0.3,
        metalness: 0.1,
      });
      const iris = new THREE.Mesh(irisGeometry, irisMaterial);
      iris.position.set(size * 0.02, 0, 0);
      eyeGroup.add(iris);
      
      // Pupil
      const pupilGeometry = new THREE.SphereGeometry(size * 0.04, 8, 6);
      const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      pupil.position.set(size * 0.03, 0, 0);
      eyeGroup.add(pupil);
      
      // Eye highlight
      const highlightGeometry = new THREE.SphereGeometry(size * 0.02, 6, 4);
      const highlightMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
      highlight.position.set(size * 0.04, size * 0.02, size * 0.01);
      eyeGroup.add(highlight);
      
      eyeGroup.position.set(pos[0], pos[1], pos[2]);
      eyes.push(eyeGroup as any);
    });
    
    return eyes;
  }

  private createSelectionGlow(): void {
    const glowGeometry = new THREE.SphereGeometry(this.data.config.size * 1.5, 16, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });

    this.selectionGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.selectionGlow.visible = false;
    this.mesh.add(this.selectionGlow);
  }

  private createPhysicsBody(): void {
    if (!this.world) return;

    const shape = new CANNON.Sphere(this.data.config.size);
    this.body = new CANNON.Body({
      mass: 0.1,
      shape,
      material: new CANNON.Material({ friction: 0.1, restitution: 0.3 }),
    });

    this.world.addBody(this.body);
  }

  private randomizePosition(): void {
    const x = (Math.random() - 0.5) * 18; // Tank width 20 minus margin
    const y = (Math.random() - 0.5) * 6;  // Tank height 8 minus margin  
    const z = (Math.random() - 0.5) * 10; // Tank depth 12 minus margin

    this.mesh.position.set(x, y, z);

    if (this.body) {
      this.body.position.set(x, y, z);
    }
  }

  update(deltaTime: number): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;

    // Update stats over time
    this.updateStats(timeSinceLastUpdate);

    // Update behavior
    this.updateBehavior(deltaTime);

    // Update visual health
    this.updateVisualHealth();

    // Sync physics body with mesh
    if (this.body) {
      this.mesh.position.copy(this.body.position as any);
      this.mesh.quaternion.copy(this.body.quaternion as any);
    }

    this.lastUpdateTime = now;
  }

  private updateStats(deltaTime: number): void {
    const minutesPassed = deltaTime / (1000 * 60);

    // Hunger increases over time
    this.data.hunger = Math.max(0, this.data.hunger - minutesPassed * 2);

    // Health decreases if hungry
    if (this.data.hunger < 20) {
      this.data.health = Math.max(0, this.data.health - minutesPassed * 0.5);
    }

    // Happiness decreases over time without interaction
    this.data.happiness = Math.max(0, this.data.happiness - minutesPassed * 0.5);
  }

  private updateBehavior(deltaTime: number): void {
    if (!this.body) return;

    const position = this.mesh.position;
    
    // Tank boundaries (slightly smaller than actual tank for margin)
    const tankBounds = {
      minX: -9, maxX: 9,   // Tank width 20, leave 1 unit margin on each side
      minY: -3.5, maxY: 3.5, // Tank height 8, leave margin
      minZ: -5.5, maxZ: 5.5  // Tank depth 12, leave margin
    };

    // Adjust speed based on health
    const healthMultiplier = Math.max(0.3, this.data.health / 100);
    let baseSpeed = (this.data.originalSpeed || 1) * healthMultiplier;
    
    // Personality-based movement modifications
    const personalityMods = this.getPersonalityMovement();
    baseSpeed *= personalityMods.speedMultiplier;

    // Boundary avoidance - create repulsion force when near walls
    const avoidanceForce = new THREE.Vector3(0, 0, 0);
    const avoidanceDistance = 2.0;
    
    if (position.x < tankBounds.minX + avoidanceDistance) {
      avoidanceForce.x += (tankBounds.minX + avoidanceDistance - position.x) * 2;
    }
    if (position.x > tankBounds.maxX - avoidanceDistance) {
      avoidanceForce.x -= (position.x - (tankBounds.maxX - avoidanceDistance)) * 2;
    }
    if (position.y < tankBounds.minY + avoidanceDistance) {
      avoidanceForce.y += (tankBounds.minY + avoidanceDistance - position.y) * 2;
    }
    if (position.y > tankBounds.maxY - avoidanceDistance) {
      avoidanceForce.y -= (position.y - (tankBounds.maxY - avoidanceDistance)) * 2;
    }
    if (position.z < tankBounds.minZ + avoidanceDistance) {
      avoidanceForce.z += (tankBounds.minZ + avoidanceDistance - position.z) * 2;
    }
    if (position.z > tankBounds.maxZ - avoidanceDistance) {
      avoidanceForce.z -= (position.z - (tankBounds.maxZ - avoidanceDistance)) * 2;
    }

    // Random direction changes based on personality
    if (Math.random() < personalityMods.directionChangeChance) {
      this.behaviorState.direction = this.generatePersonalityDirection();
    }

    // Apply avoidance force to direction
    if (avoidanceForce.length() > 0) {
      avoidanceForce.normalize();
      this.behaviorState.direction.lerp(avoidanceForce, 0.3);
      this.behaviorState.direction.normalize();
    }

    // Smooth direction changes
    const targetDirection = this.behaviorState.direction.clone();
    const currentDirection = new THREE.Vector3().copy(this.body.velocity).normalize();
    
    if (currentDirection.length() > 0) {
      const lerpFactor = Math.min(personalityMods.turnSpeed * deltaTime, 1);
      this.behaviorState.direction = currentDirection.lerp(targetDirection, lerpFactor).normalize();
    }

    // Apply movement
    const velocity = this.behaviorState.direction.clone().multiplyScalar(baseSpeed);
    this.body.velocity.set(velocity.x, velocity.y, velocity.z);

    // Realistic fish swimming orientation - fish should face direction of movement
    if (velocity.length() > 0.1) {
      const targetPosition = position.clone().add(velocity);
      this.mesh.lookAt(targetPosition);
      
      // Add subtle fin animation based on swimming speed
      this.animateFins(baseSpeed, deltaTime);
    }
  }
  
  private animateFins(speed: number, deltaTime: number): void {
    const time = Date.now() * 0.001;
    const finAnimationSpeed = speed * 2;
    
    // Find fin meshes and animate them subtly
    this.mesh.children.forEach((child, index) => {
      if (index > 0) { // Skip body mesh (index 0)
        const originalRotation = child.userData.originalRotation || { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z };
        if (!child.userData.originalRotation) {
          child.userData.originalRotation = originalRotation;
        }
        
        // Subtle fin movement
        const finMovement = Math.sin(time * finAnimationSpeed + index) * 0.1;
        child.rotation.z = originalRotation.z + finMovement;
      }
    });
  }

  private getPersonalityMovement(): { speedMultiplier: number; directionChangeChance: number; turnSpeed: number } {
    switch (this.data.personality) {
      case 'playful':
        return { speedMultiplier: 1.3, directionChangeChance: 0.08, turnSpeed: 4 };
      case 'shy':
        return { speedMultiplier: 0.6, directionChangeChance: 0.03, turnSpeed: 1.5 };
      case 'energetic':
        return { speedMultiplier: 1.5, directionChangeChance: 0.05, turnSpeed: 3 };
      case 'elegant':
        return { speedMultiplier: 0.8, directionChangeChance: 0.02, turnSpeed: 1 };
      case 'aggressive':
        return { speedMultiplier: 1.2, directionChangeChance: 0.06, turnSpeed: 2.5 };
      case 'wise':
        return { speedMultiplier: 0.7, directionChangeChance: 0.01, turnSpeed: 0.8 };
      case 'curious':
        return { speedMultiplier: 1.0, directionChangeChance: 0.04, turnSpeed: 2 };
      default:
        return { speedMultiplier: 1.0, directionChangeChance: 0.03, turnSpeed: 2 };
    }
  }

  private generatePersonalityDirection(): THREE.Vector3 {
    let direction = new THREE.Vector3();
    
    switch (this.data.personality) {
      case 'playful':
        // Quick, darting movements
        direction.set(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 4
        );
        break;
      case 'shy':
        // Prefer staying near bottom and decorations
        direction.set(
          (Math.random() - 0.5) * 1.5,
          -0.5 + Math.random() * 0.3, // Bias toward bottom
          (Math.random() - 0.5) * 1.5
        );
        break;
      case 'energetic':
        // Fast, constant movement
        direction.set(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 3
        );
        break;
      case 'elegant':
        // Smooth, graceful movements
        direction.set(
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 1.2
        );
        break;
      case 'aggressive':
        // Bold, territorial movements
        direction.set(
          (Math.random() - 0.5) * 2.5,
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 2.5
        );
        break;
      case 'wise':
        // Slow, deliberate movement
        direction.set(
          (Math.random() - 0.5) * 1,
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 1
        );
        break;
      case 'curious':
        // Investigative movement toward boundaries
        const pos = this.mesh.position;
        direction.set(
          Math.random() > 0.5 ? 1 : -1,
          (Math.random() - 0.5) * 1,
          Math.random() > 0.5 ? 1 : -1
        );
        break;
      default:
        direction.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 1,
          (Math.random() - 0.5) * 2
        );
    }
    
    return direction.normalize();
  }

  private updateVisualHealth(): void {
    const bodyMesh = this.mesh.children[0] as THREE.Mesh;
    const material = bodyMesh.material as THREE.MeshPhysicalMaterial;

    if (this.data.health < 30) {
      // Fish looks sick - duller colors, less iridescence
      material.iridescence = 0.1;
      material.clearcoat = 0.3;
      material.emissive.setRGB(0.1, 0.02, 0.02);
      this.data.needsAttentionGlow = true;
    } else if (this.data.hunger < 20) {
      // Fish is hungry - slight color desaturation
      material.iridescence = 0.3;
      material.clearcoat = 0.5;
      material.emissive.setRGB(0.05, 0.04, 0.01);
      this.data.needsAttentionGlow = true;
    } else {
      // Healthy fish - full beauty
      material.iridescence = this.data.config.iridescent ? 1.0 : 0.3;
      material.clearcoat = 0.9;
      material.emissive = this.data.config.bodyColor
        .clone()
        .multiplyScalar(0.02);
      this.data.needsAttentionGlow = false;
    }
  }

  feed(): void {
    this.data.hunger = Math.min(100, this.data.hunger + 25);
    this.data.happiness = Math.min(100, this.data.happiness + 10);
    this.data.lastFed = Date.now();

    this.createFeedParticles();
  }

  pet(): void {
    this.data.happiness = Math.min(100, this.data.happiness + 15);
    this.data.lastPetted = Date.now();
    this.data.consecutivePets = (this.data.consecutivePets || 0) + 1;

    // Create heart particle effect
    this.createPetParticles();
  }

  private createFeedParticles(): void {
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = this.mesh.position.x + (Math.random() - 0.5) * 2;
      positions[i + 1] = this.mesh.position.y + Math.random() * 2;
      positions[i + 2] = this.mesh.position.z + (Math.random() - 0.5) * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffa500,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    // Animate and remove particles
    setTimeout(() => {
      this.scene.remove(particles);
    }, 2000);
  }

  private createPetParticles(): void {
    // Create floating heart effect
    const heartGeometry = new THREE.SphereGeometry(0.05, 8, 6);
    const heartMaterial = new THREE.MeshBasicMaterial({ color: 0xff69b4, transparent: true });

    for (let i = 0; i < 5; i++) {
      const heart = new THREE.Mesh(heartGeometry, heartMaterial.clone());
      heart.position.copy(this.mesh.position);
      heart.position.y += Math.random() * 0.5;
      this.scene.add(heart);

      // Animate heart floating up and fading
      const startY = heart.position.y;
      const animate = () => {
        heart.position.y += 0.01;
        (heart.material as THREE.MeshBasicMaterial).opacity -= 0.02;

        if ((heart.material as THREE.MeshBasicMaterial).opacity > 0) {
          requestAnimationFrame(animate);
        } else {
          this.scene.remove(heart);
        }
      };

      setTimeout(() => animate(), i * 200);
    }
  }

  setSelected(selected: boolean): void {
    this.isSelected = selected;
    if (this.selectionGlow) {
      this.selectionGlow.visible = selected;
    }
  }

  getMesh(): THREE.Group {
    return this.mesh;
  }

  getData(): FishData {
    return { ...this.data };
  }

  getId(): string {
    return this.id;
  }

  destroy(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }

    if (this.body && this.world) {
      this.world.removeBody(this.body);
    }

    // Clean up particles
    this.feedParticles.forEach(particles => {
      this.scene.remove(particles);
    });
    this.feedParticles = [];
  }
}
