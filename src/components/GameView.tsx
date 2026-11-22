import { useEffect, useMemo, useState } from 'react';
import { GameController } from '../app/GameController';
import { registerPhase1DebugProbes } from '../app/debugProbes';
import { buildAllGameplayHandlers } from '../game/engines';
import type { CanonicalGameState, GameResult } from '../core/types';
import { getEvent, type StoryChoice } from '../game/content/story';
import { LOCATIONS } from '../game/content/world';
import { saveGame, loadGame, listSaveSlots, SAVE_SLOTS, type SaveMeta, type SaveSlot } from '../game/saveSystem';
import { checkEnding } from '../game/endings';
import { narrateScene } from '../game/narration';
import { expRequiredFor, derivedCombatStats } from '../game/stats';
import { GameHeader } from './GameHeader';
import { NarrativePanel } from './NarrativePanel';
import { CharacterPanel } from './CharacterPanel';
import { ActionPanel } from './ActionPanel';
import { SaveLoadOverlay } from './SaveLoadOverlay';

export function GameView() {
  const controller = useMemo(() => {
    const ctrl = new GameController();
    for (const handler of buildAllGameplayHandlers()) {
      ctrl.registerActionHandler(handler);
    }
    return ctrl;
  }, []);

  const [snapshot, setSnapshot] = useState<Readonly<CanonicalGameState>>(() => controller.getState());
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [saveOverlay, setSaveOverlay] = useState<'save' | 'load' | null>(null);
  const [saveMetas, setSaveMetas] = useState<Record<SaveSlot, SaveMeta | null>>(() => listSaveSlots());
  const [ending, setEnding] = useState<string | null>(null);

  useEffect(() => {
    const unsub = controller.subscribe('state:changed', (payload) => {
      setSnapshot(payload.stateSnapshot);
      const ended = checkEnding(payload.stateSnapshot);
      if (ended && !ending) setEnding(ended.endingId);
    });
    return unsub;
  }, [controller, ending]);

  const dispatch = (input: Parameters<GameController['dispatch']>[0]): GameResult => {
    const result = controller.dispatch(input);
    setLastResult(result);
    setSnapshot(result.stateSnapshot);
    return result;
  };

  const activeEvent = snapshot.narrative.activeEventId
    ? getEvent(snapshot.narrative.activeEventId)
    : snapshot.narrative.pendingEventIds.length > 0
      ? getEvent(snapshot.narrative.pendingEventIds[0]) ?? null
      : null;

  const handleChoice = (choice: StoryChoice) => {
    if (!activeEvent) return;
    const action = controller.normalizeAction({
      type: 'story_choice',
      source: 'ui',
      payload: { eventId: activeEvent.eventId, choiceId: choice.choiceId },
    });
    const result = dispatch(action);
    if (result.ok) {
      // After the choice, clear active event if resolved
      setSnapshot((prev) => ({
        ...prev,
        narrative: { ...prev.narrative, activeEventId: null },
      }));
    }
  };

  const handleSave = (slot: SaveSlot) => {
    const result = saveGame(slot, snapshot as CanonicalGameState);
    setSaveMetas(listSaveSlots());
    if (result.ok) setSaveOverlay(null);
  };

  const handleLoad = (slot: SaveSlot) => {
    const loaded = loadGame(slot);
    if (loaded.ok) {
      const next = controller.resetGame();
      setSnapshot({ ...next, ...loaded.state });
      setSaveOverlay(null);
      setEnding(null);
    }
  };

  const derived = derivedCombatStats(snapshot as never);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <GameHeader
        snapshot={snapshot}
        derived={derived}
        onSaveLoad={() => setSaveOverlay('save')}
        onLoad={() => setSaveOverlay('load')}
      />
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <NarrativePanel
            snapshot={snapshot}
            narration={narrateScene(snapshot as CanonicalGameState)}
            activeEvent={activeEvent}
            onChoice={handleChoice}
            lastResult={lastResult}
          />
          <ActionPanel snapshot={snapshot} dispatch={dispatch} controller={controller} />
        </div>
        <div>
          <CharacterPanel snapshot={snapshot} expRequired={expRequiredFor(snapshot.cultivation)} />
        </div>
      </div>
      {saveOverlay && (
        <SaveLoadOverlay
          mode={saveOverlay}
          slots={SAVE_SLOTS}
          metas={saveMetas}
          onSave={handleSave}
          onLoad={handleLoad}
          onClose={() => setSaveOverlay(null)}
        />
      )}
      {ending && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-700 rounded-lg p-6 max-w-md text-center space-y-3">
            <h2 className="text-2xl font-bold text-amber-400">Kết thúc: {ending}</h2>
            <p className="text-sm text-stone-300">Hành trình của bạn đã tới một kết cục. Bạn có thể chơi lại để khám phá các kết cục khác.</p>
            <button
              type="button"
              onClick={() => setEnding(null)}
              className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white"
            >
              Tiếp tục khám phá
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// preserve a reference for potential future use with debug view
export const __debugProbesRef = registerPhase1DebugProbes;
export const __locationsRef = LOCATIONS;
