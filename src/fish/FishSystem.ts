import * as THREE from 'three';
import { Component, FishData, FishSpecies, FishPersonality, FishConfig } from '../core/types';
import { EventSystem } from '../core/EventSystem';
import { Physics } from '../core/Physics';
import { Fish } from './Fish';

export interface FishSystemConfig {
  scene: THREE.Scene;
  physics?: Physics;
  events: EventSystem;
  camera: THREE.Camera;
}

export class FishSystem implements Component {
  private scene: THREE.Scene;
  private physics?: Physics;
  private events: EventSystem;
  private camera: THREE.Camera;
  private fish: Fish[] = [];
  private selectedFish: Fish | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(config: FishSystemConfig) {
    this.scene = config.scene;
    this.physics = config.physics;
    this.events = config.events;
    this.camera = config.camera;
  }

  init(): void {
    this.setupEventListeners();
    this.createInitialFish();
    console.log('🐠 Fish system initialized');
  }

  private setupEventListeners(): void {
    // Mouse click for fish selection
    window.addEventListener('click', event => this.onMouseClick(event));

    // Game events
    this.events.on('feedFish', event => this.feedFish(event.data?.fishId));
    this.events.on('petFish', event => this.petFish(event.data?.fishId));
    this.events.on('addFish', () => this.addRandomFish());
  }

  private onMouseClick(event: MouseEvent): void {
    // Convert mouse coordinates to normalized device coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Perform raycasting
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const fishMeshes = this.fish.map(fish => fish.getMesh()).filter(mesh => mesh);
    const intersects = this.raycaster.intersectObjects(fishMeshes, true);

    if (intersects.length > 0) {
      // Find the clicked fish
      const clickedMesh = intersects[0].object;
      const clickedFish = this.fish.find(fish => {
        const mesh = fish.getMesh();
        return mesh && (mesh === clickedMesh || mesh.children.includes(clickedMesh));
      });

      if (clickedFish) {
        this.selectFish(clickedFish);
      }
    } else {
      this.deselectFish();
    }
  }

  private createInitialFish(): void {
    // Create one initial fish
    const fishData = this.generateRandomFishData();
    const fish = new Fish(fishData, this.scene, this.physics?.getWorld());
    fish.init();
    this.fish.push(fish);

    this.events.emit('fishCountChanged', { count: this.fish.length });
  }

  private generateRandomFishData(): FishData {
    const species: FishSpecies[] = [
      'tropical',
      'goldfish',
      'betta',
      'tetra',
      'angelfish',
      'clownfish',
      'tang',
      'koi',
      'rainbow',
      'discus',
    ];
    const personalities: FishPersonality[] = [
      'playful',
      'shy',
      'energetic',
      'elegant',
      'aggressive',
      'wise',
      'curious',
    ];

    const randomSpecies = species[Math.floor(Math.random() * species.length)];
    const randomPersonality = personalities[Math.floor(Math.random() * personalities.length)];

    const config: FishConfig = {
      bodyColor: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
      finColor: new THREE.Color().setHSL(Math.random(), 0.8, 0.7),
      size: 0.8 + Math.random() * 0.4,
      speed: 0.5 + Math.random() * 0.5,
      turnSpeed: 1 + Math.random() * 2,
      iridescent: Math.random() > 0.7,
      translucent: Math.random() > 0.8,
    };

    return {
      species: randomSpecies,
      personality: randomPersonality,
      config,
      age: 'Young',
      health: 90 + Math.random() * 10,
      happiness: 70 + Math.random() * 20,
      hunger: 60 + Math.random() * 30,
    };
  }

  addRandomFish(): Fish {
    const fishData = this.generateRandomFishData();
    const fish = new Fish(fishData, this.scene, this.physics?.getWorld());
    fish.init();
    this.fish.push(fish);

    this.events.emit('fishCountChanged', { count: this.fish.length });
    this.events.emit('message', {
      text: `🐠 A new ${fishData.species} fish joined your aquarium!`,
    });

    return fish;
  }

  selectFish(fish: Fish): void {
    // Deselect previous fish
    if (this.selectedFish) {
      this.selectedFish.setSelected(false);
    }

    // Select new fish
    this.selectedFish = fish;
    fish.setSelected(true);

    this.events.emit('fishSelected', { fish: fish.getData() });
  }

  deselectFish(): void {
    if (this.selectedFish) {
      this.selectedFish.setSelected(false);
      this.selectedFish = null;
      this.events.emit('fishDeselected');
    }
  }

  feedFish(fishId?: string): void {
    const targetFish = fishId ? this.findFishById(fishId) : this.selectedFish;

    if (targetFish) {
      targetFish.feed();
      this.events.emit('message', { text: '🍽️ Fish fed successfully!' });
      this.events.emit('fishFed', { fishId: targetFish.getId() });
    } else {
      this.events.emit('message', { text: '⚠️ No fish selected to feed!' });
    }
  }

  petFish(fishId?: string): void {
    const targetFish = fishId ? this.findFishById(fishId) : this.selectedFish;

    if (targetFish) {
      targetFish.pet();
      this.events.emit('message', { text: '🤚 Fish petted! It seems happier!' });
      this.events.emit('fishPetted', { fishId: targetFish.getId() });
    } else {
      this.events.emit('message', { text: '⚠️ No fish selected to pet!' });
    }
  }

  private findFishById(id: string): Fish | undefined {
    return this.fish.find(fish => fish.getId() === id);
  }

  update(deltaTime: number): void {
    // Update all fish
    this.fish.forEach(fish => fish.update(deltaTime));

    // Remove dead fish (if any)
    this.fish = this.fish.filter(fish => {
      if (fish.getData().health <= 0) {
        fish.destroy();
        this.events.emit('fishDied', { fishId: fish.getId() });
        return false;
      }
      return true;
    });
  }

  getFish(): Fish[] {
    return [...this.fish];
  }

  getSelectedFish(): Fish | null {
    return this.selectedFish;
  }

  getFishCount(): number {
    return this.fish.length;
  }

  destroy(): void {
    // Clean up event listeners
    window.removeEventListener('click', this.onMouseClick);

    // Destroy all fish
    this.fish.forEach(fish => fish.destroy());
    this.fish = [];
    this.selectedFish = null;
  }
}
