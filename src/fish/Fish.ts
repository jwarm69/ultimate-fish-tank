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

    // Main fish body - streamlined torpedo shape
    const bodyGeometry = new THREE.CapsuleGeometry(this.data.config.size * 0.5, this.data.config.size * 1.5, 4, 16);
    bodyGeometry.rotateZ(Math.PI / 2); // Orient horizontally

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: this.data.config.bodyColor,
      metalness: 0.3,
      roughness: 0.4,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xffffff),
      emissive: this.data.config.bodyColor.clone().multiplyScalar(0.1),
      transparent: this.data.config.translucent,
      opacity: this.data.config.translucent ? 0.9 : 1,
      iridescence: this.data.config.iridescent ? 0.8 : 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 800],
    });

    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(bodyMesh);

    // Tail fin - beautiful fan shape
    const tailGeometry = new THREE.ConeGeometry(
      this.data.config.size * 0.8,
      this.data.config.size * 0.3,
      8,
      4,
      false,
      0,
      Math.PI * 1.8
    );
    
    const finMaterial = new THREE.MeshPhysicalMaterial({
      color: this.data.config.finColor,
      transparent: true,
      opacity: 0.7,
      metalness: 0.1,
      roughness: 0.3,
      clearcoat: 0.5,
      transmission: 0.2,
      side: THREE.DoubleSide,
    });

    const tailMesh = new THREE.Mesh(tailGeometry, finMaterial);
    tailMesh.position.x = -this.data.config.size * 1.2;
    tailMesh.rotation.z = Math.PI / 2;
    tailMesh.rotation.y = Math.PI / 2;
    group.add(tailMesh);

    // Dorsal fin - curved blade shape
    const dorsalCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, this.data.config.size * 0.6, 0),
      new THREE.Vector3(-this.data.config.size * 0.4, this.data.config.size * 0.8, 0)
    );
    
    const dorsalGeometry = new THREE.TubeGeometry(dorsalCurve, 8, this.data.config.size * 0.05, 4);
    const dorsalMesh = new THREE.Mesh(dorsalGeometry, finMaterial.clone());
    dorsalMesh.position.set(-this.data.config.size * 0.2, this.data.config.size * 0.3, 0);
    group.add(dorsalMesh);

    // Pectoral fins - wing-like
    const pectoralGeometry = new THREE.ConeGeometry(
      this.data.config.size * 0.3,
      this.data.config.size * 0.6,
      6,
      2
    );
    
    const leftPectoral = new THREE.Mesh(pectoralGeometry, finMaterial.clone());
    leftPectoral.position.set(this.data.config.size * 0.2, -this.data.config.size * 0.1, this.data.config.size * 0.4);
    leftPectoral.rotation.set(Math.PI / 6, 0, Math.PI / 4);
    group.add(leftPectoral);

    const rightPectoral = new THREE.Mesh(pectoralGeometry, finMaterial.clone());
    rightPectoral.position.set(this.data.config.size * 0.2, -this.data.config.size * 0.1, -this.data.config.size * 0.4);
    rightPectoral.rotation.set(-Math.PI / 6, 0, -Math.PI / 4);
    group.add(rightPectoral);

    // Eyes - realistic with pupils and highlights
    const eyeWhiteGeometry = new THREE.SphereGeometry(this.data.config.size * 0.15, 8, 6);
    const eyeWhiteMaterial = new THREE.MeshPhysicalMaterial({ 
      color: 0xffffff,
      clearcoat: 1,
      clearcoatRoughness: 0,
    });

    const eyePupilGeometry = new THREE.SphereGeometry(this.data.config.size * 0.08, 8, 6);
    const eyePupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const eyeHighlightGeometry = new THREE.SphereGeometry(this.data.config.size * 0.03, 6, 4);
    const eyeHighlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Left eye
    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
    leftEyeWhite.position.set(this.data.config.size * 0.7, this.data.config.size * 0.2, this.data.config.size * 0.3);
    group.add(leftEyeWhite);

    const leftEyePupil = new THREE.Mesh(eyePupilGeometry, eyePupilMaterial);
    leftEyePupil.position.set(this.data.config.size * 0.75, this.data.config.size * 0.2, this.data.config.size * 0.3);
    group.add(leftEyePupil);

    const leftEyeHighlight = new THREE.Mesh(eyeHighlightGeometry, eyeHighlightMaterial);
    leftEyeHighlight.position.set(this.data.config.size * 0.77, this.data.config.size * 0.25, this.data.config.size * 0.3);
    group.add(leftEyeHighlight);

    // Right eye
    const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial.clone());
    rightEyeWhite.position.set(this.data.config.size * 0.7, this.data.config.size * 0.2, -this.data.config.size * 0.3);
    group.add(rightEyeWhite);

    const rightEyePupil = new THREE.Mesh(eyePupilGeometry, eyePupilMaterial.clone());
    rightEyePupil.position.set(this.data.config.size * 0.75, this.data.config.size * 0.2, -this.data.config.size * 0.3);
    group.add(rightEyePupil);

    const rightEyeHighlight = new THREE.Mesh(eyeHighlightGeometry, eyeHighlightMaterial.clone());
    rightEyeHighlight.position.set(this.data.config.size * 0.77, this.data.config.size * 0.25, -this.data.config.size * 0.3);
    group.add(rightEyeHighlight);

    this.mesh = group;
    this.scene.add(this.mesh);

    // Create selection glow (initially hidden)
    this.createSelectionGlow();
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

    // Smooth rotation to face movement direction
    if (velocity.length() > 0.1) {
      const targetPosition = position.clone().add(velocity);
      this.mesh.lookAt(targetPosition);
    }
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
      // Fish looks sick - duller colors, red glow
      material.emissive.setRGB(0.2, 0.05, 0.05);
      this.data.needsAttentionGlow = true;
    } else if (this.data.hunger < 20) {
      // Fish is hungry - slight orange glow
      material.emissive.setRGB(0.1, 0.08, 0.02);
      this.data.needsAttentionGlow = true;
    } else {
      // Healthy fish
      material.emissive = this.data.config.bodyColor
        .clone()
        .multiplyScalar(this.data.originalEmissive || 0.03);
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
