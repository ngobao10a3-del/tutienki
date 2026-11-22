import type { ActionHandler } from '../../core/types';
import { GamePatchBuilder } from '../GamePatchBuilder';
import { QUEST_DEFINITIONS } from '../content/quests';
import { getEvent, type StoryChoice } from '../content/story';
import { addItemToInventory } from './inventoryEngine';
import { getItemDefinition } from '../effects';
import { startCombat } from './combatEngine';
import { ENEMY_TEMPLATES } from '../content/enemies';

export function buildSocialHandlers(): readonly ActionHandler<any>[] {
  return [dialogueHandler, questAcceptHandler, storyChoiceHandler];
}

const dialogueHandler: ActionHandler<any> = {
  actionType: 'dialogue',
  allowedDomains: ['narrative', 'relationships', 'quests', 'world', 'causal'],
  handle: (action, ctx) => {
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);
    const npc = state.relationships.npcs[action.payload.npcId];

    if (!npc) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'NPC_NOT_FOUND', message: 'Không tìm thấy NPC này.' } };
    }
    if (npc.locationId !== state.world.currentLocationId) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'NPC_NOT_HERE', message: `${npc.name} không ở đây.` } };
    }

    const relationship = { ...npc.relationship, trust: Math.min(100, npc.relationship.trust + 2) };
    const memory = {
      id: `mem_${state.world.time.totalDays}_${npc.memories.length + 1}`,
      day: state.world.time.totalDays,
      summary: `Bạn đã nói chuyện với ${npc.name} về ${action.payload.topicId}.`,
      impact: 'neutral' as const,
    };

    const patch = builder
      .worldTime(1)
      .relationships({
        ...state.relationships,
        npcs: { ...state.relationships.npcs, [npc.id]: { ...npc, relationship, memories: [...npc.memories, memory] } },
      })
      .world({ worldFlags: { ...state.world.worldFlags, [`flag_met_${npc.id.replace('npc_', '')}`]: true } })
      .logEvent(`[Đối thoại] ${npc.name} — chủ đề ${action.payload.topicId}.`)
      .build();

    return { ok: true, patch, summary: `${npc.name}: "…" (câu chuyện đang tiếp diễn).` };
  },
};

const questAcceptHandler: ActionHandler<any> = {
  actionType: 'quest_accept',
  allowedDomains: ['quests', 'narrative', 'causal'],
  handle: (action, ctx) => {
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);
    const def = QUEST_DEFINITIONS.find((q) => q.questId === action.payload.questId);

    if (!def) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'QUEST_NOT_FOUND', message: 'Nhiệm vụ không tồn tại.' } };
    }
    if (state.quests.activeQuestIds.includes(def.questId) || state.quests.completedQuestIds.includes(def.questId)) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'QUEST_ALREADY_TAKEN', message: 'Nhiệm vụ này đã được nhận rồi.' } };
    }

    const record = {
      id: def.questId,
      title: def.title,
      type: def.type,
      status: 'active' as const,
      objectives: def.objectives.map((o) => ({ ...o })),
      relatedNpcId: def.relatedNpcId,
      relatedLocationId: def.relatedLocationId,
      deadlineDay: def.deadlineDays ? state.world.time.totalDays + def.deadlineDays : undefined,
    };

    const patch = builder
      .quests({
        ...state.quests,
        quests: { ...state.quests.quests, [def.questId]: record },
        activeQuestIds: [...state.quests.activeQuestIds, def.questId],
      })
      .logEvent(`[Nhiệm vụ] Nhận nhiệm vụ "${def.title}".`)
      .build();

    return { ok: true, patch, summary: `Đã nhận nhiệm vụ: ${def.title}.` };
  },
};

const storyChoiceHandler: ActionHandler<any> = {
  actionType: 'story_choice',
  allowedDomains: ['narrative', 'character', 'cultivation', 'relationships', 'inventory', 'quests', 'world', 'combat', 'causal'],
  handle: (action, ctx) => {
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);
    const event = getEvent(action.payload.eventId);
    if (!event) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'EVENT_NOT_FOUND', message: 'Sự kiện không tồn tại.' } };
    }
    const choice = event.choices.find((c) => c.choiceId === action.payload.choiceId);
    if (!choice) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'CHOICE_NOT_FOUND', message: 'Lựa chọn không tồn tại.' } };
    }

    let nextInventory = state.inventory;
    let nextCombat = state.combat;
    let nextAttributes = state.attributes;
    let nextCultivation = state.cultivation;
    let nextRelationships = state.relationships;
    let nextQuests = state.quests;
    let nextWorldFlags = state.world.worldFlags;
    let nextCharacter = state.character;
    const notes: string[] = [...(choice.consequences ?? [])];

    // Deterministic resolution for chance-based choices
    if (choice.successChance !== undefined) {
      const success = ctx.nextFloat() < choice.successChance;
      notes.length = 0;
      notes.push(...(success ? choice.successConsequences ?? [] : choice.failureConsequences ?? []));
      notes.unshift(success ? '(Thành công)' : '(Thất bại)');
    }

    // Apply consequences deterministically
    for (const note of notes) {
      if (note.includes('canCot +')) {
        nextAttributes = { ...nextAttributes, canCot: nextAttributes.canCot + 1 };
      }
      if (note.includes('daoTam +')) {
        nextAttributes = { ...nextAttributes, daoTam: nextAttributes.daoTam + 1 };
      }
      if (note.includes('Tiến độ tu luyện +')) {
        const amount = parseInt(note.match(/\+(\d+)/)?.[1] ?? '0', 10);
        nextCultivation = { ...nextCultivation, progress: nextCultivation.progress + amount };
      }
      if (note.includes('Mất 5 linh thạch')) {
        if (nextInventory.spiritStones < 5) {
          return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'INSUFFICIENT_STONES', message: 'Không đủ 5 linh thạch.' } };
        }
        nextInventory = { ...nextInventory, spiritStones: nextInventory.spiritStones - 5 };
      }
      if (note.includes('Mất toàn bộ linh thạch')) {
        nextInventory = { ...nextInventory, spiritStones: 0 };
      }
      if (note.includes('Nhận 1-2 Huyết Sam Linh Thảo') || note.includes('Nhận 2 Huyết Sam Linh Thảo') || note.includes('Nhận 2 Huyết Sam Linh Thảo')) {
        const def = getItemDefinition('linh_thao_huyet_sam');
        if (def) nextInventory = addItemToInventory(nextInventory, def, note.includes('1-2') ? ctx.nextInt(1, 2) : 2);
      }
      if (note.includes('trust +5')) {
        const npc = nextRelationships.npcs['npc_tieu_thien'];
        if (npc) {
          nextRelationships = {
            ...nextRelationships,
            npcs: { ...nextRelationships.npcs, 'npc_tieu_thien': { ...npc, relationship: { ...npc.relationship, trust: Math.min(100, npc.relationship.trust + 5) } } },
          };
        }
      }
      if (note.includes('trust +10')) {
        const npc = nextRelationships.npcs['npc_luu_suv'];
        if (npc) {
          nextRelationships = {
            ...nextRelationships,
            npcs: { ...nextRelationships.npcs, 'npc_luu_suv': { ...npc, relationship: { ...npc.relationship, trust: Math.min(100, npc.relationship.trust + 10) } } },
          };
        }
      }
      if (note.includes('Bắt đầu giao chiến') || note.includes('chiến đấu')) {
        const enemyId = event.eventId === 'enc_wild_beast' ? 'wild_beast' : event.eventId === 'enc_blood_ritual' ? 'blood_cultist' : 'bandit';
        if (ENEMY_TEMPLATES[enemyId]) {
          const result = startCombat(state, `event_${event.eventId}`, enemyId, ctx.nextInt(1, 1000));
          nextCombat = result.combat;
        }
      }
      if (note.includes('Mở quest Con Đường Tới Thanh Vân')) {
        const def = QUEST_DEFINITIONS.find((q) => q.questId === 'quest_ch1_duong_toi_thanh_van');
        if (def && !nextQuests.activeQuestIds.includes(def.questId) && !nextQuests.completedQuestIds.includes(def.questId)) {
          const record = {
            id: def.questId,
            title: def.title,
            type: def.type,
            status: 'active' as const,
            objectives: def.objectives.map((o) => ({ ...o })),
            relatedLocationId: def.relatedLocationId,
          };
          nextQuests = {
            ...nextQuests,
            quests: { ...nextQuests.quests, [def.questId]: record },
            activeQuestIds: [...nextQuests.activeQuestIds, def.questId],
          };
        }
      }
      if (note.includes('Huyết Hà Điện thù ngươi')) {
        nextWorldFlags = { ...nextWorldFlags, 'flag_hated_by_huyet_ha': true };
      }
      if (note.includes('Được chú ý của chưởng môn')) {
        nextWorldFlags = { ...nextWorldFlags, 'flag_noticed_by_sect_master': true };
      }
      if (note.includes('Tiểu Thiên ghi nhớ ngươi')) {
        nextWorldFlags = { ...nextWorldFlags, 'flag_met_tieu_thien': true };
      }
    }

    // Progress narrative
    const completedUnique = event.unique ? [...state.narrative.completedUniqueEventIds, event.eventId] : state.narrative.completedUniqueEventIds;
    const cooldowns = { ...state.narrative.eventCooldowns };
    if (event.cooldownDays) {
      cooldowns[event.eventId] = state.world.time.totalDays + event.cooldownDays;
    }
    const pendingEventIds = state.narrative.pendingEventIds.filter((id) => id !== event.eventId);
    if (choice.nextEventId) {
      pendingEventIds.push(choice.nextEventId);
    }

    const patch = builder
      .attributes(nextAttributes)
      .cultivation(nextCultivation)
      .inventory(nextInventory)
      .combat(nextCombat)
      .relationships(nextRelationships)
      .quests(nextQuests)
      .character(nextCharacter)
      .world({ worldFlags: nextWorldFlags })
      .narrative({
        ...state.narrative,
        activeEventId: null,
        completedUniqueEventIds: completedUnique,
        eventCooldowns: cooldowns,
        pendingEventIds,
      })
      .logEvent(`[Sự kiện] ${event.title}: bạn đã chọn "${choice.text}". ${notes.join('; ')}.`, choice.text)
      .recordCausal(action.actionId, choice.domain, choice.weight, event.title, choice.text, notes)
      .build();

    return { ok: true, patch, summary: `${event.title} — ${choice.text}: ${notes.join('; ')}` };
  },
};
