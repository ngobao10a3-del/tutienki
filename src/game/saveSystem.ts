import type { CanonicalGameState } from '../core/types';
import { StateValidator } from '../core/validation/StateValidator';

export const SAVE_VERSION = 2;
const SAVE_PREFIX = 'tutienki_save_';
export const SAVE_SLOTS = ['slot_1', 'slot_2', 'slot_3'] as const;
export type SaveSlot = (typeof SAVE_SLOTS)[number];

export interface SaveMeta {
  readonly version: number;
  readonly savedAt: number;
  readonly characterName: string;
  readonly realm: string;
  readonly stateVersion: number;
  readonly day: number;
}

export interface SaveFile {
  readonly meta: SaveMeta;
  readonly state: CanonicalGameState;
}

export function saveGame(slot: SaveSlot, state: CanonicalGameState): { ok: boolean; error?: string } {
  try {
    const file: SaveFile = {
      meta: {
        version: SAVE_VERSION,
        savedAt: Date.now(),
        characterName: state.character.name,
        realm: state.cultivation.currentRealm,
        stateVersion: state.stateVersion,
        day: state.world.time.totalDays,
      },
      state,
    };
    localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(file));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function loadGame(slot: SaveSlot): { ok: true; state: CanonicalGameState } | { ok: false; error: string } {
  try {
    const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`);
    if (!raw) return { ok: false, error: 'Không tìm thấy bản lưu trong ô này.' };
    const parsed = JSON.parse(raw) as SaveFile;
    if (!parsed || typeof parsed !== 'object' || !parsed.state) {
      return { ok: false, error: 'Dữ liệu bản lưu hỏng hoặc sai cấu trúc.' };
    }
    if (parsed.meta.version !== SAVE_VERSION) {
      return { ok: false, error: `Phiên bản bản lưu (${parsed.meta.version}) không tương thích với game (${SAVE_VERSION}).` };
    }
    const validation = StateValidator.validateState(parsed.state);
    if (!validation.valid) {
      return { ok: false, error: `Bản lưu vi phạm tính toàn vẹn trạng thái: ${validation.issues.slice(0, 3).map((i) => i.message).join('; ')}` };
    }
    return { ok: true, state: parsed.state };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Không thể đọc bản lưu.' };
  }
}

export function listSaveSlots(): Record<SaveSlot, SaveMeta | null> {
  const out = {} as Record<SaveSlot, SaveMeta | null>;
  for (const slot of SAVE_SLOTS) {
    try {
      const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`);
      if (!raw) {
        out[slot] = null;
        continue;
      }
      const parsed = JSON.parse(raw) as SaveFile;
      out[slot] = parsed?.meta ?? null;
    } catch {
      out[slot] = null;
    }
  }
  return out;
}

export function deleteSave(slot: SaveSlot): void {
  localStorage.removeItem(`${SAVE_PREFIX}${slot}`);
}
