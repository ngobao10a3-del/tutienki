import type {
  AttributeState,
  CanonicalGameState,
  InventoryItem,
  ItemCategory,
  ItemGrade,
} from '../core/types';

export type EffectMap = Readonly<Record<string, number>>;

export interface ItemStatBonus {
  readonly canCot?: number;
  readonly linhLuc?: number;
  readonly thanPhap?: number;
  readonly ngoTinh?: number;
  readonly thanThuc?: number;
  readonly tamCanh?: number;
  readonly daoTam?: number;
  readonly attackFlat?: number;
  readonly defenseFlat?: number;
  readonly hpFlat?: number;
}

export interface ItemDefinition {
  readonly itemId: string;
  readonly name: string;
  readonly category: ItemCategory;
  readonly grade: ItemGrade;
  readonly description: string;
  readonly stackable: boolean;
  readonly equipSlot?: import('../core/types').EquipmentSlot;
  readonly statBonus?: ItemStatBonus;
  readonly effects?: EffectMap;
  readonly price?: number;
  readonly consumable?: boolean;
  readonly questLocked?: boolean;
}

export function emptyEffects(): EffectMap {
  return Object.freeze({});
}

export function sumEffects(entries: readonly EffectMap[]): EffectMap {
  const out: Record<string, number> = {};
  for (const entry of entries) {
    for (const key of Object.keys(entry)) {
      out[key] = (out[key] ?? 0) + (entry[key] ?? 0);
    }
  }
  return out;
}

export function equippedBonus(state: CanonicalGameState): ItemStatBonus {
  const bonus: Record<string, number> = {};
  const equipped = state.inventory.equipped;
  for (const slot of Object.keys(equipped) as import('../core/types').EquipmentSlot[]) {
    const instanceId = equipped[slot];
    if (!instanceId) continue;
    const item = state.inventory.items.find((it) => it.instanceId === instanceId);
    if (!item) continue;
    const def = getItemDefinition(item.itemId);
    if (!def?.statBonus) continue;
    for (const key of Object.keys(def.statBonus) as (keyof ItemStatBonus)[]) {
      const value = def.statBonus[key];
      if (value !== undefined) {
        bonus[key] = (bonus[key] ?? 0) + value;
      }
    }
  }
  return bonus as ItemStatBonus;
}

export function totalAttributes(state: CanonicalGameState): AttributeState {
  const bonus = equippedBonus(state);
  return {
    canCot: state.attributes.canCot + (bonus.canCot ?? 0),
    linhLuc: state.attributes.linhLuc + (bonus.linhLuc ?? 0),
    thanPhap: state.attributes.thanPhap + (bonus.thanPhap ?? 0),
    ngoTinh: state.attributes.ngoTinh + (bonus.ngoTinh ?? 0),
    thanThuc: state.attributes.thanThuc + (bonus.thanThuc ?? 0),
    tamCanh: state.attributes.tamCanh + (bonus.tamCanh ?? 0),
    daoTam: state.attributes.daoTam + (bonus.daoTam ?? 0),
  };
}

export function makeItem(def: ItemDefinition, instanceId: string, quantity: number): InventoryItem {
  return {
    instanceId,
    itemId: def.itemId,
    name: def.name,
    category: def.category,
    grade: def.grade,
    quantity,
    stackable: def.stackable,
    questLocked: def.questLocked ?? false,
    equipSlot: def.equipSlot,
  };
}

const REGISTERED_ITEMS = new Map<string, ItemDefinition>();

export function registerItems(defs: readonly ItemDefinition[]): void {
  for (const def of defs) {
    REGISTERED_ITEMS.set(def.itemId, def);
  }
}

export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return REGISTERED_ITEMS.get(itemId);
}

export function allItemDefinitions(): readonly ItemDefinition[] {
  return Array.from(REGISTERED_ITEMS.values());
}
