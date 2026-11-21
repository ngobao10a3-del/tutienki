import type { GameAction, GameActionType } from './actions';
import type { CanonicalGameState, StateDomain } from './state';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  readonly code: string;
  readonly domain: StateDomain | 'action' | 'system';
  readonly path: string;
  readonly message: string;
  readonly severity: ValidationSeverity;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

export type GameErrorCategory =
  | 'VALIDATION_ERROR'
  | 'BUSINESS_ERROR'
  | 'IDEMPOTENCY_ERROR'
  | 'OWNERSHIP_ERROR'
  | 'SYSTEM_ERROR';

export interface GameError {
  readonly category: GameErrorCategory;
  readonly code: string;
  readonly message: string;
  readonly issues?: readonly ValidationIssue[];
  readonly cause?: string;
}

export type GameStatePatch = Partial<{
  readonly [K in StateDomain]: CanonicalGameState[K];
}>;

export interface EmittedDomainEvent {
  readonly type: keyof GameEventMap;
  readonly payload: GameEventMap[keyof GameEventMap];
}

export interface ActionResolutionContext {
  readonly state: Readonly<CanonicalGameState>;
  readonly nextInt: (min: number, max: number) => number;
  readonly nextFloat: () => number;
}

export type ActionHandlerSuccess = {
  readonly ok: true;
  readonly patch: GameStatePatch;
  readonly summary: string;
  readonly touchedDomains?: readonly StateDomain[];
};

export type ActionHandlerFailure = {
  readonly ok: false;
  readonly error: GameError;
};

export type ActionHandlerOutput = ActionHandlerSuccess | ActionHandlerFailure;

export interface ActionHandler<TAction extends GameAction = GameAction> {
  readonly actionType: TAction['type'];
  readonly allowedDomains: readonly StateDomain[];
  readonly handle: (
    action: TAction,
    context: ActionResolutionContext,
  ) => ActionHandlerOutput;
}

export interface GameResultSuccess {
  readonly ok: true;
  readonly actionId: string;
  readonly actionType: GameActionType;
  readonly stateVersion: number;
  readonly summary: string;
  readonly updatedDomains: readonly StateDomain[];
  readonly stateSnapshot: Readonly<CanonicalGameState>;
}

export interface GameResultFailure {
  readonly ok: false;
  readonly actionId: string;
  readonly actionType: GameActionType;
  readonly stateVersion: number;
  readonly error: GameError;
  readonly stateSnapshot: Readonly<CanonicalGameState>;
}

export type GameResult = GameResultSuccess | GameResultFailure;

export interface GameEventMap {
  'action:received': {
    readonly actionId: string;
    readonly actionType: GameActionType;
    readonly source: GameAction['source'];
    readonly timestamp: number;
  };
  'action:committed': {
    readonly actionId: string;
    readonly actionType: GameActionType;
    readonly stateVersion: number;
    readonly updatedDomains: readonly StateDomain[];
    readonly summary: string;
  };
  'action:rejected': {
    readonly actionId: string;
    readonly actionType: GameActionType;
    readonly error: GameError;
  };
  'state:changed': {
    readonly previousVersion: number;
    readonly stateVersion: number;
    readonly updatedDomains: readonly StateDomain[];
    readonly stateSnapshot: Readonly<CanonicalGameState>;
  };
  'state:reset': {
    readonly stateVersion: number;
    readonly seed: string;
    readonly stateSnapshot: Readonly<CanonicalGameState>;
  };
  'validation:failed': {
    readonly actionId?: string;
    readonly issues: readonly ValidationIssue[];
  };
}
