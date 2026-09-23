import type { AbilityDefinition } from '@junqverse/content';
import {
  DODGE_DURATION_TICKS,
  DODGE_INVULNERABLE_END_TICK,
  DODGE_INVULNERABLE_START_TICK,
  createCombatResources,
  isAbilityOnCooldown,
  spendDodgeCharge,
  spendFocus,
  startCooldown,
  stepCombatResources,
  type CombatResources
} from './resources.js';

export type CastPhase = 'windup' | 'active' | 'recovery';
export type CastInterruptReason = 'stun' | 'death' | 'action';

export interface AbilityCastSpec {
  readonly ability: Pick<
    AbilityDefinition,
    'id' | 'costFocus' | 'cooldownTicks' | 'windupTicks' | 'recoveryTicks'
  >;
  readonly activeTicks?: number;
}

export interface ActiveCast {
  readonly abilityId: string;
  readonly attackInstanceId: string;
  readonly phase: CastPhase;
  readonly phaseTicksRemaining: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
}

export interface DodgeState {
  readonly elapsedTicks: number;
}

export interface CombatantState {
  readonly entityId: number;
  readonly alive: boolean;
  readonly resources: CombatResources;
  readonly activeCast: ActiveCast | null;
  readonly dodge: DodgeState | null;
  readonly nextAttackInstanceCounter: number;
}

export interface AbilityAcceptanceContext {
  readonly targetValid: boolean;
  readonly stunned: boolean;
}

export interface DodgeAcceptanceContext {
  readonly stunned: boolean;
}

export type CombatActionPriority =
  | 'dead'
  | 'stun'
  | 'dodge'
  | 'ability'
  | 'basic'
  | 'movement'
  | 'idle';

function assertPositiveEntityId(entityId: number): void {
  if (!Number.isSafeInteger(entityId) || entityId <= 0) {
    throw new RangeError('entityId must be a positive safe integer');
  }
}

function normalizeActiveTicks(activeTicks: number | undefined): number {
  const value = activeTicks ?? 1;
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError('activeTicks must be a positive integer');
  }
  return value;
}

function firstPhase(spec: AbilityCastSpec, attackInstanceId: string): ActiveCast {
  const activeTicks = normalizeActiveTicks(spec.activeTicks);

  if (spec.ability.windupTicks > 0) {
    return {
      abilityId: spec.ability.id,
      attackInstanceId,
      phase: 'windup',
      phaseTicksRemaining: spec.ability.windupTicks,
      activeTicks,
      recoveryTicks: spec.ability.recoveryTicks
    };
  }

  return {
    abilityId: spec.ability.id,
    attackInstanceId,
    phase: 'active',
    phaseTicksRemaining: activeTicks,
    activeTicks,
    recoveryTicks: spec.ability.recoveryTicks
  };
}

export function createCombatantState(
  entityId: number,
  focus = 100
): CombatantState {
  assertPositiveEntityId(entityId);

  return {
    entityId,
    alive: true,
    resources: createCombatResources(focus),
    activeCast: null,
    dodge: null,
    nextAttackInstanceCounter: 0
  };
}

export function tryAcceptAbility(
  state: CombatantState,
  spec: AbilityCastSpec,
  context: AbilityAcceptanceContext
): {
  readonly accepted: boolean;
  readonly reason:
    | 'accepted'
    | 'dead'
    | 'stunned'
    | 'dodging'
    | 'busy'
    | 'invalid_target'
    | 'cooldown'
    | 'focus';
  readonly state: CombatantState;
  readonly attackInstanceId: string | null;
} {
  normalizeActiveTicks(spec.activeTicks);

  if (!state.alive) {
    return { accepted: false, reason: 'dead', state, attackInstanceId: null };
  }
  if (context.stunned) {
    return { accepted: false, reason: 'stunned', state, attackInstanceId: null };
  }
  if (state.dodge !== null) {
    return { accepted: false, reason: 'dodging', state, attackInstanceId: null };
  }
  if (state.activeCast !== null) {
    return { accepted: false, reason: 'busy', state, attackInstanceId: null };
  }
  if (!context.targetValid) {
    return { accepted: false, reason: 'invalid_target', state, attackInstanceId: null };
  }
  if (isAbilityOnCooldown(state.resources, spec.ability.id)) {
    return { accepted: false, reason: 'cooldown', state, attackInstanceId: null };
  }

  const focusSpent = spendFocus(state.resources, spec.ability.costFocus);
  if (!focusSpent.accepted) {
    return { accepted: false, reason: 'focus', state, attackInstanceId: null };
  }

  const attackInstanceId =
    `attack:${state.entityId}:${state.nextAttackInstanceCounter}`;

  const resources = startCooldown(
    focusSpent.resources,
    spec.ability.id,
    spec.ability.cooldownTicks
  );

  return {
    accepted: true,
    reason: 'accepted',
    attackInstanceId,
    state: {
      ...state,
      resources,
      activeCast: firstPhase(spec, attackInstanceId),
      nextAttackInstanceCounter: state.nextAttackInstanceCounter + 1
    }
  };
}

function stepCast(cast: ActiveCast): ActiveCast | null {
  if (cast.phaseTicksRemaining > 1) {
    return {
      ...cast,
      phaseTicksRemaining: cast.phaseTicksRemaining - 1
    };
  }

  if (cast.phase === 'windup') {
    return {
      ...cast,
      phase: 'active',
      phaseTicksRemaining: cast.activeTicks
    };
  }

  if (cast.phase === 'active') {
    if (cast.recoveryTicks === 0) {
      return null;
    }
    return {
      ...cast,
      phase: 'recovery',
      phaseTicksRemaining: cast.recoveryTicks
    };
  }

  return null;
}

export function stepCombatant(state: CombatantState): CombatantState {
  const resources = stepCombatResources(state.resources);

  const dodge = state.dodge === null
    ? null
    : state.dodge.elapsedTicks + 1 >= DODGE_DURATION_TICKS
      ? null
      : { elapsedTicks: state.dodge.elapsedTicks + 1 };

  return {
    ...state,
    resources,
    activeCast: state.alive ? (state.activeCast ? stepCast(state.activeCast) : null) : null,
    dodge: state.alive ? dodge : null
  };
}

export function interruptCast(
  state: CombatantState,
  _reason: CastInterruptReason
): CombatantState {
  if (state.activeCast === null) {
    return state;
  }

  return {
    ...state,
    activeCast: null
  };
}

export function killCombatant(state: CombatantState): CombatantState {
  if (!state.alive) {
    return state;
  }

  return {
    ...state,
    alive: false,
    activeCast: null,
    dodge: null
  };
}

export function tryStartDodge(
  state: CombatantState,
  context: DodgeAcceptanceContext
): {
  readonly accepted: boolean;
  readonly reason: 'accepted' | 'dead' | 'stunned' | 'already_dodging' | 'no_charges';
  readonly state: CombatantState;
} {
  if (!state.alive) {
    return { accepted: false, reason: 'dead', state };
  }
  if (context.stunned) {
    return { accepted: false, reason: 'stunned', state };
  }
  if (state.dodge !== null) {
    return { accepted: false, reason: 'already_dodging', state };
  }

  const spent = spendDodgeCharge(state.resources);
  if (!spent.accepted) {
    return { accepted: false, reason: 'no_charges', state };
  }

  return {
    accepted: true,
    reason: 'accepted',
    state: {
      ...state,
      resources: spent.resources,
      activeCast: null,
      dodge: { elapsedTicks: 0 }
    }
  };
}

export function isDodgeInvulnerable(state: CombatantState): boolean {
  if (!state.alive || state.dodge === null) {
    return false;
  }

  return (
    state.dodge.elapsedTicks >= DODGE_INVULNERABLE_START_TICK &&
    state.dodge.elapsedTicks <= DODGE_INVULNERABLE_END_TICK
  );
}

export function resolveCombatActionPriority(input: {
  readonly dead: boolean;
  readonly stunned: boolean;
  readonly dodgeRequested: boolean;
  readonly abilityAccepted: boolean;
  readonly basicRequested: boolean;
  readonly movementRequested: boolean;
}): CombatActionPriority {
  if (input.dead) return 'dead';
  if (input.stunned) return 'stun';
  if (input.dodgeRequested) return 'dodge';
  if (input.abilityAccepted) return 'ability';
  if (input.basicRequested) return 'basic';
  if (input.movementRequested) return 'movement';
  return 'idle';
}
