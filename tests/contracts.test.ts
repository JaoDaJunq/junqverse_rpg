import { describe, expect, it } from 'vitest';
import {
  AbilityDefinitionSchema,
  QuestDefinitionSchema,
  SaveGameSchema,
  Vec2Schema,
  parseSaveGameJson
} from '../packages/content/src/index.js';
import {
  EventEnvelopeSchema,
  InputFrameSchema
} from '../packages/protocol/src/index.js';

const validAbility = {
  id: 'ability_test',
  nameKey: 'ability_test_name',
  costFocus: 10,
  cooldownTicks: 60,
  windupTicks: 6,
  recoveryTicks: 12,
  target: 'direction',
  rangePx: 180,
  shapes: [],
  effects: [{ type: 'damage', amount: 12 }],
  tags: ['electric'],
  limits: {}
};

const validQuest = {
  id: 'quest_m01',
  kind: 'main',
  titleKey: 'quest_m01_title',
  mapId: 'map_refugio',
  prerequisites: [],
  stages: [{
    id: 'stage_intro',
    objective: { type: 'interact', targetId: 'anchor_01' },
    entryActions: [],
    completionActions: [],
    checkpointAfter: true,
    nextStageId: null
  }],
  rewards: { xp: 100 },
  firstClearFlag: 'quest_m01_first_clear'
};

const validSave = {
  schemaVersion: 1,
  contentVersion: '0.1.0',
  profileId: 'profile_1',
  updatedAt: 'opaque_timestamp',
  xp: 50,
  fragments: 2,
  unlockedHeroes: ['jao'],
  unlockedRelics: ['relic_alpha'],
  loadouts: { jao: ['relic_alpha', 'relic_beta'] },
  completedQuests: ['quest_m01'],
  storyFlags: { intro_seen: true },
  cosmetics: [],
  mastery: { jao: 1 },
  rewardLedger: { quest_m01: { xp: 50, fragments: 2 } },
  activeRun: null,
  settings: { subtitles: true }
};

const validInput = {
  seq: 1,
  clientTick: 20,
  moveX: 2,
  moveY: -2,
  aimX: 320,
  aimY: 140,
  basicHeld: false,
  pressed: ['q', 'dodge'],
  released: ['e'],
  interactHeld: false
};

describe('T002 runtime contracts', () => {
  it('rejects NaN and Infinity', () => {
    expect(Vec2Schema.safeParse({ x: Number.NaN, y: 0 }).success).toBe(false);
    expect(Vec2Schema.safeParse({ x: 0, y: Number.POSITIVE_INFINITY }).success).toBe(false);
    expect(AbilityDefinitionSchema.safeParse({ ...validAbility, rangePx: Number.POSITIVE_INFINITY }).success).toBe(false);
  });

  it('rejects unknown hero ids and duplicate loadout entries', () => {
    expect(SaveGameSchema.safeParse({ ...validSave, unlockedHeroes: ['unknown_hero'] }).success).toBe(false);
    expect(SaveGameSchema.safeParse({
      ...validSave,
      loadouts: { jao: ['relic_alpha', 'relic_alpha'] }
    }).success).toBe(false);
  });

  it('preserves valid save, input and quest properties', () => {
    const save = SaveGameSchema.parse(validSave);
    const input = InputFrameSchema.parse(validInput);
    const quest = QuestDefinitionSchema.parse(validQuest);

    expect(save.loadouts.jao).toEqual(['relic_alpha', 'relic_beta']);
    expect(input.pressed).toEqual(['q', 'dodge']);
    expect(quest.stages[0]?.objective.type).toBe('interact');
    expect(quest.rewards.xp).toBe(100);
  });

  it('rejects duplicate input actions and unknown event types', () => {
    expect(InputFrameSchema.safeParse({ ...validInput, pressed: ['q', 'q'] }).success).toBe(false);
    expect(EventEnvelopeSchema.safeParse({
      eventId: 'event_1',
      tick: 1,
      runId: 'run_1',
      type: 'made_up_event',
      payload: {}
    }).success).toBe(false);
  });

  it('enforces the save payload size before parsing', () => {
    const oversized = JSON.stringify({
      ...validSave,
      storyFlags: { giant: 'x'.repeat(2 * 1024 * 1024) }
    });
    expect(() => parseSaveGameJson(oversized)).toThrow('2 MiB');
  });
});
