import type { GameStatePatch } from '../core/types';

/**
 * Builds a GameStatePatch with per-domain spread patches.
 * Only non-undefined domains are included, as required by GameStateManager.
 */
export class PatchBuilder {
  private readonly patch: Record<string, unknown> = {};

  public setDomain<K extends keyof GameStatePatch>(domain: K, value: NonNullable<GameStatePatch[K]>): this {
    if (value !== undefined && value !== null) {
      this.patch[domain as string] = value;
    }
    return this;
  }

  public build(): GameStatePatch {
    return this.patch as GameStatePatch;
  }
}
