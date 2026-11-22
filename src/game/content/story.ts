import type { StateDomain } from '../../core/types';

export type ChoiceRequirementFlag =
  | { kind: 'minAttribute'; attribute: string; value: number }
  | { kind: 'minKarma'; value: number }
  | { kind: 'hasItem'; itemId: string; quantity?: number }
  | { kind: 'realmAtLeast'; realmIndex: number }
  | { kind: 'flagSet'; flag: string };

export interface StoryChoice {
  readonly choiceId: string;
  readonly text: string;
  readonly requirements?: readonly ChoiceRequirementFlag[];
  readonly weight: import('../../core/types').DecisionWeight;
  readonly domain: import('../../core/types').CausalCategory;
  readonly consequences: readonly string[];
  readonly successChance?: number;
  readonly successConsequences?: readonly string[];
  readonly failureConsequences?: readonly string[];
  readonly nextEventId?: string;
  readonly questId?: string;
}

export interface StoryEvent {
  readonly eventId: string;
  readonly title: string;
  readonly description: string;
  readonly unique?: boolean;
  readonly cooldownDays?: number;
  readonly allowedDomains: readonly StateDomain[];
  readonly choices: readonly StoryChoice[];
  readonly nextEventId?: string;
}

export interface SceneDefinition {
  readonly sceneId: string;
  readonly chapterId: string;
  readonly title: string;
  readonly intro: string;
  readonly locationId: string;
  readonly entryEventId?: string;
}

export interface ChapterDefinition {
  readonly chapterId: string;
  readonly title: string;
  readonly description: string;
  readonly scenes: readonly SceneDefinition[];
  readonly completionFlag: string;
}

export const EVENTS: Record<string, StoryEvent> = {
  ev_ch1_opening: {
    eventId: 'ev_ch1_opening',
    title: 'Khởi Đầu Ở Thanh Ngưu Trấn',
    description: 'Chuyện bắt đầu vào một buổi sớm mờ sương ở Thanh Ngưu Trấn. Ngươi là Lâm Phàm, thôn phàm mồ côi ở ngoại vi Thương Huyền Giới, trong mình chỉ có ý chí "Bình Phàm" và năm linh thạch mẹ để lại. Phiên chợ linh cốc sắp mở, tiếng chuông chợ leng keng vang ngoài đường.',
    unique: true,
    allowedDomains: ['narrative', 'quests', 'character', 'causal'],
    choices: [
      {
        choiceId: 'ch_visit_market',
        text: 'Ra chợ phiên tìm cơ duyên, xem thử có việc gì làm kiếm linh thạch.',
        weight: 'D1',
        domain: 'narrative',
        consequences: ['Gặp gỡ thương nhân bí ẩn Tiểu Thiên'],
        nextEventId: 'ev_meet_tieu_thien',
      },
      {
        choiceId: 'ch_practice_martial',
        text: 'Ra sau đồi luyện quyền, muốn đi tu tiên thì thân thể phải khỏe.',
        weight: 'D2',
        domain: 'character',
        consequences: ['canCot +1', 'Nền tảng thể chất vững hơn'],
        nextEventId: null,
      },
      {
        choiceId: 'ch_listen_rumor',
        text: 'Ngồi quán trà nghe tin tức về Thanh Vân Tông chiêu sinh.',
        weight: 'D1',
        domain: 'narrative',
        consequences: ['Biết tin lộ trình chiêu sinh của Thanh Vân Tông'],
        nextEventId: 'ev_hear_rumor',
      },
    ],
  },
  ev_meet_tieu_thien: {
    eventId: 'ev_meet_tieu_thien',
    title: 'Hành Giả Bí Ẩn',
    description: 'Trong căm chợ, một thiếu nữ áo xanh đang bày ra vài linh dược quý hiếm. Nàng nhìn ngươi rồi khẽ cười: "Tu sĩ phi pháp như ngươi hiếm khi dám đến đây. Ta là Tiểu Thiên, làm nghề buôn tin. Ngươi muốn mua tin hay bán tin?"',
    unique: true,
    allowedDomains: ['narrative', 'relationships', 'inventory', 'causal'],
    choices: [
      {
        choiceId: 'ch_buy_rumor',
        text: 'Mua tin về phiên chợ linh cốc (5 linh thạch).',
        weight: 'D1',
        domain: 'narrative',
        consequences: ['Mất 5 linh thạch', 'Biết nơi tìm linh thảo quý'],
        nextEventId: 'ev_hear_rumor',
      },
      {
        choiceId: 'ch_chat_up',
        text: 'Trò chuyện làm quen, ghi nhớ nàng để sau này nhờ vả.',
        weight: 'D2',
        domain: 'relationship',
        consequences: ['Tiểu Thiên ghi nhớ ngươi', 'trust +5'],
      },
      {
        choiceId: 'ch_leave',
        text: 'Không quan tâm, quay về việc của mình.',
        weight: 'D1',
        domain: 'narrative',
        consequences: ['Bỏ lỡ cơ hội làm quen'],
      },
    ],
  },
  ev_hear_rumor: {
    eventId: 'ev_hear_rumor',
    title: 'Tin Từ Quán Trà',
    description: 'Nghe nói Thanh Vân Tông sẽ tổ chức đại lễ chiêu sinh sau một tháng nữa, chọn đệ tử có linh căn từ khắp Thương Huyền Giới. Ai vượt qua được ba vòng khảo hách sẽ được nhận vào ngoại môn.',
    unique: true,
    allowedDomains: ['narrative', 'quests', 'causal'],
    choices: [
      {
        choiceId: 'ch_decide_join',
        text: 'Quyết tâm tham gia chiêu sinh, bắt đầu tu luyện nghiêm túc.',
        weight: 'D3',
        domain: 'character',
        consequences: ['Mở quest Con Đường Tới Thanh Vân', 'daoTam +1'],
        nextEventId: 'ev_ch1_first_cultivation',
      },
      {
        choiceId: 'ch_dismiss',
        text: 'Chỉ là tin đồn, thôi cứ sống chậm mà chắc.',
        weight: 'D1',
        domain: 'narrative',
        consequences: ['Không đi theo con đường chính tắc'],
      },
    ],
  },
  ev_ch1_first_cultivation: {
    eventId: 'ev_ch1_first_cultivation',
    title: 'Dạ Thứ Nhất Ngộ Linh',
    description: 'Đêm đầu tiên ngồi thiền theo cách dân gian truyền nhau, ngươi cảm nhận được làn khí mỏng như tơ trong không gian. Đó là linh khí — hơi thở của tu tiên đạo.',
    unique: true,
    allowedDomains: ['cultivation', 'narrative', 'causal'],
    choices: [
      {
        choiceId: 'ch_first_breath',
        text: 'Điều chỉnh hơi thở, dẫn linh khí vào trong kinh mạch.',
        weight: 'D3',
        domain: 'cultivation',
        consequences: ['Lĩnh ngộ lần đầu về tu luyện', 'Tiến độ tu luyện +20'],
        nextEventId: null,
      },
    ],
  },
  enc_bandit_ambush: {
    eventId: 'enc_bandit_ambush',
    title: 'Mạo Phiên Chặn Đường',
    description: 'Một tên tu sĩ phi pháp chặn đường, gươm chỉ thẳng: "Để linh thạch lại, mạng giữ lấy."',
    allowedDomains: ['combat', 'narrative', 'inventory', 'causal'],
    choices: [
      {
        choiceId: 'ch_fight',
        text: 'Rút vũ khí chiến đấu.',
        weight: 'D2',
        domain: 'character',
        consequences: ['Bắt đầu giao chiến'],
      },
      {
        choiceId: 'ch_pay',
        text: 'Đưa hết linh thạch để đổi lấy an toàn.',
        weight: 'D2',
        domain: 'karma',
        consequences: ['Mất toàn bộ linh thạch'],
      },
      {
        choiceId: 'ch_flee',
        text: 'Chạy về phía đông dân cư.',
        weight: 'D1',
        domain: 'narrative',
        successChance: 0.6,
        successConsequences: ['Thoát thân an toàn'],
        failureConsequences: ['Bị tên đạo tu rượt theo, bắt đầu giao chiến'],
      },
    ],
  },
  enc_wild_beast: {
    eventId: 'enc_wild_beast',
    title: 'Huyết Lang Xuất Hiện',
    description: 'Một con Huyết Lang mắt đỏ từ bụi cây vồ tới, nanh sắc lóe sáng.',
    allowedDomains: ['combat', 'narrative', 'inventory', 'causal'],
    choices: [
      {
        choiceId: 'ch_fight_beast',
        text: 'Đỡ đòn và phản công.',
        weight: 'D2',
        domain: 'character',
        consequences: ['Bắt đầu giao chiến'],
      },
      {
        choiceId: 'ch_climb_tree',
        text: 'Trèo lên cây chờ nó đi mất.',
        weight: 'D1',
        domain: 'narrative',
        successChance: 0.7,
        successConsequences: ['Con thú bỏ đi sau một lúc lâu'],
        failureConsequences: ['Bị vồ trúng vai, bắt đầu giao chiến'],
      },
    ],
  },
  enc_herb_gathering: {
    eventId: 'enc_herb_gathering',
    title: 'Linh Thảo Ven Đường',
    description: 'Ngươi phát hiện một nhánh linh thảo mọc tự nhiên, khí lạnh toát ra.',
    allowedDomains: ['inventory', 'narrative', 'causal'],
    choices: [
      {
        choiceId: 'ch_harvest_carefully',
        text: 'Thu hoạch cẩn thận toàn bộ rễ lá.',
        weight: 'D1',
        domain: 'narrative',
        successChance: 0.8,
        successConsequences: ['Nhận 1-2 Huyết Sam Linh Thảo'],
        failureConsequences: ['Linh thảo bị nát, chỉ nhận một mảnh nhỏ'],
      },
      {
        choiceId: 'ch_harvest_all',
        text: 'Bứng cả gốc luôn, không đợi ngày mai.',
        weight: 'D2',
        domain: 'karma',
        consequences: ['Nhận 2 Huyết Sam Linh Thảo', 'Karma giảm nhẹ vì hủy hoại linh nghiệp'],
      },
    ],
  },
  enc_mysterious_merchant: {
    eventId: 'enc_mysterious_merchant',
    title: 'Thương Nhân Che Mặt',
    description: 'Một gã khoác áo trùm bán đồ lặt vặt, trong đó có vài món ngươi thấy quen mắt.',
    allowedDomains: ['inventory', 'narrative', 'relationships', 'causal'],
    choices: [
      {
        choiceId: 'ch_browse',
        text: 'Xem hàng và hỏi giá.',
        weight: 'D1',
        domain: 'narrative',
        consequences: ['Mở cửa hàng tạm bợ'],
      },
      {
        choiceId: 'ch_walk_away',
        text: 'Không thích bộ dạng của gã, bỏ đi.',
        weight: 'D1',
        domain: 'narrative',
        consequences: ['Bỏ qua cơ hội giao dịch'],
      },
    ],
  },
  enc_lost_disciple: {
    eventId: 'enc_lost_disciple',
    title: 'Đệ Tử Lạc Đường',
    description: 'Một đệ tử Thanh Vân Tông mang trang bị thương, tựa vào gốc cây thở dốc.',
    allowedDomains: ['relationships', 'narrative', 'inventory', 'causal'],
    choices: [
      {
        choiceId: 'ch_help_disciple',
        text: 'Chia cho hắn chút nước và cứu giúp.',
        weight: 'D2',
        domain: 'relationship',
        consequences: ['Được đệ tử Thanh Vân Tông ghi nhớ ơn', 'trust +10'],
      },
      {
        choiceId: 'ch_ignore',
        text: 'Chuyện của người khác, không nên nhúng tay.',
        weight: 'D1',
        domain: 'karma',
        consequences: ['Bỏ đi'],
      },
    ],
  },
  enc_blood_ritual: {
    eventId: 'enc_blood_ritual',
    title: 'Vòng Tròn Huyết Quang',
    description: 'Ven sông Huyết, mấy người áo đỏ đang bố trí tế đàn. Chúng định làm gì?',
    allowedDomains: ['combat', 'narrative', 'causal', 'inventory'],
    choices: [
      {
        choiceId: 'ch_report_authorities',
        text: 'Bí mật về trấn báo quan phủ.',
        weight: 'D2',
        domain: 'world',
        consequences: ['Thanh Vân Tông biết tin', 'Huyết Hà Điện thù ngươi'],
      },
      {
        choiceId: 'ch_spy_closer',
        text: 'Lén lại gần nghe lỏm.',
        weight: 'D2',
        domain: 'narrative',
        successChance: 0.5,
        successConsequences: ['Nghe được tên kẻ cầm đầu'],
        failureConsequences: ['Bị phát hiện, chiến đấu'],
      },
      {
        choiceId: 'ch_leave_quietly',
        text: 'Không dính vào, lặng lẽ rút lui.',
        weight: 'D1',
        domain: 'narrative',
        consequences: ['An toàn nhưng bỏ lỡ tin tức'],
      },
    ],
  },
  enc_sect_trial: {
    eventId: 'enc_sect_trial',
    title: 'Khảo Hách Ngoại Môn',
    description: 'Tại quảng trường sơn môn, các ứng viên lô xô nhau tranh tài để được vào Thanh Vân Tông.',
    allowedDomains: ['narrative', 'character', 'causal', 'quests'],
    choices: [
      {
        choiceId: 'ch_trial_fight',
        text: 'Trổ tài võ nghệ trên lôi đài.',
        weight: 'D3',
        domain: 'character',
        successChance: 0.5,
        successConsequences: ['Được chú ý của chưởng môn'],
        failureConsequences: ['Bị loại khỏi vòng đầu'],
      },
      {
        choiceId: 'ch_trial_wits',
        text: 'Chọn vòng thi luận đạo, dùng trí tuệ.',
        weight: 'D3',
        domain: 'character',
        successChance: 0.5,
        successConsequences: ['Được chú ý của chưởng môn'],
        failureConsequences: ['Bị loại khỏi vòng đầu'],
      },
    ],
  },
};

export const CHAPTER_01: ChapterDefinition = {
  chapterId: 'chapter_01_phan_tran',
  title: 'Chương I — Phân Trần',
  description: 'Từ thôn phàm đến bước đầu trên con đường tu tiên, mỗi quyết định đều là phân trần.',
  completionFlag: 'flag_chapter_01_complete',
  scenes: [
    {
      sceneId: 'scene_01_khoi_hanh',
      chapterId: 'chapter_01_phan_tran',
      title: 'Khởi Hành',
      intro: 'Thanh Ngưu Trấn, buổi sớm mù sương. Hành trình của ngươi bắt đầu từ đây.',
      locationId: 'loc_thanh_nguu_tran',
      entryEventId: 'ev_ch1_opening',
    },
    {
      sceneId: 'scene_02_phi_len',
      chapterId: 'chapter_01_phan_tran',
      title: 'Phiên Chợ Linh',
      intro: 'Chợ phiên linh cốc đông đúc, người người qua lại.',
      locationId: 'loc_thanh_nguu_tran',
    },
    {
      sceneId: 'scene_03_rung_nguyen_sac',
      chapterId: 'chapter_01_phan_tran',
      title: 'Rừng Nguyên Sắc',
      intro: 'Rừng già tăm tối, tiếng thú gầm vọng quanh.',
      locationId: 'loc_rung_nguyen_sac',
    },
    {
      sceneId: 'scene_04_khuc_song_huyet',
      chapterId: 'chapter_01_phan_tran',
      title: 'Bến Sông Huyết',
      intro: 'Nước sông đỏ ngầu, sóng rì rào như thì thầm.',
      locationId: 'loc_khuc_song_huyet',
    },
  ],
};

export const ALL_CHAPTERS: readonly ChapterDefinition[] = [CHAPTER_01];

export function getEvent(eventId: string): StoryEvent | undefined {
  return EVENTS[eventId];
}

export function getChapter(chapterId: string): ChapterDefinition | undefined {
  return ALL_CHAPTERS.find((c) => c.chapterId === chapterId);
}
