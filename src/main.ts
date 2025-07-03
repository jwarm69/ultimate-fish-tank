import './styles.css';
import { UltimateFishTank } from './core/Engine';

console.log('🚀 Starting Ultimate Fish Tank v2.0...');

// Initialize the game when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('❌ Canvas container not found');
    return;
  }

  try {
    const game = new UltimateFishTank({
      container,
      enablePhysics: true,
      enableWebGL: true,
      debug: import.meta.env.DEV,
    });

    game.init();

    // Global access for debugging
    if (import.meta.env.DEV) {
      (window as any).game = game;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Ultimate Fish Tank:', error);
  }
});
