/**
 * Deterministic Seeded Pseudo-Random Number Generator (Mulberry32 + FNV-1a seed hash).
 * Replaces direct Math.random() usage across all gameplay engines so outcomes are reproducible.
 */

function hashSeedToUint32(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const normalized = hash >>> 0;
  return normalized === 0 ? 0x6d2b79f5 : normalized;
}

export class RngService {
  private readonly seed: string;
  private state: number;

  constructor(seed: string = 'thuong-huyen-gioi-default', initialState?: number) {
    if (typeof seed !== 'string' || seed.trim().length === 0) {
      throw new Error('RngService seed must be a non-empty string.');
    }
    this.seed = seed;
    if (initialState !== undefined) {
      if (!Number.isInteger(initialState)) {
        throw new Error('RngService initialState must be a finite integer.');
      }
      this.state = initialState >>> 0;
    } else {
      this.state = hashSeedToUint32(seed);
    }
  }

  public getSeed(): string {
    return this.seed;
  }

  public getState(): number {
    return this.state >>> 0;
  }

  public setState(nextState: number): void {
    if (!Number.isInteger(nextState)) {
      throw new Error('RngService state must be a finite integer.');
    }
    this.state = nextState >>> 0;
  }

  /**
   * Returns a deterministic floating point number in [0, 1).
   */
  public nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a deterministic integer in [min, max] (inclusive).
   */
  public nextInt(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error(`RngService.nextInt bounds must be integers (got ${min}, ${max}).`);
    }
    if (min > max) {
      throw new Error(`RngService.nextInt min (${min}) cannot exceed max (${max}).`);
    }
    if (min === max) {
      return min;
    }
    const span = max - min + 1;
    return min + Math.floor(this.nextFloat() * span);
  }

  public chance(probability: number): boolean {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new Error(`RngService.chance probability must be in [0, 1] (got ${probability}).`);
    }
    if (probability === 0) return false;
    if (probability === 1) return true;
    return this.nextFloat() < probability;
  }

  public clone(): RngService {
    return new RngService(this.seed, this.state);
  }
}
