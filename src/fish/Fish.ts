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

    // Fish body (ellipsoid)
    const bodyGeometry = new THREE.SphereGeometry(this.data.config.size, 16, 12);
    bodyGeometry.scale(1.5, 1, 1); // Make it more fish-like

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: this.data.config.bodyColor,
      metalness: 0.15,
      roughness: 0.6,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      emissive: this.data.config.bodyColor
        .clone()
        .multiplyScalar(this.data.originalEmissive || 0.03),
      transparent: this.data.config.translucent,
      opacity: this.data.config.translucent ? 0.8 : 1,
      iridescence: this.data.config.iridescent ? 1 : 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
    });

    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(bodyMesh);

    // Tail fin
    const tailGeometry = new THREE.ConeGeometry(
      this.data.config.size * 0.4,
      this.data.config.size * 0.8,
      8
    );
    const tailMaterial = new THREE.MeshPhysicalMaterial({
      color: this.data.config.finColor,
      transparent: true,
      opacity: 0.7,
      metalness: 0.1,
      roughness: 0.8,
    });

    const tailMesh = new THREE.Mesh(tailGeometry, tailMaterial);
    tailMesh.position.x = -this.data.config.size * 1.2;
    tailMesh.rotation.z = Math.PI / 2;
    group.add(tailMesh);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(this.data.config.size * 0.15, 8, 6);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(
      this.data.config.size * 0.6,
      this.data.config.size * 0.3,
      this.data.config.size * 0.4
    );
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(
      this.data.config.size * 0.6,
      this.data.config.size * 0.3,
      -this.data.config.size * 0.4
    );
    group.add(rightEye);

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
    const x = (Math.random() - 0.5) * 8;
    const y = (Math.random() - 0.5) * 4;
    const z = (Math.random() - 0.5) * 4;

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

    // Adjust speed based on health
    const healthMultiplier = Math.max(0.3, this.data.health / 100);
    const currentSpeed = (this.data.originalSpeed || 1) * healthMultiplier;

    // Random direction changes
    if (Math.random() < 0.02) {
      this.behaviorState.direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2
      ).normalize();
    }

    // Apply movement
    const velocity = this.behaviorState.direction.clone().multiplyScalar(currentSpeed);
    this.body.velocity.set(velocity.x, velocity.y, velocity.z);

    // Face movement direction
    this.mesh.lookAt(
      this.mesh.position.x + velocity.x,
      this.mesh.position.y + velocity.y,
      this.mesh.position.z + velocity.z
    );
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
