import {
  JAO_BASIC_DEFINITION,
  JAO_E_DEFINITION,
  JAO_Q_DEFINITION,
  JAO_R_DEFINITION,
  JAO_W_DEFINITION,
  type Vec2
} from '@junqverse/content';
import {
  createCombatantState,
  killCombatant,
  stepCombatant,
  tryAcceptAbility,
  tryStartDodge,
  type CombatantState
} from './abilities.js';
import {
  createJaoBasicState,
  createJaoPassiveState,
  resolveJaoBasicHit,
  resolveJaoQDash,
  type JaoBasicState,
  type JaoCombatTarget,
  type JaoPassiveState
} from './heroes/jao.js';
import {
  clearJaoTransientBuffsOnDeath,
  createJaoECharge,
  createJaoRevealState,
  createJaoUltimateState,
  getJaoBasicCadenceTicks,
  getJaoEMaxChargeTicks,
  getJaoUltimateCastSpec,
  isJaoUltimateActive,
  planJaoERelease,
  resolveJaoERelease,
  resolveJaoW,
  tryActivateJaoUltimate,
  type JaoEChargeState,
  type JaoEReleasePlan,
  type JaoRevealState,
  type JaoUltimateState
} from './heroes/jao-advanced.js';
import {
  createResonanceState,
  type ResonanceState
} from './resonance.js';
import type { CombatResources } from './resources.js';
import type { PrototypeWorldState } from './prototype-world.js';

const AIM_EPSILON = 1e-9;

export interface PrototypeCombatCommand {
  readonly qPressed: boolean;
  readonly qDirection: Vec2 | null;
  readonly wPressed: boolean;
  readonly rPressed: boolean;
  readonly ePressed: boolean;
  readonly eReleased: boolean;
  readonly eDirection: Vec2 | null;
  readonly dodgePressed: boolean;
  readonly dodgeDirection: Vec2 | null;
  readonly basicHeld: boolean;
  readonly basicDirection: Vec2 | null;
}

export interface PrototypeQDashState {
  readonly direction: Vec2;
  readonly ticksRemaining: number;
}

export interface PrototypeDodgeDashState {
  readonly direction: Vec2;
  readonly ticksRemaining: number;
}

export interface PrototypeCombatState {
  readonly combatant: CombatantState;
  readonly ultimate: JaoUltimateState;
  readonly qDash: PrototypeQDashState | null;
  readonly dodgeDash: PrototypeDodgeDashState | null;
  readonly basic: JaoBasicState;
  readonly basicCastDirection: Vec2 | null;
  readonly passive: JaoPassiveState;
  readonly reveal: JaoRevealState;
  readonly resonance: ResonanceState;
  readonly eCharge: JaoEChargeState | null;
  readonly eReleasePlan: JaoEReleasePlan | null;
}

export type PrototypeCombatMovement =
  | {
      readonly kind: 'normal';
      readonly multiplier: number;
    }
  | { readonly kind: 'locked' }
  | {
      readonly kind: 'q_dash';
      readonly direction: Vec2;
      readonly distancePx: number;
    }
  | {
      readonly kind: 'dodge_dash';
      readonly direction: Vec2;
      readonly distancePx: number;
    };

export interface PrototypeCombatStepResult {
  readonly state: PrototypeCombatState;
  readonly movement: PrototypeCombatMovement;
  readonly basicDirection: Vec2 | null;
  readonly wActivated: boolean;
  readonly eReleasePlan: JaoEReleasePlan | null;
}

export interface PrototypeBasicAttackResult {
  readonly state: PrototypeCombatState;
  readonly world: PrototypeWorldState;
  readonly accepted: boolean;
  readonly hitTargetIds: readonly number[];
}

export interface PrototypeQResult {
  readonly state: PrototypeCombatState;
  readonly world: PrototypeWorldState;
  readonly hitTargetIds: readonly number[];
}

export interface PrototypeWResult {
  readonly state: PrototypeCombatState;
  readonly world: PrototypeWorldState;
  readonly revealedEnemyIds: readonly number[];
}

export interface PrototypeEResult {
  readonly state: PrototypeCombatState;
  readonly world: PrototypeWorldState;
  readonly hitTargetIds: readonly number[];
}

export interface PrototypeCombatSnapshot {
  readonly resources: CombatResources;
  readonly ultimate: JaoUltimateState;
  readonly activeAbilityId: string | null;
  readonly dodgeActive: boolean;
  readonly qDashActive: boolean;
  readonly eCharging: boolean;
  readonly ultimateActive: boolean;
}

function normalMovement(
  state: PrototypeCombatState,
  currentTick: number,
  multiplier = 1
): PrototypeCombatMovement {
  const ultimateMultiplier = isJaoUltimateActive(
    state.ultimate,
    currentTick
  )
    ? 1 + JAO_R_DEFINITION.hasteMagnitude
    : 1;

  return {
    kind: 'normal',
    multiplier: multiplier * ultimateMultiplier
  };
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

function dodgeDashMovement(direction: Vec2): PrototypeCombatMovement {
  return {
    kind: 'dodge_dash',
    direction,
    distancePx: 112 / 12
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

function updateWorldTargets(
  world: PrototypeWorldState,
  targets: readonly JaoCombatTarget[]
): PrototypeWorldState {
  const byId = new Map(
    targets.map((target) => [target.entityId, target])
  );

  return {
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
  };
}

function moveEToRecovery(combatant: CombatantState): CombatantState {
  const cast = combatant.activeCast;
  if (cast === null || cast.abilityId !== JAO_E_DEFINITION.id) {
    return combatant;
  }

  return {
    ...combatant,
    activeCast: cast.recoveryTicks > 0
      ? {
          ...cast,
          phase: 'recovery',
          phaseTicksRemaining: cast.recoveryTicks
        }
      : null
  };
}

export function createPrototypeCombatState(
  playerEntityId: number,
  ultimateCharge = 0
): PrototypeCombatState {
  return {
    combatant: createCombatantState(playerEntityId),
    ultimate: createJaoUltimateState(ultimateCharge),
    qDash: null,
    dodgeDash: null,
    basic: createJaoBasicState(),
    basicCastDirection: null,
    passive: createJaoPassiveState(),
    reveal: createJaoRevealState(),
    resonance: createResonanceState(),
    eCharge: null,
    eReleasePlan: null
  };
}

export function stepPrototypeCombat(
  state: PrototypeCombatState,
  command: PrototypeCombatCommand,
  currentTick: number
): PrototypeCombatStepResult {
  if (!Number.isInteger(currentTick) || currentTick < 0) {
    throw new RangeError('currentTick must be a non-negative integer');
  }

  const previousCast = state.combatant.activeCast;
  let combatant = stepCombatant(state.combatant);
  const basicActivated =
    previousCast?.abilityId === JAO_BASIC_DEFINITION.id &&
    previousCast.phase === 'windup' &&
    combatant.activeCast?.abilityId === JAO_BASIC_DEFINITION.id &&
    combatant.activeCast.phase === 'active';
  const wActivated =
    previousCast?.abilityId === JAO_W_DEFINITION.id &&
    previousCast.phase === 'windup' &&
    combatant.activeCast?.abilityId === JAO_W_DEFINITION.id &&
    combatant.activeCast.phase === 'active';

  let eCharge = state.eCharge;
  let eReleasePlan = state.eReleasePlan;

  if (eCharge !== null) {
    if (
      command.dodgePressed &&
      command.dodgeDirection !== null
    ) {
      const dodge = tryStartDodge(combatant, { stunned: false });
      if (dodge.accepted) {
        const direction = normalizeDirection(
          command.dodgeDirection
        );
        return {
          state: {
            ...state,
            combatant: dodge.state,
            dodgeDash: {
              direction,
              ticksRemaining: 11
            },
            eCharge: null,
            eReleasePlan: null
          },
          movement: dodgeDashMovement(direction),
          basicDirection: null,
          wActivated,
          eReleasePlan: null
        };
      }
    }

    const reachedAutomaticRelease =
      previousCast?.abilityId === JAO_E_DEFINITION.id &&
      previousCast.phase === 'active' &&
      previousCast.phaseTicksRemaining === 1 &&
      combatant.activeCast?.phase === 'recovery';

    if (eReleasePlan === null && command.eReleased) {
      eReleasePlan = planJaoERelease({
        charge: eCharge,
        requestedReleaseTick: currentTick
      });
    }

    if (eReleasePlan === null && reachedAutomaticRelease) {
      eReleasePlan = planJaoERelease({
        charge: eCharge,
        requestedReleaseTick: currentTick
      });
    }

    if (
      eReleasePlan !== null &&
      currentTick >= eReleasePlan.releaseTick
    ) {
      combatant = moveEToRecovery(combatant);

      return {
        state: {
          ...state,
          combatant,
          eCharge,
          eReleasePlan
        },
        movement: { kind: 'locked' },
        basicDirection: null,
        wActivated,
        eReleasePlan
      };
    }

    return {
      state: {
        ...state,
        combatant,
        eCharge,
        eReleasePlan
      },
      movement: normalMovement(
        state,
        currentTick,
        JAO_E_DEFINITION.movementMultiplierWhileCharging
      ),
      basicDirection: null,
      wActivated,
      eReleasePlan: null
    };
  }

  if (state.dodgeDash !== null) {
    const remaining = state.dodgeDash.ticksRemaining - 1;

    return {
      state: {
        ...state,
        combatant,
        dodgeDash: remaining > 0
          ? {
              ...state.dodgeDash,
              ticksRemaining: remaining
            }
          : null
      },
      movement: dodgeDashMovement(
        state.dodgeDash.direction
      ),
      basicDirection: null,
      wActivated,
      eReleasePlan: null
    };
  }

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
      basicDirection: null,
      wActivated,
      eReleasePlan: null
    };
  }

  if (
    command.dodgePressed &&
    command.dodgeDirection !== null
  ) {
    const dodge = tryStartDodge(combatant, {
      stunned: false
    });
    combatant = dodge.state;

    if (dodge.accepted) {
      const direction = normalizeDirection(
        command.dodgeDirection
      );

      return {
        state: {
          ...state,
          combatant,
          dodgeDash: {
            direction,
            ticksRemaining: 11
          },
          basicCastDirection: null
        },
        movement: dodgeDashMovement(direction),
        basicDirection: null,
        wActivated,
        eReleasePlan: null
      };
    }

    return {
      state: {
        ...state,
        combatant
      },
      movement: normalMovement(state, currentTick),
      basicDirection: null,
      wActivated,
      eReleasePlan: null
    };
  }

  if (
    previousCast?.abilityId === JAO_BASIC_DEFINITION.id ||
    combatant.activeCast?.abilityId === JAO_BASIC_DEFINITION.id
  ) {
    const direction = state.basicCastDirection;
    const castStillActive =
      combatant.activeCast?.abilityId === JAO_BASIC_DEFINITION.id;

    return {
      state: {
        ...state,
        combatant,
        basicCastDirection: castStillActive ? direction : null
      },
      movement: { kind: 'locked' },
      basicDirection:
        basicActivated && direction !== null ? direction : null,
      wActivated,
      eReleasePlan: null
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
        basicDirection: null,
        wActivated,
        eReleasePlan: null
      };
    }

    return {
      state: {
        ...state,
        combatant
      },
      movement: normalMovement(state, currentTick),
      basicDirection: null,
      wActivated,
      eReleasePlan: null
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
        : normalMovement(state, currentTick),
      basicDirection: null,
      wActivated,
      eReleasePlan: null
    };
  }

  if (command.rPressed) {
    const cast = tryAcceptAbility(
      combatant,
      getJaoUltimateCastSpec(),
      {
        targetValid: true,
        stunned: false
      }
    );

    if (cast.accepted) {
      const activated = tryActivateJaoUltimate({
        ultimate: state.ultimate,
        resources: cast.state.resources,
        currentTick
      });

      if (activated.accepted) {
        return {
          state: {
            ...state,
            combatant: {
              ...cast.state,
              resources: activated.resources
            },
            ultimate: activated.ultimate
          },
          movement: { kind: 'locked' },
          basicDirection: null,
          wActivated,
          eReleasePlan: null
        };
      }
    }

    return {
      state: {
        ...state,
        combatant
      },
      movement: normalMovement(state, currentTick),
      basicDirection: null,
      wActivated,
      eReleasePlan: null
    };
  }

  if (command.ePressed) {
    const direction = command.eDirection === null
      ? null
      : normalizeDirection(command.eDirection);
    const maxChargeTicks = getJaoEMaxChargeTicks(
      state.ultimate,
      currentTick
    );
    const accepted = tryAcceptAbility(
      combatant,
      {
        ability: JAO_E_DEFINITION,
        activeTicks: maxChargeTicks
      },
      {
        targetValid: direction !== null,
        stunned: false
      }
    );

    if (
      accepted.accepted &&
      accepted.attackInstanceId !== null &&
      direction !== null
    ) {
      eCharge = createJaoECharge({
        ownerEntityId: accepted.state.entityId,
        attackInstanceId: accepted.attackInstanceId,
        startedAtTick: currentTick,
        direction,
        ultimate: state.ultimate
      });

      return {
        state: {
          ...state,
          combatant: accepted.state,
          eCharge,
          eReleasePlan: null
        },
        movement: normalMovement(
          state,
          currentTick,
          JAO_E_DEFINITION.movementMultiplierWhileCharging
        ),
        basicDirection: null,
        wActivated,
        eReleasePlan: null
      };
    }

    return {
      state: {
        ...state,
        combatant: accepted.state
      },
      movement: normalMovement(state, currentTick),
      basicDirection: null,
      wActivated,
      eReleasePlan: null
    };
  }

  const cadenceTicks = getJaoBasicCadenceTicks(
    state.ultimate,
    currentTick
  );
  const canStartBasic =
    combatant.activeCast === null &&
    combatant.dodge === null &&
    command.basicHeld &&
    command.basicDirection !== null &&
    currentTick >= state.basic.nextAllowedTick;

  if (canStartBasic && command.basicDirection !== null) {
    const direction = normalizeDirection(command.basicDirection);
    const cast = tryAcceptAbility(
      combatant,
      {
        ability: {
          id: JAO_BASIC_DEFINITION.id,
          costFocus: 0,
          cooldownTicks: 0,
          windupTicks: JAO_BASIC_DEFINITION.windupTicks,
          recoveryTicks: JAO_BASIC_DEFINITION.recoveryTicks
        }
      },
      {
        targetValid: true,
        stunned: false
      }
    );

    if (cast.accepted) {
      return {
        state: {
          ...state,
          combatant: cast.state,
          basic: {
            nextAllowedTick: currentTick + cadenceTicks
          },
          basicCastDirection: direction
        },
        movement: { kind: 'locked' },
        basicDirection: null,
        wActivated,
        eReleasePlan: null
      };
    }
  }

  return {
    state: {
      ...state,
      combatant
    },
    movement: normalMovement(state, currentTick),
    basicDirection: null,
    wActivated,
    eReleasePlan: null
  };
}

export function resolvePrototypeBasicAttack(
  state: PrototypeCombatState,
  world: PrototypeWorldState,
  direction: Vec2,
  attackInstanceId: string
): PrototypeBasicAttackResult {
  const result = resolveJaoBasicHit({
    currentTick: world.tick,
    ownerEntityId: world.player.entityId,
    attackInstanceId,
    origin: world.player.position,
    direction: normalizeDirection(direction),
    rank: 1,
    blockers: world.blockers,
    targets: prototypeTargets(world),
    passive: state.passive
  });

  return {
    accepted: true,
    hitTargetIds: result.hitTargetIds,
    state,
    world: updateWorldTargets(world, result.targets)
  };
}


export function resolvePrototypeQ(
  state: PrototypeCombatState,
  world: PrototypeWorldState,
  attackInstanceId: string,
  direction: Vec2
): PrototypeQResult {
  const result = resolveJaoQDash({
    ownerEntityId: world.player.entityId,
    attackInstanceId,
    start: world.player.position,
    direction: normalizeDirection(direction),
    currentTick: world.tick,
    rank: 1,
    blockers: world.blockers,
    targets: prototypeTargets(world),
    resonance: state.resonance,
    passive: state.passive
  });

  return {
    hitTargetIds: result.hitTargetIds,
    state: {
      ...state,
      resonance: result.resonance
    },
    world: updateWorldTargets(world, result.targets)
  };
}

export function resolvePrototypeW(
  state: PrototypeCombatState,
  world: PrototypeWorldState
): PrototypeWResult {
  const result = resolveJaoW({
    currentTick: world.tick,
    origin: world.player.position,
    reveal: state.reveal,
    targets: prototypeTargets(world),
    revealables: []
  });

  return {
    revealedEnemyIds: result.revealedEnemyIds,
    state: {
      ...state,
      reveal: result.reveal
    },
    world: updateWorldTargets(world, result.targets)
  };
}

export function resolvePrototypeE(
  state: PrototypeCombatState,
  world: PrototypeWorldState,
  plan: JaoEReleasePlan
): PrototypeEResult {
  const result = resolveJaoERelease({
    plan,
    currentTick: world.tick,
    origin: world.player.position,
    rank: 1,
    blockers: world.blockers,
    targets: prototypeTargets(world),
    passive: state.passive,
    resonance: state.resonance
  });

  return {
    hitTargetIds: result.hitTargetIds,
    state: {
      ...state,
      resonance: result.resonance,
      eCharge: null,
      eReleasePlan: null
    },
    world: updateWorldTargets(world, result.targets)
  };
}


export function defeatPrototypeCombat(
  state: PrototypeCombatState
): PrototypeCombatState {
  const cleared = clearJaoTransientBuffsOnDeath({
    ultimate: state.ultimate,
    eCharge: state.eCharge
  });

  return {
    ...state,
    combatant: killCombatant(state.combatant),
    ultimate: cleared.ultimate,
    qDash: null,
    dodgeDash: null,
    eCharge: null,
    eReleasePlan: null,
    basicCastDirection: null,
    resonance: createResonanceState()
  };
}

export function createPrototypeCombatSnapshot(
  state: PrototypeCombatState,
  currentTick: number
): PrototypeCombatSnapshot {
  return {
    resources: state.combatant.resources,
    ultimate: state.ultimate,
    activeAbilityId: state.combatant.activeCast?.abilityId ?? null,
    dodgeActive: state.combatant.dodge !== null,
    qDashActive: state.qDash !== null,
    eCharging: state.eCharge !== null,
    ultimateActive: isJaoUltimateActive(
      state.ultimate,
      currentTick
    )
  };
}
