import { advanceWorldTime } from './time';
import type { CausalCategory, CausalRecord, CanonicalGameState, DecisionWeight, GameStatePatch, QuestRecord, StateDomain } from '../core/types';
import { PatchBuilder } from './PatchBuilder';

export class GamePatchBuilder {
  private readonly inner = new PatchBuilder();
  private readonly state: CanonicalGameState;

  public constructor(state: CanonicalGameState) {
    this.state = state;
  }

  public worldTime(days: number): this {
    const currentWorld = this.inner.getDomain('world') ?? this.state.world;
    const time = advanceWorldTime(currentWorld.time, days);
    this.inner.setDomain('world', {
      ...currentWorld,
      time: { ...currentWorld.time, ...time },
    });
    return this;
  }

  public world(worldPatch: Partial<CanonicalGameState['world']>): this {
    const currentWorld = this.inner.getDomain('world') ?? this.state.world;
    this.inner.setDomain('world', { ...currentWorld, ...worldPatch });
    return this;
  }

  public character(characterPatch: Partial<CanonicalGameState['character']>): this {
    const current = this.inner.getDomain('character') ?? this.state.character;
    this.inner.setDomain('character', { ...current, ...characterPatch });
    return this;
  }

  public cultivation(cultivationPatch: Partial<CanonicalGameState['cultivation']>): this {
    const current = this.inner.getDomain('cultivation') ?? this.state.cultivation;
    this.inner.setDomain('cultivation', { ...current, ...cultivationPatch });
    return this;
  }

  public attributes(attributesPatch: Partial<CanonicalGameState['attributes']>): this {
    const current = this.inner.getDomain('attributes') ?? this.state.attributes;
    this.inner.setDomain('attributes', { ...current, ...attributesPatch });
    return this;
  }

  public inventory(inventoryPatch: Partial<CanonicalGameState['inventory']>): this {
    const current = this.inner.getDomain('inventory') ?? this.state.inventory;
    this.inner.setDomain('inventory', { ...current, ...inventoryPatch });
    return this;
  }

  public combat(combatPatch: Partial<CanonicalGameState['combat']>): this {
    const current = this.inner.getDomain('combat') ?? this.state.combat;
    this.inner.setDomain('combat', { ...current, ...combatPatch });
    return this;
  }

  public narrative(narrativePatch: Partial<CanonicalGameState['narrative']>): this {
    const current = this.inner.getDomain('narrative') ?? this.state.narrative;
    this.inner.setDomain('narrative', { ...current, ...narrativePatch });
    return this;
  }

  public relationships(relationshipsPatch: Partial<CanonicalGameState['relationships']>): this {
    const current = this.inner.getDomain('relationships') ?? this.state.relationships;
    this.inner.setDomain('relationships', { ...current, ...relationshipsPatch });
    return this;
  }

  public causal(causalPatch: Partial<CanonicalGameState['causal']>): this {
    const current = this.inner.getDomain('causal') ?? this.state.causal;
    this.inner.setDomain('causal', { ...current, ...causalPatch });
    return this;
  }

  public logEvent(summary: string, choiceText?: string): this {
    const current = this.inner.getDomain('narrative') ?? this.state.narrative;
    const entry = {
      id: `log_${this.state.world.time.totalDays}_${current.recentLog.length + 1}`,
      day: this.state.world.time.totalDays,
      sceneId: current.currentSceneId,
      summary,
      choiceText,
    };
    this.inner.setDomain('narrative', {
      ...current,
      recentLog: [...current.recentLog, entry].slice(-20),
    });
    return this;
  }

  public recordCausal(
    actionId: string,
    category: CausalCategory,
    weight: DecisionWeight,
    summary: string,
    decision: string,
    consequences: readonly string[],
    relatedNpcIds: readonly string[] = [],
    relatedFactionIds: readonly string[] = [],
    createdFlags: Readonly<Record<string, boolean | number | string>> = {},
  ): this {
    const current = this.inner.getDomain('causal') ?? this.state.causal;
    const record: CausalRecord = {
      id: `causal_${current.records.length + 1}_${actionId}`,
      actionId,
      category,
      weight,
      day: this.state.world.time.totalDays,
      locationId: this.state.world.currentLocationId,
      summary,
      decision,
      consequences,
      relatedNpcIds,
      relatedFactionIds,
      createdFlags,
    };
    const karmaDelta = weight === 'D1' ? 1 : weight === 'D2' ? 3 : weight === 'D3' ? 8 : 20;
    this.inner.setDomain('causal', {
      records: [...current.records, record],
      karmaScore: current.karmaScore + karmaDelta,
      causalFlags: { ...current.causalFlags, ...createdFlags },
    });
    return this;
  }

  public quests(questsPatch: Partial<CanonicalGameState['quests']>): this {
    const current = this.inner.getDomain('quests') ?? this.state.quests;
    this.inner.setDomain('quests', { ...current, ...questsPatch });
    return this;
  }

  public quest(quest: QuestRecord): this {
    const current = this.inner.getDomain('quests') ?? this.state.quests;
    this.inner.setDomain('quests', {
      ...current,
      quests: { ...current.quests, [quest.id]: quest },
    });
    return this;
  }

  public build(): GameStatePatch {
    return this.inner.build();
  }
}

export function touchedDomains(patch: GameStatePatch): readonly StateDomain[] {
  return Object.keys(patch) as StateDomain[];
}
