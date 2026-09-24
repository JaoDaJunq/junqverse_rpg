import type { Vec2 } from '@junqverse/content';
import {
  JAO_BASE_STATS,
  JAO_BASIC_DEFINITION,
  JAO_PASSIVE_DEFINITION,
  JAO_Q_DEFINITION
} from '@junqverse/content';
import {
  applyDamage,
  type HealthState
} from '../damage.js';
import {
  moveCircleAlongSegment,
  type MovementResult
} from '../movement.js';
import {
  segmentCircleEntryFraction,
  type Aabb
} from '../geometry.js';
import {
  createHitRegistry,
  hasRegisteredHit,
  registerHit,
  type HitRegistry
} from '../hit-registry.js';
import {
  applyResonancePrimer,
  type ResonanceState,
  type ResonanceVisualEvent
} from '../resonance.js';
import {
  getIncomingStatusMultiplier,
  type StatusState
} from '../status.js';
import { resolveConeHits } from '../areas.js';

const EPSILON = 1e-9;

export interface JaoAnalyzedMark {
  readonly targetEntityId: number;
  readonly expiresAtTick: number;
}

export interface JaoActionObservation {
  readonly enemyEntityId: number;
  readonly familyId: string;
  readonly lastActionId: string;
  readonly lastObservedTick: number;
}

export interface JaoPassiveState {
  readonly observations: readonly JaoActionObservation[];
  readonly analyzed: readonly JaoAnalyzedMark[];
}

export interface JaoCombatTarget {
  readonly entityId: number;
  readonly position: Vec2;
  readonly radius: number;
  readonly health: HealthState;
  readonly status: StatusState;
  readonly invulnerable?: boolean;
  readonly isBoss?: boolean;
}

export interface JaoBasicState {
  readonly nextAllowedTick: number;
}

export interface JaoBasicResult {
  readonly accepted: boolean;
  readonly reason: 'accepted' | 'cadence';
  readonly state: JaoBasicState;
  readonly registry: HitRegistry;
  readonly targets: readonly JaoCombatTarget[];
  readonly hitTargetIds: readonly number[];
}

export interface JaoQResult {
  readonly movement: MovementResult;
  readonly registry: HitRegistry;
  readonly resonance: ResonanceState;
  readonly targets: readonly JaoCombatTarget[];
  readonly hitTargetIds: readonly number[];
  readonly visualEvents: readonly ResonanceVisualEvent[];
}

function assertTick(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

function assertEntityId(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function assertStableId(value: string, name: string): void {
  if (!/^[a-z0-9_:-]{1,128}$/.test(value) || value === '__proto__') {
    throw new RangeError(`${name} must be a valid stable id`);
  }
}

function assertFiniteVec(value: Vec2, name: string): void {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new RangeError(`${name} must contain finite coordinates`);
  }
}

function assertRank(rank: number): void {
  if (!Number.isInteger(rank) || rank <= 0) {
    throw new RangeError('rank must be a positive integer');
  }
}

function campaignPowerMultiplier(rank: number): number {
  assertRank(rank);
  return 1 + 0.04 * (rank - 1);
}

function prunePassiveState(
  state: JaoPassiveState,
  currentTick: number
): JaoPassiveState {
  assertTick(currentTick, 'currentTick');

  const analyzed = state.analyzed.filter(
    (mark) => mark.expiresAtTick > currentTick
  );
  const observations = state.observations.filter(
    (observation) =>
      currentTick - observation.lastObservedTick <=
      JAO_PASSIVE_DEFINITION.repeatWindowTicks
  );

  if (
    analyzed.length === state.analyzed.length &&
    observations.length === state.observations.length
  ) {
    return state;
  }

  return { observations, analyzed };
}

export function createJaoPassiveState(): JaoPassiveState {
  return {
    observations: [],
    analyzed: []
  };
}

export function isJaoTargetAnalyzed(
  state: JaoPassiveState,
  targetEntityId: number,
  currentTick: number
): boolean {
  assertEntityId(targetEntityId, 'targetEntityId');
  assertTick(currentTick, 'currentTick');

  return state.analyzed.some(
    (mark) =>
      mark.targetEntityId === targetEntityId &&
      mark.expiresAtTick > currentTick
  );
}

export function getJaoOutgoingMultiplier(
  state: JaoPassiveState,
  targetEntityId: number,
  currentTick: number
): number {
  return isJaoTargetAnalyzed(state, targetEntityId, currentTick)
    ? JAO_PASSIVE_DEFINITION.analyzedOutgoingMultiplier
    : 1;
}

export function observeJaoEnemyAction(
  state: JaoPassiveState,
  input: {
    readonly jaoPosition: Vec2;
    readonly enemyEntityId: number;
    readonly enemyPosition: Vec2;
    readonly familyId: string;
    readonly enemyActionId: string;
    readonly currentTick: number;
  }
): {
  readonly state: JaoPassiveState;
  readonly analyzedApplied: boolean;
} {
  assertFiniteVec(input.jaoPosition, 'jaoPosition');
  assertFiniteVec(input.enemyPosition, 'enemyPosition');
  assertEntityId(input.enemyEntityId, 'enemyEntityId');
  assertStableId(input.familyId, 'familyId');
  assertStableId(input.enemyActionId, 'enemyActionId');
  assertTick(input.currentTick, 'currentTick');

  const pruned = prunePassiveState(state, input.currentTick);
  const distance = Math.hypot(
    input.enemyPosition.x - input.jaoPosition.x,
    input.enemyPosition.y - input.jaoPosition.y
  );

  if (distance > JAO_PASSIVE_DEFINITION.observeRangePx) {
    return { state: pruned, analyzedApplied: false };
  }

  const previous = pruned.observations.find(
    (observation) =>
      observation.enemyEntityId === input.enemyEntityId &&
      observation.familyId === input.familyId
  );

  if (previous?.lastActionId === input.enemyActionId) {
    return { state: pruned, analyzedApplied: false };
  }

  const observations = [
    ...pruned.observations.filter(
      (observation) =>
        !(
          observation.enemyEntityId === input.enemyEntityId &&
          observation.familyId === input.familyId
        )
    ),
    {
      enemyEntityId: input.enemyEntityId,
      familyId: input.familyId,
      lastActionId: input.enemyActionId,
      lastObservedTick: input.currentTick
    }
  ].sort((a, b) => {
    const entityOrder = a.enemyEntityId - b.enemyEntityId;
    if (entityOrder !== 0) {
      return entityOrder;
    }
    if (a.familyId < b.familyId) {
      return -1;
    }
    if (a.familyId > b.familyId) {
      return 1;
    }
    return 0;
  });

  const repeatedWithinWindow =
    previous !== undefined &&
    input.currentTick - previous.lastObservedTick <=
      JAO_PASSIVE_DEFINITION.repeatWindowTicks;

  if (!repeatedWithinWindow) {
    return {
      state: {
        ...pruned,
        observations
      },
      analyzedApplied: false
    };
  }

  const analyzed = [
    ...pruned.analyzed.filter(
      (mark) => mark.targetEntityId !== input.enemyEntityId
    ),
    {
      targetEntityId: input.enemyEntityId,
      expiresAtTick:
        input.currentTick + JAO_PASSIVE_DEFINITION.analyzedDurationTicks
    }
  ].sort((a, b) => a.targetEntityId - b.targetEntityId);

  return {
    state: {
      observations,
      analyzed
    },
    analyzedApplied: true
  };
}

export function createJaoBasicState(): JaoBasicState {
  return { nextAllowedTick: 0 };
}

export function applyJaoAttackDamage(
  target: JaoCombatTarget,
  baseDamage: number,
  rank: number,
  passive: JaoPassiveState,
  currentTick: number
): {
  readonly target: JaoCombatTarget;
  readonly effectiveDamage: number;
} {
  const damage = applyDamage(target.health, {
    base: baseDamage,
    powerMultiplier: campaignPowerMultiplier(rank),
    outgoingModifiers: [
      getJaoOutgoingMultiplier(passive, target.entityId, currentTick)
    ],
    incomingModifiers: [
      getIncomingStatusMultiplier(target.status)
    ],
    invulnerable: target.invulnerable ?? false
  });

  return {
    target: {
      ...target,
      health: damage.state
    },
    effectiveDamage: damage.effectiveDamage
  };
}

export function resolveJaoBasicAttack(
  input: {
    readonly state: JaoBasicState;
    readonly currentTick: number;
    readonly ownerEntityId: number;
    readonly attackInstanceId: string;
    readonly origin: Vec2;
    readonly direction: Vec2;
    readonly rank: number;
    readonly blockers: readonly Aabb[];
    readonly targets: readonly JaoCombatTarget[];
    readonly registry?: HitRegistry;
    readonly passive: JaoPassiveState;
    readonly cadenceTicks?: number;
  }
): JaoBasicResult {
  assertTick(input.currentTick, 'currentTick');
  assertEntityId(input.ownerEntityId, 'ownerEntityId');
  assertStableId(input.attackInstanceId, 'attackInstanceId');
  assertFiniteVec(input.origin, 'origin');
  assertFiniteVec(input.direction, 'direction');
  assertRank(input.rank);

  const registry = input.registry ?? createHitRegistry();
  const cadenceTicks =
    input.cadenceTicks ?? JAO_BASIC_DEFINITION.cadenceTicks;
  if (!Number.isInteger(cadenceTicks) || cadenceTicks <= 0) {
    throw new RangeError('cadenceTicks must be a positive integer');
  }

  if (input.currentTick < input.state.nextAllowedTick) {
    return {
      accepted: false,
      reason: 'cadence',
      state: input.state,
      registry,
      targets: input.targets,
      hitTargetIds: []
    };
  }

  const cone = resolveConeHits({
    attackInstanceId: input.attackInstanceId,
    ownerEntityId: input.ownerEntityId,
    origin: input.origin,
    direction: input.direction,
    rangePx: JAO_BASIC_DEFINITION.rangePx,
    halfAngleRadians:
      (JAO_BASIC_DEFINITION.coneAngleDegrees * Math.PI / 180) / 2
  }, input.targets, input.blockers, registry);

  const hitSet = new Set(cone.targetEntityIds);
  const targets = input.targets.map((target) =>
    hitSet.has(target.entityId)
      ? applyJaoAttackDamage(
          target,
          JAO_BASIC_DEFINITION.baseDamage,
          input.rank,
          input.passive,
          input.currentTick
        ).target
      : target
  );

  return {
    accepted: true,
    reason: 'accepted',
    state: {
      nextAllowedTick:
        input.currentTick + cadenceTicks
    },
    registry: cone.registry,
    targets,
    hitTargetIds: cone.targetEntityIds
  };
}

function normalizeDirection(direction: Vec2): Vec2 {
  assertFiniteVec(direction, 'direction');
  const length = Math.hypot(direction.x, direction.y);

  if (length <= EPSILON) {
    throw new RangeError('direction must be non-zero');
  }

  return {
    x: direction.x / length,
    y: direction.y / length
  };
}

export function resolveJaoQDash(
  input: {
    readonly ownerEntityId: number;
    readonly attackInstanceId: string;
    readonly start: Vec2;
    readonly direction: Vec2;
    readonly currentTick: number;
    readonly rank: number;
    readonly blockers: readonly Aabb[];
    readonly targets: readonly JaoCombatTarget[];
    readonly registry?: HitRegistry;
    readonly resonance: ResonanceState;
    readonly passive: JaoPassiveState;
  }
): JaoQResult {
  assertEntityId(input.ownerEntityId, 'ownerEntityId');
  assertStableId(input.attackInstanceId, 'attackInstanceId');
  assertFiniteVec(input.start, 'start');
  assertTick(input.currentTick, 'currentTick');
  assertRank(input.rank);

  const direction = normalizeDirection(input.direction);
  const desiredEnd = {
    x: input.start.x + direction.x * JAO_Q_DEFINITION.rangePx,
    y: input.start.y + direction.y * JAO_Q_DEFINITION.rangePx
  };

  const movement = moveCircleAlongSegment(
    input.start,
    desiredEnd,
    JAO_BASE_STATS.colliderRadiusPx,
    input.blockers
  );

  let registry = input.registry ?? createHitRegistry();
  let resonance = input.resonance;
  const visualEvents: ResonanceVisualEvent[] = [];
  const hitTargetIds: number[] = [];

  const orderedHits = input.targets
    .filter(
      (target) =>
        target.entityId !== input.ownerEntityId &&
        target.health.alive &&
        !hasRegisteredHit(
          registry,
          input.attackInstanceId,
          target.entityId
        )
    )
    .map((target) => ({
      target,
      fraction: segmentCircleEntryFraction(
        input.start,
        movement.position,
        target.position,
        JAO_BASE_STATS.colliderRadiusPx + target.radius
      )
    }))
    .filter(
      (
        item
      ): item is {
        readonly target: JaoCombatTarget;
        readonly fraction: number;
      } => item.fraction !== null
    )
    .sort(
      (a, b) =>
        a.fraction - b.fraction ||
        a.target.entityId - b.target.entityId
    );

  const hitIds = new Set<number>();

  for (const { target } of orderedHits) {
    registry = registerHit(
      registry,
      input.attackInstanceId,
      target.entityId
    );
    hitIds.add(target.entityId);
    hitTargetIds.push(target.entityId);
  }

  const targets = input.targets.map((target) => {
    if (!hitIds.has(target.entityId)) {
      return target;
    }

    const damaged = applyJaoAttackDamage(
      target,
      JAO_Q_DEFINITION.baseDamage,
      input.rank,
      input.passive,
      input.currentTick
    );

    if (
      damaged.effectiveDamage > 0 &&
      damaged.target.health.alive
    ) {
      const primed = applyResonancePrimer(
        resonance,
        target.entityId,
        input.currentTick
      );
      resonance = primed.state;
      visualEvents.push(primed.visualEvent);
    }

    return damaged.target;
  });

  return {
    movement,
    registry,
    resonance,
    targets,
    hitTargetIds,
    visualEvents
  };
}
