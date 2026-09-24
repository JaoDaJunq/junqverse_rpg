import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAB_LOADOUT,
  effectForSlot,
  normalizeLabLoadout
} from '../apps/client/src/ui/LabCatalog.js';

describe('Visual V3 lab catalog', () => {
  it('uses safe defaults for malformed persisted data', () => {
    expect(normalizeLabLoadout(null)).toEqual(DEFAULT_LAB_LOADOUT);
    expect(normalizeLabLoadout({ effects: 'bad' })).toEqual(
      DEFAULT_LAB_LOADOUT
    );
  });

  it('keeps valid per-slot effects and falls back invalid entries', () => {
    const result = normalizeLabLoadout({
      effects: {
        basic: 'magic_violet',
        q: 'not_real',
        w: 'circle_cyan'
      }
    });

    expect(result.effects.basic).toBe('magic_violet');
    expect(result.effects.q).toBe(DEFAULT_LAB_LOADOUT.effects.q);
    expect(result.effects.w).toBe('circle_cyan');
  });

  it('resolves the configured effect for a slot', () => {
    expect(effectForSlot(DEFAULT_LAB_LOADOUT, 'r')).toBe('circle_cyan');
  });
});
