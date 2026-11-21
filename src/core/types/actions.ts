import type { EquipmentSlot } from './state';

/**
 * Discriminated unions for GameAction entering the unified ActionPipeline.
 */

export type ActionSource = 'ui' | 'system' | 'debug' | 'test';

export interface ActionEnvelope<TType extends string, TPayload> {
  readonly actionId: string;
  readonly type: TType;
  readonly payload: TPayload;
  readonly source: ActionSource;
  readonly createdAt: number;
}

export type CultivateActivity =
  | 'tinh_toa'
  | 'van_chuyen_cong_phap'
  | 'luyen_hoa_linh_khi'
  | 'linh_ngo_cong_phap'
  | 'tu_luyen_the_chat';

export type CultivateAction = ActionEnvelope<
  'cultivate',
  {
    readonly activity: CultivateActivity;
    readonly durationDays: number;
    readonly supportItemInstanceId?: string;
  }
>;

export type BreakthroughAction = ActionEnvelope<
  'breakthrough',
  {
    readonly targetRealm?: string;
    readonly catalystItemInstanceIds?: readonly string[];
  }
>;

export type ExploreAction = ActionEnvelope<
  'explore',
  {
    readonly locationId: string;
    readonly focus?: 'general' | 'herb' | 'ruin' | 'rumor';
  }
>;

export type AttackAction = ActionEnvelope<
  'attack',
  {
    readonly targetId: string;
    readonly skillId?: string;
    readonly mode: 'basic' | 'skill' | 'defend' | 'flee';
  }
>;

export type UseItemAction = ActionEnvelope<
  'use_item',
  {
    readonly itemInstanceId: string;
    readonly quantity: number;
    readonly targetId?: string;
  }
>;

export type EquipItemAction = ActionEnvelope<
  'equip_item',
  {
    readonly itemInstanceId: string | null;
    readonly slot: EquipmentSlot;
  }
>;

export type DialogueAction = ActionEnvelope<
  'dialogue',
  {
    readonly npcId: string;
    readonly topicId: string;
  }
>;

export type QuestAcceptAction = ActionEnvelope<
  'quest_accept',
  {
    readonly questId: string;
    readonly sourceNpcId?: string;
  }
>;

export type StoryChoiceAction = ActionEnvelope<
  'story_choice',
  {
    readonly eventId: string;
    readonly choiceId: string;
  }
>;

export type TravelAction = ActionEnvelope<
  'travel',
  {
    readonly destinationLocationId: string;
  }
>;

export type InteractAction = ActionEnvelope<
  'interact',
  {
    readonly targetType: 'npc' | 'object' | 'location' | 'market';
    readonly targetId: string;
    readonly interactionType: string;
  }
>;

export type GameAction =
  | CultivateAction
  | BreakthroughAction
  | ExploreAction
  | AttackAction
  | UseItemAction
  | EquipItemAction
  | DialogueAction
  | QuestAcceptAction
  | StoryChoiceAction
  | TravelAction
  | InteractAction;

export type GameActionType = GameAction['type'];

export type NewGameActionInput<T extends GameAction = GameAction> = Omit<
  T,
  'actionId' | 'createdAt'
> & {
  readonly actionId?: string;
  readonly createdAt?: number;
};
