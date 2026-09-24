import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createHealthState,
  createJaoBasicState,
  createJaoPassiveState,
  createResonanceState,
  createStatusState,
  getJaoOutgoingMultiplier,
  isJaoTargetAnalyzed,
  observeJaoEnemyAction,
  resolveJaoBasicAttack,
  resolveJaoQDash,
  type JaoCombatTarget,
  type JaoPassiveState
} from '../packages/sim/src/index.js';

function target(
  entityId: number,
  x: number,
  y: number
): JaoCombatTarget {
  return {
    entityId,
    position: { x, y },
    radius: 12,
    health: createHealthState(100),
    status: createStatusState()
  };
}

function observe(
  state: JaoPassiveState,
  input: {
    entityId?: number;
    x?: number;
    family: string;
    action: string;
    tick: number;
  }
) {
  return observeJaoEnemyAction(state, {
    jaoPosition: { x: 0, y: 0 },
    enemyEntityId: input.entityId ?? 2,
    enemyPosition: { x: input.x ?? 100, y: 0 },
    familyId: input.family,
    enemyActionId: input.action,
    currentTick: input.tick
  });
}

describe('T012 independent review', () => {
  it('counts observations exactly at 300 px but not beyond it', () => {
    let atBoundary = createJaoPassiveState();
    atBoundary = observe(atBoundary, {
      x: 300,
      family: 'slash',
      action: 'slash:1',
      tick: 0
    }).state;
    const second = observe(atBoundary, {
      x: 300,
      family: 'slash',
      action: 'slash:2',
      tick: 1
    });
    expect(second.analyzedApplied).toBe(true);

    let outside = createJaoPassiveState();
    outside = observe(outside, {
      x: 300.0001,
      family: 'slash',
      action: 'slash:1',
      tick: 0
    }).state;
    const outsideSecond = observe(outside, {
      x: 300,
      family: 'slash',
      action: 'slash:2',
      tick: 1
    });
    expect(outsideSecond.analyzedApplied).toBe(false);
  });

  it('accepts the second distinct family action at exactly 360 ticks but not 361', () => {
    let exact = createJaoPassiveState();
    exact = observe(exact, {
      family: 'burst',
      action: 'burst:1',
      tick: 0
    }).state;
    expect(observe(exact, {
      family: 'burst',
      action: 'burst:2',
      tick: 360
    }).analyzedApplied).toBe(true);

    let late = createJaoPassiveState();
    late = observe(late, {
      family: 'burst',
      action: 'burst:1',
      tick: 0
    }).state;
    expect(observe(late, {
      family: 'burst',
      action: 'burst:2',
      tick: 361
    }).analyzedApplied).toBe(false);
  });

  it('tracks families independently and does not treat another family as the repeat', () => {
    let passive = createJaoPassiveState();

    passive = observe(passive, {
      family: 'slash',
      action: 'slash:1',
      tick: 0
    }).state;

    const otherFamily = observe(passive, {
      family: 'shot',
      action: 'shot:1',
      tick: 10
    });
    passive = otherFamily.state;
    expect(otherFamily.analyzedApplied).toBe(false);

    const slashRepeat = observe(passive, {
      family: 'slash',
      action: 'slash:2',
      tick: 20
    });
    expect(slashRepeat.analyzedApplied).toBe(true);
  });

  it('refreshes analyzed without stacking multiple marks', () => {
    let passive = createJaoPassiveState();
    passive = observe(passive, {
      family: 'slash',
      action: 'slash:1',
      tick: 0
    }).state;
    passive = observe(passive, {
      family: 'slash',
      action: 'slash:2',
      tick: 10
    }).state;

    const refreshed = observe(passive, {
      family: 'slash',
      action: 'slash:3',
      tick: 100
    });

    expect(refreshed.analyzedApplied).toBe(true);
    expect(refreshed.state.analyzed).toHaveLength(1);
    expect(refreshed.state.analyzed[0]?.expiresAtTick).toBe(400);
    expect(isJaoTargetAnalyzed(refreshed.state, 2, 399)).toBe(true);
    expect(isJaoTargetAnalyzed(refreshed.state, 2, 400)).toBe(false);
  });

  it('does not let the basic hit through a wall', () => {
    const result = resolveJaoBasicAttack({
      state: createJaoBasicState(),
      currentTick: 0,
      ownerEntityId: 1,
      attackInstanceId: 'attack:review_basic:0',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      rank: 1,
      blockers: [{ x: 25, y: -20, width: 5, height: 40 }],
      targets: [target(2, 50, 0)],
      passive: createJaoPassiveState()
    });

    expect(result.hitTargetIds).toEqual([]);
    expect(result.targets[0]?.health.health).toBe(100);
  });

  it('applies analyzed outgoing x1.10 to Q damage', () => {
    let passive = createJaoPassiveState();
    passive = observe(passive, {
      family: 'strike',
      action: 'strike:1',
      tick: 0
    }).state;
    passive = observe(passive, {
      family: 'strike',
      action: 'strike:2',
      tick: 1
    }).state;

    expect(getJaoOutgoingMultiplier(passive, 2, 2)).toBe(1.1);

    const result = resolveJaoQDash({
      ownerEntityId: 1,
      attackInstanceId: 'attack:review_q:0',
      start: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      currentTick: 2,
      rank: 1,
      blockers: [],
      targets: [target(2, 60, 0)],
      resonance: createResonanceState(),
      passive
    });

    expect(result.targets[0]?.health.health).toBe(65);
  });

  it('returns Q hit IDs in swept path order, not input array order', () => {
    const result = resolveJaoQDash({
      ownerEntityId: 1,
      attackInstanceId: 'attack:review_q:order',
      start: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      currentTick: 0,
      rank: 1,
      blockers: [],
      targets: [
        target(4, 120, 0),
        target(2, 40, 0),
        target(3, 80, 0)
      ],
      resonance: createResonanceState(),
      passive: createJaoPassiveState()
    });

    expect(result.hitTargetIds).toEqual([2, 3, 4]);
  });

  it('keeps simulation ordering free of locale-sensitive comparisons', () => {
    const source = readFileSync(
      'packages/sim/src/heroes/jao.ts',
      'utf8'
    );

    expect(source).not.toContain('localeCompare');
  });
});
