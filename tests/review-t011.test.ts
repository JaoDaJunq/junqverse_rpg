import { describe, expect, it } from 'vitest';
import {
  applyResonancePrimer,
  createHealthState,
  createResonanceState,
  createStatusState,
  getSlowMagnitude,
  hasResonanceMark,
  tryDetonateResonance,
  type ResonanceTarget
} from '../packages/sim/src/index.js';

const target = (
  entityId: number,
  x: number,
  y: number,
  invulnerable = false
): ResonanceTarget => ({
  entityId,
  position: { x, y },
  health: createHealthState(200),
  status: createStatusState(),
  invulnerable
});

describe('T011 independent review', () => {
  it('blocks a victim through tick +89 and allows it again at tick +90', () => {
    let state = createResonanceState();
    state = applyResonancePrimer(state, 2, 0).state;
    state = applyResonancePrimer(state, 3, 0).state;

    const first = tryDetonateResonance(state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 10
    }, [
      target(2, 0, 0),
      target(3, 100, 0),
      target(4, 50, 0)
    ]);

    const at89 = tryDetonateResonance(first.state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 3,
      detonatorEntityId: 9,
      detonatorRank: 1,
      currentTick: 99
    }, first.targets);

    const sharedAt89 = at89.targets.find((item) => item.entityId === 4);
    expect(sharedAt89?.health.health).toBe(175);

    let stateAt100 = applyResonancePrimer(at89.state, 3, 100).state;
    const at90 = tryDetonateResonance(stateAt100, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 3,
      detonatorEntityId: 9,
      detonatorRank: 1,
      currentTick: 100
    }, at89.targets);

    const sharedAt90 = at90.targets.find((item) => item.entityId === 4);
    expect(sharedAt90?.health.health).toBe(150);
  });

  it('does not let resonance_explosion trigger another detonation', () => {
    const state = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    ).state;

    const result = tryDetonateResonance(state, {
      triggerKind: 'resonance_explosion',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 1
    }, [target(2, 0, 0)]);

    expect(result.detonated).toBe(false);
    expect(result.consumedMark).toBe(false);
    expect(hasResonanceMark(result.state, 2, 1)).toBe(true);
  });

  it('leaves a nearby mark available after it is damaged by an explosion', () => {
    let state = createResonanceState();
    state = applyResonancePrimer(state, 2, 0).state;
    state = applyResonancePrimer(state, 3, 0).state;

    const first = tryDetonateResonance(state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 1
    }, [target(2, 0, 0), target(3, 40, 0)]);

    expect(hasResonanceMark(first.state, 3, 1)).toBe(true);

    const second = tryDetonateResonance(first.state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 3,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 2
    }, first.targets);

    expect(second.detonated).toBe(true);
    expect(second.consumedMark).toBe(true);
    expect(second.explodedTargetIds).toEqual([]);
  });

  it('consumes a valid primary mark even when the primary is still explosion-capped', () => {
    let state = createResonanceState();
    state = applyResonancePrimer(state, 2, 0).state;
    state = applyResonancePrimer(state, 3, 0).state;

    const first = tryDetonateResonance(state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 1
    }, [target(2, 0, 0), target(3, 40, 0)]);

    const second = tryDetonateResonance(first.state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 3,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 2
    }, first.targets);

    expect(second.detonated).toBe(true);
    expect(second.consumedMark).toBe(true);
    expect(hasResonanceMark(second.state, 3, 2)).toBe(false);
  });

  it('does not damage, slow or start victim cooldown on an invulnerable target', () => {
    const state = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    ).state;

    const result = tryDetonateResonance(state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 1
    }, [target(2, 0, 0, true)]);

    expect(result.detonated).toBe(true);
    expect(result.consumedMark).toBe(true);
    expect(result.explodedTargetIds).toEqual([]);
    expect(result.targets[0]?.health.health).toBe(200);
    expect(getSlowMagnitude(result.targets[0]!.status)).toBe(0);
    expect(result.state.nextExplosionAllowedTickByTarget['2']).toBeUndefined();
  });

  it('does not detonate an expired mark', () => {
    const state = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    ).state;

    const result = tryDetonateResonance(state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 240
    }, [target(2, 0, 0)]);

    expect(result.detonated).toBe(false);
    expect(result.consumedMark).toBe(false);
  });

  it('emits outline/icon activation and explicit removal cues', () => {
    const primed = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    );

    const detonated = tryDetonateResonance(primed.state, {
      triggerKind: 'detonator',
      primaryTargetEntityId: 2,
      detonatorEntityId: 1,
      detonatorRank: 1,
      currentTick: 1
    }, [target(2, 0, 0)]);

    expect(primed.visualEvent.cue).toBe('outline_and_icon');
    expect(detonated.visualEvents[0]).toEqual({
      kind: 'mark_changed',
      targetEntityId: 2,
      active: false,
      cue: 'outline_and_icon'
    });
  });
});
