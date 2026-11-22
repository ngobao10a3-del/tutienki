import { useState } from 'react';
import type { CanonicalGameState } from '../core/types';
import { REALM_LABELS } from '../game/engines/cultivationEngine';

export function CharacterPanel({
  snapshot,
  expRequired,
}: {
  snapshot: Readonly<CanonicalGameState>;
  expRequired: number;
}) {
  const [tab, setTab] = useState<'stats' | 'inventory' | 'quests'>('stats');
  const realm = REALM_LABELS[snapshot.cultivation.currentRealm] ?? snapshot.cultivation.currentRealm;

  return (
    <section className="border border-stone-800 bg-stone-900/70 rounded-lg p-4 space-y-3">
      <div className="flex gap-1">
        {(['stats', 'inventory', 'quests'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-xs rounded ${tab === t ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}
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
        <div className="space-y-1 text-xs">
          {snapshot.inventory.items.length === 0 ? (
            <p className="text-stone-500 italic">Túi đồ trống.</p>
          ) : (
            snapshot.inventory.items.map((item) => (
              <div key={item.instanceId} className="flex justify-between border-b border-stone-800 pb-1">
                <span>{item.name}</span>
                <span className="text-stone-400">x{item.quantity}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'quests' && (
        <div className="space-y-2 text-xs">
          {snapshot.quests.activeQuestIds.length === 0 ? (
            <p className="text-stone-500 italic">Không có nhiệm vụ nào đang làm.</p>
          ) : (
            snapshot.quests.activeQuestIds.map((qid) => {
              const quest = snapshot.quests.quests[qid];
              if (!quest) return null;
              return (
                <div key={qid} className="border border-stone-800 rounded p-2">
                  <p className="font-semibold text-stone-200">{quest.title}</p>
                  {quest.objectives.map((obj) => (
                    <p key={obj.id} className="text-stone-400">
                      {obj.completed ? '✓' : '○'} {obj.description}
                    </p>
                  ))}
                </div>
              );
            })
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
