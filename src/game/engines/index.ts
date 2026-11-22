import type { ActionHandler, CanonicalGameState } from '../../core/types';
import { StateValidator } from '../../core/validation/StateValidator';
import { buildCultivationHandlers } from './cultivationEngine';
import { buildInventoryHandlers } from './inventoryEngine';
import { buildCombatHandlers } from './combatEngine';
import { buildExplorationHandlers } from './explorationEngine';
import { buildSocialHandlers } from './socialEngine';

export function buildAllGameplayHandlers(): readonly ActionHandler<any>[] {
  return [
    ...buildCultivationHandlers(),
    ...buildInventoryHandlers(),
    ...buildCombatHandlers(),
    ...buildExplorationHandlers(),
    ...buildSocialHandlers(),
  ];
}

export function validateState(state: CanonicalGameState): ReturnType<typeof StateValidator.validateState> {
  return StateValidator.validateState(state);
}
