import type { CanonicalGameState } from '../core/types';

/**
 * Deterministic narration layer. Produces flavor text based purely on canonical state.
 * Never mutates state. An optional AI layer can enrich descriptions but MUST NOT
 * alter gameplay values — deterministic fallback is always available.
 */
export function narrateScene(state: CanonicalGameState): string {
  const realm = REALM_VIETNAMES[state.cultivation.currentRealm] ?? state.cultivation.currentRealm;
  const day = state.world.time.totalDays;
  const location = state.world.currentLocationId === 'loc_thanh_nguu_tran' ? 'Thanh Ngưu Trấn' : state.world.currentLocationId;

  if (state.combat.inCombat) {
    return `Trận chiến đang diễn ra — lượt ${state.combat.turn}. Hãy chọn hành động.`;
  }
  if (state.character.status === 'trong_thuong') {
    return `Ngươi đang trọng thương — cần nghỉ ngơi hoặc dùng đan dược.`;
  }
  return `Ngày ${day} — ${location}. ${state.character.name} (${realm}, tầng ${state.cultivation.currentStage}) đang có ${state.inventory.spiritStones} linh thạch.`;
}

const REALM_VIETNAMES: Record<string, string> = {
  pham_nhan: 'Phàm Nhân',
  luyen_khi: 'Luyện Khí',
  truc_co: 'Trúc Cơ',
  kim_dan: 'Kim Đan',
  nguyen_anh: 'Nguyên Anh',
  hoa_than: 'Hóa Thần',
  luyen_hu: 'Luyện Hư',
  hop_the: 'Hợp Thể',
  dai_thua: 'Đại Thừa',
  do_kiep: 'Độ Kiếp',
};
