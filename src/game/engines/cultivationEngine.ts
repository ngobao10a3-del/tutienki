import type { ActionHandler, ActionResolutionContext } from '../../core/types';
import { GamePatchBuilder } from '../GamePatchBuilder';
import { getItemDefinition, sumEffects } from '../effects';
import { expRequiredFor, maxStageFor, realmIndex } from '../stats';

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

interface CultivatePayload {
  readonly activity: string;
  readonly durationDays: number;
  readonly supportItemInstanceId?: string;
}

interface BreakthroughPayload {
  readonly targetRealm?: string;
  readonly catalystItemInstanceIds?: readonly string[];
}

export function buildCultivationHandlers(): readonly ActionHandler<any>[] {
  return [cultivateHandler, breakthroughHandler];
}

const cultivateHandler: ActionHandler<any> = {
  actionType: 'cultivate',
  allowedDomains: ['cultivation', 'world', 'attributes', 'inventory', 'narrative', 'causal'],
  handle: (action: { payload: CultivatePayload }, ctx: ActionResolutionContext) => {
    const { activity, durationDays, supportItemInstanceId } = action.payload;
    const state = ctx.state;
    const builder = new GamePatchBuilder(state);

    let speedBonus = 0;
    if (supportItemInstanceId) {
      const item = state.inventory.items.find((it) => it.instanceId === supportItemInstanceId);
      const def = item ? getItemDefinition(item.itemId) : undefined;
      if (!item || !def) {
        return { ok: false, error: { category: 'BUSINESS_ERROR', code: 'ITEM_NOT_FOUND', message: 'Không tìm thấy vật phẩm hỗ trợ tu luyện.' } };
      }
      const effects = sumEffects([def.effects ?? {}]);
      speedBonus = effects.cultivationSpeed ?? 0;
      const nextItems = item.quantity <= 1
        ? state.inventory.items.filter((it) => it.instanceId !== supportItemInstanceId)
        : state.inventory.items.map((it) => (it.instanceId === supportItemInstanceId ? { ...it, quantity: it.quantity - 1 } : it));
      builder.inventory({ ...state.inventory, items: nextItems });
    }

    const gainedRaw = Math.round((state.cultivation.speed + speedBonus) * durationDays * (activity === 'luyen_hoa_linh_khi' ? 1.5 : 1));

    const patch = builder
      .worldTime(durationDays)
      .cultivation({
        progress: state.cultivation.progress + gainedRaw,
        exp: state.cultivation.exp + Math.floor(gainedRaw / 4),
      })
      .logEvent(`[Tu luyện] ${activity} trong ${durationDays} ngày, tiến độ +${gainedRaw}.`)
      .build();

    return { ok: true, patch, summary: `Tu luyện ${durationDays} ngày, tiến độ +${gainedRaw}.` };
  },
};

const breakthroughHandler: ActionHandler<any> = {
  actionType: 'breakthrough',
  allowedDomains: ['cultivation', 'world', 'character', 'narrative', 'causal', 'inventory'],
  handle: (action: { actionId: string; payload: BreakthroughPayload }, ctx: ActionResolutionContext) => {
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
    const roll = ctx_nextFloat(ctx) * 100 + bonus + cultivation.foundation * 0.15;
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
      fromRealm: cultivation.currentRealm as never,
      fromStage: cultivation.currentStage,
      toRealm: nextRealm as never,
      toStage: nextStage,
      outcome,
      day: state.world.time.totalDays,
    };

    const patch = builder
      .worldTime(1)
      .cultivation({
        currentRealm: nextRealm as never,
        currentStage: nextStage,
        progress: outcome === 'that_bai' ? Math.floor(cultivation.progress * 0.4) : 0,
        foundation: Math.max(1, cultivation.foundation + foundationDelta),
        breakthroughHistory: [...cultivation.breakthroughHistory, record],
        bottleneck: outcome === 'khong_on_dinh',
      })
      .character({ realm: nextRealm as never })
      .logEvent(`[Đột phá] ${REALM_LABELS[cultivation.currentRealm]} tầng ${cultivation.currentStage} → ${REALM_LABELS[nextRealm]} tầng ${nextStage}. Kết quả: ${outcome}.`)
      .recordCausal(action.actionId, 'character', isRealmUp ? 'D3' : 'D2', `Đột phá tới ${REALM_LABELS[nextRealm]} tầng ${nextStage}`, 'Đột phá cảnh giới', [`Kết quả: ${outcome}`])
      .build();

    const outcomeLabel = outcome === 'hoan_my' ? 'hoàn mỹ' : outcome === 'thanh_cong' ? 'thành công' : outcome === 'khong_on_dinh' ? 'không ổn định' : 'thất bại';
    return { ok: true, patch, summary: `Đột phá ${outcomeLabel}: ${REALM_LABELS[nextRealm]} tầng ${nextStage}.` };
  },
};

function ctx_nextFloat(ctx: { nextFloat: () => number; state: import('../../core/types').CanonicalGameState }): number {
  return ctx.nextFloat();
}

export { expRequiredFor };
