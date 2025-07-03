import { Component, PlayerStats, TankStats } from '../core/types';
import { EventSystem } from '../core/EventSystem';
import { FishSystem } from '../fish/FishSystem';
import { GameLogic } from '../game/GameLogic';

export interface UISystemConfig {
  events: EventSystem;
  playerStats: PlayerStats;
  tankStats: TankStats;
  fishSystem: FishSystem;
  gameLogic: GameLogic;
}

export class UISystem implements Component {
  private events: EventSystem;
  private playerStats: PlayerStats;
  private tankStats: TankStats;
  private fishSystem: FishSystem;
  private gameLogic: GameLogic;
  private messageQueue: string[] = [];
  private maxMessages = 5;

  constructor(config: UISystemConfig) {
    this.events = config.events;
    this.playerStats = config.playerStats;
    this.tankStats = config.tankStats;
    this.fishSystem = config.fishSystem;
    this.gameLogic = config.gameLogic;
  }

  init(): void {
    this.setupEventListeners();
    this.setupButtonHandlers();
    this.initializeUI();

    console.log('📺 UI system initialized');
  }

  private setupEventListeners(): void {
    // Game state updates
    this.events.on('coinsEarned', event => {
      this.updateCoinsDisplay();
    });

    this.events.on('levelUp', event => {
      this.updateLevelDisplay();
    });

    this.events.on('fishCountChanged', event => {
      this.updateFishCountDisplay();
    });

    this.events.on('tankStatsUpdated', event => {
      this.updateTankStatsDisplay();
    });

    // Fish selection
    this.events.on('fishSelected', event => {
      this.showFishDetails(event.data?.fish);
    });

    this.events.on('fishDeselected', () => {
      this.hideFishDetails();
    });

    // Messages
    this.events.on('message', event => {
      this.addMessage(event.data?.text || 'Unknown message');
    });

    // Achievements
    this.events.on('achievementUnlocked', event => {
      this.showAchievementNotification(event.data?.name);
    });
  }

  private setupButtonHandlers(): void {
    // Action buttons
    const feedBtn = document.getElementById('feed-btn');
    const cleanBtn = document.getElementById('clean-btn');
    const addFishBtn = document.getElementById('add-fish-btn');
    const infoBtn = document.getElementById('info-btn');

    feedBtn?.addEventListener('click', () => {
      this.events.emit('feedButton');
    });

    cleanBtn?.addEventListener('click', () => {
      this.events.emit('cleanButton');
    });

    addFishBtn?.addEventListener('click', () => {
      this.events.emit('addFishButton');
    });

    infoBtn?.addEventListener('click', () => {
      this.showInfoModal();
    });

    // Fish-specific action buttons
    const feedThisFishBtn = document.getElementById('feed-this-fish');
    const petThisFishBtn = document.getElementById('pet-this-fish');

    feedThisFishBtn?.addEventListener('click', () => {
      const selectedFish = this.fishSystem.getSelectedFish();
      if (selectedFish) {
        this.events.emit('feedFish', { fishId: selectedFish.getId() });
      }
    });

    petThisFishBtn?.addEventListener('click', () => {
      const selectedFish = this.fishSystem.getSelectedFish();
      if (selectedFish) {
        this.events.emit('petFish', { fishId: selectedFish.getId() });
      }
    });
  }

  private initializeUI(): void {
    this.updateCoinsDisplay();
    this.updateLevelDisplay();
    this.updateFishCountDisplay();
    this.updateTankStatsDisplay();
    this.addMessage('🐠 Welcome to your ultimate digital aquarium!');
  }

  private updateCoinsDisplay(): void {
    const coinsElement = document.getElementById('aqua-coins');
    if (coinsElement) {
      coinsElement.textContent = this.playerStats.coins.toString();
    }
  }

  private updateLevelDisplay(): void {
    const levelElement = document.getElementById('player-level');
    if (levelElement) {
      levelElement.textContent = this.playerStats.level.toString();
    }
  }

  private updateFishCountDisplay(): void {
    const fishCountElement = document.getElementById('fish-count');
    if (fishCountElement) {
      fishCountElement.textContent = this.fishSystem.getFishCount().toString();
    }
  }

  private updateTankStatsDisplay(): void {
    const temperatureElement = document.getElementById('temperature');
    const cleanlinessElement = document.getElementById('cleanliness');

    if (temperatureElement) {
      temperatureElement.textContent = `${Math.round(this.tankStats.temperature)}°C`;
    }

    if (cleanlinessElement) {
      cleanlinessElement.textContent = `${Math.round(this.tankStats.cleanliness)}%`;
    }
  }

  private showFishDetails(fishData: any): void {
    const noFishSelected = document.getElementById('no-fish-selected');
    const fishDetails = document.getElementById('fish-details');

    if (noFishSelected && fishDetails) {
      noFishSelected.style.display = 'none';
      fishDetails.style.display = 'block';

      // Update fish info
      this.updateFishInfo(fishData);
    }
  }

  private hideFishDetails(): void {
    const noFishSelected = document.getElementById('no-fish-selected');
    const fishDetails = document.getElementById('fish-details');

    if (noFishSelected && fishDetails) {
      noFishSelected.style.display = 'block';
      fishDetails.style.display = 'none';
    }
  }

  private updateFishInfo(fishData: any): void {
    // Update fish name and personality
    const fishNameElement = document.getElementById('fish-name');
    const fishPersonalityElement = document.getElementById('fish-personality');

    if (fishNameElement) {
      fishNameElement.textContent = `${fishData.species.charAt(0).toUpperCase() + fishData.species.slice(1)} Fish`;
    }

    if (fishPersonalityElement) {
      fishPersonalityElement.textContent = fishData.personality;
      fishPersonalityElement.className = `personality-tag ${fishData.personality}`;
    }

    // Update stat bars
    this.updateStatBar('health', fishData.health);
    this.updateStatBar('happiness', fishData.happiness);
    this.updateStatBar('hunger', fishData.hunger);

    // Update fish info text
    const lastFedElement = document.getElementById('last-fed');
    const lastPettedElement = document.getElementById('last-petted');
    const fishAgeElement = document.getElementById('fish-age');

    if (lastFedElement) {
      lastFedElement.textContent = fishData.lastFed
        ? this.formatTimeSince(fishData.lastFed)
        : 'Never';
    }

    if (lastPettedElement) {
      lastPettedElement.textContent = fishData.lastPetted
        ? this.formatTimeSince(fishData.lastPetted)
        : 'Never';
    }

    if (fishAgeElement) {
      fishAgeElement.textContent = fishData.age || 'Young';
    }
  }

  private updateStatBar(statName: string, value: number): void {
    const fillElement = document.getElementById(`${statName}-fill`);
    const valueElement = document.getElementById(`${statName}-value`);

    if (fillElement) {
      fillElement.style.width = `${Math.max(0, Math.min(100, value))}%`;
    }

    if (valueElement) {
      valueElement.textContent = `${Math.round(value)}%`;
    }
  }

  private formatTimeSince(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  }

  private addMessage(text: string): void {
    this.messageQueue.push(text);

    // Keep only the last N messages
    if (this.messageQueue.length > this.maxMessages) {
      this.messageQueue = this.messageQueue.slice(-this.maxMessages);
    }

    this.updateMessageDisplay();
  }

  private updateMessageDisplay(): void {
    const messageLog = document.getElementById('message-log');
    if (messageLog) {
      messageLog.innerHTML = this.messageQueue
        .map(message => `<div class="message">${message}</div>`)
        .join('');

      // Scroll to bottom
      messageLog.scrollTop = messageLog.scrollHeight;
    }
  }

  private showAchievementNotification(achievementName: string): void {
    // Create achievement popup
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-content">
        <div class="achievement-icon">🏆</div>
        <div class="achievement-text">
          <strong>Achievement Unlocked!</strong>
          <br>${achievementName}
        </div>
      </div>
    `;

    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      zIndex: '9999',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease',
    });

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after delay
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  private showInfoModal(): void {
    // Create modal if it doesn't exist
    let modal = document.getElementById('info-modal');
    if (!modal) {
      modal = this.createInfoModal();
    }

    modal.style.display = 'flex';
  }

  private createInfoModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.id = 'info-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>🐠 Ultimate Fish Tank</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <h3>How to Play</h3>
          <ul>
            <li><strong>🍽️ Feed:</strong> Click feed button or select a fish and feed it individually</li>
            <li><strong>🧹 Clean:</strong> Keep your tank clean for healthy fish (costs 20 coins)</li>
            <li><strong>🐠 Add Fish:</strong> Buy new fish to expand your aquarium</li>
            <li><strong>🤚 Pet:</strong> Click on fish to select them, then pet for happiness</li>
          </ul>
          
          <h3>Stats</h3>
          <ul>
            <li><strong>Health:</strong> Fish die if health reaches 0</li>
            <li><strong>Happiness:</strong> Affects fish behavior and coin rewards</li>
            <li><strong>Hunger:</strong> Feed regularly to keep fish healthy</li>
          </ul>
          
          <h3>Tips</h3>
          <ul>
            <li>Happy and healthy fish earn more coins</li>
            <li>Different fish personalities behave differently</li>
            <li>Clean your tank regularly to prevent disease</li>
            <li>Monitor temperature and cleanliness levels</li>
          </ul>
        </div>
      </div>
    `;

    // Add event listener for close button
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Close on background click
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });

    document.body.appendChild(modal);
    return modal;
  }

  update(deltaTime: number): void {
    // Update UI elements that need real-time updates
    const selectedFish = this.fishSystem.getSelectedFish();
    if (selectedFish) {
      this.updateFishInfo(selectedFish.getData());
    }

    // Update displays
    this.updateCoinsDisplay();
    this.updateLevelDisplay();
    this.updateFishCountDisplay();
    this.updateTankStatsDisplay();
  }

  destroy(): void {
    // Clean up any created modals or notifications
    const modal = document.getElementById('info-modal');
    if (modal) {
      document.body.removeChild(modal);
    }

    // Remove any achievement notifications
    const notifications = document.querySelectorAll('.achievement-notification');
    notifications.forEach(notification => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }
}
