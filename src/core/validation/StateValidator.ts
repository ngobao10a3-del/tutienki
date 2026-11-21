import {
  REALM_ORDER,
  type CanonicalGameState,
  type DecisionWeight,
  type EquipmentSlot,
  type GameAction,
  type ItemCategory,
  type ItemGrade,
  type RealmId,
  type ValidationIssue,
  type ValidationResult,
} from '../types';

const VALID_REALMS = new Set<string>(REALM_ORDER);
const VALID_CATEGORIES = new Set<string>([
  'dan_duoc',
  'vu_khi',
  'phap_bao',
  'cong_phap',
  'linh_thao',
  'nguyen_lieu',
  'linh_thach',
  'bua_chu',
  'tran_phap',
  'vat_pham_nhiem_vu',
  'di_vat',
] satisfies readonly ItemCategory[]);
const VALID_GRADES = new Set<string>([
  'pham',
  'ha',
  'trung',
  'thuong',
  'cuc',
  'tien',
] satisfies readonly ItemGrade[]);
const VALID_SLOTS: readonly EquipmentSlot[] = [
  'weapon',
  'armor',
  'shoes',
  'artifact',
  'ring',
  'talisman',
];
const VALID_DECISION_WEIGHTS = new Set<string>(['D1', 'D2', 'D3', 'D4'] satisfies readonly DecisionWeight[]);
const VALID_ACTION_TYPES = new Set<string>([
  'cultivate',
  'breakthrough',
  'explore',
  'attack',
  'use_item',
  'equip_item',
  'dialogue',
  'quest_accept',
  'story_choice',
  'travel',
  'interact',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeFinite(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function pushIssue(
  issues: ValidationIssue[],
  code: string,
  domain: ValidationIssue['domain'],
  path: string,
  message: string,
): void {
  issues.push({
    code,
    domain,
    path,
    message,
    severity: 'error',
  });
}

export class StateValidator {
  public static validateAction(action: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!isPlainObject(action)) {
      pushIssue(
        issues,
        'ACTION_INVALID_SHAPE',
        'action',
        'action',
        'GameAction phải là một object hợp lệ.',
      );
      return { valid: false, issues };
    }

    if (!isNonEmptyString(action.actionId)) {
      pushIssue(
        issues,
        'ACTION_MISSING_ID',
        'action',
        'action.actionId',
        'actionId không được rỗng.',
      );
    }

    if (!isNonEmptyString(action.type) || !VALID_ACTION_TYPES.has(action.type)) {
      pushIssue(
        issues,
        'ACTION_INVALID_TYPE',
        'action',
        'action.type',
        `Loại action không hợp lệ: ${String(action.type)}.`,
      );
    }

    if (!isPlainObject(action.payload)) {
      pushIssue(
        issues,
        'ACTION_INVALID_PAYLOAD',
        'action',
        'action.payload',
        'payload của GameAction phải là object.',
      );
    }

    if (
      action.source !== 'ui' &&
      action.source !== 'system' &&
      action.source !== 'debug' &&
      action.source !== 'test'
    ) {
      pushIssue(
        issues,
        'ACTION_INVALID_SOURCE',
        'action',
        'action.source',
        `Nguồn action không hợp lệ: ${String(action.source)}.`,
      );
    }

    if (!isFiniteNumber(action.createdAt) || action.createdAt <= 0) {
      pushIssue(
        issues,
        'ACTION_INVALID_TIMESTAMP',
        'action',
        'action.createdAt',
        'createdAt phải là số dương hợp lệ.',
      );
    }

    // Basic payload shape validation per discriminated type
    if (isPlainObject(action.payload) && typeof action.type === 'string') {
      const p = action.payload;
      switch (action.type as GameAction['type']) {
        case 'cultivate':
          if (!isNonEmptyString(p.activity)) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload.activity', 'Thiếu hoạt động tu luyện.');
          }
          if (!isFiniteNumber(p.durationDays) || p.durationDays <= 0) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload.durationDays', 'durationDays phải lớn hơn 0.');
          }
          break;
        case 'use_item':
          if (!isNonEmptyString(p.itemInstanceId)) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload.itemInstanceId', 'Thiếu itemInstanceId.');
          }
          if (!isFiniteNumber(p.quantity) || p.quantity <= 0 || !Number.isInteger(p.quantity)) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload.quantity', 'Số lượng sử dụng phải là số nguyên dương.');
          }
          break;
        case 'equip_item':
          if (!isNonEmptyString(p.slot)) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload.slot', 'Thiếu slot trang bị.');
          }
          break;
        case 'explore':
          if (!isNonEmptyString(p.locationId)) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload.locationId', 'Thiếu locationId để khám phá.');
          }
          break;
        case 'travel':
          if (!isNonEmptyString(p.destinationLocationId)) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload.destinationLocationId', 'Thiếu destinationLocationId.');
          }
          break;
        case 'attack':
          if (!isNonEmptyString(p.targetId)) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload.targetId', 'Thiếu targetId.');
          }
          break;
        case 'dialogue':
          if (!isNonEmptyString(p.npcId) || !isNonEmptyString(p.topicId)) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload', 'Dialogue cần npcId và topicId.');
          }
          break;
        case 'quest_accept':
          if (!isNonEmptyString(p.questId)) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload.questId', 'Thiếu questId.');
          }
          break;
        case 'story_choice':
          if (!isNonEmptyString(p.eventId) || !isNonEmptyString(p.choiceId)) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload', 'Story choice cần eventId và choiceId.');
          }
          break;
        case 'interact':
          if (!isNonEmptyString(p.targetId) || !isNonEmptyString(p.interactionType)) {
            pushIssue(issues, 'ACTION_PAYLOAD_INVALID', 'action', 'action.payload', 'Interact cần targetId và interactionType.');
          }
          break;
        case 'breakthrough':
          break;
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  public static validateState(state: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!isPlainObject(state)) {
      pushIssue(
        issues,
        'STATE_INVALID_SHAPE',
        'system',
        'state',
        'CanonicalGameState phải là object.',
      );
      return { valid: false, issues };
    }

    const s = state as unknown as CanonicalGameState;

    // System metadata
    if (!Number.isInteger(s.schemaVersion) || s.schemaVersion < 1) {
      pushIssue(issues, 'SYSTEM_INVALID_SCHEMA', 'system', 'schemaVersion', 'schemaVersion phải là số nguyên >= 1.');
    }
    if (!Number.isInteger(s.stateVersion) || s.stateVersion < 0) {
      pushIssue(issues, 'SYSTEM_INVALID_VERSION', 'system', 'stateVersion', 'stateVersion phải là số nguyên >= 0.');
    }
    if (!isNonEmptyString(s.seed)) {
      pushIssue(issues, 'SYSTEM_INVALID_SEED', 'system', 'seed', 'seed không được rỗng.');
    }
    if (!Number.isInteger(s.rngState)) {
      pushIssue(issues, 'SYSTEM_INVALID_RNG', 'system', 'rngState', 'rngState phải là số nguyên hợp lệ.');
    }
    if (!Array.isArray(s.processedActionIds)) {
      pushIssue(issues, 'SYSTEM_INVALID_ACTION_IDS', 'system', 'processedActionIds', 'processedActionIds phải là mảng.');
    }

    // 1. Character State
    if (!isPlainObject(s.character)) {
      pushIssue(issues, 'CHARACTER_MISSING', 'character', 'character', 'Thiếu CharacterState.');
    } else {
      if (!isNonEmptyString(s.character.id)) {
        pushIssue(issues, 'CHARACTER_MISSING_ID', 'character', 'character.id', 'Thiếu character.id.');
      }
      if (!isNonEmptyString(s.character.name)) {
        pushIssue(issues, 'CHARACTER_MISSING_NAME', 'character', 'character.name', 'Thiếu tên nhân vật.');
      }
      if (!isNonEmptyString(s.character.origin)) {
        pushIssue(issues, 'CHARACTER_MISSING_ORIGIN', 'character', 'character.origin', 'Thiếu xuất thân nhân vật.');
      }
      if (!isNonNegativeFinite(s.character.age)) {
        pushIssue(issues, 'CHARACTER_INVALID_AGE', 'character', 'character.age', 'Tuổi nhân vật phải >= 0 và là số hữu hạn.');
      }
      if (!isNonNegativeFinite(s.character.lifespan) || s.character.lifespan < s.character.age) {
        pushIssue(issues, 'CHARACTER_INVALID_LIFESPAN', 'character', 'character.lifespan', 'Tuổi thọ phải >= tuổi hiện tại và hợp lệ.');
      }
      if (!VALID_REALMS.has(s.character.realm)) {
        pushIssue(issues, 'CHARACTER_INVALID_REALM', 'character', 'character.realm', `Cảnh giới nhân vật không hợp lệ: ${String(s.character.realm)}.`);
      }
      if (!isFiniteNumber(s.character.reputation)) {
        pushIssue(issues, 'CHARACTER_INVALID_REPUTATION', 'character', 'character.reputation', 'Danh tiếng phải là số hữu hạn.');
      }
      if (!Array.isArray(s.character.talents)) {
        pushIssue(issues, 'CHARACTER_INVALID_TALENTS', 'character', 'character.talents', 'talents phải là mảng.');
      }
    }

    // 2. Cultivation State
    if (!isPlainObject(s.cultivation)) {
      pushIssue(issues, 'CULTIVATION_MISSING', 'cultivation', 'cultivation', 'Thiếu CultivationState.');
    } else {
      if (!VALID_REALMS.has(s.cultivation.currentRealm)) {
        pushIssue(issues, 'CULTIVATION_INVALID_REALM', 'cultivation', 'cultivation.currentRealm', `Cảnh giới tu luyện không hợp lệ: ${String(s.cultivation.currentRealm)}.`);
      }
      if (isPlainObject(s.character) && VALID_REALMS.has(s.character.realm) && s.character.realm !== s.cultivation.currentRealm) {
        pushIssue(
          issues,
          'CULTIVATION_REALM_MISMATCH',
          'cultivation',
          'cultivation.currentRealm',
          `Cảnh giới tu luyện (${s.cultivation.currentRealm}) không khớp với character.realm (${s.character.realm}).`,
        );
      }
      const maxStage = (s.cultivation.currentRealm as RealmId) === 'pham_nhan' ? 3 : 9;
      if (!Number.isInteger(s.cultivation.currentStage) || s.cultivation.currentStage < 0 || s.cultivation.currentStage > maxStage) {
        pushIssue(issues, 'CULTIVATION_INVALID_STAGE', 'cultivation', 'cultivation.currentStage', `Tiểu cảnh giới không hợp lệ: ${String(s.cultivation.currentStage)}.`);
      }
      if (!isNonNegativeFinite(s.cultivation.exp)) {
        pushIssue(issues, 'CULTIVATION_NEGATIVE_EXP', 'cultivation', 'cultivation.exp', 'EXP tu luyện không được âm hoặc NaN.');
      }
      if (!isNonNegativeFinite(s.cultivation.progress) || !isFiniteNumber(s.cultivation.progressMax) || s.cultivation.progressMax <= 0) {
        pushIssue(issues, 'CULTIVATION_INVALID_PROGRESS', 'cultivation', 'cultivation.progress', 'Tiến độ tu luyện không hợp lệ.');
      }
      if (!isNonNegativeFinite(s.cultivation.speed) || !isNonNegativeFinite(s.cultivation.foundation) || !isNonNegativeFinite(s.cultivation.comprehension)) {
        pushIssue(issues, 'CULTIVATION_INVALID_METRICS', 'cultivation', 'cultivation', 'speed/foundation/comprehension phải là số không âm hợp lệ.');
      }
    }

    // 3. Attribute State
    if (!isPlainObject(s.attributes)) {
      pushIssue(issues, 'ATTRIBUTES_MISSING', 'attributes', 'attributes', 'Thiếu AttributeState.');
    } else {
      const attrKeys = [
        'canCot',
        'linhLuc',
        'thanPhap',
        'ngoTinh',
        'thanThuc',
        'tamCanh',
        'daoTam',
      ] as const;
      for (const key of attrKeys) {
        const val = s.attributes[key];
        if (!isNonNegativeFinite(val)) {
          pushIssue(issues, 'ATTRIBUTE_INVALID_VALUE', 'attributes', `attributes.${key}`, `Thuộc tính ${key} phải là số không âm hợp lệ.`);
        }
      }
    }

    // 4. Inventory State
    if (!isPlainObject(s.inventory)) {
      pushIssue(issues, 'INVENTORY_MISSING', 'inventory', 'inventory', 'Thiếu InventoryState.');
    } else {
      if (!isNonNegativeFinite(s.inventory.spiritStones)) {
        pushIssue(issues, 'INVENTORY_NEGATIVE_STONES', 'inventory', 'inventory.spiritStones', 'Linh thạch không được âm hoặc không hợp lệ.');
      }
      if (!Number.isInteger(s.inventory.maxCapacity) || s.inventory.maxCapacity < 1) {
        pushIssue(issues, 'INVENTORY_INVALID_CAPACITY', 'inventory', 'inventory.maxCapacity', 'Sức chứa túi đồ phải >= 1.');
      }
      if (!Array.isArray(s.inventory.items)) {
        pushIssue(issues, 'INVENTORY_INVALID_ITEMS', 'inventory', 'inventory.items', 'items phải là mảng.');
      } else {
        const seenInstanceIds = new Set<string>();
        s.inventory.items.forEach((item, index) => {
          if (!isPlainObject(item)) {
            pushIssue(issues, 'INVENTORY_ITEM_INVALID', 'inventory', `inventory.items[${index}]`, 'Item phải là object.');
            return;
          }
          if (!isNonEmptyString(item.instanceId) || !isNonEmptyString(item.itemId) || !isNonEmptyString(item.name)) {
            pushIssue(issues, 'INVENTORY_ITEM_MISSING_FIELDS', 'inventory', `inventory.items[${index}]`, 'Item thiếu instanceId, itemId hoặc name.');
          } else {
            if (seenInstanceIds.has(item.instanceId)) {
              pushIssue(issues, 'INVENTORY_DUPLICATE_INSTANCE', 'inventory', `inventory.items[${index}].instanceId`, `Trùng instanceId vật phẩm: ${item.instanceId}.`);
            }
            seenInstanceIds.add(item.instanceId);
          }

          if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 0) {
            pushIssue(issues, 'INVENTORY_NEGATIVE_QUANTITY', 'inventory', `inventory.items[${index}].quantity`, `Số lượng vật phẩm "${String(item.name)}" không được âm (${String(item.quantity)}).`);
          }
          if (typeof item.category !== 'string' || !VALID_CATEGORIES.has(item.category)) {
            pushIssue(issues, 'INVENTORY_INVALID_CATEGORY', 'inventory', `inventory.items[${index}].category`, `Loại vật phẩm không hợp lệ: ${String(item.category)}.`);
          }
          if (typeof item.grade !== 'string' || !VALID_GRADES.has(item.grade)) {
            pushIssue(issues, 'INVENTORY_INVALID_GRADE', 'inventory', `inventory.items[${index}].grade`, `Phẩm cấp vật phẩm không hợp lệ: ${String(item.grade)}.`);
          }
        });

        if (isPlainObject(s.inventory.equipped)) {
          for (const slot of VALID_SLOTS) {
            const equippedId = s.inventory.equipped[slot];
            if (equippedId !== null && equippedId !== undefined) {
              if (!seenInstanceIds.has(equippedId)) {
                pushIssue(issues, 'INVENTORY_EQUIPPED_MISSING', 'inventory', `inventory.equipped.${slot}`, `Trang bị ở slot ${slot} (${equippedId}) không tồn tại trong túi đồ.`);
              }
            }
          }
        } else {
          pushIssue(issues, 'INVENTORY_INVALID_EQUIPPED', 'inventory', 'inventory.equipped', 'Thiếu cấu trúc equipped.');
        }
      }
    }

    // 5. Combat State
    if (!isPlainObject(s.combat)) {
      pushIssue(issues, 'COMBAT_MISSING', 'combat', 'combat', 'Thiếu CombatState.');
    } else {
      if (typeof s.combat.inCombat !== 'boolean') {
        pushIssue(issues, 'COMBAT_INVALID_FLAG', 'combat', 'combat.inCombat', 'inCombat phải là boolean.');
      }
      if (!Number.isInteger(s.combat.turn) || s.combat.turn < 0) {
        pushIssue(issues, 'COMBAT_INVALID_TURN', 'combat', 'combat.turn', 'Lượt chiến đấu phải là số nguyên >= 0.');
      }
      if (!Array.isArray(s.combat.participants)) {
        pushIssue(issues, 'COMBAT_INVALID_PARTICIPANTS', 'combat', 'combat.participants', 'participants phải là mảng.');
      } else {
        s.combat.participants.forEach((p, idx) => {
          if (!isNonNegativeFinite(p.hp) || !isFiniteNumber(p.maxHp) || p.maxHp <= 0 || p.hp > p.maxHp) {
            pushIssue(issues, 'COMBAT_INVALID_HP', 'combat', `combat.participants[${idx}].hp`, 'HP chiến đấu không hợp lệ.');
          }
          if (!isNonNegativeFinite(p.spiritEnergy) || !isNonNegativeFinite(p.maxSpiritEnergy)) {
            pushIssue(issues, 'COMBAT_INVALID_SPIRIT', 'combat', `combat.participants[${idx}].spiritEnergy`, 'Linh lực chiến đấu không hợp lệ.');
          }
        });
      }
    }

    // 6. Quest State
    if (!isPlainObject(s.quests) || !isPlainObject(s.quests.quests)) {
      pushIssue(issues, 'QUESTS_MISSING', 'quests', 'quests', 'Thiếu QuestState.');
    } else {
      if (!Array.isArray(s.quests.activeQuestIds) || !Array.isArray(s.quests.completedQuestIds) || !Array.isArray(s.quests.failedQuestIds)) {
        pushIssue(issues, 'QUESTS_INVALID_LISTS', 'quests', 'quests', 'Danh sách trạng thái nhiệm vụ không hợp lệ.');
      }
    }

    // 7. Narrative State
    if (!isPlainObject(s.narrative)) {
      pushIssue(issues, 'NARRATIVE_MISSING', 'narrative', 'narrative', 'Thiếu NarrativeState.');
    } else {
      if (!isNonEmptyString(s.narrative.currentChapterId) || !isNonEmptyString(s.narrative.currentSceneId)) {
        pushIssue(issues, 'NARRATIVE_MISSING_SCENE', 'narrative', 'narrative', 'Thiếu currentChapterId hoặc currentSceneId.');
      }
      if (!Array.isArray(s.narrative.completedUniqueEventIds) || !Array.isArray(s.narrative.recentLog)) {
        pushIssue(issues, 'NARRATIVE_INVALID_ARRAYS', 'narrative', 'narrative', 'Dữ liệu lịch sử sự kiện không hợp lệ.');
      }
    }

    // 8. Relationship State
    if (!isPlainObject(s.relationships) || !isPlainObject(s.relationships.npcs) || !isPlainObject(s.relationships.factions)) {
      pushIssue(issues, 'RELATIONSHIPS_MISSING', 'relationships', 'relationships', 'Thiếu RelationshipState.');
    } else {
      for (const [npcId, npc] of Object.entries(s.relationships.npcs)) {
        if (!isPlainObject(npc) || !isPlainObject(npc.relationship)) {
          pushIssue(issues, 'NPC_INVALID_SHAPE', 'relationships', `relationships.npcs.${npcId}`, 'Dữ liệu NPC không hợp lệ.');
          continue;
        }
        const dims = npc.relationship;
        for (const dim of ['trust', 'affinity', 'respect', 'hostility'] as const) {
          const val = dims[dim];
          if (!isFiniteNumber(val) || val < -100 || val > 100) {
            pushIssue(issues, 'NPC_INVALID_DIMENSION', 'relationships', `relationships.npcs.${npcId}.relationship.${dim}`, `Chỉ số quan hệ ${dim} phải nằm trong [-100, 100].`);
          }
        }
      }
    }

    // 9. World State
    if (!isPlainObject(s.world) || !isPlainObject(s.world.time)) {
      pushIssue(issues, 'WORLD_MISSING', 'world', 'world', 'Thiếu WorldState.');
    } else {
      if (!isNonEmptyString(s.world.currentRegionId) || !isNonEmptyString(s.world.currentLocationId)) {
        pushIssue(issues, 'WORLD_MISSING_LOCATION', 'world', 'world', 'Thiếu khu vực hoặc địa điểm hiện tại.');
      }
      const t = s.world.time;
      if (!Number.isInteger(t.year) || t.year < 1 || !Number.isInteger(t.month) || t.month < 1 || t.month > 12 || !Number.isInteger(t.day) || t.day < 1 || t.day > 30 || !Number.isInteger(t.totalDays) || t.totalDays < 1) {
        pushIssue(issues, 'WORLD_INVALID_TIME', 'world', 'world.time', 'Thời gian thế giới không hợp lệ.');
      }
    }

    // 10. Causal History
    if (!isPlainObject(s.causal)) {
      pushIssue(issues, 'CAUSAL_MISSING', 'causal', 'causal', 'Thiếu CausalHistory.');
    } else {
      if (!isFiniteNumber(s.causal.karmaScore)) {
        pushIssue(issues, 'CAUSAL_INVALID_KARMA', 'causal', 'causal.karmaScore', 'karmaScore phải là số hữu hạn.');
      }
      if (!Array.isArray(s.causal.records)) {
        pushIssue(issues, 'CAUSAL_INVALID_RECORDS', 'causal', 'causal.records', 'causal.records phải là mảng.');
      } else {
        s.causal.records.forEach((rec, idx) => {
          if (
            !isPlainObject(rec) ||
            !isNonEmptyString(rec.id) ||
            typeof rec.weight !== 'string' ||
            !VALID_DECISION_WEIGHTS.has(rec.weight)
          ) {
            pushIssue(issues, 'CAUSAL_RECORD_INVALID', 'causal', `causal.records[${idx}]`, 'Bản ghi nhân quả không hợp lệ.');
          }
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
