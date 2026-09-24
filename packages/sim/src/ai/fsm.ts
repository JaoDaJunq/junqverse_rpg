import type { Vec2 } from '@junqverse/content';
import {
  ECO_ATIRADOR_DEFINITION,
  ECO_RASTEIRO_DEFINITION,
  ENEMY_AI_DECISION_INTERVAL_TICKS,
  type P0EnemyArchetype
} from '@junqverse/content';
import {
  hasLineOfSight,
  type Aabb
} from '../geometry.js';
import {
  nextPathDirection,
  type GridSpec
} from './pathfinding.js';

export type EnemyAiPhase =
  | 'idle'
  | 'approach'
  | 'telegraph'
  | 'attack'
  | 'recovery';

export interface EnemyAiActionEvent {
  readonly kind: 'telegraph' | 'attack';
  readonly enemyEntityId: number;
  readonly targetEntityId: number;
  readonly enemyActionId: string;
  readonly familyId: string;
}

export interface EnemyAiTarget {
  readonly entityId: number;
  readonly position: Vec2;
}

export interface EnemyAiState {
  readonly phase: EnemyAiPhase;
  readonly phaseTicksRemaining: number;
  readonly nextDecisionTick: number;
  readonly nextActionCounter: number;
  readonly pendingActionId: string | null;
  readonly desiredMovement: Vec2;
}

export interface EnemyAiStepResult {
  readonly state: EnemyAiState;
  readonly events: readonly EnemyAiActionEvent[];
}

function assertTick(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError('currentTick must be a non-negative integer');
  }
}

function assertEntityId(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function normalizeAway(from: Vec2, target: Vec2): Vec2 {
  const dx = from.x - target.x;
  const dy = from.y - target.y;
  const length = Math.hypot(dx, dy);

  return length === 0
    ? { x: 0, y: 0 }
    : { x: dx / length, y: dy / length };
}

function archetypeConfig(archetype: P0EnemyArchetype): {
  readonly telegraphTicks: number;
  readonly cooldownTicks: number;
  readonly familyId: string;
  readonly meleeRangePx: number | null;
  readonly requiresLineOfSight: boolean;
} {
  if (archetype === 'eco_rasteiro') {
    return {
      telegraphTicks: ECO_RASTEIRO_DEFINITION.telegraphTicks,
      cooldownTicks: ECO_RASTEIRO_DEFINITION.cooldownTicks,
      familyId: ECO_RASTEIRO_DEFINITION.attackFamilyId,
      meleeRangePx: ECO_RASTEIRO_DEFINITION.attackRangePx,
      requiresLineOfSight: true
    };
  }

  return {
    telegraphTicks: ECO_ATIRADOR_DEFINITION.telegraphTicks,
    cooldownTicks: ECO_ATIRADOR_DEFINITION.cooldownTicks,
    familyId: ECO_ATIRADOR_DEFINITION.attackFamilyId,
    meleeRangePx: null,
    requiresLineOfSight: true
  };
}

export function createEnemyAiState(): EnemyAiState {
  return {
    phase: 'idle',
    phaseTicksRemaining: 0,
    nextDecisionTick: 0,
    nextActionCounter: 0,
    pendingActionId: null,
    desiredMovement: { x: 0, y: 0 }
  };
}

function canStartAttack(input: {
  readonly archetype: P0EnemyArchetype;
  readonly position: Vec2;
  readonly target: EnemyAiTarget;
  readonly blockers: readonly Aabb[];
  readonly attacksEnabled: boolean;
}): boolean {
  if (!input.attacksEnabled) {
    return false;
  }

  const config = archetypeConfig(input.archetype);
  const visible = hasLineOfSight(
    input.position,
    input.target.position,
    input.blockers
  );

  if (config.requiresLineOfSight && !visible) {
    return false;
  }

  if (config.meleeRangePx === null) {
    return true;
  }

  return (
    Math.hypot(
      input.target.position.x - input.position.x,
      input.target.position.y - input.position.y
    ) <= config.meleeRangePx
  );
}

function approachDirection(input: {
  readonly position: Vec2;
  readonly target: EnemyAiTarget;
  readonly blockers: readonly Aabb[];
  readonly grid: GridSpec;
}): Vec2 {
  if (hasLineOfSight(input.position, input.target.position, input.blockers)) {
    const dx = input.target.position.x - input.position.x;
    const dy = input.target.position.y - input.position.y;
    const length = Math.hypot(dx, dy);

    return length === 0
      ? { x: 0, y: 0 }
      : { x: dx / length, y: dy / length };
  }

  return nextPathDirection({
    position: input.position,
    target: input.target.position,
    blockers: input.blockers,
    grid: input.grid
  });
}

export function stepEnemyAi(input: {
  readonly state: EnemyAiState;
  readonly archetype: P0EnemyArchetype;
  readonly currentTick: number;
  readonly enemyEntityId: number;
  readonly position: Vec2;
  readonly target: EnemyAiTarget | null;
  readonly blockers: readonly Aabb[];
  readonly grid: GridSpec;
  readonly attacksEnabled?: boolean;
}): EnemyAiStepResult {
  assertTick(input.currentTick);
  assertEntityId(input.enemyEntityId, 'enemyEntityId');

  const attacksEnabled = input.attacksEnabled ?? true;
  const config = archetypeConfig(input.archetype);

  if (input.target === null) {
    return {
      state: {
        ...input.state,
        phase: 'idle',
        phaseTicksRemaining: 0,
        pendingActionId: null,
        desiredMovement: { x: 0, y: 0 },
        nextDecisionTick:
          input.currentTick + ENEMY_AI_DECISION_INTERVAL_TICKS
      },
      events: []
    };
  }

  assertEntityId(input.target.entityId, 'target entityId');

  if (input.state.phase === 'telegraph') {
    if (input.state.phaseTicksRemaining > 1) {
      return {
        state: {
          ...input.state,
          phaseTicksRemaining: input.state.phaseTicksRemaining - 1,
          desiredMovement: { x: 0, y: 0 }
        },
        events: []
      };
    }

    const canFire =
      attacksEnabled &&
      (
        input.archetype !== 'eco_atirador' ||
        hasLineOfSight(
          input.position,
          input.target.position,
          input.blockers
        )
      );

    if (!canFire || input.state.pendingActionId === null) {
      return {
        state: {
          ...input.state,
          phase: 'approach',
          phaseTicksRemaining: 0,
          pendingActionId: null,
          desiredMovement: approachDirection({
            position: input.position,
            target: input.target,
            blockers: input.blockers,
            grid: input.grid
          }),
          nextDecisionTick: input.currentTick
        },
        events: []
      };
    }

    return {
      state: {
        ...input.state,
        phase: 'attack',
        phaseTicksRemaining: 1,
        desiredMovement: { x: 0, y: 0 }
      },
      events: [{
        kind: 'attack',
        enemyEntityId: input.enemyEntityId,
        targetEntityId: input.target.entityId,
        enemyActionId: input.state.pendingActionId,
        familyId: config.familyId
      }]
    };
  }

  if (input.state.phase === 'attack') {
    return {
      state: {
        ...input.state,
        phase: 'recovery',
        phaseTicksRemaining: config.cooldownTicks,
        pendingActionId: null,
        desiredMovement:
          input.archetype === 'eco_rasteiro'
            ? normalizeAway(input.position, input.target.position)
            : { x: 0, y: 0 }
      },
      events: []
    };
  }

  if (input.state.phase === 'recovery') {
    if (input.state.phaseTicksRemaining > 1) {
      return {
        state: {
          ...input.state,
          phaseTicksRemaining: input.state.phaseTicksRemaining - 1,
          desiredMovement:
            input.archetype === 'eco_rasteiro'
              ? normalizeAway(input.position, input.target.position)
              : { x: 0, y: 0 }
        },
        events: []
      };
    }

    return {
      state: {
        ...input.state,
        phase: 'approach',
        phaseTicksRemaining: 0,
        desiredMovement: { x: 0, y: 0 },
        nextDecisionTick: input.currentTick
      },
      events: []
    };
  }

  if (input.currentTick < input.state.nextDecisionTick) {
    return { state: input.state, events: [] };
  }

  if (canStartAttack({
    archetype: input.archetype,
    position: input.position,
    target: input.target,
    blockers: input.blockers,
    attacksEnabled
  })) {
    const actionId =
      `enemy_action:${input.enemyEntityId}:${input.state.nextActionCounter}`;

    return {
      state: {
        ...input.state,
        phase: 'telegraph',
        phaseTicksRemaining: config.telegraphTicks,
        nextDecisionTick:
          input.currentTick + ENEMY_AI_DECISION_INTERVAL_TICKS,
        nextActionCounter: input.state.nextActionCounter + 1,
        pendingActionId: actionId,
        desiredMovement: { x: 0, y: 0 }
      },
      events: [{
        kind: 'telegraph',
        enemyEntityId: input.enemyEntityId,
        targetEntityId: input.target.entityId,
        enemyActionId: actionId,
        familyId: config.familyId
      }]
    };
  }

  return {
    state: {
      ...input.state,
      phase: 'approach',
      phaseTicksRemaining: 0,
      desiredMovement: approachDirection({
        position: input.position,
        target: input.target,
        blockers: input.blockers,
        grid: input.grid
      }),
      nextDecisionTick:
        input.currentTick + ENEMY_AI_DECISION_INTERVAL_TICKS
    },
    events: []
  };
}
