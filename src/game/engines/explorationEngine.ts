import type { ActionHandler, CanonicalGameState } from '../../core/types';
import { GamePatchBuilder } from '../GamePatchBuilder';
import { LOCATIONS } from '../content/world';
import { EVENTS, getEvent } from '../content/story';
import { QUEST_DEFINITIONS } from '../content/quests';
import { startCombat } from './combatEngine';
import { ENEMY_TEMPLATES } from '../content/enemies';
import { addItemToInventory, removeItemByInstance } from './inventoryEngine';
import { getItemDefinition } from '../effects';

export function buildExplorationHandlers(): readonly ActionHandler<any>[] {
  return [travelHandler, exploreHandler, interactHandler];
}

function availableEncounters(locationId: string, state: CanonicalGameState): readonly string[] {
  const location = LOCATIONS.find((loc) => loc.locationId === locationId);
  if (!location) return [];
  return location.encounterTable.filter((encId) => {
    const event = EVENTS[encId];
    if (!event) return false;
    if (event.unique && state.narrative.completedUniqueEventIds.includes(encId)) return false;
    const cooldown = state.narrative.eventCooldowns[encId];
    if (cooldown !== undefined && cooldown > state.world.time.totalDays) return false;
    return true;
  });
}

const travelHandler: ActionHandler<any> = {
  actionType: 'travel',
  allowedDomains: ['world', 'narrative', 'combat', 'causal', 'quests'],
  handle: (action, ctx) => {
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);
    const target = LOCATIONS.find((loc) => loc.locationId === action.payload.destinationLocationId);

    if (!target) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'LOCATION_NOT_FOUND', message: 'Địa điểm không tồn tại.' } };
    }
    if (state.world.currentLocationId === target.locationId) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'ALREADY_HERE', message: 'Bạn đang ở đây rồi.' } };
    }
    if (target.unlockFlag && !state.world.worldFlags[target.unlockFlag]) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'LOCATION_LOCKED', message: `${target.name} chưa được mở khóa.` } };
    }

    let combat = state.combat;
    let pendingEventIds = state.narrative.pendingEventIds;
    const roll = ctx.nextFloat();
    if (roll < 0.3 && target.encounterTable.some((e) => ENEMY_TEMPLATES.hasOwnProperty(e === 'enc_wild_beast' ? 'wild_beast' : e === 'enc_bandit_ambush' ? 'bandit' : e === 'enc_blood_ritual' ? 'blood_cultist' : e === 'enc_lost_disciple' ? 'black_knight' : ''))) {
      const enemyId = target.encounterTable.includes('enc_wild_beast')
        ? 'wild_beast'
        : target.encounterTable.includes('enc_bandit_ambush')
          ? 'bandit'
          : 'blood_cultist';
      const result = startCombat(state, `travel_${Date.now()}`, enemyId, ctx.nextInt(1, 1000));
      combat = result.combat;
    } else {
      pendingEventIds = [...pendingEventIds, ...availableEncounters(target.locationId, state)];
    }

    const patch = builder
      .worldTime(target.travelDays)
      .world({
        currentLocationId: target.locationId,
        currentRegionId: target.regionId,
        unlockedLocationIds: state.world.unlockedLocationIds.includes(target.locationId)
          ? state.world.unlockedLocationIds
          : [...state.world.unlockedLocationIds, target.locationId],
      })
      .combat(combat)
      .narrative({ ...state.narrative, pendingEventIds })
      .logEvent(`[Du hành] Đã tới ${target.name} sau ${target.travelDays} ngày.`)
      .build();

    return { ok: true, patch, summary: `Đã tới ${target.name}.` };
  },
};

const exploreHandler: ActionHandler<any> = {
  actionType: 'explore',
  allowedDomains: ['world', 'narrative', 'inventory', 'combat', 'relationships', 'quests', 'causal', 'character'],
  handle: (action, ctx) => {
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);
    const location = LOCATIONS.find((loc) => loc.locationId === state.world.currentLocationId);

    if (!location) {
      return { ok: false, error: { category: 'SYSTEM_ERROR', code: 'LOCATION_UNKNOWN', message: 'Vị trí hiện tại không xác định.' } };
    }

    const encounters = availableEncounters(location.locationId, state);
    const notes: string[] = [];
    let nextInventory = state.inventory;
    let combat = state.combat;
    let pendingEventIds = state.narrative.pendingEventIds;
    let relationships = state.relationships;
    let worldFlags = state.world.worldFlags;
    let quests = state.quests;

    if (encounters.length > 0 && ctx.nextFloat() < 0.75) {
      const roll = ctx.nextInt(0, encounters.length - 1);
      const picked = encounters[roll];
      pendingEventIds = [...pendingEventIds, picked];
      notes.push(`Gặp sự kiện: ${getEvent(picked)?.title ?? picked}`);
    } else {
      const foundSpiritStones = ctx.nextInt(1, 8);
      nextInventory = { ...nextInventory, spiritStones: nextInventory.spiritStones + foundSpiritStones };
      notes.push(`Nhặt được ${foundSpiritStones} linh thạch.`);
      if (ctx.nextFloat() < 0.3) {
        const herb = getItemDefinition('linh_thao_huyet_sam');
        if (herb) {
          nextInventory = addItemToInventory(nextInventory, herb, 1);
          notes.push('Tìm thấy 1 Huyết Sam Linh Thảo.');
        }
      }
    }

    // Auto-accept available quests whose questGiverFlag is set and player is at location
    for (const qdef of QUEST_DEFINITIONS) {
      if (!qdef.questGiverFlag) continue;
      if (!worldFlags[qdef.questGiverFlag]) continue;
      if (quests.activeQuestIds.includes(qdef.questId) || quests.completedQuestIds.includes(qdef.questId)) continue;
      const qrecord = {
        id: qdef.questId,
        title: qdef.title,
        type: qdef.type,
        status: 'active' as const,
        objectives: qdef.objectives.map((o) => ({ ...o })),
        relatedNpcId: qdef.relatedNpcId,
        relatedLocationId: qdef.relatedLocationId,
        deadlineDay: qdef.deadlineDays ? state.world.time.totalDays + qdef.deadlineDays : undefined,
      };
      quests = {
        ...quests,
        quests: { ...quests.quests, [qdef.questId]: qrecord },
        activeQuestIds: [...quests.activeQuestIds, qdef.questId],
      };
      notes.push(`Nhận nhiệm vụ: ${qdef.title}`);
    }

    const patch = builder
      .worldTime(1)
      .inventory(nextInventory)
      .combat(combat)
      .narrative({ ...state.narrative, pendingEventIds })
      .relationships(relationships)
      .quests(quests)
      .world({ worldFlags })
      .logEvent(`[Khám phá] ${location.name}: ${notes.join(' ')}`)
      .build();

    return { ok: true, patch, summary: notes.join(' ') || 'Không có gì đặc biệt xảy ra.' };
  },
};

const interactHandler: ActionHandler<any> = {
  actionType: 'interact',
  allowedDomains: ['narrative', 'relationships', 'world', 'inventory', 'quests', 'causal', 'character'],
  handle: (action, ctx) => {
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);
    const { targetType, targetId, interactionType } = action.payload;

    if (targetType === 'npc') {
      const npc = state.relationships.npcs[targetId];
      if (!npc) {
        return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'NPC_NOT_FOUND', message: 'Không tìm thấy NPC này ở đây.' } };
      }
      const relationship = { ...npc.relationship };
      switch (interactionType) {
        case 'talk':
          relationship.trust = Math.min(100, relationship.trust + 3);
          relationship.affinity = Math.min(100, relationship.affinity + 2);
          break;
        case 'gift':
          relationship.affinity = Math.min(100, relationship.affinity + 8);
          break;
        case 'threaten':
          relationship.hostility = Math.min(100, relationship.hostility + 15);
          relationship.trust = Math.max(-100, relationship.trust - 10);
          break;
        default:
          break;
      }
      const memory = {
        id: `mem_${state.world.time.totalDays}_${npc.memories.length + 1}`,
        day: state.world.time.totalDays,
        summary: `Bạn đã ${interactionType === 'talk' ? 'trò chuyện' : interactionType === 'gift' ? 'tặng quà' : 'doạ nạt'} với ${npc.name}.`,
        impact: interactionType === 'threaten' ? ('negative' as const) : ('positive' as const),
      };
      const patch = builder
        .worldTime(1)
        .relationships({
          ...state.relationships,
          npcs: {
            ...state.relationships.npcs,
            [targetId]: { ...npc, relationship, memories: [...npc.memories, memory] },
          },
        })
        .world({ worldFlags: { ...state.world.worldFlags, [`flag_met_${targetId.replace('npc_', '')}`]: true } })
        .logEvent(`[Tương tác] ${npc.name}: ${interactionType}.`)
        .recordCausal(action.actionId, 'relationship', 'D1', `Tương tác với ${npc.name}`, `Tương tác ${interactionType}`, [`Mối quan hệ thay đổi`], [targetId])
        .build();

      return { ok: true, patch, summary: `Đã tương tác với ${npc.name}.` };
    }

    if (targetType === 'market') {
      const loc = LOCATIONS.find((l) => l.locationId === state.world.currentLocationId);
      if (!loc || !loc.marketAvailable) {
        return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'MARKET_UNAVAILABLE', message: 'Nơi này không có chợ phiên hay phường thị.' } };
      }

      const isBuy = interactionType === 'buy' || interactionType.startsWith('buy');
      const isSell = interactionType === 'sell' || interactionType.startsWith('sell');

      if (isBuy) {
        const itemId = targetId || (interactionType.includes(':') ? interactionType.split(':')[1] : '');
        const def = getItemDefinition(itemId);
        if (!def || !def.price || def.price <= 0) {
          return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'ITEM_NOT_FOR_SALE', message: 'Vật phẩm này không bày bán tại phường thị.' } };
        }
        const qty = 1;
        const totalCost = def.price * qty;
        if (state.inventory.spiritStones < totalCost) {
          return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'INSUFFICIENT_FUNDS', message: `Cần ${totalCost} linh thạch nhưng bạn chỉ có ${state.inventory.spiritStones}.` } };
        }
        const nextInventory = addItemToInventory(
          { ...state.inventory, spiritStones: state.inventory.spiritStones - totalCost },
          def,
          qty,
        );
        const patch = builder
          .inventory(nextInventory)
          .logEvent(`[Chợ phiên] Đã mua ${def.name} x${qty} với giá ${totalCost} linh thạch.`)
          .recordCausal(action.actionId, 'character', 'D1', `Mua ${def.name}`, 'Giao dịch chợ phiên', [`Tiêu ${totalCost} linh thạch`])
          .build();
        return { ok: true, patch, summary: `Đã mua ${def.name} (-${totalCost} linh thạch).` };
      }

      if (isSell) {
        const item = state.inventory.items.find((it) => it.instanceId === targetId || it.itemId === targetId);
        if (!item) {
          return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'ITEM_NOT_FOUND', message: 'Không tìm thấy vật phẩm cần bán trong túi đồ.' } };
        }
        if (item.questLocked) {
          return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'ITEM_QUEST_LOCKED', message: 'Vật phẩm nhiệm vụ không thể đem bán.' } };
        }
        const def = getItemDefinition(item.itemId);
        const sellPrice = Math.max(1, Math.floor((def?.price ?? 2) * 0.5));
        const nextInventory = removeItemByInstance(
          { ...state.inventory, spiritStones: state.inventory.spiritStones + sellPrice },
          item.instanceId,
          1,
        );
        const patch = builder
          .inventory(nextInventory)
          .logEvent(`[Chợ phiên] Đã bán 1 ${item.name} thu về ${sellPrice} linh thạch.`)
          .recordCausal(action.actionId, 'character', 'D1', `Bán ${item.name}`, 'Giao dịch chợ phiên', [`Thu ${sellPrice} linh thạch`])
          .build();
        return { ok: true, patch, summary: `Đã bán 1 ${item.name} (+${sellPrice} linh thạch).` };
      }

      return { ok: true, patch: builder.build(), summary: `Phường thị tại ${loc.name} tấp nập tiếng rao mua bán đan dược và linh thảo.` };
    }

    return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'INTERACT_UNAVAILABLE', message: `Không thể tương tác với ${targetId} theo cách này.` } };
  },
};
