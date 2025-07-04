import * as THREE from 'three';
import { Component, ParticleConfig } from '../core/types';
import { EventSystem } from '../core/EventSystem';

export interface EffectsSystemConfig {
  scene: THREE.Scene;
  events: EventSystem;
}

export class EffectsSystem implements Component {
  private scene: THREE.Scene;
  private events: EventSystem;
  private particles: THREE.Points[] = [];
  private bubbles: THREE.Points[] = [];
  private backgroundAnimations: THREE.Object3D[] = [];

  constructor(config: EffectsSystemConfig) {
    this.scene = config.scene;
    this.events = config.events;
  }

  init(): void {
    this.setupEventListeners();
    this.createBackgroundBubbles();

    console.log('✨ Effects system initialized');
  }

  private setupEventListeners(): void {
    this.events.on('fishFed', event => {
      this.createFeedingEffect(event.data?.position || new THREE.Vector3());
    });

    this.events.on('fishPetted', event => {
      this.createPettingEffect(event.data?.position || new THREE.Vector3());
    });

    this.events.on('tankCleaned', () => {
      this.createCleaningEffect();
    });

    this.events.on('bubbleEffect', event => {
      this.createBubbleEffect(event.data?.position, event.data?.count);
    });

    this.events.on('dropFood', event => {
      this.createFoodDrop(event.data?.targetFish);
    });
  }

  private createBackgroundBubbles(): void {
    const bubbleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(bubbleCount * 3);
    const velocities = new Float32Array(bubbleCount * 3);
    const sizes = new Float32Array(bubbleCount);

    for (let i = 0; i < bubbleCount; i++) {
      const i3 = i * 3;

      // Random positions within tank
      positions[i3] = (Math.random() - 0.5) * 8;
      positions[i3 + 1] = -3 + Math.random() * 6;
      positions[i3 + 2] = (Math.random() - 0.5) * 5;

      // Upward velocities with slight random drift
      velocities[i3] = (Math.random() - 0.5) * 0.1;
      velocities[i3 + 1] = 0.2 + Math.random() * 0.3;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;

      // Random sizes
      sizes[i] = 0.02 + Math.random() * 0.08;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      map: this.createBubbleTexture(),
    });

    const bubbles = new THREE.Points(geometry, material);
    this.scene.add(bubbles);
    this.bubbles.push(bubbles);
  }

  private createBubbleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;

    // Create bubble gradient
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createFeedingEffect(position: THREE.Vector3): void {
    const particleCount = 15;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Spread particles around the feeding position
      positions[i3] = position.x + (Math.random() - 0.5) * 2;
      positions[i3 + 1] = position.y + Math.random() * 1;
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * 2;

      // Orange/yellow food colors
      colors[i3] = 1; // Red
      colors[i3 + 1] = 0.5 + Math.random() * 0.5; // Green
      colors[i3 + 2] = 0; // Blue
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    this.particles.push(particles);

    // Animate particles falling and fading
    this.animateParticles(particles, {
      fallSpeed: 0.5,
      fadeSpeed: 0.01,
      duration: 3000,
    });
  }

  private createPettingEffect(position: THREE.Vector3): void {
    // Create heart particles
    for (let i = 0; i < 5; i++) {
      const heartGeometry = new THREE.SphereGeometry(0.05, 8, 6);
      const heartMaterial = new THREE.MeshBasicMaterial({
        color: 0xff69b4,
        transparent: true,
        opacity: 0.8,
      });

      const heart = new THREE.Mesh(heartGeometry, heartMaterial);
      heart.position.copy(position);
      heart.position.y += Math.random() * 0.5;
      heart.position.x += (Math.random() - 0.5) * 0.5;
      heart.position.z += (Math.random() - 0.5) * 0.5;

      this.scene.add(heart);

      // Animate hearts floating up
      this.animateHeart(heart, 2000);
    }
  }

  private animateHeart(heart: THREE.Mesh, duration: number): void {
    const startTime = Date.now();
    const startY = heart.position.y;
    const material = heart.material as THREE.MeshBasicMaterial;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        heart.position.y = startY + progress * 2;
        material.opacity = 0.8 * (1 - progress);
        heart.scale.setScalar(1 + progress * 0.5);

        requestAnimationFrame(animate);
      } else {
        this.scene.remove(heart);
      }
    };

    animate();
  }

  private createCleaningEffect(): void {
    // Create sparkle effect throughout the tank
    const sparkleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(sparkleCount * 3);

    for (let i = 0; i < sparkleCount; i++) {
      const i3 = i * 3;

      // Random positions throughout tank
      positions[i3] = (Math.random() - 0.5) * 9;
      positions[i3 + 1] = (Math.random() - 0.5) * 5;
      positions[i3 + 2] = (Math.random() - 0.5) * 5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.05,
      transparent: true,
      opacity: 1,
    });

    const sparkles = new THREE.Points(geometry, material);
    this.scene.add(sparkles);

    // Animate sparkles
    this.animateParticles(sparkles, {
      twinkle: true,
      fadeSpeed: 0.02,
      duration: 2000,
    });
  }

  private createBubbleEffect(position?: THREE.Vector3, count: number = 10): void {
    const bubblePos = position || new THREE.Vector3(0, -2, 0);

    for (let i = 0; i < count; i++) {
      const bubbleGeometry = new THREE.SphereGeometry(0.02 + Math.random() * 0.05, 8, 6);
      const bubbleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
      });

      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
      bubble.position.copy(bubblePos);
      bubble.position.x += (Math.random() - 0.5) * 0.5;
      bubble.position.z += (Math.random() - 0.5) * 0.5;

      this.scene.add(bubble);

      // Animate bubble rising
      this.animateBubble(bubble, 3000 + Math.random() * 2000);
    }
  }

  private animateBubble(bubble: THREE.Mesh, duration: number): void {
    const startTime = Date.now();
    const startY = bubble.position.y;
    const material = bubble.material as THREE.MeshBasicMaterial;
    const riseSpeed = 0.5 + Math.random() * 0.3;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1 && bubble.position.y < 3) {
        bubble.position.y += riseSpeed * 0.016; // Approximate 60fps
        bubble.position.x += Math.sin(elapsed * 0.003) * 0.001;

        // Fade as it rises
        material.opacity = 0.6 * (1 - progress * 0.5);

        requestAnimationFrame(animate);
      } else {
        this.scene.remove(bubble);
      }
    };

    animate();
  }

  private animateParticles(particles: THREE.Points, options: any): void {
    const startTime = Date.now();
    const material = particles.material as THREE.PointsMaterial;
    const geometry = particles.geometry;
    const positions = geometry.attributes.position.array as Float32Array;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / options.duration;

      if (progress < 1) {
        // Update particle positions
        if (options.fallSpeed) {
          for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= options.fallSpeed * 0.016;
          }
          geometry.attributes.position.needsUpdate = true;
        }

        // Fade effect
        if (options.fadeSpeed) {
          material.opacity = Math.max(0, material.opacity - options.fadeSpeed);
        }

        // Twinkle effect
        if (options.twinkle) {
          material.opacity = 0.5 + 0.5 * Math.sin(elapsed * 0.01);
        }

        requestAnimationFrame(animate);
      } else {
        this.scene.remove(particles);
        const index = this.particles.indexOf(particles);
        if (index > -1) {
          this.particles.splice(index, 1);
        }
      }
    };

    animate();
  }

  update(deltaTime: number): void {
    const time = Date.now() * 0.001;

    // Update background bubbles
    this.bubbles.forEach(bubbleSystem => {
      const geometry = bubbleSystem.geometry;
      const positions = geometry.attributes.position.array as Float32Array;
      const velocities = geometry.attributes.velocity?.array as Float32Array;

      if (velocities) {
        for (let i = 0; i < positions.length; i += 3) {
          // Move bubbles
          positions[i] += velocities[i] * deltaTime;
          positions[i + 1] += velocities[i + 1] * deltaTime;
          positions[i + 2] += velocities[i + 2] * deltaTime;

          // Reset bubbles that reach the top
          if (positions[i + 1] > 3) {
            positions[i] = (Math.random() - 0.5) * 8;
            positions[i + 1] = -3;
            positions[i + 2] = (Math.random() - 0.5) * 5;
          }
        }

        geometry.attributes.position.needsUpdate = true;
      }
    });
  }

  createParticle(config: ParticleConfig): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([config.position.x, config.position.y, config.position.z]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: config.color,
      size: config.size,
      transparent: true,
      opacity: config.opacity,
    });

    const particle = new THREE.Points(geometry, material);
    this.scene.add(particle);
    this.particles.push(particle);

    return particle;
  }

  removeParticle(particle: THREE.Points): void {
    this.scene.remove(particle);
    const index = this.particles.indexOf(particle);
    if (index > -1) {
      this.particles.splice(index, 1);
    }
  }

  private createFoodDrop(targetFishId?: string): void {
    // Create multiple food pellets
    const pelletCount = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < pelletCount; i++) {
      const pelletGeometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.03, 8, 6);
      const pelletMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 0.8, 0.6), // Brown/orange food colors
        roughness: 0.8,
        metalness: 0.1,
        emissive: new THREE.Color(0x332211),
        emissiveIntensity: 0.1
      });

      const pellet = new THREE.Mesh(pelletGeometry, pelletMaterial);
      
      // Start at water surface, slightly random positions
      pellet.position.set(
        (Math.random() - 0.5) * 15, // Random X within tank
        3.5, // Water surface
        (Math.random() - 0.5) * 10   // Random Z within tank
      );

      this.scene.add(pellet);

      // Animate pellet falling with realistic physics
      this.animateFoodPellet(pellet, targetFishId, 4000 + Math.random() * 2000);
    }
  }

  private animateFoodPellet(pellet: THREE.Mesh, targetFishId: string | undefined, duration: number): void {
    const startTime = Date.now();
    const fallSpeed = 1.5 + Math.random() * 0.5;
    const sinkSpeed = 0.3 + Math.random() * 0.2;
    const driftSpeed = 0.1;
    
    let hasHitWater = false;
    const waterSurface = 3.2;
    const tankBottom = -3.5;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const deltaTime = 0.016; // Approximate 60fps

      if (elapsed < duration && pellet.position.y > tankBottom) {
        if (!hasHitWater && pellet.position.y > waterSurface) {
          // Falling through air
          pellet.position.y -= fallSpeed * deltaTime;
        } else {
          // In water - slower sinking with drift
          if (!hasHitWater) {
            hasHitWater = true;
            // Create splash effect
            this.createSplashEffect(pellet.position.clone());
          }
          
          pellet.position.y -= sinkSpeed * deltaTime;
          pellet.position.x += Math.sin(elapsed * 0.002) * driftSpeed * deltaTime;
          pellet.position.z += Math.cos(elapsed * 0.003) * driftSpeed * deltaTime;
          
          // Slight rotation as it sinks
          pellet.rotation.x += 0.02;
          pellet.rotation.z += 0.01;
        }

        requestAnimationFrame(animate);
      } else {
        // Remove pellet when it reaches bottom or times out
        this.scene.remove(pellet);
        
        // Create small bubble effect when it hits bottom
        if (pellet.position.y <= tankBottom + 0.1) {
          this.createBubbleEffect(pellet.position, 2);
        }
      }
    };

    animate();
  }

  private createSplashEffect(position: THREE.Vector3): void {
    // Create small splash when food hits water
    const splashCount = 8;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(splashCount * 3);

    for (let i = 0; i < splashCount; i++) {
      const i3 = i * 3;
      const angle = (i / splashCount) * Math.PI * 2;
      const radius = 0.2 + Math.random() * 0.3;

      positions[i3] = position.x + Math.cos(angle) * radius;
      positions[i3 + 1] = position.y;
      positions[i3 + 2] = position.z + Math.sin(angle) * radius;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.04,
      transparent: true,
      opacity: 0.8,
    });

    const splash = new THREE.Points(geometry, material);
    this.scene.add(splash);

    // Animate splash particles
    this.animateParticles(splash, {
      fadeSpeed: 0.03,
      duration: 1000,
    });
  }

  destroy(): void {
    // Clean up all particles
    [...this.particles, ...this.bubbles].forEach(particle => {
      this.scene.remove(particle);
    });

    this.particles = [];
    this.bubbles = [];
    this.backgroundAnimations = [];
  }
}
