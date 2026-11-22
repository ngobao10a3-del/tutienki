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
    locationId: 'loc_thanh_van_tong',
    name: 'Sơn Môn Thanh Vân Tông',
    regionId: 'region_son_mai',
    description: 'Sơn môn của Thanh Vân Tông, một trong ngũ đại thế lực Thương Huyền Giới.',
    travelDays: 4,
    encounterTable: ['enc_sect_trial', 'enc_lost_disciple'],
    marketAvailable: true,
    unlockFlag: 'flag_unlocked_thanh_van',
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
    id: 'npc_hac_kiem',
    name: 'Hắc Diện Kiếm Khách',
    factionId: 'faction_huyet_ha_dien',
    locationId: 'loc_rung_nguyen_sac',
    alive: true,
    status: 'Kiếm khách ẩn mặt, ám sát các tu sĩ đi qua rừng.',
    memories: [],
  },
];

export function makeNpc(template: Omit<NpcRecord, 'relationship'>): NpcRecord {
  return { ...template, relationship: { trust: 0, affinity: 0, respect: 0, hostility: 0 } };
}
