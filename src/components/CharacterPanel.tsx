import { useState } from 'react';
import type { CanonicalGameState, GameResult, EquipmentSlot } from '../core/types';
import type { GameController } from '../app/GameController';
import { REALM_LABELS } from '../game/engines/cultivationEngine';
import { getItemDefinition } from '../game/effects';
import { QUEST_DEFINITIONS } from '../game/content/quests';

export function CharacterPanel({
  snapshot,
  expRequired,
  dispatch,
  controller,
}: {
  snapshot: Readonly<CanonicalGameState>;
  expRequired: number;
  dispatch?: (input: Parameters<GameController['dispatch']>[0]) => GameResult;
  controller?: GameController;
}) {
  const [tab, setTab] = useState<'stats' | 'inventory' | 'quests'>('stats');
  const [busy, setBusy] = useState(false);
  const realm = REALM_LABELS[snapshot.cultivation.currentRealm] ?? snapshot.cultivation.currentRealm;

  const run = (fn: () => void) => {
    setBusy(true);
    try {
      fn();
    } finally {
      setBusy(false);
    }
  };

  const handleUseItem = (instanceId: string) => {
    if (!dispatch || !controller) return;
    run(() => {
      dispatch(
        controller.normalizeAction({
          type: 'use_item',
          source: 'ui',
          payload: { itemInstanceId: instanceId, quantity: 1 },
        }),
      );
    });
  };

  const handleEquipItem = (instanceId: string | null, slot: EquipmentSlot) => {
    if (!dispatch || !controller) return;
    run(() => {
      dispatch(
        controller.normalizeAction({
          type: 'equip_item',
          source: 'ui',
          payload: { itemInstanceId: instanceId, slot },
        }),
      );
    });
  };

  const handleAcceptQuest = (questId: string) => {
    if (!dispatch || !controller) return;
    run(() => {
      dispatch(
        controller.normalizeAction({
          type: 'quest_accept',
          source: 'ui',
          payload: { questId },
        }),
      );
    });
  };

  const availableQuests = QUEST_DEFINITIONS.filter(
    (q) =>
      !snapshot.quests.activeQuestIds.includes(q.questId) &&
      !snapshot.quests.completedQuestIds.includes(q.questId),
  );

  return (
    <section className="border border-stone-800 bg-stone-900/70 rounded-lg p-4 space-y-3">
      <div className="flex gap-1">
        {(['stats', 'inventory', 'quests'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              tab === t ? 'bg-amber-600 text-white font-semibold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            {t === 'stats' ? 'Nhân Vật' : t === 'inventory' ? 'Túi Đồ' : 'Nhiệm Vụ'}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <div className="space-y-2 text-xs font-mono">
          <Row label="Cảnh giới" value={`${realm} tầng ${snapshot.cultivation.currentStage}`} />
          <Row label="Tiến độ" value={`${snapshot.cultivation.progress}/${expRequired}`} />
          <Row label="Cốt cách" value={`${snapshot.attributes.canCot}`} />
          <Row label="Linh lực" value={`${snapshot.attributes.linhLuc}`} />
          <Row label="Thân pháp" value={`${snapshot.attributes.thanPhap}`} />
          <Row label="Ngộ tính" value={`${snapshot.attributes.ngoTinh}`} />
          <Row label="Thần thức" value={`${snapshot.attributes.thanThuc}`} />
          <Row label="Tâm cảnh" value={`${snapshot.attributes.tamCanh}`} />
          <Row label="Đạo tâm" value={`${snapshot.attributes.daoTam}`} />
          <Row label="Nền tảng" value={`${snapshot.cultivation.foundation}`} />
          <Row label="Karma" value={`${snapshot.causal.karmaScore}`} />
          <Row label="Linh thạch" value={`${snapshot.inventory.spiritStones}`} />
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-3 text-xs">
          {/* Equipped items summary */}
          <div className="p-2.5 rounded bg-stone-950/60 border border-stone-800 space-y-1">
            <p className="font-semibold text-amber-300 mb-1">Trang Bị Hiện Tại:</p>
            {(
              [
                ['weapon', 'Vũ khí'],
                ['armor', 'Y phục'],
                ['artifact', 'Pháp bảo'],
              ] as const
            ).map(([slotKey, slotName]) => {
              const eqId = snapshot.inventory.equipped[slotKey];
              const eqItem = eqId ? snapshot.inventory.items.find((it) => it.instanceId === eqId) : null;
              return (
                <div key={slotKey} className="flex justify-between items-center text-stone-300">
                  <span className="text-stone-400">{slotName}:</span>
                  {eqItem ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-300 font-medium">{eqItem.name}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleEquipItem(null, slotKey)}
                        className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-amber-200"
                      >
                        Tháo
                      </button>
                    </div>
                  ) : (
                    <span className="text-stone-500 italic">Trống</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Item list */}
          <div className="space-y-2">
            <p className="font-semibold text-stone-300">
              Vật Phẩm Trong Túi ({snapshot.inventory.items.length}/{snapshot.inventory.maxCapacity}):
            </p>
            {snapshot.inventory.items.length === 0 ? (
              <p className="text-stone-500 italic">Túi đồ trống.</p>
            ) : (
              snapshot.inventory.items.map((item) => {
                const def = getItemDefinition(item.itemId);
                const isEquippable = Boolean(def?.equipSlot);
                const isConsumable = Boolean(def?.consumable);
                const isEquipped = isEquippable && def?.equipSlot
                  ? snapshot.inventory.equipped[def.equipSlot] === item.instanceId
                  : false;

                const effectsDesc: string[] = [];
                if (def?.effects?.heal) effectsDesc.push(`Hồi ${def.effects.heal} HP`);
                if (def?.effects?.spirit) effectsDesc.push(`Hồi ${def.effects.spirit} linh lực`);
                if (def?.effects?.cultivationSpeed) effectsDesc.push(`+${def.effects.cultivationSpeed} tốc độ tu luyện`);
                if (def?.effects?.breakthroughBonus) effectsDesc.push(`+${def.effects.breakthroughBonus}% tỷ lệ đột phá`);

                return (
                  <div
                    key={item.instanceId}
                    className="p-2 border border-stone-800 rounded bg-stone-950/40 space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-stone-200">
                        {item.name}
                        {isEquipped && (
                          <span className="ml-1.5 px-1 py-0.2 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                            Đang trang bị
                          </span>
                        )}
                      </span>
                      <span className="text-stone-400 font-mono">x{item.quantity}</span>
                    </div>

                    {effectsDesc.length > 0 && (
                      <p className="text-[11px] text-emerald-400">{effectsDesc.join(', ')}</p>
                    )}

                    {def?.description && (
                      <p className="text-[11px] text-stone-400 italic">{def.description}</p>
                    )}

                    <div className="flex gap-1.5 pt-1">
                      {isConsumable && (
                        <button
                          type="button"
                          disabled={busy || item.questLocked}
                          onClick={() => handleUseItem(item.instanceId)}
                          className="px-2.5 py-1 text-xs rounded bg-sky-800 hover:bg-sky-700 text-sky-100 disabled:opacity-40 transition-colors"
                        >
                          Sử dụng
                        </button>
                      )}

                      {isEquippable && def?.equipSlot && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handleEquipItem(
                              isEquipped ? null : item.instanceId,
                              def.equipSlot!,
                            )
                          }
                          className={`px-2.5 py-1 text-xs rounded transition-colors ${
                            isEquipped
                              ? 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                              : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100'
                          }`}
                        >
                          {isEquipped ? 'Tháo ra' : 'Trang bị'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === 'quests' && (
        <div className="space-y-3 text-xs">
          <div>
            <p className="font-semibold text-stone-300 mb-1.5">Nhiệm Vụ Đang Thực Hiện:</p>
            {snapshot.quests.activeQuestIds.length === 0 ? (
              <p className="text-stone-500 italic">Không có nhiệm vụ nào đang làm.</p>
            ) : (
              <div className="space-y-2">
                {snapshot.quests.activeQuestIds.map((qid) => {
                  const quest = snapshot.quests.quests[qid];
                  if (!quest) return null;
                  return (
                    <div key={qid} className="border border-stone-800 rounded p-2.5 bg-stone-950/40 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-amber-300">{quest.title}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 uppercase">
                          {quest.type}
                        </span>
                      </div>
                      <div className="space-y-1 pt-0.5">
                        {quest.objectives.map((obj) => (
                          <p
                            key={obj.id}
                            className={`flex items-center gap-1.5 ${
                              obj.completed ? 'text-emerald-400' : 'text-stone-300'
                            }`}
                          >
                            <span>{obj.completed ? '✓' : '○'}</span>
                            <span>{obj.description}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {availableQuests.length > 0 && (
            <div className="border-t border-stone-800 pt-2 space-y-2">
              <p className="font-semibold text-stone-400">Nhiệm Vụ Có Thể Nhận:</p>
              {availableQuests.map((aq) => (
                <div
                  key={aq.questId}
                  className="p-2 border border-stone-800/80 rounded bg-stone-950/20 space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-stone-300">{aq.title}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAcceptQuest(aq.questId)}
                      className="px-2 py-0.5 text-xs rounded bg-amber-700 hover:bg-amber-600 text-amber-100 disabled:opacity-40"
                    >
                      Nhận
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-400">{aq.description}</p>
                  <p className="text-[10px] text-stone-500">
                    Phần thưởng: {aq.rewardSpiritStones ? `${aq.rewardSpiritStones} LT ` : ''}
                    {aq.rewardExp ? `+${aq.rewardExp} EXP` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-stone-800 pb-1">
      <span className="text-stone-400">{label}</span>
      <span className="text-stone-100">{value}</span>
    </div>
  );
}
