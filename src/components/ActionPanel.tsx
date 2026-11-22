import { useState } from 'react';
import type { GameController } from '../app/GameController';
import type { CanonicalGameState, GameResult } from '../core/types';
import { LOCATIONS } from '../game/content/world';

export function ActionPanel({
  snapshot,
  dispatch,
  controller,
}: {
  snapshot: Readonly<CanonicalGameState>;
  dispatch: (input: Parameters<GameController['dispatch']>[0]) => GameResult;
  controller: GameController;
}) {
  const [busy, setBusy] = useState(false);

  const run = (fn: () => GameResult) => {
    setBusy(true);
    try {
      fn();
    } finally {
      setBusy(false);
    }
  };

  const explore = () =>
    run(() =>
      dispatch(
        controller.normalizeAction({
          type: 'explore',
          source: 'ui',
          payload: { locationId: snapshot.world.currentLocationId },
        }),
      ),
    );

  const cultivate = () =>
    run(() =>
      dispatch(
        controller.normalizeAction({
          type: 'cultivate',
          source: 'ui',
          payload: { activity: 'tinh_toa', durationDays: 1 },
        }),
      ),
    );

  const breakthrough = () =>
    run(() =>
      dispatch(
        controller.normalizeAction({
          type: 'breakthrough',
          source: 'ui',
          payload: {},
        }),
      ),
    );

  const attack = (mode: 'basic' | 'defend' | 'flee') =>
    run(() =>
      dispatch(
        controller.normalizeAction({
          type: 'attack',
          source: 'ui',
          payload: { targetId: 'enemy', mode },
        }),
      ),
    );

  if (snapshot.combat.inCombat) {
    const player = snapshot.combat.participants.find((p) => p.isPlayer);
    return (
      <section className="border border-rose-900 bg-rose-950/30 rounded-lg p-4 space-y-2">
        <h2 className="text-sm font-semibold text-rose-300 uppercase">Trận Chiến — Lượt {snapshot.combat.turn}</h2>
        {player && <p className="text-xs font-mono">HP của bạn: {player.hp}/{player.maxHp}</p>}
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => attack('basic')} label="Tấn công" color="bg-rose-700 hover:bg-rose-600" disabled={busy} />
          <ActionButton onClick={() => attack('defend')} label="Phòng thủ" color="bg-stone-700 hover:bg-stone-600" disabled={busy} />
          <ActionButton onClick={() => attack('flee')} label="Bỏ chạy" color="bg-amber-700 hover:bg-amber-600" disabled={busy} />
        </div>
        <div className="max-h-32 overflow-y-auto text-xs font-mono space-y-0.5">
          {snapshot.combat.log.slice(-8).map((line, i) => (
            <p key={i} className="text-stone-300">{line}</p>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="border border-stone-800 bg-stone-900/70 rounded-lg p-4 space-y-2">
      <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Hành Động</h2>
      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={explore} label="Khám phá" color="bg-emerald-700 hover:bg-emerald-600" disabled={busy} />
        <ActionButton onClick={cultivate} label="Tu luyện (1 ngày)" color="bg-sky-700 hover:bg-sky-600" disabled={busy} />
        <ActionButton onClick={breakthrough} label="Đột phá" color="bg-amber-700 hover:bg-amber-600" disabled={busy} />
      </div>
      <div className="pt-2 space-y-1">
        <p className="text-xs text-stone-400 uppercase">Du hành tới:</p>
        <div className="flex flex-wrap gap-2">
          {LOCATIONS.filter((loc) => loc.locationId !== snapshot.world.currentLocationId).map((loc) => (
            <button
              key={loc.locationId}
              type="button"
              disabled={busy || (Boolean(loc.unlockFlag) && !snapshot.world.worldFlags[loc.unlockFlag!])}
              onClick={() =>
                run(() =>
                  dispatch(
                    controller.normalizeAction({
                      type: 'travel',
                      source: 'ui',
                      payload: { destinationLocationId: loc.locationId },
                    }),
                  ),
                )
              }
              className="px-3 py-1.5 text-xs rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-stone-100"
            >
              {loc.name} ({loc.travelDays} ngày)
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ActionButton({
  onClick,
  label,
  color,
  disabled,
}: {
  onClick: () => void;
  label: string;
  color: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-sm rounded ${color} text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
    >
      {label}
    </button>
  );
}
