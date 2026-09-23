import { describe, expect, it } from 'vitest';
import {
  applyDamage,
  applyHealing,
  applyShield,
  applyStatus,
  calculateDamage,
  canApplyDisplacement,
  createHealthState,
  createStatusState,
  getIncomingStatusMultiplier,
  getSlowMagnitude,
  getStatusMovementMultiplier,
  isRooted,
  isStunned,
  stepStatuses,
  totalShield
} from '../packages/sim/src/index.js';

function stepStatusMany(
  state: ReturnType<typeof createStatusState>,
  ticks: number,
  mode: 'pve' | 'arena' = 'pve'
) {
  let next = state;
  for (let index = 0; index < ticks; index += 1) {
    next = stepStatuses(next, mode);
  }
  return next;
}

describe('T009 damage, shields, healing and statuses', () => {
  it('applies the documented damage formula and clamps modifier products', () => {
    expect(calculateDamage(0, {
      base: 100,
      powerMultiplier: 1,
      outgoingModifiers: [1.5, 2],
      incomingModifiers: [0.5, 0.5]
    })).toBe(50);

    expect(calculateDamage(100, {
      base: 100,
      powerMultiplier: 1.2,
      outgoingModifiers: [1.1],
      incomingModifiers: [1.15]
    })).toBe(75);
  });

  it('absorbs shields before health and never produces negative health', () => {
    let state = createHealthState(100);
    state = applyShield(state, 'shield_a', 30).state;

    const hit = applyDamage(state, {
      base: 150,
      powerMultiplier: 1
    });

    expect(hit.absorbedByShield).toBe(30);
    expect(hit.healthDamage).toBe(100);
    expect(hit.state.health).toBe(0);
    expect(hit.state.alive).toBe(false);
    expect(hit.diedNow).toBe(true);

    const repeated = applyDamage(hit.state, {
      base: 999,
      powerMultiplier: 1
    });
    expect(repeated.diedNow).toBe(false);
    expect(repeated.effectiveDamage).toBe(0);
  });

  it('renews same-source shield without stacking and caps total shield at 50% max health', () => {
    let state = createHealthState(200);

    state = applyShield(state, 'same', 30).state;
    state = applyShield(state, 'same', 20).state;
    expect(totalShield(state.shields)).toBe(30);

    state = applyShield(state, 'same', 60).state;
    expect(totalShield(state.shields)).toBe(60);

    state = applyShield(state, 'other', 80).state;
    expect(totalShield(state.shields)).toBe(100);
    expect(state.shields.bySource.other).toBe(40);
  });

  it('heals only living targets and caps at max health', () => {
    const damaged = applyDamage(createHealthState(100), {
      base: 40,
      powerMultiplier: 1
    }).state;

    const healed = applyHealing(damaged, 999);
    expect(healed.state.health).toBe(100);
    expect(healed.effectiveHealing).toBe(40);

    const dead = applyDamage(createHealthState(100), {
      base: 200,
      powerMultiplier: 1
    }).state;
    const noRevive = applyHealing(dead, 50);
    expect(noRevive.state.health).toBe(0);
    expect(noRevive.effectiveHealing).toBe(0);
  });

  it('blocks damage while invulnerable', () => {
    const state = createHealthState(100);
    const result = applyDamage(state, {
      base: 999,
      powerMultiplier: 1,
      invulnerable: true
    });

    expect(result.state).toEqual(state);
    expect(result.effectiveDamage).toBe(0);
  });

  it('uses the strongest slow while keeping weaker sources alive', () => {
    let state = createStatusState();
    state = applyStatus(state, {
      kind: 'slow',
      sourceId: 'weak',
      magnitude: 0.2,
      durationTicks: 120
    }, { isBoss: false }).state;
    state = applyStatus(state, {
      kind: 'slow',
      sourceId: 'strong',
      magnitude: 0.5,
      durationTicks: 30
    }, { isBoss: false }).state;

    expect(getSlowMagnitude(state)).toBe(0.5);
    state = stepStatusMany(state, 30);
    expect(getSlowMagnitude(state)).toBe(0.2);
  });

  it('caps PvE root and stun durations', () => {
    let root = applyStatus(createStatusState(), {
      kind: 'root',
      sourceId: 'root',
      durationTicks: 999
    }, { isBoss: false }).state;
    let stun = applyStatus(createStatusState(), {
      kind: 'stun',
      sourceId: 'stun',
      durationTicks: 999
    }, { isBoss: false }).state;

    root = stepStatusMany(root, 89);
    stun = stepStatusMany(stun, 59);
    expect(isRooted(root)).toBe(true);
    expect(isStunned(stun)).toBe(true);

    root = stepStatuses(root);
    stun = stepStatuses(stun);
    expect(isRooted(root)).toBe(false);
    expect(isStunned(stun)).toBe(false);
  });

  it('converts boss root/stun into temporary vulnerable with conversion immunity', () => {
    let state = createStatusState();
    const first = applyStatus(state, {
      kind: 'stun',
      sourceId: 'hero_stun',
      durationTicks: 60
    }, { isBoss: true });

    state = first.state;
    expect(first.outcome).toBe('converted');
    expect(isStunned(state)).toBe(false);
    expect(getIncomingStatusMultiplier(state)).toBe(1.15);
    expect(state.bossControlConversionImmunityTicks).toBe(240);

    const repeated = applyStatus(state, {
      kind: 'root',
      sourceId: 'hero_root',
      durationTicks: 90
    }, { isBoss: true });

    expect(repeated.outcome).toBe('ignored');
    expect(repeated.state).toEqual(state);
    expect(canApplyDisplacement(true)).toBe(false);
  });

  it('caps arena slow and strong control, then grants post-control immunity', () => {
    let state = createStatusState();
    state = applyStatus(state, {
      kind: 'slow',
      sourceId: 'slow',
      magnitude: 0.5,
      durationTicks: 60
    }, { isBoss: false, mode: 'arena' }).state;
    state = applyStatus(state, {
      kind: 'stun',
      sourceId: 'stun',
      durationTicks: 120
    }, { isBoss: false, mode: 'arena' }).state;

    expect(getSlowMagnitude(state)).toBe(0.3);

    state = stepStatusMany(state, 45, 'arena');
    expect(isStunned(state)).toBe(false);
    expect(state.strongControlImmunityTicks).toBe(120);

    const blocked = applyStatus(state, {
      kind: 'root',
      sourceId: 'root',
      durationTicks: 10
    }, { isBoss: false, mode: 'arena' });
    expect(blocked.outcome).toBe('ignored');
  });

  it('does not stack vulnerable and haste from multiple sources', () => {
    let state = createStatusState();

    state = applyStatus(state, {
      kind: 'vulnerable',
      sourceId: 'v1',
      durationTicks: 180
    }, { isBoss: false }).state;
    state = applyStatus(state, {
      kind: 'vulnerable',
      sourceId: 'v2',
      durationTicks: 180
    }, { isBoss: false }).state;
    state = applyStatus(state, {
      kind: 'haste',
      sourceId: 'h1',
      magnitude: 0.15,
      durationTicks: 180
    }, { isBoss: false }).state;
    state = applyStatus(state, {
      kind: 'haste',
      sourceId: 'h2',
      magnitude: 0.15,
      durationTicks: 180
    }, { isBoss: false }).state;

    expect(getIncomingStatusMultiplier(state)).toBe(1.15);
    expect(getStatusMovementMultiplier(state)).toBe(1.15);
  });
});
