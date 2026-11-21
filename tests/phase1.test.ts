import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GameController } from '../src/app/GameController';
import { GameStateManager, createInitialCanonicalState } from '../src/app/GameStateManager';
import { ActionPipeline } from '../src/app/ActionPipeline';
import { EventBus } from '../src/core/events/EventBus';
import { RngService } from '../src/core/rng/RngService';
import { StateValidator } from '../src/core/validation/StateValidator';
import type { ActionHandler, CultivateAction, ExploreAction, UseItemAction } from '../src/core/types';

describe('Phase 1 — Core Foundation Tests', () => {
  it('GST-01: Khởi tạo CanonicalGameState hợp lệ với đủ 10 nhóm trạng thái', () => {
    const manager = new GameStateManager({ seed: 'gst-01-seed', characterName: 'Lâm Phàm' });
    const snapshot = manager.getSnapshot();

    assert.equal(snapshot.schemaVersion, 1);
    assert.equal(snapshot.stateVersion, 1);
    assert.equal(snapshot.seed, 'gst-01-seed');
    assert.equal(snapshot.character.name, 'Lâm Phàm');
    assert.equal(snapshot.character.realm, 'pham_nhan');
    assert.equal(snapshot.cultivation.currentRealm, 'pham_nhan');
    assert.ok(snapshot.attributes);
    assert.ok(snapshot.inventory);
    assert.ok(snapshot.combat);
    assert.ok(snapshot.quests);
    assert.ok(snapshot.narrative);
    assert.ok(snapshot.relationships);
    assert.ok(snapshot.world);
    assert.ok(snapshot.causal);

    const validation = StateValidator.validateState(snapshot);
    assert.equal(validation.valid, true);
    assert.equal(validation.issues.length, 0);
  });

  it('GST-02: Bảo đảm tính nhất quán và bất biến snapshot (external mutation bị chặn)', () => {
    const manager = new GameStateManager({ seed: 'gst-02-seed' });
    const snapshot = manager.getSnapshot();

    assert.equal(Object.isFrozen(snapshot), true);
    assert.equal(Object.isFrozen(snapshot.inventory), true);
    assert.equal(Object.isFrozen(snapshot.character), true);

    assert.throws(() => {
      (snapshot.inventory as unknown as { spiritStones: number }).spiritStones = -500;
    }, TypeError);

    assert.equal(manager.getSnapshot().inventory.spiritStones, 5);
    assert.equal(manager.getVersion(), 1);
  });

  it('GST-03: Kiểm tra quyền sở hữu trạng thái (từ chối handler ghi trái phép sang domain khác)', () => {
    const controller = new GameController({ initialStateOptions: { seed: 'gst-03-seed' } });

    const rogueHandler: ActionHandler<ExploreAction> = {
      actionType: 'explore',
      allowedDomains: ['narrative'],
      handle: (_action, ctx) => ({
        ok: true,
        summary: 'Cố ghi lậu vào inventory và cultivation.',
        patch: {
          inventory: {
            ...ctx.state.inventory,
            spiritStones: ctx.state.inventory.spiritStones + 1000,
          },
        },
      }),
    };

    controller.registerActionHandler(rogueHandler);
    const before = controller.getState();

    const result = controller.dispatch({
      actionId: 'act_ownership_violation_1',
      type: 'explore',
      source: 'test',
      createdAt: Date.now(),
      payload: { locationId: 'loc_thanh_nguu_tran' },
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.category, 'OWNERSHIP_ERROR');
      assert.equal(result.error.code, 'HANDLER_OWNERSHIP_VIOLATION');
    }
    const after = controller.getState();
    assert.equal(after.stateVersion, before.stateVersion);
    assert.equal(after.inventory.spiritStones, before.inventory.spiritStones);

    // Direct GameStateManager.commitCandidate ownership guard
    const manager = new GameStateManager({ seed: 'gst-03-direct' });
    const snap = manager.getSnapshot();
    const candidate = manager.buildCandidateState(
      {
        cultivation: {
          ...snap.cultivation,
          exp: 999,
        },
      },
      { actionId: 'direct_1', nextRngState: snap.rngState, timestamp: Date.now() },
    );
    const commitOutcome = manager.commitCandidate(candidate, ['inventory']);
    assert.equal(commitOutcome.ok, false);
    if (!commitOutcome.ok) {
      assert.equal(commitOutcome.error.category, 'OWNERSHIP_ERROR');
      assert.equal(commitOutcome.error.code, 'UNAUTHORIZED_DOMAIN_MUTATION');
    }
  });

  it('GST-04: Từ chối trạng thái không hợp lệ với lỗi có cấu trúc và không commit', () => {
    const base = createInitialCanonicalState({ seed: 'gst-04-seed' });

    // Negative item quantity & invalid realm & NaN attribute
    const corrupted = {
      ...base,
      character: {
        ...base.character,
        age: -5,
        realm: 'sieu_than_khong_ton_tai' as unknown as typeof base.character.realm,
      },
      attributes: {
        ...base.attributes,
        canCot: Number.NaN,
      },
      inventory: {
        ...base.inventory,
        spiritStones: -10,
        items: [
          {
            ...base.inventory.items[0],
            quantity: -2,
          },
        ],
      },
    };

    const validation = StateValidator.validateState(corrupted);
    assert.equal(validation.valid, false);
    assert.ok(validation.issues.length >= 4);
    const codes = new Set(validation.issues.map((i) => i.code));
    assert.ok(codes.has('CHARACTER_INVALID_AGE'));
    assert.ok(codes.has('CHARACTER_INVALID_REALM'));
    assert.ok(codes.has('ATTRIBUTE_INVALID_VALUE'));
    assert.ok(codes.has('INVENTORY_NEGATIVE_STONES'));
    assert.ok(codes.has('INVENTORY_NEGATIVE_QUANTITY'));

    // Via ActionPipeline
    const controller = new GameController({ initialStateOptions: { seed: 'gst-04-pipe' } });
    const badInventoryHandler: ActionHandler<UseItemAction> = {
      actionType: 'use_item',
      allowedDomains: ['inventory'],
      handle: (action, ctx) => ({
        ok: true,
        summary: 'Trừ quá số lượng hiện có.',
        patch: {
          inventory: {
            ...ctx.state.inventory,
            items: ctx.state.inventory.items.map((item) =>
              item.instanceId === action.payload.itemInstanceId
                ? { ...item, quantity: item.quantity - action.payload.quantity }
                : item,
            ),
          },
        },
      }),
    };
    controller.registerActionHandler(badInventoryHandler);

    const result = controller.dispatch({
      actionId: 'act_negative_qty',
      type: 'use_item',
      source: 'test',
      createdAt: Date.now(),
      payload: { itemInstanceId: 'item_inst_kho_luong_01', quantity: 50 },
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.category, 'VALIDATION_ERROR');
      assert.equal(result.error.code, 'STATE_INVARIANT_VIOLATION');
      assert.ok(result.error.issues && result.error.issues.length > 0);
    }
    assert.equal(controller.getState().inventory.items[0].quantity, 3);
    assert.equal(controller.getState().stateVersion, 1);
  });

  it('GST-05: Chống thực thi hành động trùng lặp theo actionId (Idempotency)', () => {
    const controller = new GameController({ initialStateOptions: { seed: 'gst-05-seed' } });
    let executionCount = 0;

    const cultivateHandler: ActionHandler<CultivateAction> = {
      actionType: 'cultivate',
      allowedDomains: ['cultivation'],
      handle: (_action, ctx) => {
        executionCount += 1;
        const delta = ctx.nextInt(10, 20);
        return {
          ok: true,
          summary: `Tăng ${delta} exp.`,
          patch: {
            cultivation: {
              ...ctx.state.cultivation,
              exp: ctx.state.cultivation.exp + delta,
            },
          },
        };
      },
    };
    controller.registerActionHandler(cultivateHandler);

    const fixedAction: CultivateAction = {
      actionId: 'act_unique_001',
      type: 'cultivate',
      source: 'test',
      createdAt: 1700000000000,
      payload: { activity: 'tinh_toa', durationDays: 1 },
    };

    const first = controller.dispatch(fixedAction);
    assert.equal(first.ok, true);
    const expAfterFirst = controller.getState().cultivation.exp;
    const versionAfterFirst = controller.getState().stateVersion;
    const rngAfterFirst = controller.getState().rngState;

    const second = controller.dispatch(fixedAction);
    assert.equal(second.ok, false);
    if (!second.ok) {
      assert.equal(second.error.category, 'IDEMPOTENCY_ERROR');
      assert.equal(second.error.code, 'DUPLICATE_ACTION_ID');
    }

    assert.equal(executionCount, 1);
    assert.equal(controller.getState().cultivation.exp, expAfterFirst);
    assert.equal(controller.getState().stateVersion, versionAfterFirst);
    assert.equal(controller.getState().rngState, rngAfterFirst);
  });

  it('RNG: Tái lập chuỗi ngẫu nhiên theo seed và kiểm tra khoảng giá trị', () => {
    const rngA = new RngService('thuong-huyen-rng-test');
    const rngB = new RngService('thuong-huyen-rng-test');

    const seqA = Array.from({ length: 15 }, () => rngA.nextInt(1, 20));
    const seqB = Array.from({ length: 15 }, () => rngB.nextInt(1, 20));
    assert.deepEqual(seqA, seqB);

    for (const val of seqA) {
      assert.ok(val >= 1 && val <= 20);
      assert.ok(Number.isInteger(val));
    }

    // Save/restore internal state mid-stream
    const savedState = rngA.getState();
    const nextFromA = [rngA.nextInt(1, 100), rngA.nextInt(1, 100)];
    const rngC = new RngService('thuong-huyen-rng-test', savedState);
    const nextFromC = [rngC.nextInt(1, 100), rngC.nextInt(1, 100)];
    assert.deepEqual(nextFromA, nextFromC);

    assert.throws(() => rngA.nextInt(10, 5));
    assert.throws(() => rngA.nextInt(1.5, 5));
  });

  it('EventBus: Subscribe, Publish và Unsubscribe hoạt động chính xác', () => {
    const bus = new EventBus();
    const received: number[] = [];

    const unsub = bus.subscribe('state:changed', (payload) => {
      received.push(payload.stateVersion);
    });

    assert.equal(bus.listenerCount('state:changed'), 1);

    const snapshot = createInitialCanonicalState({ seed: 'event-bus-test' });
    bus.publish('state:changed', {
      previousVersion: 1,
      stateVersion: 2,
      updatedDomains: ['cultivation'],
      stateSnapshot: snapshot,
    });
    assert.deepEqual(received, [2]);

    unsub();
    assert.equal(bus.listenerCount('state:changed'), 0);

    bus.publish('state:changed', {
      previousVersion: 2,
      stateVersion: 3,
      updatedDomains: ['cultivation'],
      stateSnapshot: snapshot,
    });
    assert.deepEqual(received, [2]);
  });

  it('Pipeline & GameController: Rollback RNG/state khi handler ném lỗi và từ chối action sai cấu trúc', () => {
    const stateManager = new GameStateManager({ seed: 'pipe-rollback-seed' });
    const eventBus = new EventBus();
    const rng = new RngService(
      stateManager.getSnapshot().seed,
      stateManager.getSnapshot().rngState,
    );
    const pipeline = new ActionPipeline(stateManager, eventBus, rng);

    const rejectedEvents: string[] = [];
    eventBus.subscribe('action:rejected', (e) => {
      rejectedEvents.push(e.error.code);
    });

    // Handler consumes RNG then throws
    pipeline.registerHandler<CultivateAction>({
      actionType: 'cultivate',
      allowedDomains: ['cultivation'],
      handle: (_action, ctx) => {
        ctx.nextInt(1, 20);
        ctx.nextInt(1, 20);
        throw new Error('Unexpected crash mid-resolution');
      },
    });

    const beforeRngState = stateManager.getSnapshot().rngState;
    const crashResult = pipeline.execute({
      actionId: 'act_crash_01',
      type: 'cultivate',
      source: 'test',
      createdAt: Date.now(),
      payload: { activity: 'tinh_toa', durationDays: 1 },
    });

    assert.equal(crashResult.ok, false);
    if (!crashResult.ok) {
      assert.equal(crashResult.error.category, 'SYSTEM_ERROR');
      assert.equal(crashResult.error.code, 'ACTION_RESOLUTION_EXCEPTION');
    }
    // RNG & state completely rolled back
    assert.equal(rng.getState(), beforeRngState);
    assert.equal(stateManager.getVersion(), 1);
    assert.equal(stateManager.hasProcessedAction('act_crash_01'), false);

    // Invalid action shape via GameController
    const controller = new GameController({ initialStateOptions: { seed: 'ctrl-invalid' } });
    const invalidResult = controller.dispatch({
      actionId: '',
      type: 'cultivate',
      source: 'test',
      createdAt: Date.now(),
      payload: { activity: 'tinh_toa', durationDays: -3 },
    });

    assert.equal(invalidResult.ok, false);
    if (!invalidResult.ok) {
      assert.equal(invalidResult.error.category, 'VALIDATION_ERROR');
      assert.equal(invalidResult.error.code, 'INVALID_GAME_ACTION');
    }
    assert.deepEqual(rejectedEvents, ['ACTION_RESOLUTION_EXCEPTION']);
  });
});
