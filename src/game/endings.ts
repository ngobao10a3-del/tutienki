import type { CanonicalGameState, CausalRecord } from '../core/types';
import { realmIndex } from './stats';

export interface EndingDefinition {
  readonly endingId: string;
  readonly title: string;
  readonly description: string;
  readonly check: (state: CanonicalGameState) => boolean;
}

const hasFlag = (state: CanonicalGameState, flag: string) => Boolean(state.world.worldFlags[flag]);
const recordCount = (records: readonly CausalRecord[], category: string) =>
  records.filter((r) => r.category === category).length;

export const ENDINGS: readonly EndingDefinition[] = [
  {
    endingId: 'ending_pham_dao_thanh_tien',
    title: 'Phàm Đạo Thành Tiên',
    description: 'Từ thân phàm hèn kém, ngươi bước lên con đường tu tiên bằng chính ý chí của mình. Không phải thiên tài, chỉ là người không bao giờ bỏ cuộc.',
    check: (state) => realmIndex(state.cultivation.currentRealm) >= 5 && state.causal.karmaScore > 30,
  },
  {
    endingId: 'ending_ngu_hanh_chi_ton',
    title: 'Ngũ Hành Chí Tôn',
    description: 'Ngươi nắm vững cả ngũ hành linh căn, trở thành bậc chí tôn điều khiển ngũ hành trong Thương Huyền Giới.',
    check: (state) => realmIndex(state.cultivation.currentRealm) >= 6 && state.cultivation.foundation > 70,
  },
  {
    endingId: 'ending_sat_phat_de_quan',
    title: 'Sát Phạt Đế Quân',
    description: 'Ngươi theo con đường sát phạt, dùng máu đen giá trị để nâng mình lên, trở thành đế quân khiến thiên hạ khiếp sợ.',
    check: (state) => realmIndex(state.cultivation.currentRealm) >= 5 && recordCount(state.causal.records, 'character') > 10 && state.causal.karmaScore < 20,
  },
  {
    endingId: 'ending_thien_menh_chi_tu',
    title: 'Thiên Mệnh Chi Tử',
    description: 'Ngươi nhận ra mình là quân cờ của thiên đạo — rồi quay lưng lại, viết lại thiên mệnh bằng tay mình.',
    check: (state) => hasFlag(state, 'flag_noticed_by_sect_master') && realmIndex(state.cultivation.currentRealm) >= 4,
  },
  {
    endingId: 'ending_nhat_dai_dan_ton',
    title: 'Nhất Đại Đan Tôn',
    description: 'Con đường luyện đan đưa ngươi tới tôn vị, danh xưng "Đan Tôn" vang khắp Thương Huyền Giới.',
    check: (state) => state.inventory.items.some((it) => it.category === 'dan_duoc' && it.quantity >= 10) && realmIndex(state.cultivation.currentRealm) >= 4,
  },
  {
    endingId: 'ending_nhan_qua_chi_chu',
    title: 'Nhân Quả Chi Chủ',
    description: 'Mỗi lựa chọn của ngươi để lại dấu sâu trong nhân quả. Ngươi trở thành chủ nhân của nhân quả, không còn là kẻ theo nó.',
    check: (state) => state.causal.records.length >= 25 && recordCount(state.causal.records, 'relationship') >= 5,
  },
  {
    endingId: 'ending_nghich_thien_doc_hanh',
    title: 'Nghịch Thiên Độc Hành',
    description: 'Ngươi đi ngược thiên đạo, một mình một đường, không thần thánh nào có thể đoán được bước tiếp theo của ngươi.',
    check: (state) => realmIndex(state.cultivation.currentRealm) >= 5 && recordCount(state.causal.records, 'karma') >= 8,
  },
];

export function checkEnding(state: CanonicalGameState): EndingDefinition | null {
  return ENDINGS.find((e) => e.check(state)) ?? null;
}
