import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Component } from '../core/types';
import { EventSystem } from '../core/EventSystem';

export interface FoodParticle {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  age: number;
  eaten: boolean;
  nutritionValue: number;
}

export interface FoodSystemConfig {
  scene: THREE.Scene;
  world: CANNON.World;
  events: EventSystem;
  tankBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export class FoodSystem implements Component {
  private scene: THREE.Scene;
  private world: CANNON.World;
  private events: EventSystem;
  private tankBounds: any;
  private foodParticles: FoodParticle[] = [];
  private maxFoodParticles = 50;
  private foodMaterial?: THREE.MeshPhysicalMaterial;
  private foodGeometry?: THREE.SphereGeometry;

  constructor(config: FoodSystemConfig) {
    this.scene = config.scene;
    this.world = config.world;
    this.events = config.events;
    this.tankBounds = config.tankBounds;
  }

  init(): void {
    this.createFoodMaterials();
    this.setupEventListeners();
    
    console.log('🍽️ Food system initialized');
  }

  private createFoodMaterials(): void {
    // Create realistic food pellet geometry and material
    this.foodGeometry = new THREE.SphereGeometry(0.03, 8, 6);
    
    this.foodMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8B4513, // Brown food pellet color
      roughness: 0.8,
      metalness: 0.1,
      clearcoat: 0.2,
      emissive: new THREE.Color(0x4A2C17),
      emissiveIntensity: 0.1,
    });
  }

  private setupEventListeners(): void {
    // Listen for feeding events
    this.events.on('dropFood', (event) => {
      const targetFish = event.data?.targetFish;
      const dropPosition = event.data?.position || this.getRandomSurfacePosition();
      
      this.dropFoodParticles(dropPosition, targetFish ? 3 : 8);
    });

    // Listen for general feeding
    this.events.on('feedFish', (event) => {
      if (!event.data?.fishId) {
        // General feeding - drop food at multiple random locations
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            this.dropFoodParticles(this.getRandomSurfacePosition(), 4);
          }, i * 500);
        }
      }
    });
  }

  private getRandomSurfacePosition(): THREE.Vector3 {
    // Drop food near water surface at random location
    return new THREE.Vector3(
      (Math.random() - 0.5) * (this.tankBounds.maxX - this.tankBounds.minX) * 0.8,
      this.tankBounds.maxY - 0.5, // Near surface
      (Math.random() - 0.5) * (this.tankBounds.maxZ - this.tankBounds.minZ) * 0.8
    );
  }

  private dropFoodParticles(position: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.foodParticles.length >= this.maxFoodParticles) {
        // Remove oldest food particle
        this.removeFoodParticle(this.foodParticles[0]);
      }

      const foodParticle = this.createFoodParticle(position, i);
      this.foodParticles.push(foodParticle);
    }

    // Emit event for fish to detect food
    this.events.emit('foodDropped', {
      position: position.clone(),
      count,
      particles: this.foodParticles.slice(-count)
    });

    console.log(`🍽️ Dropped ${count} food particles at`, position);
  }

  private createFoodParticle(basePosition: THREE.Vector3, index: number): FoodParticle {
    // Create visual mesh
    const mesh = new THREE.Mesh(this.foodGeometry!.clone(), this.foodMaterial!.clone());
    
    // Add slight variation to drop position
    const position = basePosition.clone();
    position.x += (Math.random() - 0.5) * 0.5;
    position.z += (Math.random() - 0.5) * 0.5;
    position.y += index * 0.1; // Stagger drop heights slightly
    
    mesh.position.copy(position);
    this.scene.add(mesh);

    // Create physics body
    const shape = new CANNON.Sphere(0.03);
    const body = new CANNON.Body({
      mass: 0.001, // Very light so they sink slowly
      shape,
      material: new CANNON.Material({
        friction: 0.3,
        restitution: 0.2
      })
    });
    
    body.position.copy(position as any);
    
    // Add slight random initial velocity for natural spread
    body.velocity.set(
      (Math.random() - 0.5) * 0.5,
      -0.2, // Slight downward velocity
      (Math.random() - 0.5) * 0.5
    );
    
    this.world.addBody(body);

    return {
      mesh,
      body,
      age: 0,
      eaten: false,
      nutritionValue: 1 + Math.random() * 2 // Random nutrition value
    };
  }

  public getFoodParticles(): FoodParticle[] {
    return this.foodParticles.filter(particle => !particle.eaten);
  }

  public eatFoodParticle(particle: FoodParticle): number {
    if (particle.eaten) return 0;
    
    particle.eaten = true;
    
    // Create eating effect
    this.createEatingEffect(particle.mesh.position);
    
    // Remove from scene and physics world
    this.removeFoodParticle(particle);
    
    return particle.nutritionValue;
  }

  private createEatingEffect(position: THREE.Vector3): void {
    // Create small particle burst when food is eaten
    const particleCount = 8;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = position.x + (Math.random() - 0.5) * 0.2;
      positions[i + 1] = position.y + (Math.random() - 0.5) * 0.2;
      positions[i + 2] = position.z + (Math.random() - 0.5) * 0.2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xFFA500,
      size: 0.02,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    
    // Animate and remove
    let opacity = 0.8;
    const animate = () => {
      opacity -= 0.05;
      material.opacity = opacity;
      
      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(particles);
        geometry.dispose();
        material.dispose();
      }
    };
    
    animate();
  }

  private removeFoodParticle(particle: FoodParticle): void {
    // Remove from scene
    this.scene.remove(particle.mesh);
    particle.mesh.geometry.dispose();
    (particle.mesh.material as THREE.Material).dispose();
    
    // Remove from physics world
    this.world.removeBody(particle.body);
    
    // Remove from array
    const index = this.foodParticles.indexOf(particle);
    if (index > -1) {
      this.foodParticles.splice(index, 1);
    }
  }

  update(deltaTime: number): void {
    // Update food particles
    for (let i = this.foodParticles.length - 1; i >= 0; i--) {
      const particle = this.foodParticles[i];
      
      if (particle.eaten) continue;
      
      // Update age
      particle.age += deltaTime;
      
      // Sync visual position with physics
      particle.mesh.position.copy(particle.body.position as any);
      particle.mesh.quaternion.copy(particle.body.quaternion as any);
      
      // Check if food hit tank bottom or is too old
      const hitBottom = particle.body.position.y <= this.tankBounds.minY + 0.5;
      const tooOld = particle.age > 30000; // 30 seconds
      
      if (hitBottom || tooOld) {
        if (hitBottom) {
          // Food settles on bottom, slowly dissolves
          particle.body.velocity.set(0, 0, 0);
          const material = particle.mesh.material as THREE.MeshPhysicalMaterial;
          material.opacity = Math.max(0.1, material.opacity - deltaTime * 0.001);
          
          if (material.opacity <= 0.1 || particle.age > 60000) {
            this.removeFoodParticle(particle);
          }
        } else {
          this.removeFoodParticle(particle);
        }
      }
    }
  }

  destroy(): void {
    // Clean up all food particles
    this.foodParticles.forEach(particle => {
      this.removeFoodParticle(particle);
    });
    this.foodParticles = [];
    
    // Dispose of shared materials
    if (this.foodGeometry) {
      this.foodGeometry.dispose();
    }
    if (this.foodMaterial) {
      this.foodMaterial.dispose();
    }
  }
}