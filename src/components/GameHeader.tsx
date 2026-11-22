import type { CanonicalGameState } from '../core/types';
import { REALM_LABELS } from '../game/engines/cultivationEngine';
import { derivedCombatStats } from '../game/stats';

export function GameHeader({
  snapshot,
  derived,
  onSaveLoad,
  onLoad,
}: {
  snapshot: Readonly<CanonicalGameState>;
  derived: ReturnType<typeof derivedCombatStats>;
  onSaveLoad: () => void;
  onLoad: () => void;
}) {
  const realm = REALM_LABELS[snapshot.cultivation.currentRealm] ?? snapshot.cultivation.currentRealm;
  return (
    <header className="border-b border-stone-800 bg-stone-900/80">
      <div className="max-w-7xl mx-auto p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-amber-400">Hệ Thống Tu Tiên Ký</h1>
          <p className="text-xs text-stone-400">
            {snapshot.character.name} — {realm} tầng {snapshot.cultivation.currentStage} — Ngày {snapshot.world.time.totalDays}
          </p>
        </div>
        <div className="flex gap-2 text-xs font-mono">
          <span className="px-2 py-1 rounded bg-stone-800">HP {derived.hp}</span>
          <span className="px-2 py-1 rounded bg-stone-800">ATK {derived.attack}</span>
          <span className="px-2 py-1 rounded bg-stone-800">DEF {derived.defense}</span>
          <button type="button" onClick={onSaveLoad} className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white">
            Lưu
          </button>
          <button type="button" onClick={onLoad} className="px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-600 text-white">
            Tải
          </button>
        </div>
      </div>
    </header>
  );
}
