import { useState } from 'react';
import type { GameController } from '../app/GameController';
import type { CanonicalGameState, GameResult } from '../core/types';
import { LOCATIONS } from '../game/content/world';
import { getItemDefinition } from '../game/effects';

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

  const talkToNpc = (npcId: string) =>
    run(() =>
      dispatch(
        controller.normalizeAction({
          type: 'dialogue',
          source: 'ui',
          payload: { npcId, topicId: 'chuyen_tro' },
        }),
      ),
    );

  const giftNpc = (npcId: string) =>
    run(() =>
      dispatch(
        controller.normalizeAction({
          type: 'interact',
          source: 'ui',
          payload: { targetType: 'npc', targetId: npcId, interactionType: 'gift' },
        }),
      ),
    );

  const buyItem = (itemId: string) =>
    run(() =>
      dispatch(
        controller.normalizeAction({
          type: 'interact',
          source: 'ui',
          payload: { targetType: 'market', targetId: itemId, interactionType: 'buy' },
        }),
      ),
    );

  const sellItem = (instanceId: string) =>
    run(() =>
      dispatch(
        controller.normalizeAction({
          type: 'interact',
          source: 'ui',
          payload: { targetType: 'market', targetId: instanceId, interactionType: 'sell' },
        }),
      ),
    );

  if (snapshot.combat.inCombat) {
    const player = snapshot.combat.participants.find((p) => p.isPlayer);
    const enemy = snapshot.combat.participants.find((p) => !p.isPlayer);
    return (
      <section className="border border-rose-900 bg-rose-950/30 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-rose-300 uppercase tracking-wider">
            Trận Chiến — Lượt {snapshot.combat.turn}
          </h2>
          {enemy && (
            <span className="text-xs text-rose-400 font-medium">
              Đối thủ: {enemy.name} (HP: {enemy.hp}/{enemy.maxHp})
            </span>
          )}
        </div>
        {player && (
          <p className="text-xs font-mono text-emerald-300">
            HP của bạn: {player.hp}/{player.maxHp} | Linh lực: {player.spiritEnergy}/{player.maxSpiritEnergy}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => attack('basic')} label="Tấn công" color="bg-rose-700 hover:bg-rose-600" disabled={busy} />
          <ActionButton onClick={() => attack('defend')} label="Phòng thủ" color="bg-stone-700 hover:bg-stone-600" disabled={busy} />
          <ActionButton onClick={() => attack('flee')} label="Bỏ chạy" color="bg-amber-700 hover:bg-amber-600" disabled={busy} />
        </div>
        <div className="max-h-32 overflow-y-auto text-xs font-mono space-y-1 bg-stone-950/60 p-2 rounded border border-rose-950">
          {snapshot.combat.log.slice(-8).map((line, i) => (
            <p key={i} className="text-stone-300">{line}</p>
          ))}
        </div>
      </section>
    );
  }

  const currentLocation = LOCATIONS.find((loc) => loc.locationId === snapshot.world.currentLocationId);
  const currentNpcs = Object.values(snapshot.relationships.npcs).filter(
    (npc) => npc.locationId === snapshot.world.currentLocationId && npc.alive,
  );
  const marketAvailable = currentLocation?.marketAvailable ?? false;

  const marketWares = [
    { itemId: 'kho_luong', name: 'Lương Khô Hành Đường', price: 2, desc: 'Hồi 15 HP' },
    { itemId: 'huyet_khi_dan', name: 'Huyết Khí Đan', price: 25, desc: 'Hồi 60 HP' },
    { itemId: 'luyen_khi_tan', name: 'Luyện Khí Tán', price: 30, desc: '+3 tốc độ tu luyện' },
  ];

  return (
    <section className="border border-stone-800 bg-stone-900/70 rounded-lg p-4 space-y-4">
      {/* Basic Actions */}
      <div>
        <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">Hành Động</h2>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={explore} label="Khám phá" color="bg-emerald-700 hover:bg-emerald-600" disabled={busy} />
          <ActionButton onClick={cultivate} label="Tu luyện (1 ngày)" color="bg-sky-700 hover:bg-sky-600" disabled={busy} />
          <ActionButton onClick={breakthrough} label="Đột phá" color="bg-amber-700 hover:bg-amber-600" disabled={busy} />
        </div>
      </div>

      {/* NPCs in Current Location */}
      {currentNpcs.length > 0 && (
        <div className="border-t border-stone-800 pt-3 space-y-2">
          <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
            Nhân Vật Tại {currentLocation?.name ?? 'Địa Phương'}:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {currentNpcs.map((npc) => (
              <div
                key={npc.id}
                className="p-2.5 rounded bg-stone-950/50 border border-stone-800 space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-stone-200 text-xs">{npc.name}</span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Tin cậy: {npc.relationship.trust} | Hảo cảm: {npc.relationship.affinity}
                  </span>
                </div>
                {npc.status && <p className="text-[11px] text-stone-400 italic">{npc.status}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => talkToNpc(npc.id)}
                    className="px-2.5 py-1 text-xs rounded bg-stone-800 hover:bg-stone-700 text-amber-300 disabled:opacity-40"
                  >
                    Trò chuyện
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => giftNpc(npc.id)}
                    className="px-2.5 py-1 text-xs rounded bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-40"
                  >
                    Tặng quà
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Section */}
      {marketAvailable && (
        <div className="border-t border-stone-800 pt-3 space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Phường Thị / Chợ Phiên ({currentLocation?.name})
            </h3>
            <span className="text-xs text-amber-400 font-mono">
              Ngân lượng: {snapshot.inventory.spiritStones} linh thạch
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {marketWares.map((ware) => {
              const canAfford = snapshot.inventory.spiritStones >= ware.price;
              return (
                <div
                  key={ware.itemId}
                  className="p-2 rounded bg-stone-950/40 border border-stone-800 flex flex-col justify-between"
                >
                  <div>
                    <p className="font-medium text-xs text-stone-200">{ware.name}</p>
                    <p className="text-[11px] text-stone-400">{ware.desc}</p>
                    <p className="text-[11px] text-amber-400 font-mono mt-0.5">{ware.price} Linh thạch</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy || !canAfford}
                    onClick={() => buyItem(ware.itemId)}
                    className="mt-2 w-full py-1 text-xs rounded bg-amber-800 hover:bg-amber-700 text-amber-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {canAfford ? 'Mua 1' : 'Không đủ LT'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick sell from inventory */}
          {snapshot.inventory.items.length > 0 && (
            <div className="pt-1.5">
              <p className="text-[11px] text-stone-400 mb-1">Bán vật phẩm thu hồi linh thạch:</p>
              <div className="flex flex-wrap gap-1.5">
                {snapshot.inventory.items
                  .filter((it) => !it.questLocked)
                  .map((it) => {
                    const def = getItemDefinition(it.itemId);
                    const sellVal = Math.max(1, Math.floor((def?.price ?? 2) * 0.5));
                    return (
                      <button
                        key={it.instanceId}
                        type="button"
                        disabled={busy}
                        onClick={() => sellItem(it.instanceId)}
                        className="px-2 py-1 text-[11px] rounded bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-40"
                      >
                        Bán 1 {it.name} (+{sellVal} LT)
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Travel */}
      <div className="border-t border-stone-800 pt-3 space-y-1.5">
        <p className="text-xs font-semibold text-stone-400 uppercase">Du hành tới địa phương khác:</p>
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
              className="px-3 py-1.5 text-xs rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-stone-100 transition-colors"
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
      className={`px-4 py-2 text-sm rounded ${color} text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium`}
    >
      {label}
    </button>
  );
}
