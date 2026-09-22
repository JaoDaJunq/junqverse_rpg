import { describe, expect, it } from 'vitest';
import { validateContent, type ContentDocument } from '../../../packages/content/src/index.js';

const ability = (id: string) => ({
  id,
  nameKey: `${id}_name`,
  costFocus: 0,
  cooldownTicks: 0,
  windupTicks: 0,
  recoveryTicks: 0,
  target: 'direction',
  rangePx: 100,
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
    q: ability('q'),
    w: ability('w'),
    e: ability('e'),
    r: ability('r')
  },
  assetId: 'missing_asset'
};

const map = {
  id: 'map_p0',
  tileSize: 32,
  widthTiles: 10,
  heightTiles: 10,
  rooms: [],
  spawnPoints: [],
  blockers: [],
  interactables: [],
  exits: []
};

const quest = {
  id: 'quest_m01',
  kind: 'main',
  titleKey: 'quest_m01_title',
  mapId: 'map_p0',
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

describe('T003 reviewer', () => {
  it('rejects a missing hero asset reference with file/id context', () => {
    const docs: ContentDocument[] = [
      { file: 'heroes/jao.json', kind: 'hero', data: hero }
    ];
    const result = validateContent(docs);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      file: 'heroes/jao.json',
      id: 'jao',
      code: 'missing_asset'
    }));
  });

  it('rejects duplicate ids', () => {
    const docs: ContentDocument[] = [
      { file: 'maps/a.json', kind: 'map', data: map },
      { file: 'maps/b.json', kind: 'map', data: map }
    ];
    const result = validateContent(docs);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.code === 'duplicate_id')).toBe(true);
  });

  it('accepts a partial catalog when every included reference resolves', () => {
    const docs: ContentDocument[] = [
      { file: 'maps/p0.json', kind: 'map', data: map },
      { file: 'quests/m01.json', kind: 'quest', data: quest }
    ];
    expect(validateContent(docs)).toEqual({ ok: true, errors: [] });
  });
});
