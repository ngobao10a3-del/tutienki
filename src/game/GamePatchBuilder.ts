import { advanceWorldTime } from './time';
import type { CausalCategory, CausalRecord, CanonicalGameState, DecisionWeight, GameStatePatch, QuestRecord, StateDomain } from '../core/types';
import { PatchBuilder } from './PatchBuilder';

export class GamePatchBuilder {
  private readonly inner = new PatchBuilder();

  public constructor(private readonly state: CanonicalGameState) {}

  public worldTime(days: number): this {
    const time = advanceWorldTime(this.state.world.time, days);
    this.inner.setDomain('world', {
      ...this.state.world,
      time: { ...this.state.world.time, ...time },
    });
    return this;
  }

  public world(worldPatch: Partial<CanonicalGameState['world']>): this {
    this.inner.setDomain('world', { ...this.state.world, ...worldPatch });
    return this;
  }

  public character(characterPatch: Partial<CanonicalGameState['character']>): this {
    this.inner.setDomain('character', { ...this.state.character, ...characterPatch });
    return this;
  }

  public cultivation(cultivationPatch: Partial<CanonicalGameState['cultivation']>): this {
    this.inner.setDomain('cultivation', { ...this.state.cultivation, ...cultivationPatch });
    return this;
  }

  public attributes(attributesPatch: Partial<CanonicalGameState['attributes']>): this {
    this.inner.setDomain('attributes', { ...this.state.attributes, ...attributesPatch });
    return this;
  }

  public inventory(inventoryPatch: Partial<CanonicalGameState['inventory']>): this {
    this.inner.setDomain('inventory', { ...this.state.inventory, ...inventoryPatch });
    return this;
  }

  public combat(combatPatch: Partial<CanonicalGameState['combat']>): this {
    this.inner.setDomain('combat', { ...this.state.combat, ...combatPatch });
    return this;
  }

  public narrative(narrativePatch: Partial<CanonicalGameState['narrative']>): this {
    this.inner.setDomain('narrative', { ...this.state.narrative, ...narrativePatch });
    return this;
  }

  public relationships(relationshipsPatch: Partial<CanonicalGameState['relationships']>): this {
    this.inner.setDomain('relationships', { ...this.state.relationships, ...relationshipsPatch });
    return this;
  }

  public causal(causalPatch: Partial<CanonicalGameState['causal']>): this {
    this.inner.setDomain('causal', { ...this.state.causal, ...causalPatch });
    return this;
  }

  public logEvent(summary: string, choiceText?: string): this {
    const entry = {
      id: `log_${this.state.world.time.totalDays}_${this.state.narrative.recentLog.length + 1}`,
      day: this.state.world.time.totalDays,
      sceneId: this.state.narrative.currentSceneId,
      summary,
      choiceText,
    };
    this.inner.setDomain('narrative', {
      ...this.state.narrative,
      recentLog: [...this.state.narrative.recentLog, entry].slice(-20),
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
    const record: CausalRecord = {
      id: `causal_${this.state.causal.records.length + 1}_${actionId}`,
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
      records: [...this.state.causal.records, record],
      karmaScore: this.state.causal.karmaScore + karmaDelta,
      causalFlags: { ...this.state.causal.causalFlags, ...createdFlags },
    });
    return this;
  }

  public quests(questsPatch: Partial<CanonicalGameState['quests']>): this {
    this.inner.setDomain('quests', { ...this.state.quests, ...questsPatch });
    return this;
  }

  public quest(quest: QuestRecord): this {
    this.inner.setDomain('quests', {
      ...this.state.quests,
      quests: { ...this.state.quests.quests, [quest.id]: quest },
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
