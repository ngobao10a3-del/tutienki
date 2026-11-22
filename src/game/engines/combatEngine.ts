import type { ActionHandler, CanonicalGameState, CombatantSnapshot } from '../../core/types';
import { GamePatchBuilder } from '../GamePatchBuilder';
import { ENEMY_TEMPLATES, makeEnemy } from '../content/enemies';
import { addItemToInventory } from './inventoryEngine';
import { getItemDefinition } from '../effects';
import { derivedCombatStats } from '../stats';

const ATTACK_MODES = { basic: 1, skill: 1.8, defend: 0.3, flee: 0 } as const;

export function buildCombatHandlers(): readonly ActionHandler<any>[] {
  return [attackHandler];
}

function findCombatant(state: CanonicalGameState, id: string | null): CombatantSnapshot | undefined {
  return state.combat.participants.find((p) => p.id === id);
}

const attackHandler: ActionHandler<any> = {
  actionType: 'attack',
  allowedDomains: ['combat', 'inventory', 'character', 'cultivation', 'world', 'narrative', 'causal', 'quests', 'relationships'],
  handle: (action, ctx) => {
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);

    if (!state.combat.inCombat) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'NOT_IN_COMBAT', message: 'Hiện không đang trong trận chiến.' } };
    }

    const mode = action.payload.mode;
    const player = findCombatant(state, state.combat.activeCombatantId);
    const enemy = state.combat.participants.find((p) => !p.isPlayer);

    if (!player || !enemy) {
      return { ok: false, error: { category: 'SYSTEM_ERROR', code: 'COMBAT_CORRUPT', message: 'Dữ liệu trận chiến không hợp lệ.' } };
    }

    let nextPlayer = player;
    let nextEnemy = enemy;
    const log: string[] = [];

    // --- Player action ---
    if (mode === 'flee') {
      const fleeChance = 0.4 + (player.speed - enemy.speed) * 0.03;
      if (ctx.nextFloat() < fleeChance) {
        const patch = builder
          .combat({ inCombat: false, encounterId: null, outcome: 'fled', participants: [], turn: 0, activeCombatantId: null, turnOrder: [], log: [] })
          .logEvent('[Chiến đấu] Đã thoát thân khỏi trận chiến.')
          .build();
        return { ok: true, patch, summary: 'Bạn đã thoát khỏi trận chiến.' };
      }
      log.push('Bạn định chạy nhưng bị chặn đường!');
    } else if (mode === 'defend') {
      nextPlayer = { ...player, effects: [...player.effects, { id: 'defending', name: 'Phòng thủ', remainingTurns: 1, magnitude: 0.5 }] };
      log.push('Bạn thủ thế, giảm thương hại trong lượt.');
    } else {
      const multiplier = ATTACK_MODES[mode as keyof typeof ATTACK_MODES] ?? 1;
      const dodge = ctx.nextFloat() < enemy.evasion;
      if (dodge) {
        log.push('Đối phương né được đòn đánh của bạn.');
      } else {
        const isCrit = ctx.nextFloat() < player.critChance;
        const rawDamage = player.attack * multiplier * (isCrit ? player.critDamage : 1);
        const damage = Math.max(1, Math.round(rawDamage - enemy.defense * 0.5));
        nextEnemy = { ...nextEnemy, hp: Math.max(0, nextEnemy.hp - damage) };
        log.push(`Bạn gây ${damage} thương hại${isCrit ? ' (BÍ KÍCH!)' : ''}.`);
      }
    }

    // --- Enemy turn (if alive) ---
    if (nextEnemy.hp > 0) {
      const defendEffect = nextPlayer.effects.find((e) => e.id === 'defending');
      const dodge = ctx.nextFloat() < nextPlayer.evasion;
      if (dodge) {
        log.push('Bạn né được đòn phản công.');
      } else {
        const isCrit = ctx.nextFloat() < nextEnemy.critChance;
        const rawDamage = nextEnemy.attack * (isCrit ? nextEnemy.critDamage : 1);
        const mitigated = defendEffect ? rawDamage * (1 - defendEffect.magnitude) : rawDamage;
        const damage = Math.max(1, Math.round(mitigated - nextPlayer.defense * 0.5));
        nextPlayer = { ...nextPlayer, hp: Math.max(0, nextPlayer.hp - damage), effects: nextPlayer.effects.filter((e) => e.id !== 'defending') };
        log.push(`${nextEnemy.name} gây ${damage} thương hại${isCrit ? ' (BÍ KÍCH!)' : ''}.`);
      }
    }

    // --- Resolve outcome ---
    if (nextEnemy.hp <= 0) {
      const template = Object.values(ENEMY_TEMPLATES).find((t) => t.name === enemy.name);
      const spiritStones = template ? ctx.nextInt(template.spiritStoneReward[0], template.spiritStoneReward[1]) : 10;
      const exp = template?.expReward ?? 20;

      let nextInventory = state.inventory;
      const lootNotes: string[] = [];
      if (template) {
        for (const entry of template.lootTable) {
          if (ctx.nextFloat() < entry.chance) {
            const def = getItemDefinition(entry.itemId);
            if (def) {
              const qty = ctx.nextInt(entry.min, entry.max);
              nextInventory = addItemToInventory(nextInventory, def, qty);
              lootNotes.push(`${def.name} x${qty}`);
            }
          }
        }
      }

      const patch = builder
        .combat({
          inCombat: false,
          encounterId: null,
          outcome: 'victory',
          participants: [],
          turn: 0,
          activeCombatantId: null,
          turnOrder: [],
          log: [...state.combat.log, ...log, 'CHIẾN THẮNG!'],
        })
        .inventory({ ...nextInventory, spiritStones: nextInventory.spiritStones + spiritStones })
        .cultivation({ exp: state.cultivation.exp + exp })
        .logEvent(`[Chiến đấu] Hạ gục ${nextEnemy.name}. Nhận ${spiritStones} linh thạch, ${exp} EXP${lootNotes.length ? ', vật phẩm: ' + lootNotes.join(', ') : ''}.`)
        .recordCausal(action.actionId, 'character', 'D2', `Hạ gục ${nextEnemy.name}`, 'Chiến đấu', [`Nhận ${spiritStones} linh thạch`])
        .build();

      return { ok: true, patch, summary: `Chiến thắng! Hạ gục ${nextEnemy.name}, nhận ${spiritStones} linh thạch + ${exp} EXP.` };
    }

    if (nextPlayer.hp <= 0) {
      const patch = builder
        .combat({
          inCombat: false,
          encounterId: null,
          outcome: 'defeat',
          participants: [],
          turn: 0,
          activeCombatantId: null,
          turnOrder: [],
          log: [...state.combat.log, ...log, 'THẤT BẠI!'],
        })
        .character({ status: 'trong_thuong' })
        .logEvent('[Chiến đấu] Bạn bị trọng thương và bất tỉnh. May mắn được người qua đường cứu.')
        .recordCausal(action.actionId, 'character', 'D2', `Bị ${nextEnemy.name} đánh bại`, 'Chiến đấu', ['Trọng thương'])
        .build();

      return { ok: true, patch, summary: 'Bạn đã thất bại trong trận chiến và bị trọng thương.' };
    }

    const turn = state.combat.turn + 1;
    const patch = builder
      .combat({
        participants: state.combat.participants.map((p) => (p.isPlayer ? nextPlayer : nextEnemy)),
        turn,
        log: [...state.combat.log, ...log].slice(-15),
      })
      .build();

    return { ok: true, patch, summary: log.join(' ') };
  },
};

export function startCombat(
  state: CanonicalGameState,
  encounterId: string,
  enemyTemplateId: string,
  seedOffset: number,
): { combat: CanonicalGameState['combat'] } {
  const template = ENEMY_TEMPLATES[enemyTemplateId];
  if (!template) {
    throw new Error(`Unknown enemy template: ${enemyTemplateId}`);
  }
  const enemy = makeEnemy(template, seedOffset);
  const playerStats = derivedCombatStats(state);
  const player = {
    id: 'player',
    name: state.character.name,
    isPlayer: true,
    hp: Math.max(1, Math.round(playerStats.hp)),
    maxHp: Math.round(playerStats.hp),
    spiritEnergy: playerStats.spiritEnergy,
    maxSpiritEnergy: playerStats.spiritEnergy,
    attack: playerStats.attack,
    defense: playerStats.defense,
    speed: playerStats.speed,
    critChance: playerStats.critChance,
    critDamage: playerStats.critDamage,
    evasion: playerStats.evasion,
    effects: [],
  };

  const turnOrder = [player.speed >= enemy.speed ? 'player' : `enemy_${template.enemyId}`, player.speed >= enemy.speed ? `enemy_${template.enemyId}` : 'player'];
  return {
    combat: {
      inCombat: true,
      encounterId,
      turn: 1,
      turnOrder,
      activeCombatantId: turnOrder[0],
      outcome: 'ongoing',
      participants: [player, enemy],
      log: [`Giao chiến với ${enemy.name}!`],
    },
  };
}
