import { describe, expect, it } from 'vitest';
import {
  SaveGameSchema,
  parseSaveGameJson,
  validateContent,
  type ContentDocument
} from '../packages/content/src/index.js';
import {
  EventEnvelopeSchema,
  InputFrameSchema
} from '../packages/protocol/src/index.js';
import {
  createWorld,
  emitWorldEvent,
  nextWorldRandom,
  stepWorld
} from '../packages/sim/src/index.js';

const validSave = {
  schemaVersion: 1,
  contentVersion: '0.1.0',
  profileId: 'audit_profile',
  updatedAt: 'opaque',
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

describe('full audit adversarial checks', () => {
  it('rejects non-finite and duplicate protocol actions', () => {
    const base = {
      seq: 1,
      clientTick: 1,
      moveX: 0,
      moveY: 0,
      aimX: 0,
      aimY: 0,
      basicHeld: false,
      pressed: [],
      released: [],
      interactHeld: false
    };

    expect(InputFrameSchema.safeParse({ ...base, aimX: Number.NaN }).success).toBe(false);
    expect(InputFrameSchema.safeParse({ ...base, released: ['e', 'e'] }).success).toBe(false);
  });

  it('rejects nested prototype pollution in save and events', () => {
    const nested = JSON.parse('{"safe":[{"__proto__":{"polluted":true}}]}') as unknown;

    expect(SaveGameSchema.safeParse({ ...validSave, settings: nested }).success).toBe(false);
    expect(EventEnvelopeSchema.safeParse({
      eventId: 'audit_event',
      tick: 1,
      runId: 'audit_run',
      type: 'entity_moved',
      payload: nested
    }).success).toBe(false);
  });

  it('counts UTF-8 bytes before parsing oversized saves', () => {
    const payload = JSON.stringify({
      ...validSave,
      storyFlags: { multibyte: '😀'.repeat(600_000) }
    });

    expect(() => parseSaveGameJson(payload)).toThrow('2 MiB');
  });

  it('keeps world transitions deterministic across repeated single ticks', () => {
    const run = () => {
      let world = createWorld('audit_world', 2026);
      const trace: number[] = [];

      for (let index = 0; index < 600; index += 1) {
        if (index % 60 === 0) {
          const sampled = nextWorldRandom(world);
          world = sampled.world;
          trace.push(sampled.value);
        }
        world = stepWorld(world, [], 1).world;
      }
      return { world, trace };
    };

    expect(run()).toEqual(run());
    expect(run().world.tick).toBe(600);
  });

  it('keeps event ordering stable when returned world state is threaded', () => {
    let world = createWorld('audit_events', 1);
    const ids: string[] = [];

    for (let index = 0; index < 100; index += 1) {
      const emitted = emitWorldEvent(world, 'entity_moved', { index });
      world = emitted.world;
      ids.push(emitted.event.eventId);
    }

    expect(new Set(ids).size).toBe(100);
    expect(ids[0]).toBe('audit_events:0:0');
    expect(ids[99]).toBe('audit_events:0:99');
  });

  it('rejects duplicate quest ids in a content catalog', () => {
    const quest = {
      id: 'quest_m01',
      kind: 'main',
      titleKey: 'quest_m01_title',
      mapId: 'map_a',
      prerequisites: [],
      stages: [{
        id: 'start',
        objective: { type: 'interact' },
        entryActions: [],
        completionActions: [],
        checkpointAfter: false,
        nextStageId: null
      }],
      rewards: {},
      firstClearFlag: 'quest_m01_clear'
    };
    const map = {
      id: 'map_a', tileSize: 32, widthTiles: 10, heightTiles: 10,
      rooms: [], spawnPoints: [], blockers: [], interactables: [], exits: []
    };
    const docs: ContentDocument[] = [
      { file: 'maps/a.json', kind: 'map', data: map },
      { file: 'quests/a.json', kind: 'quest', data: quest },
      { file: 'quests/b.json', kind: 'quest', data: quest }
    ];

    const result = validateContent(docs);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.code === 'duplicate_id')).toBe(true);
  });
});
