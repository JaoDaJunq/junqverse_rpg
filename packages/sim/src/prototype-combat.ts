import {
  JAO_Q_DEFINITION,
  JAO_W_DEFINITION,
  type Vec2
} from '@junqverse/content';
import {
  createCombatantState,
  stepCombatant,
  tryAcceptAbility,
  tryStartDodge,
  type CombatantState
} from './abilities.js';
import {
  createJaoBasicState,
  createJaoPassiveState,
  resolveJaoBasicAttack,
  type JaoBasicState,
  type JaoCombatTarget,
  type JaoPassiveState
} from './heroes/jao.js';
import {
  createJaoUltimateState,
  type JaoUltimateState
} from './heroes/jao-advanced.js';
import type { CombatResources } from './resources.js';
import type { PrototypeWorldState } from './prototype-world.js';

const AIM_EPSILON = 1e-9;

export interface PrototypeCombatCommand {
  readonly qPressed: boolean;
  readonly qDirection: Vec2 | null;
  readonly wPressed: boolean;
  readonly dodgePressed: boolean;
  readonly basicHeld: boolean;
  readonly basicDirection: Vec2 | null;
}

export interface PrototypeQDashState {
  readonly direction: Vec2;
  readonly ticksRemaining: number;
}

export interface PrototypeCombatState {
  readonly combatant: CombatantState;
  readonly ultimate: JaoUltimateState;
  readonly qDash: PrototypeQDashState | null;
  readonly basic: JaoBasicState;
  readonly passive: JaoPassiveState;
}

export type PrototypeCombatMovement =
  | { readonly kind: 'normal' }
  | { readonly kind: 'locked' }
  | {
      readonly kind: 'q_dash';
      readonly direction: Vec2;
      readonly distancePx: number;
    };

export interface PrototypeCombatStepResult {
  readonly state: PrototypeCombatState;
  readonly movement: PrototypeCombatMovement;
  readonly basicDirection: Vec2 | null;
}

export interface PrototypeBasicAttackResult {
  readonly state: PrototypeCombatState;
  readonly world: PrototypeWorldState;
  readonly accepted: boolean;
  readonly hitTargetIds: readonly number[];
}

export interface PrototypeCombatSnapshot {
  readonly resources: CombatResources;
  readonly ultimate: JaoUltimateState;
  readonly activeAbilityId: string | null;
  readonly dodgeActive: boolean;
  readonly qDashActive: boolean;
}

function normalizeDirection(direction: Vec2): Vec2 {
  if (!Number.isFinite(direction.x) || !Number.isFinite(direction.y)) {
    throw new RangeError('prototype combat direction must be finite');
  }

  const length = Math.hypot(direction.x, direction.y);
  if (length <= AIM_EPSILON) {
    throw new RangeError('prototype combat direction must be non-zero');
  }

  return {
    x: direction.x / length,
    y: direction.y / length
  };
}

function qDashMovement(direction: Vec2): PrototypeCombatMovement {
  return {
    kind: 'q_dash',
    direction,
    distancePx:
      JAO_Q_DEFINITION.rangePx / JAO_Q_DEFINITION.dashDurationTicks
  };
}

function prototypeTargets(
  world: PrototypeWorldState
): readonly JaoCombatTarget[] {
  return world.enemies.map((enemy) => ({
    entityId: enemy.entityId,
    position: enemy.position,
    radius: enemy.radius,
    health: enemy.health,
    status: enemy.status
  }));
}

export function createPrototypeCombatState(
  playerEntityId: number,
  ultimateCharge = 0
): PrototypeCombatState {
  return {
    combatant: createCombatantState(playerEntityId),
    ultimate: createJaoUltimateState(ultimateCharge),
    qDash: null,
    basic: createJaoBasicState(),
    passive: createJaoPassiveState()
  };
}

export function stepPrototypeCombat(
  state: PrototypeCombatState,
  command: PrototypeCombatCommand
): PrototypeCombatStepResult {
  let combatant = stepCombatant(state.combatant);

  if (state.qDash !== null) {
    const remaining = state.qDash.ticksRemaining - 1;

    return {
      state: {
        ...state,
        combatant,
        qDash: remaining > 0
          ? {
              ...state.qDash,
              ticksRemaining: remaining
            }
          : null
      },
      movement: qDashMovement(state.qDash.direction),
      basicDirection: null
    };
  }

  if (command.dodgePressed) {
    const dodge = tryStartDodge(combatant, {
      stunned: false
    });
    combatant = dodge.state;

    return {
      state: {
        ...state,
        combatant
      },
      movement: dodge.accepted
        ? { kind: 'locked' }
        : { kind: 'normal' },
      basicDirection: null
    };
  }

  if (command.qPressed) {
    const accepted = tryAcceptAbility(
      combatant,
      {
        ability: JAO_Q_DEFINITION,
        activeTicks: JAO_Q_DEFINITION.dashDurationTicks
      },
      {
        targetValid: command.qDirection !== null,
        stunned: false
      }
    );

    combatant = accepted.state;

    if (accepted.accepted && command.qDirection !== null) {
      const direction = normalizeDirection(command.qDirection);
      const remaining = JAO_Q_DEFINITION.dashDurationTicks - 1;

      return {
        state: {
          ...state,
          combatant,
          qDash: remaining > 0
            ? {
                direction,
                ticksRemaining: remaining
              }
            : null
        },
        movement: qDashMovement(direction),
        basicDirection: null
      };
    }

    return {
      state: {
        ...state,
        combatant
      },
      movement: { kind: 'normal' },
      basicDirection: null
    };
  }

  if (command.wPressed) {
    const accepted = tryAcceptAbility(
      combatant,
      { ability: JAO_W_DEFINITION },
      {
        targetValid: true,
        stunned: false
      }
    );

    return {
      state: {
        ...state,
        combatant: accepted.state
      },
      movement: accepted.accepted
        ? { kind: 'locked' }
        : { kind: 'normal' },
      basicDirection: null
    };
  }

  const canUseBasic =
    combatant.activeCast === null &&
    combatant.dodge === null &&
    command.basicHeld &&
    command.basicDirection !== null;

  return {
    state: {
      ...state,
      combatant
    },
    movement: { kind: 'normal' },
    basicDirection: canUseBasic
      ? normalizeDirection(command.basicDirection!)
      : null
  };
}

export function resolvePrototypeBasicAttack(
  state: PrototypeCombatState,
  world: PrototypeWorldState,
  direction: Vec2
): PrototypeBasicAttackResult {
  const result = resolveJaoBasicAttack({
    state: state.basic,
    currentTick: world.tick,
    ownerEntityId: world.player.entityId,
    attackInstanceId:
      `attack:basic:${world.player.entityId}:${world.tick}`,
    origin: world.player.position,
    direction: normalizeDirection(direction),
    rank: 1,
    blockers: world.blockers,
    targets: prototypeTargets(world),
    passive: state.passive
  });

  const byId = new Map(
    result.targets.map((target) => [target.entityId, target])
  );

  return {
    accepted: result.accepted,
    hitTargetIds: result.hitTargetIds,
    state: {
      ...state,
      basic: result.state
    },
    world: {
      ...world,
      enemies: world.enemies.map((enemy) => {
        const target = byId.get(enemy.entityId);
        return target
          ? {
              ...enemy,
              health: target.health,
              status: target.status
            }
          : enemy;
      })
    }
  };
}

export function createPrototypeCombatSnapshot(
  state: PrototypeCombatState
): PrototypeCombatSnapshot {
  return {
    resources: state.combatant.resources,
    ultimate: state.ultimate,
    activeAbilityId: state.combatant.activeCast?.abilityId ?? null,
    dodgeActive: state.combatant.dodge !== null,
    qDashActive: state.qDash !== null
  };
}
