/**
 * Canonical Game State type definitions for "Hệ Thống Tu Tiên Ký" (Thương Huyền Giới).
 * Strict TypeScript types covering all 10 Canonical State groups + system metadata.
 */

export const REALM_ORDER = [
  'pham_nhan',
  'luyen_khi',
  'truc_co',
  'kim_dan',
  'nguyen_anh',
  'hoa_than',
  'luyen_hu',
  'hop_the',
  'dai_thua',
  'do_kiep',
] as const;

export type RealmId = (typeof REALM_ORDER)[number];

export type CultivationPath =
  | 'kiem_tu'
  | 'the_tu'
  | 'phap_tu'
  | 'dan_tu'
  | 'tran_tu'
  | 'chua_dinh';

export type CharacterGender = 'nam' | 'nu' | 'khac';

export type CharacterHealthStatus =
  | 'khoe_manh'
  | 'nhe_thuong'
  | 'trong_thuong'
  | 'tau_hoa_nhap_ma'
  | 'be_quan'
  | 'tu_vong';

export interface CharacterState {
  readonly id: string;
  readonly name: string;
  readonly age: number;
  readonly lifespan: number;
  readonly gender: CharacterGender;
  readonly origin: string;
  readonly talents: readonly string[];
  readonly status: CharacterHealthStatus;
  readonly realm: RealmId;
  readonly reputation: number;
  readonly flags: Readonly<Record<string, boolean | number | string>>;
}

export interface AttributeState {
  /** Ảnh hưởng tốc độ tu luyện, nền tảng đột phá */
  readonly canCot: number;
  /** Ảnh hưởng năng lực sử dụng pháp thuật */
  readonly linhLuc: number;
  /** Ảnh hưởng né tránh, di chuyển, hành động */
  readonly thanPhap: number;
  /** Ảnh hưởng học công pháp, lĩnh ngộ */
  readonly ngoTinh: number;
  /** Ảnh hưởng phát hiện, nhận biết, kiểm tra tinh thần */
  readonly thanThuc: number;
  /** Ảnh hưởng khả năng chống ảnh hưởng tinh thần */
  readonly tamCanh: number;
  /** Ảnh hưởng các lựa chọn và sự kiện nhân quả */
  readonly daoTam: number;
}

export type BreakthroughOutcome =
  | 'hoan_my'
  | 'thanh_cong'
  | 'khong_on_dinh'
  | 'that_bai';

export interface BreakthroughRecord {
  readonly id: string;
  readonly fromRealm: RealmId;
  readonly fromStage: number;
  readonly toRealm: RealmId;
  readonly toStage: number;
  readonly outcome: BreakthroughOutcome;
  readonly day: number;
}

export interface CultivationState {
  readonly currentRealm: RealmId;
  readonly currentStage: number;
  readonly path: CultivationPath;
  readonly exp: number;
  readonly progress: number;
  readonly progressMax: number;
  readonly speed: number;
  readonly foundation: number;
  readonly comprehension: number;
  readonly bottleneck: boolean;
  readonly activeMethodId: string | null;
  readonly knownMethodIds: readonly string[];
  readonly breakthroughHistory: readonly BreakthroughRecord[];
}

export type ItemCategory =
  | 'dan_duoc'
  | 'vu_khi'
  | 'phap_bao'
  | 'cong_phap'
  | 'linh_thao'
  | 'nguyen_lieu'
  | 'linh_thach'
  | 'bua_chu'
  | 'tran_phap'
  | 'vat_pham_nhiem_vu'
  | 'di_vat';

export type ItemGrade = 'pham' | 'ha' | 'trung' | 'thuong' | 'cuc' | 'tien';

export type EquipmentSlot =
  | 'weapon'
  | 'armor'
  | 'shoes'
  | 'artifact'
  | 'ring'
  | 'talisman';

export interface InventoryItem {
  readonly instanceId: string;
  readonly itemId: string;
  readonly name: string;
  readonly category: ItemCategory;
  readonly grade: ItemGrade;
  readonly quantity: number;
  readonly stackable: boolean;
  readonly questLocked: boolean;
  readonly equipSlot?: EquipmentSlot;
}

export interface InventoryState {
  readonly spiritStones: number;
  readonly maxCapacity: number;
  readonly items: readonly InventoryItem[];
  readonly equipped: Readonly<Record<EquipmentSlot, string | null>>;
}

export interface CombatStatusEffect {
  readonly id: string;
  readonly name: string;
  readonly remainingTurns: number;
  readonly magnitude: number;
}

export interface CombatantSnapshot {
  readonly id: string;
  readonly name: string;
  readonly isPlayer: boolean;
  readonly hp: number;
  readonly maxHp: number;
  readonly spiritEnergy: number;
  readonly maxSpiritEnergy: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
  readonly critChance: number;
  readonly critDamage: number;
  readonly evasion: number;
  readonly effects: readonly CombatStatusEffect[];
}

export type CombatOutcome = 'ongoing' | 'victory' | 'defeat' | 'fled';

export interface CombatState {
  readonly inCombat: boolean;
  readonly encounterId: string | null;
  readonly turn: number;
  readonly turnOrder: readonly string[];
  readonly activeCombatantId: string | null;
  readonly outcome: CombatOutcome | null;
  readonly participants: readonly CombatantSnapshot[];
  readonly log: readonly string[];
}

export type QuestType = 'main' | 'side' | 'exploration' | 'faction' | 'causal';
export type QuestStatus = 'available' | 'active' | 'completed' | 'failed' | 'expired';

export interface QuestObjective {
  readonly id: string;
  readonly description: string;
  readonly current: number;
  readonly required: number;
  readonly completed: boolean;
}

export interface QuestRecord {
  readonly id: string;
  readonly title: string;
  readonly type: QuestType;
  readonly status: QuestStatus;
  readonly objectives: readonly QuestObjective[];
  readonly relatedNpcId?: string;
  readonly relatedLocationId?: string;
  readonly deadlineDay?: number;
}

export interface QuestState {
  readonly activeQuestIds: readonly string[];
  readonly completedQuestIds: readonly string[];
  readonly failedQuestIds: readonly string[];
  readonly quests: Readonly<Record<string, QuestRecord>>;
}

export interface NarrativeLogEntry {
  readonly id: string;
  readonly day: number;
  readonly sceneId: string;
  readonly eventId?: string;
  readonly summary: string;
  readonly choiceText?: string;
}

export interface NarrativeState {
  readonly currentChapterId: string;
  readonly currentSceneId: string;
  readonly activeEventId: string | null;
  readonly pendingEventIds: readonly string[];
  readonly completedUniqueEventIds: readonly string[];
  readonly eventCooldowns: Readonly<Record<string, number>>;
  readonly branchFlags: Readonly<Record<string, boolean | string | number>>;
  readonly recentLog: readonly NarrativeLogEntry[];
}

export interface NpcRelationshipDimensions {
  readonly trust: number;
  readonly affinity: number;
  readonly respect: number;
  readonly hostility: number;
}

export interface NpcMemoryEntry {
  readonly id: string;
  readonly day: number;
  readonly summary: string;
  readonly impact: 'positive' | 'negative' | 'neutral';
}

export interface NpcRecord {
  readonly id: string;
  readonly name: string;
  readonly factionId: string | null;
  readonly locationId: string;
  readonly alive: boolean;
  readonly status: string;
  readonly relationship: NpcRelationshipDimensions;
  readonly memories: readonly NpcMemoryEntry[];
}

export interface FactionRecord {
  readonly id: string;
  readonly name: string;
  readonly power: number;
  readonly reputation: number;
  readonly politicalState: 'hoa_binh' | 'cang_thang' | 'xung_dot' | 'lien_minh' | 'huy_diet';
  readonly active: boolean;
}

export interface RelationshipState {
  readonly npcs: Readonly<Record<string, NpcRecord>>;
  readonly factions: Readonly<Record<string, FactionRecord>>;
}

export interface WorldTime {
  readonly era: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly totalDays: number;
}

export interface WorldState {
  readonly currentRegionId: string;
  readonly currentLocationId: string;
  readonly unlockedLocationIds: readonly string[];
  readonly time: WorldTime;
  readonly activeWorldEventIds: readonly string[];
  readonly worldFlags: Readonly<Record<string, boolean | number | string>>;
}

export type DecisionWeight = 'D1' | 'D2' | 'D3' | 'D4';

export type CausalCategory =
  | 'character'
  | 'relationship'
  | 'karma'
  | 'world'
  | 'narrative'
  | 'faction';

export interface CausalRecord {
  readonly id: string;
  readonly actionId: string;
  readonly category: CausalCategory;
  readonly weight: DecisionWeight;
  readonly day: number;
  readonly locationId: string;
  readonly summary: string;
  readonly decision: string;
  readonly consequences: readonly string[];
  readonly relatedNpcIds: readonly string[];
  readonly relatedFactionIds: readonly string[];
  readonly createdFlags: Readonly<Record<string, boolean | number | string>>;
}

export interface CausalHistory {
  readonly records: readonly CausalRecord[];
  readonly karmaScore: number;
  readonly causalFlags: Readonly<Record<string, boolean | number | string>>;
}

export type StateDomain =
  | 'character'
  | 'cultivation'
  | 'attributes'
  | 'inventory'
  | 'combat'
  | 'quests'
  | 'narrative'
  | 'relationships'
  | 'world'
  | 'causal';

export interface CanonicalGameState {
  readonly schemaVersion: number;
  readonly stateVersion: number;
  readonly seed: string;
  readonly rngState: number;
  readonly processedActionIds: readonly string[];
  readonly lastUpdatedAt: number;
  readonly character: CharacterState;
  readonly cultivation: CultivationState;
  readonly attributes: AttributeState;
  readonly inventory: InventoryState;
  readonly combat: CombatState;
  readonly quests: QuestState;
  readonly narrative: NarrativeState;
  readonly relationships: RelationshipState;
  readonly world: WorldState;
  readonly causal: CausalHistory;
}
