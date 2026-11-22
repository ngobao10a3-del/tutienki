import type { NpcRecord } from '../../core/types';

export interface WorldLocation {
  readonly locationId: string;
  readonly name: string;
  readonly regionId: string;
  readonly description: string;
  readonly unlockFlag?: string;
  readonly travelDays: number;
  readonly encounterTable: readonly string[];
  readonly marketAvailable: boolean;
}

export interface WorldRegion {
  readonly regionId: string;
  readonly name: string;
  readonly description: string;
}

export const REGIONS: readonly WorldRegion[] = [
  { regionId: 'region_dong_vuc_ngoai_vi', name: 'Động Cực Ngoại Vi', description: 'Vùng đất hoang sác ngoài rìa Thương Huyền Giới, nơi phàm nhân và tu sĩ thấp kiếm sống.' },
  { regionId: 'region_thanh_nguu_tran', name: 'Vùng Thanh Ngưu', description: 'Khu vực quanh trấn Thanh Ngưu, nơi bắt đầu mọi chuyện.' },
  { regionId: 'region_son_mai', name: 'Sơn Mạch Thanh Vân', description: 'Dãy núi tuyết sơn nơi Thanh Vân Tông đặt sơn môn.' },
];

export const LOCATIONS: readonly WorldLocation[] = [
  {
    locationId: 'loc_thanh_nguu_tran',
    name: 'Thanh Ngưu Trấn',
    regionId: 'region_thanh_nguu_tran',
    description: 'Trấn nhỏ lưng dựa núi, mặt hướng sông Huyết. Nơi buôn bán linh cốc và linh thảo của tu sĩ phàm.',
    travelDays: 0,
    encounterTable: ['enc_bandit_ambush', 'enc_herb_gathering', 'enc_mysterious_merchant'],
    marketAvailable: true,
  },
  {
    locationId: 'loc_rung_nguyen_sac',
    name: 'Rừng Nguyên Sắc',
    regionId: 'region_thanh_nguu_tran',
    description: 'Rừng già quanh trấn, nhiều linh thảo nhưng cũng nhiều yêu thú.',
    travelDays: 1,
    encounterTable: ['enc_wild_beast', 'enc_herb_gathering', 'enc_lost_disciple'],
    marketAvailable: false,
  },
  {
    locationId: 'loc_khuc_song_huyet',
    name: 'Khúc Sông Huyết',
    regionId: 'region_thanh_nguu_tran',
    description: 'Khúc sông đỏ ngàu truyền thuyết, thỉnh thoảng trôi xác tu sĩ từ thượng nguồn.',
    travelDays: 2,
    encounterTable: ['enc_blood_ritual', 'enc_wild_beast', 'enc_herb_gathering'],
    marketAvailable: false,
  },
  {
    locationId: 'loc_cho_phuong_mau',
    name: 'Chợ Phượng Mậu',
    regionId: 'region_son_mai',
    description: 'Chợ lớn dưới chân núi Thanh Vân, nơi tu sĩ đủ cảnh giới giao dịch linh dược và pháp khí.',
    travelDays: 3,
    encounterTable: ['ev_ch2_arrival_market', 'ev_ch2_caravan_missing', 'enc_mysterious_merchant'],
    marketAvailable: true,
    unlockFlag: 'flag_chapter_01_complete',
  },
  {
    locationId: 'loc_hoang_linh_coc',
    name: 'Hoang Linh Cốc',
    regionId: 'region_son_mai',
    description: 'Cốc vực âm khí tràn opaque, nhiều linh thảo quý nhưng cũng là nơi thương đội thường xuyên mất tích.',
    travelDays: 5,
    encounterTable: ['ev_ch2_camp_ruins', 'enc_wild_beast', 'enc_herb_gathering'],
    marketAvailable: false,
    unlockFlag: 'flag_chapter_01_complete',
  },
];

export const NPC_TEMPLATES: readonly Omit<NpcRecord, 'relationship'>[] = [
  {
    id: 'npc_tran_doanh',
    name: 'Trần Doanh',
    factionId: null,
    locationId: 'loc_thanh_nguu_tran',
    alive: true,
    status: 'Thợ rèn trấn, từng là tán tu Luyện Khí thất bại.',
    memories: [],
  },
  {
    id: 'npc_tieu_thien',
    name: 'Tiểu Thiên',
    factionId: 'faction_thien_co_cac',
    locationId: 'loc_thanh_nguu_tran',
    alive: true,
    status: 'Hành thương bí ẩn của Thiên Cơ Các, hay xuất hiện ở chợ trấn.',
    memories: [],
  },
  {
    id: 'npc_luu_suv',
    name: 'Lưu Sư Viễn',
    factionId: 'faction_thanh_van_tong',
    locationId: 'loc_thanh_nguu_tran',
    alive: true,
    status: 'Đệ tử ngoại môn Thanh Vân Tông đang làm nhiệm vụ ở hạ giới.',
    memories: [],
  },
  {
    id: 'npc_cho_phuong',
    name: 'Bà Chương Phượng',
    factionId: 'faction_cuu_dai_gia',
    locationId: 'loc_cho_phuong_mau',
    alive: true,
    status: 'Quán chủ tửu lầu Phượng Mậu, người phối hợp với thương đội của chín thế gia.',
    memories: [],
  },
  {
    id: 'npc_mo_tham',
    name: 'Lão Mô Thâm',
    factionId: null,
    locationId: 'loc_hoang_linh_coc',
    alive: true,
    status: 'Thợ mỏ già sống sót sau vụ mất tích của thương đội, nay ẩn cư trong cốc.',
    memories: [],
  },
  {
    id: 'npc_hoang_vi',
    name: 'Hoàng Vỹ',
    factionId: 'faction_thien_dao_minh',
    locationId: 'loc_cho_phuong_mau',
    alive: true,
    status: 'Tu sĩ Thiên Đạo Minh đang điều tra việc thương đội mất tích.',
    memories: [],
  },
];

export function makeNpc(template: Omit<NpcRecord, 'relationship'>): NpcRecord {
  return { ...template, relationship: { trust: 0, affinity: 0, respect: 0, hostility: 0 } };
}
