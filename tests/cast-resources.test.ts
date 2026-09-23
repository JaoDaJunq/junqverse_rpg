import { describe, expect, it } from 'vitest';
import {
  DODGE_INVULNERABLE_END_TICK,
  DODGE_INVULNERABLE_START_TICK,
  DODGE_RECHARGE_TICKS,
  createCombatantState,
  interruptCast,
  isAbilityOnCooldown,
  isDodgeInvulnerable,
  killCombatant,
  resolveCombatActionPriority,
  stepCombatant,
  tryAcceptAbility,
  tryStartDodge,
  type AbilityCastSpec
} from '../packages/sim/src/index.js';

const ability: AbilityCastSpec = {
  ability: {
    id: 'test_dash',
    costFocus: 20,
    cooldownTicks: 120,
    windupTicks: 2,
    recoveryTicks: 2
  },
  activeTicks: 1
};

function stepMany<T>(state: T, steps: number, step: (value: T) => T): T {
  let next = state;
  for (let index = 0; index < steps; index += 1) {
    next = step(next);
  }
  return next;
}

describe('T008 cast cycle and resources', () => {
  it('rejects an invalid target without spending focus or starting cooldown', () => {
    const initial = createCombatantState(1);
    const result = tryAcceptAbility(initial, ability, {
      targetValid: false,
      stunned: false
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('invalid_target');
    expect(result.state).toEqual(initial);
    expect(result.attackInstanceId).toBeNull();
  });

  it('spends focus and starts cooldown at acceptance', () => {
    const result = tryAcceptAbility(createCombatantState(1), ability, {
      targetValid: true,
      stunned: false
    });

    expect(result.accepted).toBe(true);
    expect(result.state.resources.focus).toBe(80);
    expect(result.state.resources.cooldowns.test_dash).toBe(120);
    expect(result.state.activeCast?.phase).toBe('windup');
    expect(result.attackInstanceId).toBe('attack:1:0');
  });

  it('does not refund cost or cooldown after a stun interruption', () => {
    const accepted = tryAcceptAbility(createCombatantState(1), ability, {
      targetValid: true,
      stunned: false
    });
    const interrupted = interruptCast(accepted.state, 'stun');

    expect(interrupted.activeCast).toBeNull();
    expect(interrupted.resources.focus).toBe(80);
    expect(interrupted.resources.cooldowns.test_dash).toBe(120);
  });

  it('progresses windup to active to recovery deterministically', () => {
    let state = tryAcceptAbility(createCombatantState(1), ability, {
      targetValid: true,
      stunned: false
    }).state;

    expect(state.activeCast?.phase).toBe('windup');
    state = stepCombatant(state);
    expect(state.activeCast?.phase).toBe('windup');
    state = stepCombatant(state);
    expect(state.activeCast?.phase).toBe('active');
    state = stepCombatant(state);
    expect(state.activeCast?.phase).toBe('recovery');
    state = stepCombatant(state);
    expect(state.activeCast?.phase).toBe('recovery');
    state = stepCombatant(state);
    expect(state.activeCast).toBeNull();
  });

  it('does not duplicate a cast while the previous cast or cooldown is active', () => {
    const first = tryAcceptAbility(createCombatantState(1), ability, {
      targetValid: true,
      stunned: false
    });
    const whileBusy = tryAcceptAbility(first.state, ability, {
      targetValid: true,
      stunned: false
    });

    expect(whileBusy.accepted).toBe(false);
    expect(whileBusy.reason).toBe('busy');
    expect(whileBusy.state.resources.focus).toBe(80);

    const afterCast = stepMany(first.state, 5, stepCombatant);
    const whileCooldown = tryAcceptAbility(afterCast, ability, {
      targetValid: true,
      stunned: false
    });

    expect(whileCooldown.accepted).toBe(false);
    expect(whileCooldown.reason).toBe('cooldown');
    expect(whileCooldown.state.resources.focus).toBeGreaterThanOrEqual(80);
  });

  it('keeps attack instance ids monotonic even when a cast is interrupted', () => {
    const first = tryAcceptAbility(createCombatantState(7), {
      ...ability,
      ability: { ...ability.ability, cooldownTicks: 0 }
    }, {
      targetValid: true,
      stunned: false
    });

    const interrupted = interruptCast(first.state, 'stun');
    const second = tryAcceptAbility(interrupted, {
      ...ability,
      ability: { ...ability.ability, cooldownTicks: 0 }
    }, {
      targetValid: true,
      stunned: false
    });

    expect(first.attackInstanceId).toBe('attack:7:0');
    expect(second.attackInstanceId).toBe('attack:7:1');
  });

  it('cancels the active cast on death without refunding accepted resources', () => {
    const accepted = tryAcceptAbility(createCombatantState(1), ability, {
      targetValid: true,
      stunned: false
    });
    const dead = killCombatant(accepted.state);

    expect(dead.alive).toBe(false);
    expect(dead.activeCast).toBeNull();
    expect(dead.resources.focus).toBe(80);
    expect(isAbilityOnCooldown(dead.resources, 'test_dash')).toBe(true);
  });

  it('recharges focus at 10 per second only after one second without spending', () => {
    const accepted = tryAcceptAbility(createCombatantState(1), ability, {
      targetValid: true,
      stunned: false
    });

    let state = stepMany(accepted.state, 60, stepCombatant);
    expect(state.resources.focus).toBe(80);

    state = stepMany(state, 6, stepCombatant);
    expect(state.resources.focus).toBe(81);

    state = stepMany(state, 54, stepCombatant);
    expect(state.resources.focus).toBe(90);
  });

  it('uses two dodge charges with sequential four-second recharge', () => {
    let state = createCombatantState(1);

    const first = tryStartDodge(state, { stunned: false });
    expect(first.accepted).toBe(true);
    state = stepMany(first.state, 12, stepCombatant);

    const second = tryStartDodge(state, { stunned: false });
    expect(second.accepted).toBe(true);
    state = second.state;
    expect(state.resources.dodgeCharges).toBe(0);

    state = stepMany(state, DODGE_RECHARGE_TICKS - 12, stepCombatant);
    expect(state.resources.dodgeCharges).toBe(1);
    expect(state.resources.dodgeRechargeTicksRemaining).toBe(DODGE_RECHARGE_TICKS);

    state = stepMany(state, DODGE_RECHARGE_TICKS, stepCombatant);
    expect(state.resources.dodgeCharges).toBe(2);
    expect(state.resources.dodgeRechargeTicksRemaining).toBeNull();
  });

  it('applies dodge invulnerability only on relative ticks 2 through 8', () => {
    let state = tryStartDodge(createCombatantState(1), { stunned: false }).state;

    expect(isDodgeInvulnerable(state)).toBe(false);

    for (let tick = 1; tick <= DODGE_INVULNERABLE_END_TICK + 1; tick += 1) {
      state = stepCombatant(state);
      expect(isDodgeInvulnerable(state)).toBe(
        tick >= DODGE_INVULNERABLE_START_TICK &&
        tick <= DODGE_INVULNERABLE_END_TICK
      );
    }
  });

  it('dodge takes priority over an accepted cast and cancels it without refund', () => {
    const accepted = tryAcceptAbility(createCombatantState(1), ability, {
      targetValid: true,
      stunned: false
    });

    const dodge = tryStartDodge(accepted.state, { stunned: false });

    expect(dodge.accepted).toBe(true);
    expect(dodge.state.activeCast).toBeNull();
    expect(dodge.state.resources.focus).toBe(80);
    expect(dodge.state.resources.cooldowns.test_dash).toBe(120);
  });

  it('resolves action priority according to the combat contract', () => {
    expect(resolveCombatActionPriority({
      dead: true,
      stunned: true,
      dodgeRequested: true,
      abilityAccepted: true,
      basicRequested: true,
      movementRequested: true
    })).toBe('dead');

    expect(resolveCombatActionPriority({
      dead: false,
      stunned: true,
      dodgeRequested: true,
      abilityAccepted: true,
      basicRequested: true,
      movementRequested: true
    })).toBe('stun');

    expect(resolveCombatActionPriority({
      dead: false,
      stunned: false,
      dodgeRequested: true,
      abilityAccepted: true,
      basicRequested: true,
      movementRequested: true
    })).toBe('dodge');

    expect(resolveCombatActionPriority({
      dead: false,
      stunned: false,
      dodgeRequested: false,
      abilityAccepted: true,
      basicRequested: true,
      movementRequested: true
    })).toBe('ability');
  });
});
