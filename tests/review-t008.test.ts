import { describe, expect, it } from 'vitest';
import {
  DODGE_RECHARGE_TICKS,
  FOCUS_REGEN_DELAY_TICKS,
  FOCUS_REGEN_INTERVAL_TICKS,
  createCombatantState,
  isAbilityOnCooldown,
  isDodgeInvulnerable,
  stepCombatant,
  tryAcceptAbility,
  tryStartDodge,
  interruptCast,
  killCombatant,
  type AbilityCastSpec,
  type CombatantState
} from '../packages/sim/src/index.js';

function stepMany(state: CombatantState, ticks: number): CombatantState {
  let next = state;
  for (let index = 0; index < ticks; index += 1) {
    next = stepCombatant(next);
  }
  return next;
}

const instant: AbilityCastSpec = {
  ability: {
    id: 'instant',
    costFocus: 10,
    cooldownTicks: 0,
    windupTicks: 0,
    recoveryTicks: 0
  }
};

describe('T008 independent review', () => {
  it('keeps accepted state immutable from the original', () => {
    const original = createCombatantState(1);
    const accepted = tryAcceptAbility(original, instant, {
      targetValid: true,
      stunned: false
    });

    expect(original.resources.focus).toBe(100);
    expect(original.activeCast).toBeNull();
    expect(original.nextAttackInstanceCounter).toBe(0);
    expect(accepted.state).not.toBe(original);
  });

  it('finishes a zero-windup zero-recovery instant cast in exactly one step', () => {
    const accepted = tryAcceptAbility(createCombatantState(1), instant, {
      targetValid: true,
      stunned: false
    });

    expect(accepted.state.activeCast?.phase).toBe('active');
    expect(accepted.state.activeCast?.phaseTicksRemaining).toBe(1);

    const after = stepCombatant(accepted.state);
    expect(after.activeCast).toBeNull();
    expect(isAbilityOnCooldown(after.resources, 'instant')).toBe(false);
  });

  it('does not regenerate focus during the full delay window', () => {
    const accepted = tryAcceptAbility(createCombatantState(1), instant, {
      targetValid: true,
      stunned: false
    });

    const beforeDelayEnds = stepMany(
      accepted.state,
      FOCUS_REGEN_DELAY_TICKS - 1
    );
    expect(beforeDelayEnds.resources.focus).toBe(90);

    const delayEnds = stepCombatant(beforeDelayEnds);
    expect(delayEnds.resources.focus).toBe(90);

    const beforeFirstPoint = stepMany(
      delayEnds,
      FOCUS_REGEN_INTERVAL_TICKS - 1
    );
    expect(beforeFirstPoint.resources.focus).toBe(90);

    const firstPoint = stepCombatant(beforeFirstPoint);
    expect(firstPoint.resources.focus).toBe(91);
  });

  it('does not reset first dodge recharge when second charge is spent', () => {
    let state = tryStartDodge(createCombatantState(1), { stunned: false }).state;
    state = stepMany(state, 12);
    const remainingBeforeSecond = state.resources.dodgeRechargeTicksRemaining;

    state = tryStartDodge(state, { stunned: false }).state;
    expect(state.resources.dodgeRechargeTicksRemaining).toBe(remainingBeforeSecond);

    state = stepMany(state, remainingBeforeSecond ?? 0);
    expect(state.resources.dodgeCharges).toBe(1);
    expect(state.resources.dodgeRechargeTicksRemaining).toBe(DODGE_RECHARGE_TICKS);
  });

  it('has no invulnerability before tick 2 or after tick 8', () => {
    let state = tryStartDodge(createCombatantState(1), { stunned: false }).state;

    expect(isDodgeInvulnerable(state)).toBe(false);
    state = stepCombatant(state);
    expect(isDodgeInvulnerable(state)).toBe(false);
    state = stepCombatant(state);
    expect(isDodgeInvulnerable(state)).toBe(true);

    state = stepMany(state, 6);
    expect(isDodgeInvulnerable(state)).toBe(true);
    state = stepCombatant(state);
    expect(isDodgeInvulnerable(state)).toBe(false);
  });

  it('preserves cost and cooldown through interruption and death', () => {
    const spec: AbilityCastSpec = {
      ability: {
        id: 'costly',
        costFocus: 35,
        cooldownTicks: 90,
        windupTicks: 10,
        recoveryTicks: 5
      }
    };

    const accepted = tryAcceptAbility(createCombatantState(2), spec, {
      targetValid: true,
      stunned: false
    });

    const interrupted = interruptCast(accepted.state, 'stun');
    const dead = killCombatant(interrupted);

    expect(dead.resources.focus).toBe(65);
    expect(dead.resources.cooldowns.costly).toBe(90);
    expect(dead.activeCast).toBeNull();
  });

  it('rejects dodge while stunned without consuming a charge', () => {
    const original = createCombatantState(1);
    const dodge = tryStartDodge(original, { stunned: true });

    expect(dodge.accepted).toBe(false);
    expect(dodge.reason).toBe('stunned');
    expect(dodge.state).toEqual(original);
  });

  it('rejects invalid active tick counts before mutating state', () => {
    const original = createCombatantState(1);

    expect(() => tryAcceptAbility(original, {
      ...instant,
      activeTicks: 0
    }, {
      targetValid: true,
      stunned: false
    })).toThrow('activeTicks');

    expect(original.resources.focus).toBe(100);
  });

  it('does not reuse attack IDs after multiple interrupted zero-cooldown casts', () => {
    let state = createCombatantState(9);
    const ids: Array<string | null> = [];

    for (let index = 0; index < 5; index += 1) {
      const accepted = tryAcceptAbility(state, instant, {
        targetValid: true,
        stunned: false
      });
      ids.push(accepted.attackInstanceId);
      state = interruptCast(accepted.state, 'action');
    }

    expect(ids).toEqual([
      'attack:9:0',
      'attack:9:1',
      'attack:9:2',
      'attack:9:3',
      'attack:9:4'
    ]);
  });
});
