import type { ActionHandler, CultivationState, GameStatePatch } from '../core/types';
import { GamePatchBuilder } from './GamePatchBuilder';
import { getItemDefinition, sumEffects } from './effects';
import { expRequiredFor, maxStageFor, realmIndex, REALM_STAGE_MAX } from './stats';
import type { CanonicalGameState } from '../core/types';
import { StateValidator } from '../core/validation/StateValidator';

const REALM_NAMES = ['pham_nhan', 'luyen_khi', 'truc_co', 'kim_dan', 'nguyen_anh', 'hoa_than', 'luyen_hu', 'hop_the', 'dai_thua', 'do_kiep'] as const;
export const REALM_LABELS: Record<string, string> = {
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

export function buildCultivationHandlers(): readonly ActionHandler<any>[] {
  return [cultivateHandler, breakthroughHandler];
}

const cultivateHandler: ActionHandler<any> = {
  actionType: 'cultivate',
  allowedDomains: ['cultivation', 'world', 'attributes', 'inventory', 'narrative', 'causal'],
  handle: (action, ctx) => {
    const { activity, durationDays, supportItemInstanceId } = action.payload;
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);

    let speedBonus = 0;
    let nextInventory = state.inventory;
    if (supportItemInstanceId) {
      const item = state.inventory.items.find((it) => it.instanceId === supportItemInstanceId);
      const def = item ? getItemDefinition(item.itemId) : undefined;
      if (!item || !def) {
        return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'ITEM_NOT_FOUND', message: 'Không tìm thấy vật phẩm hỗ trợ tu luyện.' } };
      }
      const effects = sumEffects([def.effects ?? {}]);
      speedBonus = effects.cultivationSpeed ?? 0;
      if (item.quantity <= 1) {
        nextInventory = {
          ...state.inventory,
          items: state.inventory.items.filter((it) => it.instanceId !== supportItemInstanceId),
        };
      } else {
        nextInventory = {
          ...state.inventory,
          items: state.inventory.items.map((it) =>
            it.instanceId === supportItemInstanceId ? { ...it, quantity: it.quantity - 1 } : it,
          ),
        };
      }
      builder.inventory(nextInventory);
    }

    const baseSpeed = state.cultivation.speed;
    const gainedRaw = Math.round((baseSpeed + speedBonus) * durationDays * (activity === 'luyen_hoa_linh_khi' ? 1.5 : 1));
    const progressMax = expRequiredFor(state.cultivation);
    const nextProgress = state.cultivation.progress + gainedRaw;

    const patch = builder
      .worldTime(durationDays)
      .cultivation({
        progress: nextProgress,
        exp: state.cultivation.exp + Math.floor(gainedRaw / 4),
        path: activity === 'tu_luyen_the_chat' ? 'the_tu' : state.cultivation.path,
      })
      .logEvent(`[Tu luyện] ${activity} trong ${durationDays} ngày, tiến độ +${gainedRaw}.`)
      .build();

    return { ok: true, patch, summary: `Tu luyện ${durationDays} ngày, tiến độ +${gainedRaw}.` };
  },
};

const breakthroughHandler: ActionHandler<any> = {
  actionType: 'breakthrough',
  allowedDomains: ['cultivation', 'world', 'character', 'narrative', 'causal', 'inventory'],
  handle: (action, ctx) => {
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);
    const cultivation = state.cultivation;
    const required = expRequiredFor(cultivation);
    const stageMax = maxStageFor(cultivation.currentRealm);

    if (cultivation.currentStage >= stageMax && realmIndex(cultivation.currentRealm) >= REALM_NAMES.length - 1) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'REALM_MAX', message: 'Đã đạt cảnh giới tối đa của Thương Huyền Giới.' } };
    }

    if (cultivation.progress < required) {
      return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'BREAKTHROUGH_NOT_READY', message: `Tiến độ ${cultivation.progress}/${required} chưa đủ để đột phá.` } };
    }

    const bonus = (action.payload.catalystItemInstanceIds ?? []).length * 10;
    const roll = ctx.nextFloat() * 100 + bonus + state.cultivation.foundation * 0.15;
    const stageNext = cultivation.currentStage + 1;
    const isRealmUp = stageNext > stageMax;
    const nextRealm = isRealmUp
      ? REALM_NAMES[Math.min(REALM_NAMES.length - 1, realmIndex(cultivation.currentRealm) + 1)]
      : cultivation.currentRealm;
    const nextStage = isRealmUp ? 1 : stageNext;

    let outcome: 'hoan_my' | 'thanh_cong' | 'khong_on_dinh' | 'that_bai';
    if (roll > 85) outcome = 'hoan_my';
    else if (roll > 45) outcome = 'thanh_cong';
    else if (roll > 20) outcome = 'khong_on_dinh';
    else outcome = 'that_bai';

    const foundationDelta = outcome === 'hoan_my' ? 8 : outcome === 'thanh_cong' ? 4 : outcome === 'khong_on_dinh' ? -2 : -6;
    const record = {
      id: `bt_${state.world.time.totalDays}_${cultivation.breakthroughHistory.length + 1}`,
      fromRealm: cultivation.currentRealm,
      fromStage: cultivation.currentStage,
      toRealm: nextRealm,
      toStage: nextStage,
      outcome,
      day: state.world.time.totalDays,
    };

    const builderFull = builder
      .worldTime(1)
      .cultivation({
        currentRealm: nextRealm,
        currentStage: nextStage,
        progress: outcome === 'that_bai' ? Math.floor(cultivation.progress * 0.4) : 0,
        foundation: Math.max(1, cultivation.foundation + foundationDelta),
        breakthroughHistory: [...cultivation.breakthroughHistory, record],
        bottleneck: outcome === 'khong_on_dinh',
      })
      .character({ realm: nextRealm })
      .logEvent(`[Đột phá] ${REALM_LABELS[cultivation.currentRealm]} tầng ${cultivation.currentStage} → ${REALM_LABELS[nextRealm]} tầng ${nextStage}. Kết quả: ${outcome}.`)
      .recordCausal(action.actionId, 'character', isRealmUp ? 'D3' : 'D2', `Đột phá tới ${REALM_LABELS[nextRealm]} tầng ${nextStage}`, 'Đột phá cảnh giới', [`Kết quả: ${outcome}`]);

    return { ok: true, patch: builderFull.build(), summary: `Đột phá ${outcome === 'hoan_my' ? 'hoàn mỹ' : outcome === 'thanh_cong' ? 'thành công' : outcome === 'khong_on_dinh' ? 'không ổn định' : 'thất bại'}: ${REALM_LABELS[nextRealm]} tầng ${nextStage}.` };
  },
};
