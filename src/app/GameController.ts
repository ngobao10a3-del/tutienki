import { EventBus, type EventHandler, type UnsubscribeFn } from '../core/events/EventBus';
import { RngService } from '../core/rng/RngService';
import {
  type ActionHandler,
  type CanonicalGameState,
  type GameAction,
  type GameActionType,
  type GameEventMap,
  type GameResult,
  type NewGameActionInput,
} from '../core/types';
import { ActionPipeline } from './ActionPipeline';
import { GameStateManager, type InitialStateOptions } from './GameStateManager';

let actionSequence = 0;

function generateActionId(type: GameActionType): string {
  actionSequence += 1;
  return `act_${type}_${Date.now()}_${actionSequence}`;
}

export interface GameControllerOptions {
  readonly initialStateOptions?: InitialStateOptions;
}

/**
 * Unified coordinator connecting Presentation Layer, ActionPipeline, and GameStateManager.
 * Contains zero domain gameplay business rules.
 */
export class GameController {
  private readonly stateManager: GameStateManager;
  private readonly eventBus: EventBus;
  private readonly rng: RngService;
  private readonly pipeline: ActionPipeline;

  constructor(options: GameControllerOptions = {}) {
    this.stateManager = new GameStateManager(options.initialStateOptions);
    const snapshot = this.stateManager.getSnapshot();
    this.eventBus = new EventBus();
    this.rng = new RngService(snapshot.seed, snapshot.rngState);
    this.pipeline = new ActionPipeline(this.stateManager, this.eventBus, this.rng);
  }

  public getState(): Readonly<CanonicalGameState> {
    return this.stateManager.getSnapshot();
  }

  public registerActionHandler<TAction extends GameAction>(
    handler: ActionHandler<TAction>,
  ): void {
    this.pipeline.registerHandler(handler);
  }

  public unregisterActionHandler(actionType: GameActionType): void {
    this.pipeline.unregisterHandler(actionType);
  }

  public hasActionHandler(actionType: GameActionType): boolean {
    return this.pipeline.hasHandler(actionType);
  }

  public normalizeAction<TAction extends GameAction>(
    input: NewGameActionInput<TAction>,
  ): TAction {
    return {
      ...input,
      actionId: input.actionId ?? generateActionId(input.type),
      createdAt: input.createdAt ?? Date.now(),
    } as TAction;
  }

  public dispatch(input: GameAction | NewGameActionInput): GameResult {
    const normalized: GameAction =
      'actionId' in input &&
      typeof input.actionId === 'string' &&
      'createdAt' in input &&
      typeof input.createdAt === 'number'
        ? (input as GameAction)
        : this.normalizeAction(input as NewGameActionInput);

    return this.pipeline.execute(normalized);
  }

  public subscribe<K extends keyof GameEventMap>(
    eventType: K,
    handler: EventHandler<K>,
  ): UnsubscribeFn {
    return this.eventBus.subscribe(eventType, handler);
  }

  public resetGame(options?: InitialStateOptions): Readonly<CanonicalGameState> {
    const nextSnapshot = this.stateManager.reset(options);
    this.rng.setState(nextSnapshot.rngState);
    this.eventBus.publish('state:reset', {
      stateVersion: nextSnapshot.stateVersion,
      seed: nextSnapshot.seed,
      stateSnapshot: nextSnapshot,
    });
    return nextSnapshot;
  }
}
