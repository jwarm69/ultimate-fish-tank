import { EngineConfig, Capabilities, PlayerStats, TankStats } from './types';
import { Renderer } from './Renderer';
import { Camera } from './Camera';
import { Physics } from './Physics';
import { EventSystem } from './EventSystem';
import { FishSystem } from '../fish/FishSystem';
import { EnvironmentSystem } from '../environment/EnvironmentSystem';
import { EffectsSystem } from '../effects/EffectsSystem';
import { GameLogic } from '../game/GameLogic';
import { UISystem } from '../ui/UISystem';
import { FoodSystem } from '../food/FoodSystem';

export class UltimateFishTank {
  private config: EngineConfig;
  private capabilities: Capabilities;
  private renderer!: Renderer;
  private camera!: Camera;
  private physics?: Physics;
  private events!: EventSystem;

  // Game systems
  private fishSystem!: FishSystem;
  private environmentSystem!: EnvironmentSystem;
  private effectsSystem!: EffectsSystem;
  private gameLogic!: GameLogic;
  private uiSystem!: UISystem;
  private foodSystem!: FoodSystem;

  // State
  private isRunning = false;
  private lastFrameTime = 0;
  private frameCount = 0;

  // Game data
  public playerStats: PlayerStats;
  public tankStats: TankStats;

  constructor(config: EngineConfig) {
    this.config = config;
    this.capabilities = this.detectCapabilities();

    // Initialize game state
    this.playerStats = {
      coins: 500,
      level: 1,
      totalCoinsEarned: 500,
      achievements: {
        fishFed: 0,
        tanksCleaned: 0,
        fishPetted: 0,
        consecutiveDaysActive: 0,
      },
    };

    this.tankStats = {
      cleanliness: 90,
      temperature: 24,
      lastCleaningUpdate: Date.now(),
      lastTempUpdate: Date.now(),
      dirtParticles: [],
    };

    if (this.config.debug) {
      console.log('🎮 UltimateFishTank initialized with config:', config);
      console.log('🔍 Detected capabilities:', this.capabilities);
    }
  }

  async init(): Promise<void> {
    try {
      // Initialize core systems
      await this.initializeCoreSystems();

      // Initialize game systems
      await this.initializeGameSystems();

      // Setup event listeners
      this.setupEventListeners();

      // Start the game loop
      this.start();

      // Hide loading screen
      this.hideLoadingScreen();

      console.log('✅ Ultimate Fish Tank initialized successfully!');
    } catch (error) {
      console.error('❌ Failed to initialize Ultimate Fish Tank:', error);
      this.showError('Failed to initialize the aquarium. Please refresh and try again.');
    }
  }

  private async initializeCoreSystems(): Promise<void> {
    // Initialize event system first (other systems depend on it)
    this.events = new EventSystem();

    // Initialize renderer
    this.renderer = new Renderer({
      container: this.config.container,
      enableWebGL: this.capabilities.webgl,
      debug: this.config.debug,
    });
    await this.renderer.init();

    // Initialize camera
    this.camera = new Camera({
      container: this.config.container,
      renderer: this.renderer.getRenderer(),
    });
    this.camera.init();

    // Initialize physics (optional)
    if (this.config.enablePhysics) {
      this.physics = new Physics();
      this.physics.init();
    }
  }

  private async initializeGameSystems(): Promise<void> {
    // Initialize environment system
    this.environmentSystem = new EnvironmentSystem({
      scene: this.renderer.getScene(),
      capabilities: this.capabilities,
      debug: this.config.debug,
    });
    await this.environmentSystem.init();

    // Initialize effects system
    this.effectsSystem = new EffectsSystem({
      scene: this.renderer.getScene(),
      events: this.events,
    });
    this.effectsSystem.init();

    // Initialize fish system
    this.fishSystem = new FishSystem({
      scene: this.renderer.getScene(),
      physics: this.physics,
      events: this.events,
      camera: this.camera.getCamera(),
    });
    this.fishSystem.init();
    
    // Initialize food system
    this.foodSystem = new FoodSystem({
      scene: this.renderer.getScene(),
      world: this.physics!.getWorld(),
      events: this.events,
      tankBounds: {
        minX: -9, maxX: 9,
        minY: -3.5, maxY: 3.5,
        minZ: -5.5, maxZ: 5.5
      }
    });
    this.foodSystem.init();
    
    // Connect food system with fish system for food detection
    this.setupFoodFishInteraction();

    // Initialize game logic
    this.gameLogic = new GameLogic({
      playerStats: this.playerStats,
      tankStats: this.tankStats,
      events: this.events,
      fishSystem: this.fishSystem,
      effectsSystem: this.effectsSystem,
    });
    this.gameLogic.init();

    // Initialize UI system
    this.uiSystem = new UISystem({
      events: this.events,
      playerStats: this.playerStats,
      tankStats: this.tankStats,
      fishSystem: this.fishSystem,
      gameLogic: this.gameLogic,
    });
    this.uiSystem.init();
  }
  
  private setupFoodFishInteraction(): void {
    // Update fish food targets when food is dropped
    this.events.on('foodDropped', (event) => {
      const foodPosition = event.data?.position;
      const foodParticles = event.data?.particles || [];
      
      if (foodPosition) {
        const fish = this.fishSystem.getFish();
        
        // Find fish that can detect the food
        fish.forEach(f => {
          if (f.isNearFood(foodPosition)) {
            f.setFoodTarget(foodPosition);
          }
        });
      }
    });
  }

  private setupEventListeners(): void {
    // Window resize
    window.addEventListener('resize', () => {
      this.renderer.onResize();
      this.camera.onResize();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', event => {
      this.events.emit('keyboard', { key: event.key, type: 'keydown' });
    });

    // Mouse events are handled by individual systems
  }

  private start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = currentTime;
    this.frameCount++;

    try {
      // Update all systems
      this.update(deltaTime);

      // Render frame
      this.render();

      // Continue loop
      requestAnimationFrame(this.gameLoop);
    } catch (error) {
      console.error('❌ Error in game loop:', error);
      this.stop();
    }
  };

  private update(deltaTime: number): void {
    // Update physics
    if (this.physics) {
      this.physics.update(deltaTime);
    }

    // Update camera
    this.camera.update(deltaTime);

    // Update game systems
    this.fishSystem.update(deltaTime);
    this.environmentSystem.update(deltaTime);
    this.effectsSystem.update(deltaTime);
    this.foodSystem.update(deltaTime);
    this.gameLogic.update(deltaTime);
    this.uiSystem.update(deltaTime);
    
    // Update food-fish interactions
    this.updateFoodFishInteractions();
  }

  private render(): void {
    this.renderer.render(this.camera.getCamera());
  }

  public stop(): void {
    this.isRunning = false;
  }
  
  private updateFoodFishInteractions(): void {
    const foodParticles = this.foodSystem.getFoodParticles();
    const fish = this.fishSystem.getFish();
    
    // Check for fish-food interactions
    foodParticles.forEach(particle => {
      if (particle.eaten) return;
      
      fish.forEach(f => {
        const distanceToFood = f.getMesh().position.distanceTo(particle.mesh.position);
        
        // If fish is very close to food, eat it
        if (distanceToFood < 0.3 && !particle.eaten) {
          const nutritionGained = this.foodSystem.eatFoodParticle(particle);
          if (nutritionGained > 0) {
            // Update fish stats through events
            this.events.emitImmediate('fishFed', { fishId: f.getId() });
          }
        }
        // If fish can see food but isn't chasing anything, set as target
        else if (distanceToFood <= f.getFoodDetectionRadius() && !f.isChasingFood()) {
          f.setFoodTarget(particle.mesh.position);
        }
      });
    });
  }

  public destroy(): void {
    this.stop();

    // Cleanup all systems (using comprehensive version)
    if (this.fishSystem) this.fishSystem.destroy();
    if (this.environmentSystem) this.environmentSystem.destroy();
    if (this.effectsSystem) this.effectsSystem.destroy();
    if (this.foodSystem) this.foodSystem.destroy();
    if (this.gameLogic) this.gameLogic.destroy();
    if (this.uiSystem) this.uiSystem.destroy();
    
    // Cleanup core systems
    if (this.physics) this.physics.destroy();
    if (this.events) this.events.destroy();
  }

  private detectCapabilities(): Capabilities {
    const capabilities: Capabilities = {
      three: true, // THREE.js is always available as ES module
      cannon: true, // CANNON-ES is always available as ES module
      webgl: this.detectWebGL(),
    };

    return capabilities;
  }

  private detectWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  private hideLoadingScreen(): void {
    const loading = document.getElementById('loading');
    const gameContainer = document.getElementById('game-container');

    if (loading) loading.style.display = 'none';
    if (gameContainer) gameContainer.style.display = 'block';
  }

  private showError(message: string): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = `
        <div class="loading-content">
          <div style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
          <h2>Error</h2>
          <p>${message}</p>
        </div>
      `;
    }
  }

  // Public API for external access
  public getEvents(): EventSystem {
    return this.events;
  }

  public getFishSystem(): FishSystem {
    return this.fishSystem;
  }

  public getRenderer(): Renderer {
    return this.renderer;
  }

  public getCapabilities(): Capabilities {
    return this.capabilities;
  }

  public getFrameCount(): number {
    return this.frameCount;
  }
  
  public getFoodSystem(): FoodSystem {
    return this.foodSystem;
  }
}
