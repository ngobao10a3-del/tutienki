import { useEffect, useState } from 'react';
import type { SaveMeta, SaveSlot } from '../game/saveSystem';

export function SaveLoadOverlay({
  mode,
  slots,
  metas,
  onSave,
  onLoad,
  onClose,
}: {
  mode: 'save' | 'load';
  slots: readonly SaveSlot[];
  metas: Record<SaveSlot, SaveMeta | null>;
  onSave: (slot: SaveSlot) => void;
  onLoad: (slot: SaveSlot) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-5 max-w-md w-full space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-amber-400">{mode === 'save' ? 'Lưu Trò Chơi' : 'Tải Trò Chơi'}</h2>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-200 text-xl">×</button>
        </div>
        <div className="space-y-2">
          {slots.map((slot) => {
            const meta = metas[slot];
            return (
              <button
                key={slot}
                type="button"
                onClick={() => (mode === 'save' ? onSave(slot) : meta && onLoad(slot))}
                disabled={mode === 'load' && !meta}
                className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                  meta
                    ? 'border-stone-700 bg-stone-800 hover:bg-stone-700'
                    : 'border-stone-800 bg-stone-900 opacity-60 cursor-not-allowed'
                } disabled:cursor-not-allowed`}
              >
                <p className="text-sm font-medium text-stone-100">{slot.replace('slot_', 'Ô ')}: {meta ? meta.characterName : '(trống)'}</p>
                {meta && (
                  <p className="text-xs text-stone-400">
                    Cảnh giới: {meta.realm} — Ngày {meta.day} — v{meta.stateVersion}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
