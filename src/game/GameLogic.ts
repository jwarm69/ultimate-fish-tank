import * as THREE from 'three';
import { Component, PlayerStats, TankStats } from '../core/types';
import { EventSystem } from '../core/EventSystem';
import { FishSystem } from '../fish/FishSystem';
import { EffectsSystem } from '../effects/EffectsSystem';

export interface GameLogicConfig {
  playerStats: PlayerStats;
  tankStats: TankStats;
  events: EventSystem;
  fishSystem: FishSystem;
  effectsSystem: EffectsSystem;
}

export class GameLogic implements Component {
  private playerStats: PlayerStats;
  private tankStats: TankStats;
  private events: EventSystem;
  private fishSystem: FishSystem;
  private effectsSystem: EffectsSystem;
  private lastStatsUpdate = Date.now();
  private achievements: Map<string, boolean> = new Map();

  constructor(config: GameLogicConfig) {
    this.playerStats = config.playerStats;
    this.tankStats = config.tankStats;
    this.events = config.events;
    this.fishSystem = config.fishSystem;
    this.effectsSystem = config.effectsSystem;
  }

  init(): void {
    this.setupEventListeners();
    this.initializeAchievements();

    console.log('🎮 Game logic initialized');
  }

  private setupEventListeners(): void {
    // Fish-related events
    this.events.on('fishFed', event => {
      this.handleFishFed(event.data?.fishId);
    });

    this.events.on('fishPetted', event => {
      this.handleFishPetted(event.data?.fishId);
    });

    this.events.on('fishDied', event => {
      this.handleFishDied(event.data?.fishId);
    });

    // Tank maintenance events
    this.events.on('tankCleaned', () => {
      this.handleTankCleaned();
    });

    this.events.on('cleanTank', () => {
      this.handleCleanButton();
    });

    // UI events - handle both direct fish feeding and general feed button
    this.events.on('feedFish', event => {
      if (event.data?.fishId) {
        // Specific fish feeding - already handled above
        return;
      } else {
        // General feed button
        this.handleFeedButton();
      }
    });

    this.events.on('addFish', () => {
      this.handleAddFishButton();
    });
  }

  private initializeAchievements(): void {
    const achievementDefinitions = [
      { id: 'first_fish_fed', name: 'First Meal', description: 'Feed your first fish' },
      { id: 'fish_lover', name: 'Fish Lover', description: 'Feed fish 10 times' },
      { id: 'aquarium_master', name: 'Aquarium Master', description: 'Feed fish 100 times' },
      { id: 'clean_keeper', name: 'Clean Keeper', description: 'Clean the tank 5 times' },
      { id: 'pet_whisperer', name: 'Pet Whisperer', description: 'Pet fish 25 times' },
      { id: 'multi_fish', name: 'Community Builder', description: 'Have 3 or more fish' },
      { id: 'coin_collector', name: 'Coin Collector', description: 'Earn 1000 coins' },
    ];

    achievementDefinitions.forEach(achievement => {
      this.achievements.set(achievement.id, false);
    });
  }

  private handleFishFed(fishId?: string): void {
    // Award coins for feeding
    const coinsEarned = 5 + Math.floor(Math.random() * 5);
    this.playerStats.coins += coinsEarned;
    this.playerStats.totalCoinsEarned += coinsEarned;
    this.playerStats.achievements.fishFed++;

    this.events.emit('coinsEarned', { amount: coinsEarned, reason: 'Fed fish' });
    this.events.emit('message', { text: `🍽️ Fish fed! +${coinsEarned} coins` });

    this.checkAchievements();
    this.updatePlayerLevel();
  }

  private handleFishPetted(fishId?: string): void {
    // Award coins for petting
    const coinsEarned = 3 + Math.floor(Math.random() * 3);
    this.playerStats.coins += coinsEarned;
    this.playerStats.totalCoinsEarned += coinsEarned;
    this.playerStats.achievements.fishPetted++;

    this.events.emit('coinsEarned', { amount: coinsEarned, reason: 'Petted fish' });
    this.events.emit('message', { text: `🤚 Fish petted! +${coinsEarned} coins` });

    this.checkAchievements();
    this.updatePlayerLevel();
  }

  private handleFishDied(fishId?: string): void {
    this.events.emit('message', { text: '😢 A fish has died. Take better care of your aquarium!' });

    // Create mourning effect
    this.effectsSystem.createParticle({
      position: new THREE.Vector3(0, 0, 0),
      life: 3000,
      size: 0.1,
      color: new THREE.Color(0x666666),
      opacity: 0.5,
    });
  }

  private handleTankCleaned(): void {
    this.tankStats.cleanliness = 100;
    this.tankStats.lastCleaningUpdate = Date.now();
    this.playerStats.achievements.tanksCleaned++;

    // Clear dirt particles
    this.tankStats.dirtParticles.forEach(particle => {
      if (particle.parent) {
        particle.parent.remove(particle);
      }
    });
    this.tankStats.dirtParticles = [];

    // Award coins for cleaning
    const coinsEarned = 10 + Math.floor(Math.random() * 10);
    this.playerStats.coins += coinsEarned;
    this.playerStats.totalCoinsEarned += coinsEarned;

    this.events.emit('coinsEarned', { amount: coinsEarned, reason: 'Cleaned tank' });
    this.events.emit('message', { text: `🧹 Tank cleaned! +${coinsEarned} coins` });

    this.checkAchievements();
    this.updatePlayerLevel();
  }

  private handleFeedButton(): void {
    const selectedFish = this.fishSystem.getSelectedFish();
    if (selectedFish) {
      this.events.emit('feedFish', { fishId: selectedFish.getId() });
    } else {
      // Feed all fish
      const fish = this.fishSystem.getFish();
      if (fish.length > 0) {
        fish.forEach(f => {
          this.events.emit('feedFish', { fishId: f.getId() });
        });
      } else {
        this.events.emit('message', { text: '⚠️ No fish to feed!' });
      }
    }
  }

  private handleCleanButton(): void {
    if (this.playerStats.coins >= 20) {
      this.playerStats.coins -= 20;
      this.events.emit('tankCleaned');
      this.events.emit('cleaningEffect');
    } else {
      this.events.emit('message', { text: '⚠️ Not enough coins to clean! (Cost: 20 coins)' });
    }
  }

  private handleAddFishButton(): void {
    const fishCost = 50 + this.fishSystem.getFishCount() * 25;

    if (this.playerStats.coins >= fishCost) {
      this.playerStats.coins -= fishCost;
      const newFish = this.fishSystem.addRandomFish();
      this.events.emit('message', { text: `🐠 New fish added! (-${fishCost} coins)` });
      this.checkAchievements();
    } else {
      this.events.emit('message', {
        text: `⚠️ Not enough coins for a new fish! (Cost: ${fishCost} coins)`,
      });
    }
  }

  private checkAchievements(): void {
    const newAchievements: string[] = [];

    // First fish fed
    if (!this.achievements.get('first_fish_fed') && this.playerStats.achievements.fishFed >= 1) {
      this.achievements.set('first_fish_fed', true);
      newAchievements.push('First Meal');
    }

    // Fish lover
    if (!this.achievements.get('fish_lover') && this.playerStats.achievements.fishFed >= 10) {
      this.achievements.set('fish_lover', true);
      newAchievements.push('Fish Lover');
    }

    // Aquarium master
    if (!this.achievements.get('aquarium_master') && this.playerStats.achievements.fishFed >= 100) {
      this.achievements.set('aquarium_master', true);
      newAchievements.push('Aquarium Master');
    }

    // Clean keeper
    if (!this.achievements.get('clean_keeper') && this.playerStats.achievements.tanksCleaned >= 5) {
      this.achievements.set('clean_keeper', true);
      newAchievements.push('Clean Keeper');
    }

    // Pet whisperer
    if (!this.achievements.get('pet_whisperer') && this.playerStats.achievements.fishPetted >= 25) {
      this.achievements.set('pet_whisperer', true);
      newAchievements.push('Pet Whisperer');
    }

    // Multi fish
    if (!this.achievements.get('multi_fish') && this.fishSystem.getFishCount() >= 3) {
      this.achievements.set('multi_fish', true);
      newAchievements.push('Community Builder');
    }

    // Coin collector
    if (!this.achievements.get('coin_collector') && this.playerStats.totalCoinsEarned >= 1000) {
      this.achievements.set('coin_collector', true);
      newAchievements.push('Coin Collector');
    }

    // Announce new achievements
    newAchievements.forEach(achievement => {
      this.events.emit('achievementUnlocked', { name: achievement });
      this.events.emit('message', { text: `🏆 Achievement unlocked: ${achievement}!` });

      // Award bonus coins for achievements
      const bonusCoins = 50;
      this.playerStats.coins += bonusCoins;
      this.playerStats.totalCoinsEarned += bonusCoins;
      this.events.emit('coinsEarned', { amount: bonusCoins, reason: 'Achievement bonus' });
    });
  }

  private updatePlayerLevel(): void {
    const requiredCoins = this.playerStats.level * 100;
    if (this.playerStats.totalCoinsEarned >= requiredCoins) {
      this.playerStats.level++;
      this.events.emit('levelUp', { newLevel: this.playerStats.level });
      this.events.emit('message', {
        text: `🎆 Level up! You are now level ${this.playerStats.level}!`,
      });

      // Award level up bonus
      const bonusCoins = this.playerStats.level * 25;
      this.playerStats.coins += bonusCoins;
      this.playerStats.totalCoinsEarned += bonusCoins;
      this.events.emit('coinsEarned', { amount: bonusCoins, reason: 'Level up bonus' });
    }
  }

  update(deltaTime: number): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastStatsUpdate;

    // Update tank stats every 30 seconds
    if (timeSinceLastUpdate > 30000) {
      this.updateTankStats();
      this.lastStatsUpdate = now;
    }

    // Monitor fish health for warnings
    this.monitorFishHealth();
  }

  private updateTankStats(): void {
    const now = Date.now();
    const minutesSinceClean = (now - this.tankStats.lastCleaningUpdate) / (1000 * 60);

    // Cleanliness decreases over time
    this.tankStats.cleanliness = Math.max(0, this.tankStats.cleanliness - minutesSinceClean * 0.5);

    // Temperature fluctuates slightly
    const tempChange = (Math.random() - 0.5) * 0.5;
    this.tankStats.temperature = Math.max(
      20,
      Math.min(28, this.tankStats.temperature + tempChange)
    );
    this.tankStats.lastTempUpdate = now;

    // Emit updates
    this.events.emit('tankStatsUpdated', {
      cleanliness: this.tankStats.cleanliness,
      temperature: this.tankStats.temperature,
    });
  }

  private monitorFishHealth(): void {
    const fish = this.fishSystem.getFish();
    let needsAttention = false;

    fish.forEach(f => {
      const data = f.getData();
      if (data.health < 30 || data.hunger < 20) {
        needsAttention = true;
      }
    });

    if (needsAttention) {
      this.events.emit('fishNeedAttention', { urgency: 'high' });
    }
  }

  getPlayerStats(): PlayerStats {
    return { ...this.playerStats };
  }

  getTankStats(): TankStats {
    return { ...this.tankStats };
  }

  getAchievements(): Map<string, boolean> {
    return new Map(this.achievements);
  }

  destroy(): void {
    // Clean up any timers or intervals if needed
  }
}
