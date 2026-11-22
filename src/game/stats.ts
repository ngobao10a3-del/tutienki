import type {
  AttributeState,
  CanonicalGameState,
  CombatantSnapshot,
  CultivationState,
} from '../core/types';

export const REALM_STAGE_MAX: Record<string, number> = {
  pham_nhan: 3,
  luyen_khi: 9,
  truc_co: 3,
  kim_dan: 3,
  nguyen_anh: 3,
  hoa_than: 3,
  luyen_hu: 3,
  hop_the: 3,
  dai_thua: 3,
  do_kiep: 1,
};

export interface DerivedCombatStats {
  readonly hp: number;
  readonly spiritEnergy: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
  readonly critChance: number;
  readonly critDamage: number;
  readonly evasion: number;
}

export function realmIndex(realm: string): number {
  return REALM_STAGE_MAX.hasOwnProperty(realm)
    ? ['pham_nhan', 'luyen_khi', 'truc_co', 'kim_dan', 'nguyen_anh', 'hoa_than', 'luyen_hu', 'hop_the', 'dai_thua', 'do_kiep'].indexOf(realm)
    : 0;
}

export function maxStageFor(realm: string): number {
  return REALM_STAGE_MAX[realm] ?? 3;
}

export function baseHp(state: Pick<CanonicalGameState, 'attributes' | 'cultivation' | 'character'>): number {
  return Math.round(50 + state.attributes.canCot * 7 + state.cultivation.foundation * 0.8 + realmIndex(state.cultivation.currentRealm) * 30);
}

export function derivedCombatStats(
  state: Pick<CanonicalGameState, 'attributes' | 'cultivation'>,
  hpOverride?: number,
): DerivedCombatStats {
  const realmBonus = realmIndex(state.cultivation.currentRealm);
  return {
    hp: hpOverride ?? baseHp(state as never),
    spiritEnergy: Math.round(20 + state.attributes.thanThuc * 3 + state.attributes.linhLuc * 4 + realmBonus * 10),
    attack: Math.round(6 + state.attributes.canCot * 1.6 + state.attributes.linhLuc * 0.6 + realmBonus * 4),
    defense: Math.round(3 + state.attributes.thanPhap * 0.5 + state.cultivation.foundation * 0.12),
    speed: Math.round(6 + state.attributes.thanPhap * 0.8),
    critChance: 0.05 + state.attributes.daoTam * 0.004,
    critDamage: 1.5 + state.attributes.daoTam * 0.01,
    evasion: 0.03 + state.attributes.thanPhap * 0.003,
  };
}

export function playerCombatant(state: CanonicalGameState, hpOverride?: number): CombatantSnapshot {
  const s = derivedCombatStats(state, hpOverride);
  return {
    id: 'player',
    name: state.character.name,
    isPlayer: true,
    hp: Math.max(1, Math.round(s.hp)),
    maxHp: Math.round(s.hp),
    spiritEnergy: s.spiritEnergy,
    maxSpiritEnergy: s.spiritEnergy,
    attack: s.attack,
    defense: s.defense,
    speed: s.speed,
    critChance: s.critChance,
    critDamage: s.critDamage,
    evasion: s.evasion,
    effects: [],
  };
}

export function expRequiredFor(state: CultivationState): number {
  return 40 + realmIndex(state.currentRealm) * 60 + state.currentStage * 35;
}

export function applyXpGain(attributes: AttributeState, exp: number): { attributes: AttributeState; points: number } {
  const points = Math.floor(exp / 40);
  if (points <= 0) return { attributes, points: 0 };
  return {
    attributes: { ...attributes, canCot: attributes.canCot + points },
    points,
  };
}
