import type { QuestObjective, QuestType } from '../../core/types';

export interface QuestDefinition {
  readonly questId: string;
  readonly title: string;
  readonly type: QuestType;
  readonly description: string;
  readonly relatedNpcId?: string;
  readonly relatedLocationId?: string;
  readonly objectives: readonly QuestObjective[];
  readonly rewardSpiritStones?: number;
  readonly rewardItemIds?: readonly string[];
  readonly rewardExp?: number;
  readonly deadlineDays?: number;
  readonly autoAccepted?: boolean;
  readonly questGiverFlag?: string;
}

export const QUEST_DEFINITIONS: readonly QuestDefinition[] = [
  {
    questId: 'quest_ch1_thanh_nguu_khoi_hanh',
    title: 'Khởi Hành Thanh Ngưu',
    type: 'main',
    description: 'Làm quen trấn Thanh Ngưu, tìm hiểu về phiên chợ linh cốc sắp diễn ra.',
    relatedLocationId: 'loc_thanh_nguu_tran',
    objectives: [
      { id: 'obj_talk_tran_doanh', description: 'Nói chuyện với thợ rèn Trần Doanh', current: 0, required: 1, completed: false },
      { id: 'obj_earn_10_stones', description: 'Có ít nhất 10 linh thạch trong túi', current: 0, required: 1, completed: false },
    ],
    rewardExp: 30,
    autoAccepted: true,
  },
  {
    questId: 'quest_ch1_loi_hen_rung',
    title: 'Lời Hẹn Trong Rừng',
    type: 'side',
    description: 'Lưu Sư Viễn nhờ bạn thu thập Huyết Sam Linh Thảo trong Rừng Nguyên Sắc.',
    relatedNpcId: 'npc_luu_suv',
    questGiverFlag: 'flag_met_luu_suv',
    objectives: [
      { id: 'obj_collect_huyet_sam', description: 'Thu thập 3 Huyết Sam Linh Thảo', current: 0, required: 3, completed: false },
    ],
    rewardSpiritStones: 30,
    rewardExp: 25,
    deadlineDays: 20,
  },
  {
    questId: 'quest_ch2_thuong_doi_mat_tich',
    title: 'Thương Đội Mất Tích',
    type: 'main',
    description: 'Thương đội của chín thế gia biến mất trong Hoang Linh Cốc. Bà Chương Phượng treo thưởng tìm manh mối.',
    relatedNpcId: 'npc_cho_phuong',
    relatedLocationId: 'loc_hoang_linh_coc',
    objectives: [
      { id: 'obj_talk_ba_chuong', description: 'Gặp bà Chương Phượng ở Chợ Phượng Mậu', current: 0, required: 1, completed: false },
      { id: 'obj_find_mo_tham', description: 'Tìm Lão Mô Thâm trong Hoang Linh Cốc', current: 0, required: 1, completed: false },
    ],
    rewardSpiritStones: 50,
    rewardExp: 60,
    deadlineDays: 30,
  },
  {
    questId: 'quest_ch2_dao_phum_sat_nhan',
    title: 'Đạo Phốm Sát Nhân',
    type: 'side',
    description: 'Hoàng Vỹ của Thiên Đạo Minh nghi ngờ có kẻ luyện huyết công pháp dưới cốc. Cần bằng chứng.',
    relatedNpcId: 'npc_hoang_vi',
    relatedLocationId: 'loc_hoang_linh_coc',
    questGiverFlag: 'flag_met_hoang_vi',
    objectives: [
      { id: 'obj_investigate_camp', description: 'Khảo sát remnants doanh trại trong cốc', current: 0, required: 1, completed: false },
      { id: 'obj_report_hoang_vi', description: 'Báo lại kết quả cho Hoàng Vỹ', current: 0, required: 1, completed: false },
    ],
    rewardSpiritStones: 35,
    rewardExp: 45,
  },
];
