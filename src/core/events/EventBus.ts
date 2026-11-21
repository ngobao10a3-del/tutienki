import type { GameEventMap } from '../types';

export type EventHandler<K extends keyof GameEventMap> = (
  payload: GameEventMap[K],
) => void;

export type UnsubscribeFn = () => void;

/**
 * Pure publish/subscribe EventBus for decoupled system notifications.
 * Does NOT store canonical game state.
 */
export class EventBus {
  private readonly listeners = new Map<
    keyof GameEventMap,
    Set<EventHandler<keyof GameEventMap>>
  >();

  public subscribe<K extends keyof GameEventMap>(
    eventType: K,
    handler: EventHandler<K>,
  ): UnsubscribeFn {
    let bucket = this.listeners.get(eventType);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(eventType, bucket);
    }
    const typedHandler = handler as EventHandler<keyof GameEventMap>;
    bucket.add(typedHandler);

    return () => {
      this.unsubscribe(eventType, handler);
    };
  }

  public unsubscribe<K extends keyof GameEventMap>(
    eventType: K,
    handler: EventHandler<K>,
  ): void {
    const bucket = this.listeners.get(eventType);
    if (!bucket) {
      return;
    }
    bucket.delete(handler as EventHandler<keyof GameEventMap>);
    if (bucket.size === 0) {
      this.listeners.delete(eventType);
    }
  }

  public publish<K extends keyof GameEventMap>(
    eventType: K,
    payload: GameEventMap[K],
  ): void {
    const bucket = this.listeners.get(eventType);
    if (!bucket || bucket.size === 0) {
      return;
    }
    const snapshotHandlers = Array.from(bucket);
    for (const handler of snapshotHandlers) {
      (handler as EventHandler<K>)(payload);
    }
  }

  public listenerCount<K extends keyof GameEventMap>(eventType: K): number {
    return this.listeners.get(eventType)?.size ?? 0;
  }

  public clear(): void {
    this.listeners.clear();
  }
}
