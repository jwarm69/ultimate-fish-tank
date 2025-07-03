import { GameEvent, EventCallback, Component } from './types';

export class EventSystem implements Component {
  private listeners: Map<string, EventCallback[]> = new Map();
  private eventQueue: GameEvent[] = [];
  private isProcessing = false;

  // Subscribe to an event type
  on(eventType: string, callback: EventCallback): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  // Unsubscribe from an event type
  off(eventType: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit an event (queued for processing)
  emit(eventType: string, data?: any): void {
    const event: GameEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
    };

    this.eventQueue.push(event);
  }

  // Emit an event immediately (synchronous)
  emitImmediate(eventType: string, data?: any): void {
    const event: GameEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
    };

    this.processEvent(event);
  }

  // Process queued events
  update(deltaTime: number): void {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Process all queued events
    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    eventsToProcess.forEach(event => {
      this.processEvent(event);
    });

    this.isProcessing = false;
  }

  private processEvent(event: GameEvent): void {
    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error processing event ${event.type}:`, error);
        }
      });
    }
  }

  // Get all listeners for debugging
  getListeners(): Map<string, EventCallback[]> {
    return new Map(this.listeners);
  }

  // Clear all listeners
  clearAllListeners(): void {
    this.listeners.clear();
  }

  // Clear listeners for a specific event type
  clearListeners(eventType: string): void {
    this.listeners.delete(eventType);
  }

  destroy(): void {
    this.clearAllListeners();
    this.eventQueue = [];
    this.isProcessing = false;
  }
}
