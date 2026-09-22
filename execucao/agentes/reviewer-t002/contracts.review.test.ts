import { describe, expect, it } from 'vitest';
import { SaveGameSchema } from '../../../packages/content/src/index.js';
import { InputFrameSchema } from '../../../packages/protocol/src/index.js';

const normativeSave = {
  schemaVersion: 1,
  contentVersion: '0.1.0',
  profileId: 'profile_1',
  updatedAt: '2026-09-22T20:00:00-03:00',
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

const normativeInput = {
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

describe('T002 independent contract compatibility', () => {
  it('accepts a normal dotted contentVersion because the normative contract declares string', () => {
    expect(SaveGameSchema.safeParse(normativeSave).success).toBe(true);
  });

  it('does not invent an undocumented movement range for finite numeric input fields', () => {
    expect(InputFrameSchema.safeParse(normativeInput).success).toBe(true);
  });
});
