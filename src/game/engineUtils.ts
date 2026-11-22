import type { ActionHandlerOutput, CanonicalGameState, GameStatePatch, StateDomain } from '../core/types';
import { StateValidator } from '../core/validation/StateValidator';

export function reject(category: 'BUSINESS_ERROR' | 'VALIDATION_ERROR' | 'SYSTEM_ERROR' | 'OWNERSHIP_ERROR' | 'IDEMPOTENCY_ERROR', code: string, message: string): ActionHandlerOutput {
  return { ok: false, error: { category, code, message } };
}

/**
 * Validates a handler patch against a simulated candidate state before returning success.
 * Ensures invariants (negative spirit stones, invalid quantities) fail inside the handler
 * instead of being caught by the pipeline's state-invariant check.
 */
export function successWithValidation(
  state: CanonicalGameState,
  patch: GameStatePatch,
  allowedDomains: readonly StateDomain[],
  summary: string,
): ActionHandlerOutput {
  const candidate: CanonicalGameState = {
    ...state,
    ...(patch as Partial<CanonicalGameState>),
  };

  const allowedSet = new Set<StateDomain>(allowedDomains);
  for (const key of Object.keys(patch) as StateDomain[]) {
    if (!allowedSet.has(key)) {
      return {
        ok: false,
        error: {
          category: 'OWNERSHIP_ERROR',
          code: 'HANDLER_OWNERSHIP_VIOLATION',
          message: `Hành động không có quyền ghi vào domain "${key}".`,
        },
      };
    }
  }

  const validation = StateValidator.validateState(candidate);
  if (!validation.valid) {
    return {
      ok: false,
      error: {
        category: 'VALIDATION_ERROR',
        code: 'STATE_INVARIANT_VIOLATION',
        message: 'Dữ liệu sau xử lý vi phạm bất biến trạng thái.',
        issues: validation.issues,
      },
    };
  }

  return { ok: true, patch, summary };
}
