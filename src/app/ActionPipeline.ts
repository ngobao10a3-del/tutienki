import { EventBus } from '../core/events/EventBus';
import { RngService } from '../core/rng/RngService';
import {
  type ActionHandler,
  type GameAction,
  type GameActionType,
  type GameError,
  type GameResult,
  type StateDomain,
} from '../core/types';
import { StateValidator } from '../core/validation/StateValidator';
import { GameStateManager } from './GameStateManager';

/**
 * Unified 9-step deterministic ActionPipeline:
 * Receive Action
 * -> Validate Action
 * -> Check Idempotency
 * -> Resolve Action
 * -> Validate Result
 * -> Validate State Invariants
 * -> Commit State
 * -> Publish Events
 * -> Return GameResult
 */
export class ActionPipeline {
  private readonly handlers = new Map<GameActionType, ActionHandler<GameAction>>();
  private readonly stateManager: GameStateManager;
  private readonly eventBus: EventBus;
  private readonly rng: RngService;

  constructor(
    stateManager: GameStateManager,
    eventBus: EventBus,
    rng: RngService,
  ) {
    this.stateManager = stateManager;
    this.eventBus = eventBus;
    this.rng = rng;
  }

  public registerHandler<TAction extends GameAction>(
    handler: ActionHandler<TAction>,
  ): void {
    this.handlers.set(
      handler.actionType,
      handler as unknown as ActionHandler<GameAction>,
    );
  }

  public unregisterHandler(actionType: GameActionType): void {
    this.handlers.delete(actionType);
  }

  public hasHandler(actionType: GameActionType): boolean {
    return this.handlers.has(actionType);
  }

  public syncRngFromState(): void {
    const snap = this.stateManager.getSnapshot();
    this.rng.setState(snap.rngState);
  }

  public execute(action: GameAction): GameResult {
    // 1. Receive Action
    const fallbackActionId =
      typeof (action as unknown as Record<string, unknown>)?.actionId === 'string'
        ? action.actionId
        : 'unknown_action';
    const fallbackActionType =
      typeof (action as unknown as Record<string, unknown>)?.type === 'string'
        ? action.type
        : ('cultivate' as GameActionType);

    this.eventBus.publish('action:received', {
      actionId: fallbackActionId,
      actionType: fallbackActionType,
      source: action?.source ?? 'system',
      timestamp: Date.now(),
    });

    // 2. Validate Action
    const actionValidation = StateValidator.validateAction(action);
    if (!actionValidation.valid) {
      const error: GameError = {
        category: 'VALIDATION_ERROR',
        code: 'INVALID_GAME_ACTION',
        message: 'GameAction không hợp lệ về cấu trúc hoặc dữ liệu đầu vào.',
        issues: actionValidation.issues,
      };
      this.eventBus.publish('validation:failed', {
        actionId: fallbackActionId,
        issues: actionValidation.issues,
      });
      this.eventBus.publish('action:rejected', {
        actionId: fallbackActionId,
        actionType: fallbackActionType,
        error,
      });
      return {
        ok: false,
        actionId: fallbackActionId,
        actionType: fallbackActionType,
        stateVersion: this.stateManager.getVersion(),
        error,
        stateSnapshot: this.stateManager.getSnapshot(),
      };
    }

    // 3. Check Idempotency
    if (this.stateManager.hasProcessedAction(action.actionId)) {
      const error: GameError = {
        category: 'IDEMPOTENCY_ERROR',
        code: 'DUPLICATE_ACTION_ID',
        message: `Hành động với actionId "${action.actionId}" đã được thực thi trước đó và bị từ chối thực thi lại.`,
      };
      this.eventBus.publish('action:rejected', {
        actionId: action.actionId,
        actionType: action.type,
        error,
      });
      return {
        ok: false,
        actionId: action.actionId,
        actionType: action.type,
        stateVersion: this.stateManager.getVersion(),
        error,
        stateSnapshot: this.stateManager.getSnapshot(),
      };
    }

    // Check registered handler (business rule boundary)
    const handler = this.handlers.get(action.type);
    if (!handler) {
      const error: GameError = {
        category: 'BUSINESS_ERROR',
        code: 'ACTION_HANDLER_NOT_REGISTERED',
        message: `Chưa có Gameplay Engine đăng ký xử lý cho loại hành động "${action.type}".`,
      };
      this.eventBus.publish('action:rejected', {
        actionId: action.actionId,
        actionType: action.type,
        error,
      });
      return {
        ok: false,
        actionId: action.actionId,
        actionType: action.type,
        stateVersion: this.stateManager.getVersion(),
        error,
        stateSnapshot: this.stateManager.getSnapshot(),
      };
    }

    // 4. Resolve Action (with RNG checkpoint for atomic rollback)
    const preSnapshot = this.stateManager.getSnapshot();
    const rngCheckpoint = preSnapshot.rngState;
    this.rng.setState(rngCheckpoint);

    let resolution;
    try {
      resolution = handler.handle(action, {
        state: preSnapshot,
        nextInt: (min, max) => this.rng.nextInt(min, max),
        nextFloat: () => this.rng.nextFloat(),
      });
    } catch (err) {
      // Rollback RNG on unexpected system exception
      this.rng.setState(rngCheckpoint);
      const error: GameError = {
        category: 'SYSTEM_ERROR',
        code: 'ACTION_RESOLUTION_EXCEPTION',
        message: 'Lỗi hệ thống trong quá trình xử lý hành động. Trạng thái đã được giữ nguyên.',
        cause: err instanceof Error ? err.message : String(err),
      };
      this.eventBus.publish('action:rejected', {
        actionId: action.actionId,
        actionType: action.type,
        error,
      });
      return {
        ok: false,
        actionId: action.actionId,
        actionType: action.type,
        stateVersion: this.stateManager.getVersion(),
        error,
        stateSnapshot: this.stateManager.getSnapshot(),
      };
    }

    // 5. Validate Result
    if (!resolution || typeof resolution !== 'object' || typeof resolution.ok !== 'boolean') {
      this.rng.setState(rngCheckpoint);
      const error: GameError = {
        category: 'SYSTEM_ERROR',
        code: 'INVALID_HANDLER_RESULT',
        message: 'Handler trả về kết quả sai định dạng.',
      };
      this.eventBus.publish('action:rejected', {
        actionId: action.actionId,
        actionType: action.type,
        error,
      });
      return {
        ok: false,
        actionId: action.actionId,
        actionType: action.type,
        stateVersion: this.stateManager.getVersion(),
        error,
        stateSnapshot: this.stateManager.getSnapshot(),
      };
    }

    if (!resolution.ok) {
      this.rng.setState(rngCheckpoint);
      this.eventBus.publish('action:rejected', {
        actionId: action.actionId,
        actionType: action.type,
        error: resolution.error,
      });
      return {
        ok: false,
        actionId: action.actionId,
        actionType: action.type,
        stateVersion: this.stateManager.getVersion(),
        error: resolution.error,
        stateSnapshot: this.stateManager.getSnapshot(),
      };
    }

    // Enforce Ownership Boundaries before building candidate state
    const allowedSet = new Set<StateDomain>(handler.allowedDomains);
    const patchKeys = Object.keys(resolution.patch) as StateDomain[];
    for (const domain of patchKeys) {
      if (resolution.patch[domain] !== undefined && !allowedSet.has(domain)) {
        this.rng.setState(rngCheckpoint);
        const error: GameError = {
          category: 'OWNERSHIP_ERROR',
          code: 'HANDLER_OWNERSHIP_VIOLATION',
          message: `Handler "${action.type}" không có quyền ghi vào domain "${domain}".`,
        };
        this.eventBus.publish('action:rejected', {
          actionId: action.actionId,
          actionType: action.type,
          error,
        });
        return {
          ok: false,
          actionId: action.actionId,
          actionType: action.type,
          stateVersion: this.stateManager.getVersion(),
          error,
          stateSnapshot: this.stateManager.getSnapshot(),
        };
      }
    }

    // 6. Build Candidate & Validate State Invariants + 7. Commit State
    const candidateState = this.stateManager.buildCandidateState(resolution.patch, {
      actionId: action.actionId,
      nextRngState: this.rng.getState(),
      timestamp: Date.now(),
    });

    const commitOutcome = this.stateManager.commitCandidate(
      candidateState,
      handler.allowedDomains,
    );

    if (!commitOutcome.ok) {
      this.rng.setState(rngCheckpoint);
      if (commitOutcome.error.issues) {
        this.eventBus.publish('validation:failed', {
          actionId: action.actionId,
          issues: commitOutcome.error.issues,
        });
      }
      this.eventBus.publish('action:rejected', {
        actionId: action.actionId,
        actionType: action.type,
        error: commitOutcome.error,
      });
      return {
        ok: false,
        actionId: action.actionId,
        actionType: action.type,
        stateVersion: this.stateManager.getVersion(),
        error: commitOutcome.error,
        stateSnapshot: this.stateManager.getSnapshot(),
      };
    }

    // 8. Publish Events
    this.eventBus.publish('action:committed', {
      actionId: action.actionId,
      actionType: action.type,
      stateVersion: commitOutcome.snapshot.stateVersion,
      updatedDomains: commitOutcome.updatedDomains,
      summary: resolution.summary,
    });
    this.eventBus.publish('state:changed', {
      previousVersion: commitOutcome.previousVersion,
      stateVersion: commitOutcome.snapshot.stateVersion,
      updatedDomains: commitOutcome.updatedDomains,
      stateSnapshot: commitOutcome.snapshot,
    });

    // 9. Return GameResult
    return {
      ok: true,
      actionId: action.actionId,
      actionType: action.type,
      stateVersion: commitOutcome.snapshot.stateVersion,
      summary: resolution.summary,
      updatedDomains: commitOutcome.updatedDomains,
      stateSnapshot: commitOutcome.snapshot,
    };
  }
}
