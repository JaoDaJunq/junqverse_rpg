import { describe, expect, it } from 'vitest';
import { QuestDefinitionSchema, SaveGameSchema } from '../../../packages/content/src/index.js';
import { EventEnvelopeSchema, InputFrameSchema } from '../../../packages/protocol/src/index.js';

const save = {
  schemaVersion: 1,
  contentVersion: '0.1.0',
  profileId: 'profile_1',
  updatedAt: 'opaque_timestamp',
  xp: 0,
  fragments: 0,
  unlockedHeroes: ['jao'],
  unlockedRelics: [],
  loadouts: {},
  completedQuests: [],
  storyFlags: {},
  cosmetics: [],
  mastery: {},
  rewardLedger: {},
  activeRun: null,
  settings: {}
};

const input = {
  seq: 1,
  clientTick: 1,
  moveX: 2,
  moveY: -2,
  aimX: 0,
  aimY: 0,
  basicHeld: false,
  pressed: [],
  released: [],
  interactHeld: false
};

const quest = {
  id: 'quest_m01',
  kind: 'main',
  titleKey: 'quest_m01_title',
  mapId: 'map_01',
  prerequisites: [],
  stages: [{
    id: 'stage_01',
    objective: { type: 'interact' },
    entryActions: [],
    completionActions: [],
    checkpointAfter: false,
    nextStageId: null
  }],
  rewards: {},
  firstClearFlag: 'quest_m01_clear'
};

describe('T002 reviewer round 3', () => {
  it('accepts normative string fields and finite movement values', () => {
    expect(SaveGameSchema.safeParse(save).success).toBe(true);
    expect(InputFrameSchema.safeParse(input).success).toBe(true);
  });

  it('rejects unknown quest ids', () => {
    expect(QuestDefinitionSchema.safeParse({ ...quest, id: 'quest_m99' }).success).toBe(false);
  });

  it('rejects prototype-pollution keys in save and message inputs', () => {
    const polluted = JSON.parse('{"__proto__":{"polluted":true}}') as unknown;

    expect(SaveGameSchema.safeParse({
      ...save,
      settings: polluted
    }).success).toBe(false);

    expect(EventEnvelopeSchema.safeParse({
      eventId: 'event_1',
      tick: 1,
      runId: 'run_1',
      type: 'entity_moved',
      payload: polluted
    }).success).toBe(false);
  });

  it('rejects non-finite numbers nested in message payloads', () => {
    expect(EventEnvelopeSchema.safeParse({
      eventId: 'event_1',
      tick: 1,
      runId: 'run_1',
      type: 'entity_moved',
      payload: { x: Number.NaN }
    }).success).toBe(false);
  });
});
