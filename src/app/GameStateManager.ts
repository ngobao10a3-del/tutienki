import { RngService } from '../core/rng/RngService';
import {
  type CanonicalGameState,
  type GameError,
  type GameStatePatch,
  type StateDomain,
  type ValidationResult,
} from '../core/types';
import { StateValidator } from '../core/validation/StateValidator';

const ALL_DOMAINS: readonly StateDomain[] = [
  'character',
  'cultivation',
  'attributes',
  'inventory',
  'combat',
  'quests',
  'narrative',
  'relationships',
  'world',
  'causal',
];

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const prop = (obj as Record<string, unknown>)[key];
    if (prop !== null && typeof prop === 'object' && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  }
  return obj;
}

export interface InitialStateOptions {
  readonly seed?: string;
  readonly characterName?: string;
  readonly timestamp?: number;
}

export function createInitialCanonicalState(
  options: InitialStateOptions = {},
): CanonicalGameState {
  const seed = options.seed?.trim() || 'lam-pham-thuong-huyen-001';
  const rng = new RngService(seed);
  const now = options.timestamp ?? Date.now();

  return {
    schemaVersion: 1,
    stateVersion: 1,
    seed,
    rngState: rng.getState(),
    processedActionIds: [],
    lastUpdatedAt: now,
    character: {
      id: 'char_lam_pham',
      name: options.characterName?.trim() || 'Lâm Phàm',
      age: 16,
      lifespan: 80,
      gender: 'nam',
      origin: 'Thanh Ngưu Trấn — Phàm Tục Sơn Thôn',
      talents: ['Bình Phàm Ý Chí'],
      status: 'khoe_manh',
      realm: 'pham_nhan',
      reputation: 0,
      flags: {
        initialized: true,
      },
    },
    cultivation: {
      currentRealm: 'pham_nhan',
      currentStage: 1,
      path: 'chua_dinh',
      exp: 0,
      progress: 0,
      progressMax: 100,
      speed: 1,
      foundation: 50,
      comprehension: 10,
      bottleneck: false,
      activeMethodId: null,
      knownMethodIds: [],
      breakthroughHistory: [],
    },
    attributes: {
      canCot: 8,
      linhLuc: 0,
      thanPhap: 9,
      ngoTinh: 10,
      thanThuc: 7,
      tamCanh: 10,
      daoTam: 10,
    },
    inventory: {
      spiritStones: 5,
      maxCapacity: 24,
      items: [
        {
          instanceId: 'item_inst_kho_luong_01',
          itemId: 'kho_luong',
          name: 'Lương Khô Hành Đường',
          category: 'dan_duoc',
          grade: 'pham',
          quantity: 3,
          stackable: true,
          questLocked: false,
        },
      ],
      equipped: {
        weapon: null,
        armor: null,
        shoes: null,
        artifact: null,
        ring: null,
        talisman: null,
      },
    },
    combat: {
      inCombat: false,
      encounterId: null,
      turn: 0,
      turnOrder: [],
      activeCombatantId: null,
      outcome: null,
      participants: [],
      log: [],
    },
    quests: {
      activeQuestIds: [],
      completedQuestIds: [],
      failedQuestIds: [],
      quests: {},
    },
    narrative: {
      currentChapterId: 'chapter_01_phan_tran',
      currentSceneId: 'scene_01_khoi_hanh',
      activeEventId: null,
      completedUniqueEventIds: [],
      eventCooldowns: {},
      branchFlags: {},
      recentLog: [
        {
          id: 'log_init_01',
          day: 1,
          sceneId: 'scene_01_khoi_hanh',
          summary: 'Khởi đầu hành trình tại Thanh Ngưu Trấn, Thương Huyền Giới.',
        },
      ],
    },
    relationships: {
      npcs: {},
      factions: {},
    },
    world: {
      currentRegionId: 'region_dong_vuc_ngoai_vi',
      currentLocationId: 'loc_thanh_nguu_tran',
      unlockedLocationIds: ['loc_thanh_nguu_tran'],
      time: {
        era: 'Thương Huyền Kỷ Nguyên',
        year: 1,
        month: 1,
        day: 1,
        totalDays: 1,
      },
      activeWorldEventIds: [],
      worldFlags: {},
    },
    causal: {
      records: [],
      karmaScore: 0,
      causalFlags: {},
    },
  };
}

export type CommitOutcome =
  | {
      readonly ok: true;
      readonly previousVersion: number;
      readonly snapshot: Readonly<CanonicalGameState>;
      readonly updatedDomains: readonly StateDomain[];
    }
  | {
      readonly ok: false;
      readonly error: GameError;
    };

/**
 * Single authoritative owner of CanonicalGameState.
 * External callers only receive deep-frozen clones and must commit changes through validation & ownership checks.
 */
export class GameStateManager {
  #state: CanonicalGameState;

  constructor(initialOptions?: InitialStateOptions) {
    const initial = createInitialCanonicalState(initialOptions);
    const check = StateValidator.validateState(initial);
    if (!check.valid) {
      throw new Error(
        `Initial CanonicalGameState is invalid: ${check.issues.map((i) => i.message).join('; ')}`,
      );
    }
    this.#state = deepClone(initial);
  }

  public getSnapshot(): Readonly<CanonicalGameState> {
    return deepFreeze(deepClone(this.#state));
  }

  public getVersion(): number {
    return this.#state.stateVersion;
  }

  public hasProcessedAction(actionId: string): boolean {
    return this.#state.processedActionIds.includes(actionId);
  }

  public validateCurrentState(): ValidationResult {
    return StateValidator.validateState(this.#state);
  }

  public buildCandidateState(
    patch: GameStatePatch,
    meta: {
      readonly actionId: string;
      readonly nextRngState: number;
      readonly timestamp: number;
    },
  ): CanonicalGameState {
    const nextState = deepClone(this.#state);

    for (const domain of ALL_DOMAINS) {
      const domainPatch = patch[domain];
      if (domainPatch !== undefined) {
        (nextState as unknown as Record<string, unknown>)[domain] = deepClone(domainPatch);
      }
    }

    return {
      ...nextState,
      stateVersion: this.#state.stateVersion + 1,
      rngState: meta.nextRngState,
      lastUpdatedAt: meta.timestamp,
      processedActionIds: [...this.#state.processedActionIds, meta.actionId],
    };
  }

  public commitCandidate(
    candidateState: CanonicalGameState,
    allowedDomains: readonly StateDomain[],
  ): CommitOutcome {
    const allowedSet = new Set<StateDomain>(allowedDomains);
    const updatedDomains: StateDomain[] = [];

    for (const domain of ALL_DOMAINS) {
      const prevSerialized = JSON.stringify(this.#state[domain]);
      const nextSerialized = JSON.stringify(candidateState[domain]);
      if (prevSerialized !== nextSerialized) {
        if (!allowedSet.has(domain)) {
          return {
            ok: false,
            error: {
              category: 'OWNERSHIP_ERROR',
              code: 'UNAUTHORIZED_DOMAIN_MUTATION',
              message: `Vi phạm quyền sở hữu trạng thái: không được phép sửa domain "${domain}" trong hành động này.`,
            },
          };
        }
        updatedDomains.push(domain);
      }
    }

    const validation = StateValidator.validateState(candidateState);
    if (!validation.valid) {
      return {
        ok: false,
        error: {
          category: 'VALIDATION_ERROR',
          code: 'STATE_INVARIANT_VIOLATION',
          message: 'Trạng thái sau xử lý vi phạm bất biến hệ thống, đã hủy commit.',
          issues: validation.issues,
        },
      };
    }

    const previousVersion = this.#state.stateVersion;
    this.#state = deepClone(candidateState);

    return {
      ok: true,
      previousVersion,
      snapshot: this.getSnapshot(),
      updatedDomains,
    };
  }

  public reset(options?: InitialStateOptions): Readonly<CanonicalGameState> {
    const next = createInitialCanonicalState(options);
    const check = StateValidator.validateState(next);
    if (!check.valid) {
      throw new Error(
        `Reset CanonicalGameState is invalid: ${check.issues.map((i) => i.message).join('; ')}`,
      );
    }
    this.#state = deepClone(next);
    return this.getSnapshot();
  }
}
