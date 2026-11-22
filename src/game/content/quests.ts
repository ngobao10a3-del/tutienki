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
    description: 'Làm quen trấn Thanh Ngưu, tìm hiểu về phiên我们认为 linh cốc sắp diễn ra.',
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
    questId: 'quest_ch1_duong_toi_thanh_van',
    title: 'Con Đường Tới Thanh Vân',
    type: 'main',
    description: 'Tìm cách được nhận vào Thanh Vân Tông với tư cách đệ tử hằng năm.',
    relatedLocationId: 'loc_thanh_van_tong',
    objectives: [
      { id: 'obj_realm_luyen_khi', description: 'Đạt cảnh giới Luyện Khí', current: 0, required: 1, completed: false },
      { id: 'obj_travel_thanh_van', description: 'Du hành tới Sơn Môn Thanh Vân Tông', current: 0, required: 1, completed: false },
    ],
    rewardExp: 80,
  },
];
