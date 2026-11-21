import { useEffect, useMemo, useState } from 'react';
import { GameController } from '../app/GameController';
import { registerPhase1DebugProbes } from '../app/debugProbes';
import type {
  CanonicalGameState,
  GameAction,
  GameResult,
  StateDomain,
} from '../core/types';

interface EventLogEntry {
  readonly id: number;
  readonly eventType: string;
  readonly detail: string;
}

const DOMAIN_TABS: readonly { readonly id: StateDomain | 'all'; readonly label: string }[] = [
  { id: 'all', label: 'All State' },
  { id: 'character', label: 'Character' },
  { id: 'cultivation', label: 'Cultivation' },
  { id: 'attributes', label: 'Attributes' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'combat', label: 'Combat' },
  { id: 'quests', label: 'Quests' },
  { id: 'narrative', label: 'Narrative' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'world', label: 'World' },
  { id: 'causal', label: 'Causal' },
];

export function DebugFoundationView() {
  const controller = useMemo(() => {
    const ctrl = new GameController();
    registerPhase1DebugProbes(ctrl);
    return ctrl;
  }, []);

  const [snapshot, setSnapshot] = useState<Readonly<CanonicalGameState>>(() =>
    controller.getState(),
  );
  const [selectedTab, setSelectedTab] = useState<StateDomain | 'all'>('all');
  const [lastAction, setLastAction] = useState<GameAction | null>(null);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [eventLog, setEventLog] = useState<readonly EventLogEntry[]>([]);

  useEffect(() => {
    let seq = 0;
    const pushLog = (eventType: string, detail: string) => {
      seq += 1;
      setEventLog((prev) => [{ id: seq, eventType, detail }, ...prev].slice(0, 30));
    };

    const unsubChanged = controller.subscribe('state:changed', (payload) => {
      setSnapshot(payload.stateSnapshot);
      pushLog(
        'state:changed',
        `v${payload.previousVersion} → v${payload.stateVersion} [${payload.updatedDomains.join(', ') || 'none'}]`,
      );
    });

    const unsubRejected = controller.subscribe('action:rejected', (payload) => {
      pushLog(
        'action:rejected',
        `${payload.actionType} (${payload.actionId}): ${payload.error.category}/${payload.error.code}`,
      );
    });

    const unsubValidation = controller.subscribe('validation:failed', (payload) => {
      pushLog(
        'validation:failed',
        `${payload.issues.length} issue(s): ${payload.issues.map((i) => i.code).join(', ')}`,
      );
    });

    const unsubReset = controller.subscribe('state:reset', (payload) => {
      setSnapshot(payload.stateSnapshot);
      pushLog('state:reset', `Reset state về v${payload.stateVersion} (seed: ${payload.seed})`);
    });

    return () => {
      unsubChanged();
      unsubRejected();
      unsubValidation();
      unsubReset();
    };
  }, [controller]);

  const executeAction = (action: GameAction) => {
    setLastAction(action);
    const result = controller.dispatch(action);
    setLastResult(result);
    setSnapshot(result.stateSnapshot);
  };

  const handleValidCultivateProbe = () => {
    const action = controller.normalizeAction({
      type: 'cultivate',
      source: 'debug',
      payload: {
        activity: 'tinh_toa',
        durationDays: 1,
      },
    });
    executeAction(action);
  };

  const handleRetryLastAction = () => {
    if (!lastAction) return;
    executeAction(lastAction);
  };

  const handleInvalidStateProbe = () => {
    const action = controller.normalizeAction({
      type: 'use_item',
      source: 'debug',
      payload: {
        itemInstanceId: 'item_inst_kho_luong_01',
        quantity: 99,
      },
    });
    executeAction(action);
  };

  const handleOwnershipViolationProbe = () => {
    const action = controller.normalizeAction({
      type: 'explore',
      source: 'debug',
      payload: {
        locationId: '__violate_ownership__',
      },
    });
    executeAction(action);
  };

  const handleUnregisteredActionProbe = () => {
    const action = controller.normalizeAction({
      type: 'breakthrough',
      source: 'debug',
      payload: {},
    });
    executeAction(action);
  };

  const handleExceptionRollbackProbe = () => {
    const action = controller.normalizeAction({
      type: 'interact',
      source: 'debug',
      payload: {
        targetType: 'object',
        targetId: 'stone_stele_01',
        interactionType: '__throw_error__',
      },
    });
    executeAction(action);
  };

  const handleReset = () => {
    const next = controller.resetGame();
    setSnapshot(next);
    setLastAction(null);
    setLastResult(null);
  };

  const displayedState =
    selectedTab === 'all' ? snapshot : snapshot[selectedTab];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="border border-stone-800 bg-stone-900/80 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
              Phase 1 · Core Foundation Diagnostic Console
            </p>
            <h1 className="text-xl font-bold text-stone-50 mt-0.5">
              Hệ Thống Tu Tiên Ký — ActionPipeline &amp; CanonicalGameState Inspector
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-stone-300">
            <span className="px-2.5 py-1 rounded bg-stone-800 border border-stone-700">
              stateVersion: <strong className="text-emerald-400">v{snapshot.stateVersion}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-stone-800 border border-stone-700">
              rngState: <strong className="text-sky-400">{snapshot.rngState}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-stone-800 border border-stone-700">
              processedActions: <strong>{snapshot.processedActionIds.length}</strong>
            </span>
          </div>
        </header>

        <section className="border border-stone-800 bg-stone-900/60 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold text-stone-200 uppercase tracking-wider">
            Sample Action Dispatchers (Pipeline Verification)
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleValidCultivateProbe}
              className="px-3 py-2 text-xs font-medium rounded bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
            >
              1. Dispatch Valid Probe (cultivate)
            </button>
            <button
              type="button"
              onClick={handleRetryLastAction}
              disabled={!lastAction}
              className="px-3 py-2 text-xs font-medium rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            >
              2. Retry Last actionId (Idempotency)
            </button>
            <button
              type="button"
              onClick={handleInvalidStateProbe}
              className="px-3 py-2 text-xs font-medium rounded bg-rose-700 hover:bg-rose-600 text-white transition-colors cursor-pointer"
            >
              3. Trigger Negative Item Invariant
            </button>
            <button
              type="button"
              onClick={handleOwnershipViolationProbe}
              className="px-3 py-2 text-xs font-medium rounded bg-orange-700 hover:bg-orange-600 text-white transition-colors cursor-pointer"
            >
              4. Trigger Ownership Violation
            </button>
            <button
              type="button"
              onClick={handleUnregisteredActionProbe}
              className="px-3 py-2 text-xs font-medium rounded bg-indigo-700 hover:bg-indigo-600 text-white transition-colors cursor-pointer"
            >
              5. Unregistered Action (breakthrough)
            </button>
            <button
              type="button"
              onClick={handleExceptionRollbackProbe}
              className="px-3 py-2 text-xs font-medium rounded bg-purple-700 hover:bg-purple-600 text-white transition-colors cursor-pointer"
            >
              6. Handler Exception Rollback
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-xs font-medium rounded bg-stone-700 hover:bg-stone-600 text-stone-100 transition-colors ml-auto cursor-pointer"
            >
              Reset Canonical State
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-4">
            <section className="border border-stone-800 bg-stone-900/70 rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Last Dispatched GameAction
              </h3>
              <pre className="text-xs font-mono bg-stone-950 border border-stone-800 rounded p-3 overflow-x-auto max-h-48 text-sky-300">
                {lastAction ? JSON.stringify(lastAction, null, 2) : '// Chưa dispatch action nào'}
              </pre>
            </section>

            <section className="border border-stone-800 bg-stone-900/70 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  ActionPipeline GameResult
                </h3>
                {lastResult && (
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded ${
                      lastResult.ok
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {lastResult.ok ? 'COMMITTED' : lastResult.error.category}
                  </span>
                )}
              </div>

              {lastResult ? (
                lastResult.ok ? (
                  <div className="text-xs bg-emerald-950/30 border border-emerald-900/60 rounded p-3 space-y-1">
                    <p className="text-emerald-200 font-medium">{lastResult.summary}</p>
                    <p className="font-mono text-emerald-400/90">
                      updatedDomains: [{lastResult.updatedDomains.join(', ')}] · stateVersion: v
                      {lastResult.stateVersion}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs bg-rose-950/30 border border-rose-900/60 rounded p-3 space-y-2">
                    <p className="font-mono text-rose-300 font-semibold">
                      [{lastResult.error.category}] {lastResult.error.code}
                    </p>
                    <p className="text-rose-200">{lastResult.error.message}</p>
                    {lastResult.error.cause && (
                      <p className="font-mono text-rose-300/80">Cause: {lastResult.error.cause}</p>
                    )}
                    {lastResult.error.issues && lastResult.error.issues.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-rose-900/50">
                        <p className="text-rose-300 font-semibold">Validation Issues:</p>
                        {lastResult.error.issues.map((issue, idx) => (
                          <div key={`${issue.code}_${idx}`} className="font-mono text-rose-200">
                            • [{issue.domain}] {issue.path}: {issue.message} ({issue.code})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <p className="text-xs text-stone-500 font-mono">
                  // Kết quả xử lý và validation errors sẽ hiển thị ở đây
                </p>
              )}
            </section>

            <section className="border border-stone-800 bg-stone-900/70 rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                EventBus Stream (Decoupled Notifications)
              </h3>
              <div className="bg-stone-950 border border-stone-800 rounded p-2.5 max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
                {eventLog.length === 0 ? (
                  <p className="text-stone-500">// Chưa có sự kiện nào được publish</p>
                ) : (
                  eventLog.map((entry) => (
                    <div key={entry.id} className="text-stone-300">
                      <span className="text-amber-400">{entry.eventType}</span>{' '}
                      <span className="text-stone-400">→ {entry.detail}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="lg:col-span-7 border border-stone-800 bg-stone-900/70 rounded-lg p-4 flex flex-col space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Canonical Game State Snapshot (Read-Only Deep-Frozen)
              </h3>
              <div className="flex flex-wrap gap-1">
                {DOMAIN_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedTab(tab.id)}
                    className={`px-2 py-1 text-xs rounded font-mono transition-colors cursor-pointer ${
                      selectedTab === tab.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <pre className="text-xs font-mono bg-stone-950 border border-stone-800 rounded p-3 overflow-auto max-h-[34rem] text-stone-200">
              {JSON.stringify(displayedState, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
