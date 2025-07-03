import { Object3D, Vector3, Color } from 'three';

// Core engine types
export interface EngineConfig {
  container: HTMLElement;
  enablePhysics?: boolean;
  enableWebGL?: boolean;
  debug?: boolean;
}

export interface Capabilities {
  three: boolean;
  cannon: boolean;
  webgl: boolean;
}

// Fish related types
export type FishPersonality =
  | 'playful'
  | 'shy'
  | 'energetic'
  | 'elegant'
  | 'aggressive'
  | 'wise'
  | 'curious';

export type FishSpecies =
  | 'tropical'
  | 'goldfish'
  | 'betta'
  | 'tetra'
  | 'angelfish'
  | 'clownfish'
  | 'tang'
  | 'koi'
  | 'rainbow'
  | 'discus';

export interface FishStats {
  health: number;
  happiness: number;
  hunger: number;
}

export interface FishConfig {
  bodyColor: Color;
  finColor: Color;
  size: number;
  speed: number;
  turnSpeed: number;
  iridescent?: boolean;
  translucent?: boolean;
}

export interface FishData extends FishStats {
  species: FishSpecies;
  personality: FishPersonality;
  config: FishConfig;
  age: string;
  lastFed?: number;
  lastPetted?: number;
  lastInteraction?: number;
  consecutivePets?: number;
  needsAttentionGlow?: boolean;
  originalSpeed?: number;
  originalEmissive?: number;
}

// Game state types
export interface PlayerStats {
  coins: number;
  level: number;
  totalCoinsEarned: number;
  achievements: {
    fishFed: number;
    tanksCleaned: number;
    fishPetted: number;
    consecutiveDaysActive: number;
  };
}

export interface TankStats {
  cleanliness: number;
  temperature: number;
  lastCleaningUpdate: number;
  lastTempUpdate: number;
  dirtParticles: Object3D[];
}

// Event system types
export interface GameEvent {
  type: string;
  data?: any;
  timestamp: number;
}

export type EventCallback = (event: GameEvent) => void;

// Component types for modular architecture
export interface Component {
  update(deltaTime: number): void;
  destroy?(): void;
}

export interface Updateable {
  update(deltaTime: number): void;
}

export interface Renderable {
  render(): void;
}

// Particle system types
export interface ParticleConfig {
  position: Vector3;
  velocity?: Vector3;
  life: number;
  size: number;
  color: Color;
  opacity: number;
}

// UI types
export interface UIElement {
  show(): void;
  hide(): void;
  update?(data: any): void;
}

// Animation types
export interface AnimationConfig {
  duration: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
}

// Fish AI behavior types
export interface BehaviorState {
  seeking?: boolean;
  target?: Vector3;
  speed: number;
  direction: Vector3;
}

export interface Movement3D {
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
}
