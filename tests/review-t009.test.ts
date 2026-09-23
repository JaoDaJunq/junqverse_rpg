import { describe, expect, it } from 'vitest';
import {
  applyDamage,
  applyHealing,
  applyShield,
  applyStatus,
  calculateDamage,
  createHealthState,
  createStatusState,
  getIncomingStatusMultiplier,
  getSlowMagnitude,
  isRooted,
  isStunned,
  stepStatuses,
  totalShield
} from '../packages/sim/src/index.js';

function stepStatus(
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

describe('T009 independent review', () => {
  it('keeps minimum damage at one under extreme armor', () => {
    expect(calculateDamage(1_000_000, {
      base: 1,
      powerMultiplier: 1
    })).toBe(1);
  });

  it('clamps outgoing and incoming products independently', () => {
    expect(calculateDamage(0, {
      base: 100,
      powerMultiplier: 1,
      outgoingModifiers: [10, 10],
      incomingModifiers: [10, 10]
    })).toBe(400);

    expect(calculateDamage(0, {
      base: 100,
      powerMultiplier: 1,
      outgoingModifiers: [0.01],
      incomingModifiers: [0.01]
    })).toBe(6);
  });

  it('reports death only on the living-to-dead transition', () => {
    const first = applyDamage(createHealthState(10), {
      base: 999,
      powerMultiplier: 1
    });

    const second = applyDamage(first.state, {
      base: 999,
      powerMultiplier: 1
    });

    expect(first.diedNow).toBe(true);
    expect(second.diedNow).toBe(false);
    expect(second.state.health).toBe(0);
  });

  it('keeps same-source shield at the larger value without stacking', () => {
    let state = createHealthState(100);
    state = applyShield(state, 'a', 20).state;
    state = applyShield(state, 'a', 30).state;
    state = applyShield(state, 'a', 25).state;

    expect(totalShield(state.shields)).toBe(30);
    expect(state.shields.bySource.a).toBe(30);
  });

  it('absorbs multiple shield sources before touching health', () => {
    let state = createHealthState(200);
    state = applyShield(state, 'b', 40).state;
    state = applyShield(state, 'a', 30).state;

    const result = applyDamage(state, {
      base: 60,
      powerMultiplier: 1
    });

    expect(result.absorbedByShield).toBe(60);
    expect(result.healthDamage).toBe(0);
    expect(result.state.health).toBe(200);
    expect(totalShield(result.state.shields)).toBe(10);
  });

  it('never revives through healing after death', () => {
    const dead = applyDamage(createHealthState(10), {
      base: 10,
      powerMultiplier: 1
    }).state;

    const healed = applyHealing(dead, 10_000);
    expect(healed.state.alive).toBe(false);
    expect(healed.state.health).toBe(0);
  });

  it('lets a weaker slow remain after the stronger source expires', () => {
    let state = createStatusState();

    state = applyStatus(state, {
      kind: 'slow',
      sourceId: 'long_weak',
      magnitude: 0.2,
      durationTicks: 100
    }, { isBoss: false }).state;

    state = applyStatus(state, {
      kind: 'slow',
      sourceId: 'short_strong',
      magnitude: 0.5,
      durationTicks: 10
    }, { isBoss: false }).state;

    state = stepStatus(state, 10);
    expect(getSlowMagnitude(state)).toBe(0.2);
  });

  it('allows boss control conversion again exactly after immunity expires', () => {
    let state = applyStatus(createStatusState(), {
      kind: 'stun',
      sourceId: 'first',
      durationTicks: 60
    }, { isBoss: true }).state;

    state = stepStatus(state, 239);
    const blocked = applyStatus(state, {
      kind: 'root',
      sourceId: 'second',
      durationTicks: 60
    }, { isBoss: true });
    expect(blocked.outcome).toBe('ignored');

    state = stepStatuses(state);
    const converted = applyStatus(state, {
      kind: 'root',
      sourceId: 'second',
      durationTicks: 60
    }, { isBoss: true });

    expect(converted.outcome).toBe('converted');
    expect(isRooted(converted.state)).toBe(false);
    expect(isStunned(converted.state)).toBe(false);
    expect(getIncomingStatusMultiplier(converted.state)).toBe(1.15);
  });

  it('grants arena immunity on the exact tick strong control expires', () => {
    let state = applyStatus(createStatusState(), {
      kind: 'stun',
      sourceId: 'arena_stun',
      durationTicks: 45
    }, { isBoss: false, mode: 'arena' }).state;

    state = stepStatus(state, 44, 'arena');
    expect(isStunned(state)).toBe(true);
    expect(state.strongControlImmunityTicks).toBe(0);

    state = stepStatuses(state, 'arena');
    expect(isStunned(state)).toBe(false);
    expect(state.strongControlImmunityTicks).toBe(120);

    const blocked = applyStatus(state, {
      kind: 'stun',
      sourceId: 'arena_stun_2',
      durationTicks: 1
    }, { isBoss: false, mode: 'arena' });

    expect(blocked.outcome).toBe('ignored');
  });

  it('does not mutate source health or status states', () => {
    const health = createHealthState(100);
    const status = createStatusState();

    const damaged = applyDamage(health, { base: 20, powerMultiplier: 1 });
    const slowed = applyStatus(status, {
      kind: 'slow',
      sourceId: 'slow',
      magnitude: 0.2,
      durationTicks: 10
    }, { isBoss: false });

    expect(health.health).toBe(100);
    expect(status.effects).toEqual([]);
    expect(damaged.state).not.toBe(health);
    expect(slowed.state).not.toBe(status);
  });
});
