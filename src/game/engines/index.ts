import { RngService } from '../core/rng/RngService';
import { EventBus } from '../core/events/EventBus';
import type { ActionHandler, ActionHandlerOutput, CanonicalGameState, GameStatePatch } from '../core/types';
import { StateValidator } from '../core/validation/StateValidator';
import { buildCultivationHandlers } from './engines/cultivationEngine';
import { buildInventoryHandlers } from './engines/inventoryEngine';
import { buildCombatHandlers } from './engines/combatEngine';
import { buildExplorationHandlers } from './engines/explorationEngine';
import { buildSocialHandlers } from './engines/socialEngine';

export function buildAllGameplayHandlers(): readonly ActionHandler<any>[] {
  return [
    ...buildCultivationHandlers(),
    ...buildInventoryHandlers(),
    ...buildCombatHandlers(),
    ...buildExplorationHandlers(),
    ...buildSocialHandlers(),
  ];
}

export { RngService, EventBus, StateValidator };
export type { ActionHandler, ActionHandlerOutput, CanonicalGameState, GameStatePatch };
