import { describe, expect, it } from 'vitest';
import {
  applyResonancePrimer,
  createHealthState,
  createResonanceState,
  createStatusState,
  getSlowMagnitude,
  hasResonanceMark,
  pruneExpiredResonanceMarks,
  tryDetonateResonance,
  type ResonanceTarget
} from '../packages/sim/src/index.js';

const makeTarget = (
  entityId: number,
  x: number,
  y: number
): ResonanceTarget => ({
  entityId,
  position: { x, y },
  health: createHealthState(100),
  status: createStatusState()
});

describe('T011 resonance', () => {
  it('allows one hero to primer and detonate a target', () => {
    const primed = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    );

    const result = tryDetonateResonance(primed.state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 1
    }, [makeTarget(2, 0, 0)]);

    expect(result.detonated).toBe(true);
    expect(result.consumedMark).toBe(true);
    expect(result.explodedTargetIds).toEqual([2]);
    expect(result.targets[0]?.health.health).toBe(75);
    expect(getSlowMagnitude(result.targets[0]!.status)).toBe(0.2);
    expect(hasResonanceMark(result.state, 2, 1)).toBe(false);
  });

  it('renews a single mark instead of stacking marks', () => {
    let state = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    ).state;

    state = applyResonancePrimer(state, 2, 100).state;

    expect(state.marks).toHaveLength(1);
    expect(state.marks[0]?.expiresAtTick).toBe(340);
  });

  it('expires a mark exactly after four seconds', () => {
    const state = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    ).state;

    expect(hasResonanceMark(state, 2, 239)).toBe(true);
    expect(hasResonanceMark(state, 2, 240)).toBe(false);
    expect(pruneExpiredResonanceMarks(state, 240).marks).toEqual([]);
  });

  it('prevents two simultaneous detonators from duplicating one marked explosion', () => {
    const primed = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    ).state;

    const first = tryDetonateResonance(primed, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 10
    }, [makeTarget(2, 0, 0)]);

    const second = tryDetonateResonance(first.state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 3,
      detonatorRank: 1,
      currentTick: 10
    }, first.targets);

    expect(first.explodedTargetIds).toEqual([2]);
    expect(second.detonated).toBe(false);
    expect(second.explodedTargetIds).toEqual([]);
    expect(second.targets[0]?.health.health).toBe(75);
  });

  it('caps each explosion victim globally for 1.5 seconds across authors', () => {
    let state = createResonanceState();
    state = applyResonancePrimer(state, 2, 0).state;
    state = applyResonancePrimer(state, 3, 0).state;

    const targets = [
      makeTarget(2, 0, 0),
      makeTarget(3, 100, 0),
      makeTarget(4, 50, 0)
    ];

    const first = tryDetonateResonance(state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 5
    }, targets);

    const second = tryDetonateResonance(first.state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 3,
      detonatorEntityId: 9,
      detonatorRank: 1,
      currentTick: 5
    }, first.targets);

    const shared = second.targets.find((target) => target.entityId === 4);
    expect(shared?.health.health).toBe(75);
    expect(first.explodedTargetIds).toContain(4);
    expect(second.explodedTargetIds).not.toContain(4);
  });

  it('does not consume or detonate nearby marks in a chain', () => {
    let state = createResonanceState();
    state = applyResonancePrimer(state, 2, 0).state;
    state = applyResonancePrimer(state, 3, 0).state;

    const result = tryDetonateResonance(state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 1
    }, [
      makeTarget(2, 0, 0),
      makeTarget(3, 40, 0)
    ]);

    expect(result.explodedTargetIds).toEqual([2, 3]);
    expect(hasResonanceMark(result.state, 2, 1)).toBe(false);
    expect(hasResonanceMark(result.state, 3, 1)).toBe(true);
  });

  it('does not let DoT trigger or consume a mark', () => {
    const state = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    ).state;

    const result = tryDetonateResonance(state, {
      triggerKind: 'dot',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 1
    }, [makeTarget(2, 0, 0)]);

    expect(result.detonated).toBe(false);
    expect(result.consumedMark).toBe(false);
    expect(hasResonanceMark(result.state, 2, 1)).toBe(true);
  });

  it('uses detonator rank for explosion damage', () => {
    const state = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    ).state;

    const result = tryDetonateResonance(state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 6,
      currentTick: 1
    }, [makeTarget(2, 0, 0)]);

    expect(result.targets[0]?.health.health).toBe(70);
  });

  it('emits a non-color mark cue for presentation', () => {
    const primed = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    );

    expect(primed.visualEvent).toEqual({
      kind: 'mark_changed',
      targetEntityId: 2,
      active: true,
      cue: 'outline_and_icon'
    });
  });
});
