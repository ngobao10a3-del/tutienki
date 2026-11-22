import type { CanonicalGameState, GameResult } from '../core/types';
import { getEvent, type StoryEvent } from '../game/content/story';
import type { StoryChoice } from '../game/content/story';

export function NarrativePanel({
  snapshot,
  narration,
  activeEvent,
  onChoice,
  lastResult,
}: {
  snapshot: Readonly<CanonicalGameState>;
  narration: string;
  activeEvent: StoryEvent | null;
  onChoice: (choice: StoryChoice) => void;
  lastResult: GameResult | null;
}) {
  return (
    <section className="border border-stone-800 bg-stone-900/70 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Diễn Biến</h2>
        <span className="text-xs font-mono text-stone-500">v{snapshot.stateVersion}</span>
      </div>
      <p className="text-sm text-stone-200 leading-relaxed">{narration}</p>

      {activeEvent ? (
        <div className="border border-amber-800/50 bg-amber-950/20 rounded p-3 space-y-2">
          <h3 className="font-bold text-amber-300">{activeEvent.title}</h3>
          <p className="text-sm text-stone-300">{activeEvent.description}</p>
          <div className="space-y-2">
            {activeEvent.choices.map((choice) => (
              <button
                key={choice.choiceId}
                type="button"
                onClick={() => onChoice(choice)}
                className="w-full text-left px-3 py-2 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-sm transition-colors"
              >
                {choice.text}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-stone-500 italic">Không có sự kiện nào đang chờ. Hãy khám phá để tìm cơ duyên.</p>
      )}

      {lastResult && !lastResult.ok && (
        <div className="border border-rose-900/50 bg-rose-950/30 rounded p-3">
          <p className="text-xs font-semibold text-rose-300">Lỗi: {lastResult.error.message}</p>
        </div>
      )}
      {lastResult?.ok && (
        <p className="text-xs text-emerald-400">{lastResult.summary}</p>
      )}

      {snapshot.narrative.recentLog.length > 0 && (
        <div className="max-h-40 overflow-y-auto border-t border-stone-800 pt-2 space-y-1">
          {snapshot.narrative.recentLog.slice(-5).reverse().map((entry) => (
            <p key={entry.id} className="text-xs text-stone-400">
              <span className="text-stone-600">[Ngày {entry.day}]</span> {entry.summary}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
