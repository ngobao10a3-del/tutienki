import type { ActionHandler, CanonicalGameState, GameStatePatch, InventoryItem } from '../../core/types';
import { GamePatchBuilder } from '../GamePatchBuilder';
import { getItemDefinition, sumEffects, makeItem } from '../effects';
import { StateValidator } from '../../core/validation/StateValidator';

export function addItemToInventory(
  inventory: CanonicalGameState['inventory'],
  def: { itemId: string; name: string; category: InventoryItem['category']; grade: InventoryItem['grade']; stackable: boolean; equipSlot?: InventoryItem['equipSlot'] },
  quantity: number,
): CanonicalGameState['inventory'] {
  if (def.stackable) {
    const existing = inventory.items.find((it) => it.itemId === def.itemId);
    if (existing) {
      return {
        ...inventory,
        items: inventory.items.map((it) =>
          it.itemId === def.itemId ? { ...it, quantity: it.quantity + quantity } : it,
        ),
      };
    }
  }
  let counter = inventory.items.filter((it) => it.itemId === def.itemId).length + 1;
  let instanceId = `item_inst_${def.itemId}_${counter}`;
  while (inventory.items.some((it) => it.instanceId === instanceId)) {
    counter += 1;
    instanceId = `item_inst_${def.itemId}_${counter}`;
  }
  return {
    ...inventory,
    items: [...inventory.items, makeItem({ ...def } as never, instanceId, quantity)],
  };
}

export function removeItemByInstance(
  inventory: CanonicalGameState['inventory'],
  instanceId: string,
  quantity: number,
): CanonicalGameState['inventory'] {
  const items: InventoryItem[] = [];
  for (const item of inventory.items) {
    if (item.instanceId === instanceId) {
      if (item.quantity > quantity) {
        items.push({ ...item, quantity: item.quantity - quantity });
      }
    } else {
      items.push(item);
    }
  }
  return { ...inventory, items };
}

export function buildInventoryHandlers(): readonly ActionHandler<any>[] {
  return [useItemHandler, equipItemHandler];
}

const useItemHandler: ActionHandler<any> = {
  actionType: 'use_item',
  allowedDomains: ['inventory', 'character', 'narrative', 'combat', 'causal'],
  handle: (action, ctx) => {
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);
    const { itemInstanceId, quantity, targetId } = action.payload;
    const item = state.inventory.items.find((it) => it.instanceId === itemInstanceId);
    const def = item ? getItemDefinition(item.itemId) : undefined;

    if (!item || !def) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'ITEM_NOT_FOUND', message: 'Vật phẩm không tồn tại trong túi.' } };
    }
    if (!def.consumable) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'ITEM_NOT_CONSUMABLE', message: `${item.name} không thể sử dụng trực tiếp.` } };
    }
    if (item.questLocked) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'ITEM_QUEST_LOCKED', message: 'Vật phẩm nhiệm vụ không thể sử dụng.' } };
    }
    if (item.quantity < quantity) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'ITEM_INSUFFICIENT', message: `Chỉ còn ${item.quantity} ${item.name}.` } };
    }

    const effects = sumEffects([def.effects ?? {}]);
    const nextInventory = removeItemByInstance(state.inventory, itemInstanceId, quantity);
    builder.inventory(nextInventory);

    const notes: string[] = [];
    if (effects.heal) {
      if (state.combat.inCombat && state.combat.activeCombatantId === 'player') {
        const participant = state.combat.participants.find((p) => p.id === 'player');
        if (participant) {
          const healed = Math.min(participant.maxHp, participant.hp + effects.heal);
          builder.combat({
            participants: state.combat.participants.map((p) => (p.id === 'player' ? { ...p, hp: healed } : p)),
          });
          notes.push(`hồi ${healed - participant.hp} HP`);
        }
      } else {
        notes.push(`hồi ${effects.heal} HP (ngoài chiến)`);
      }
    }
    if (effects.spirit) {
      notes.push(`hồi ${effects.spirit} linh lực`);
    }
    if (effects.cultivationSpeed) {
      notes.push(`tốc độ tu luyện +${effects.cultivationSpeed} tạm thời`);
    }
    if (targetId) {
      notes.push(`nhắm vào ${targetId}`);
    }

    builder
      .logEvent(`[Dùng vật phẩm] ${item.name} x${quantity}${notes.length ? ': ' + notes.join(', ') : ''}.`)
      .recordCausal(action.actionId, 'character', 'D1', `Dùng ${item.name}`, 'Sử dụng vật phẩm', notes);

    return { ok: true, patch: builder.build(), summary: `Đã dùng ${item.name} x${quantity}.` };
  },
};

const equipItemHandler: ActionHandler<any> = {
  actionType: 'equip_item',
  allowedDomains: ['inventory', 'character', 'narrative'],
  handle: (action, ctx) => {
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);
    const { itemInstanceId, slot } = action.payload;

    if (itemInstanceId === null) {
      const current = state.inventory.equipped[slot as keyof typeof state.inventory.equipped];
      if (!current) {
        return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'SLOT_EMPTY', message: `Slot ${slot} đang trống.` } };
      }
      builder.inventory({ ...state.inventory, equipped: { ...state.inventory.equipped, [slot]: null } });
      return { ok: true, patch: builder.build(), summary: `Đã tháo trang bị khỏi slot ${slot}.` };
    }

    const item = state.inventory.items.find((it) => it.instanceId === itemInstanceId);
    const def = item ? getItemDefinition(item.itemId) : undefined;
    if (!item || !def) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'ITEM_NOT_FOUND', message: 'Vật phẩm không tồn tại trong túi.' } };
    }
    if (def.equipSlot !== slot) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'SLOT_MISMATCH', message: `${item.name} không thể trang bị vào slot ${slot}.` } };
    }

    builder.inventory({ ...state.inventory, equipped: { ...state.inventory.equipped, [slot]: itemInstanceId } });
    builder.logEvent(`[Trang bị] ${item.name} vào slot ${slot}.`);
    return { ok: true, patch: builder.build(), summary: `Đã trang bị ${item.name}.` };
  },
};

export function validateInventoryState(state: CanonicalGameState): ReturnType<typeof StateValidator.validateState> {
  return StateValidator.validateState(state);
}

export type { GameStatePatch };
