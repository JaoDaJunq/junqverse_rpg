import { describe, expect, it } from 'vitest';
import {
  CURRENT_CONTENT_DOCUMENTS,
  assertValidContent,
  validateContent,
  type ContentDocument
} from '../packages/content/src/index.js';

const ability = (id: string) => ({
  id,
  nameKey: `${id}_name`,
  costFocus: 0,
  cooldownTicks: 0,
  windupTicks: 0,
  recoveryTicks: 0,
  target: 'direction',
  rangePx: 120,
  shapes: [],
  effects: [{ type: 'damage', amount: 1 }],
  tags: [],
  limits: {}
});

const hero = {
  id: 'jao',
  nameKey: 'hero_jao_name',
  roleKey: 'hero_jao_role',
  hp: 100,
  speedPxPerSecond: 180,
  basic: {},
  passive: {},
  abilities: {
    q: ability('jao_q'),
    w: ability('jao_w'),
    e: ability('jao_e'),
    r: ability('jao_r')
  },
  assetId: 'hero_jao_asset'
};

const map = {
  id: 'map_p0',
  tileSize: 32,
  widthTiles: 20,
  heightTiles: 20,
  rooms: [],
  spawnPoints: [],
  blockers: [],
  interactables: [],
  exits: []
};

function quest(
  id: 'quest_m01' | 'quest_m02',
  prerequisites: Array<'quest_m01' | 'quest_m02'> = [],
  stages = [
    {
      id: 'stage_start',
      objective: { type: 'interact' },
      entryActions: [],
      completionActions: [],
      checkpointAfter: false,
      nextStageId: 'stage_end'
    },
    {
      id: 'stage_end',
      objective: { type: 'interact' },
      entryActions: [],
      completionActions: [],
      checkpointAfter: true,
      nextStageId: null
    }
  ]
) {
  return {
    id,
    kind: 'main',
    titleKey: `${id}_title`,
    mapId: 'map_p0',
    prerequisites,
    stages,
    rewards: {},
    firstClearFlag: `${id}_first_clear`
  };
}

function baseDocuments(): ContentDocument[] {
  return [
    { file: 'assets/p0.json', kind: 'asset', data: 'hero_jao_asset' },
    { file: 'heroes/jao.json', kind: 'hero', data: hero },
    { file: 'maps/p0.json', kind: 'map', data: map },
    { file: 'quests/m01.json', kind: 'quest', data: quest('quest_m01') }
  ];
}

describe('T003 content validation', () => {
  it('keeps the current production catalog behind a failing gate', () => {
    expect(() => assertValidContent(CURRENT_CONTENT_DOCUMENTS)).not.toThrow();
  });

  it('accepts an internally complete partial milestone catalog', () => {
    const result = validateContent(baseDocuments());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects missing references with file and id in the error', () => {
    const documents = baseDocuments().filter((document) => document.kind !== 'map');
    const result = validateContent(documents);

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      file: 'quests/m01.json',
      id: 'quest_m01',
      code: 'missing_map'
    }));
    expect(result.errors.some((error) => error.message.includes('quests/m01.json [quest_m01]'))).toBe(true);
  });

  it('rejects prerequisite cycles', () => {
    const documents = baseDocuments().filter((document) => document.kind !== 'quest');
    documents.push(
      { file: 'quests/m01.json', kind: 'quest', data: quest('quest_m01', ['quest_m02']) },
      { file: 'quests/m02.json', kind: 'quest', data: quest('quest_m02', ['quest_m01']) }
    );

    const result = validateContent(documents);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.code === 'prerequisite_cycle')).toBe(true);
  });

  it('rejects missing next stages and unreachable stages', () => {
    const documents = baseDocuments().filter((document) => document.kind !== 'quest');
    documents.push({
      file: 'quests/m01.json',
      kind: 'quest',
      data: quest('quest_m01', [], [
        {
          id: 'stage_start',
          objective: { type: 'interact' },
          entryActions: [],
          completionActions: [],
          checkpointAfter: false,
          nextStageId: 'missing_stage'
        },
        {
          id: 'orphan_stage',
          objective: { type: 'interact' },
          entryActions: [],
          completionActions: [],
          checkpointAfter: false,
          nextStageId: null
        }
      ])
    });

    const result = validateContent(documents);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.code === 'missing_stage')).toBe(true);
    expect(result.errors.some((error) => error.code === 'unreachable_stage')).toBe(true);
    expect(result.errors.some((error) => error.code === 'missing_terminal')).toBe(true);
  });

  it('rejects stage cycles with no terminal', () => {
    const documents = baseDocuments().filter((document) => document.kind !== 'quest');
    documents.push({
      file: 'quests/m01.json',
      kind: 'quest',
      data: quest('quest_m01', [], [
        {
          id: 'stage_a',
          objective: { type: 'interact' },
          entryActions: [],
          completionActions: [],
          checkpointAfter: false,
          nextStageId: 'stage_b'
        },
        {
          id: 'stage_b',
          objective: { type: 'interact' },
          entryActions: [],
          completionActions: [],
          checkpointAfter: false,
          nextStageId: 'stage_a'
        }
      ])
    });

    const result = validateContent(documents);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.code === 'stage_cycle')).toBe(true);
  });

  it('throws from the gate helper when content is invalid', () => {
    const invalid = baseDocuments().filter((document) => document.kind !== 'asset');
    expect(() => assertValidContent(invalid)).toThrow('heroes/jao.json [jao]');
  });
});
