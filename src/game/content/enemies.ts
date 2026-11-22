import type { CombatantSnapshot, CombatStatusEffect } from '../../core/types';

export interface EnemyTemplate {
  readonly enemyId: string;
  readonly name: string;
  readonly description: string;
  readonly hp: number;
  readonly spiritEnergy: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
  readonly critChance: number;
  readonly critDamage: number;
  readonly evasion: number;
  readonly skillIds: readonly string[];
  readonly lootTable: readonly { readonly itemId: string; readonly chance: number; readonly min: number; readonly max: number }[];
  readonly spiritStoneReward: [number, number];
  readonly expReward: number;
}

export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  wild_beast: {
    enemyId: 'wild_beast',
    name: 'Huyết Lang Dã Thú',
    description: 'Con lang mắt đỏ hoang dã, thình lình vồ tới từ bụi cây.',
    hp: 55,
    spiritEnergy: 10,
    attack: 10,
    defense: 3,
    speed: 11,
    critChance: 0.1,
    critDamage: 1.4,
    evasion: 0.05,
    skillIds: ['bite'],
    lootTable: [
      { itemId: 'linh_thao_huyet.sam', chance: 0.5, min: 1, max: 2 },
      { itemId: 'kho_luong', chance: 0.3, min: 1, max: 1 },
    ],
    spiritStoneReward: [4, 10],
    expReward: 22,
  },
  bandit: {
    enemyId: 'bandit',
    name: 'Mạo Phiên Đạo Tu',
    description: 'Tên tu sĩ phi pháp cướp đường, gươm đã mài sắc.',
    hp: 70,
    spiritEnergy: 25,
    attack: 12,
    defense: 5,
    speed: 9,
    critChance: 0.08,
    critDamage: 1.5,
    evasion: 0.04,
    skillIds: ['slash'],
    lootTable: [
      { itemId: 'kiem_sat_thu', chance: 0.2, min: 1, max: 1 },
      { itemId: 'linh_thach_ha_pham', chance: 0.8, min: 2, max: 8 },
    ],
    spiritStoneReward: [6, 15],
    expReward: 30,
  },
  blood_cultist: {
    enemyId: 'blood_cultist',
    name: 'Huyết Hà Điện Sự Giả',
    description: 'Người tế lễ áo đỏ, quanh thân sóng mờ khí huyết.',
    hp: 85,
    spiritEnergy: 60,
    attack: 14,
    defense: 6,
    speed: 10,
    critChance: 0.1,
    critDamage: 1.6,
    evasion: 0.06,
    skillIds: ['blood_drain'],
    lootTable: [
      { itemId: 'huyet_khi_dan', chance: 0.4, min: 1, max: 1 },
      { itemId: 'linh_thao_nguyet_hoa', chance: 0.35, min: 1, max: 1 },
    ],
    spiritStoneReward: [15, 30],
    expReward: 45,
  },
  black_knight: {
    enemyId: 'black_knight',
    name: 'Hắc Diện Kiếm Khách',
    description: 'Võ công sharply, mỗi nhát kiếm đều tìm điểm yếu.',
    hp: 110,
    spiritEnergy: 50,
    attack: 18,
    defense: 8,
    speed: 14,
    critChance: 0.15,
    critDamage: 1.7,
    evasion: 0.1,
    skillIds: ['thrust'],
    lootTable: [
      { itemId: 'kiem_sat_thu', chance: 0.5, min: 1, max: 1 },
      { itemId: 'thu_menh_phu', chance: 0.15, min: 1, max: 1 },
    ],
    spiritStoneReward: [25, 45],
    expReward: 70,
  },
};

export function makeEnemy(template: EnemyTemplate, seedOffset: number): CombatantSnapshot {
  const variance = ((seedOffset * 37) % 11) - 5;
  return {
    id: `enemy_${template.enemyId}`,
    name: template.name,
    isPlayer: false,
    hp: template.hp + variance,
    maxHp: template.hp + variance,
    spiritEnergy: template.spiritEnergy,
    maxSpiritEnergy: template.spiritEnergy,
    attack: template.attack + (variance > 0 ? 1 : 0),
    defense: template.defense,
    speed: template.speed,
    critChance: template.critChance,
    critDamage: template.critDamage,
    evasion: template.evasion,
    effects: [],
  };
}

export function makeStatusEffect(id: string, name: string, remainingTurns: number, magnitude: number): CombatStatusEffect {
  return { id, name, remainingTurns, magnitude };
}
