import type { ActionHandler, CultivateAction, ExploreAction, InteractAction, UseItemAction } from '../core/types';
import { GameController } from './GameController';

/**
 * Lightweight Phase 1 pipeline verification handlers used ONLY by the developer diagnostic screen
 * to test ActionPipeline flow (valid commit, invariant rejection, ownership boundary, exception rollback).
 * Full gameplay engines will replace these in Phase 2-5.
 */
export function registerPhase1DebugProbes(controller: GameController): void {
  const cultivateProbe: ActionHandler<CultivateAction> = {
    actionType: 'cultivate',
    allowedDomains: ['cultivation', 'world'],
    handle: (action, ctx) => {
      const gained = ctx.nextInt(6, 14) * action.payload.durationDays;
      const nextProgress = ctx.state.cultivation.progress + gained;
      const nextTotalDays = ctx.state.world.time.totalDays + action.payload.durationDays;
      const nextDay = ((ctx.state.world.time.day - 1 + action.payload.durationDays) % 30) + 1;
      const monthOffset = Math.floor((ctx.state.world.time.day - 1 + action.payload.durationDays) / 30);
      const nextMonth = ((ctx.state.world.time.month - 1 + monthOffset) % 12) + 1;
      const yearOffset = Math.floor((ctx.state.world.time.month - 1 + monthOffset) / 12);

      return {
        ok: true,
        summary: `[Probe] Tĩnh tọa ${action.payload.durationDays} ngày, tiến độ tu luyện +${gained} (RNG seeded).`,
        patch: {
          cultivation: {
            ...ctx.state.cultivation,
            exp: ctx.state.cultivation.exp + gained,
            progress: nextProgress,
          },
          world: {
            ...ctx.state.world,
            time: {
              ...ctx.state.world.time,
              day: nextDay,
              month: nextMonth,
              year: ctx.state.world.time.year + yearOffset,
              totalDays: nextTotalDays,
            },
          },
        },
      };
    },
  };

  // Probe that deliberately attempts to mutate an invalid negative item quantity to verify StateValidator rejection
  const invalidUseItemProbe: ActionHandler<UseItemAction> = {
    actionType: 'use_item',
    allowedDomains: ['inventory'],
    handle: (action, ctx) => {
      const nextItems = ctx.state.inventory.items.map((item) =>
        item.instanceId === action.payload.itemInstanceId
          ? { ...item, quantity: item.quantity - action.payload.quantity }
          : item,
      );
      return {
        ok: true,
        summary: '[Probe] Thử trừ số lượng vật phẩm.',
        patch: {
          inventory: {
            ...ctx.state.inventory,
            items: nextItems,
          },
        },
      };
    },
  };

  // Probe that deliberately violates domain ownership (declared ['narrative'], tries writing 'inventory')
  const ownershipViolationProbe: ActionHandler<ExploreAction> = {
    actionType: 'explore',
    allowedDomains: ['narrative'],
    handle: (action, ctx) => {
      if (action.payload.locationId === '__violate_ownership__') {
        return {
          ok: true,
          summary: '[Probe] Thử ghi trái phép sang inventory.',
          patch: {
            inventory: {
              ...ctx.state.inventory,
              spiritStones: ctx.state.inventory.spiritStones + 999,
            },
          },
        };
      }
      return {
        ok: true,
        summary: `[Probe] Thăm dò địa điểm ${action.payload.locationId}.`,
        patch: {
          narrative: {
            ...ctx.state.narrative,
            recentLog: [
              ...ctx.state.narrative.recentLog,
              {
                id: `log_probe_${action.actionId}`,
                day: ctx.state.world.time.totalDays,
                sceneId: ctx.state.narrative.currentSceneId,
                summary: `[Probe] Quan sát khu vực ${action.payload.locationId}.`,
              },
            ],
          },
        },
      };
    },
  };

  // Probe that throws an unexpected runtime exception to verify SYSTEM_ERROR & RNG rollback
  const exceptionProbe: ActionHandler<InteractAction> = {
    actionType: 'interact',
    allowedDomains: ['world'],
    handle: (action, ctx) => {
      ctx.nextInt(1, 100);
      if (action.payload.interactionType === '__throw_error__') {
        throw new Error('Simulated runtime exception inside handler.');
      }
      return {
        ok: false,
        error: {
          category: 'BUSINESS_ERROR',
          code: 'INTERACT_NOT_AVAILABLE',
          message: `Mục tiêu "${action.payload.targetId}" chưa có tương tác trong Phase 1.`,
        },
      };
    },
  };

  controller.registerActionHandler(cultivateProbe);
  controller.registerActionHandler(invalidUseItemProbe);
  controller.registerActionHandler(ownershipViolationProbe);
  controller.registerActionHandler(exceptionProbe);
}
