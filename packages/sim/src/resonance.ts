import type { Vec2 } from '@junqverse/content';
import {
  applyDamage,
  type HealthState
} from './damage.js';
import {
  applyStatus,
  getIncomingStatusMultiplier,
  type StatusState
} from './status.js';

export const RESONANCE_MARK_DURATION_TICKS = 240;
export const RESONANCE_EXPLOSION_RADIUS_PX = 64;
export const RESONANCE_EXPLOSION_BASE_DAMAGE = 25;
export const RESONANCE_VICTIM_COOLDOWN_TICKS = 90;
export const RESONANCE_SLOW_MAGNITUDE = 0.2;
export const RESONANCE_SLOW_DURATION_TICKS = 60;

export type ResonanceTriggerKind =
  | 'detonator'
  | 'dot'
  | 'resonance_explosion'
  | 'other';

export interface ResonanceMark {
  readonly targetEntityId: number;
  readonly expiresAtTick: number;
}

export interface ResonanceState {
  readonly marks: readonly ResonanceMark[];
  readonly nextExplosionAllowedTickByTarget: Readonly<Record<string, number>>;
}

export interface ResonanceTarget {
  readonly entityId: number;
  readonly position: Vec2;
  readonly health: HealthState;
  readonly status: StatusState;
  readonly invulnerable?: boolean;
}

export interface ResonanceVisualEvent {
  readonly kind: 'mark_changed' | 'explosion';
  readonly targetEntityId: number;
  readonly active?: boolean;
  readonly cue: 'outline_and_icon' | 'radial_burst';
}

export interface ResonanceDetonationResult {
  readonly state: ResonanceState;
  readonly targets: readonly ResonanceTarget[];
  readonly detonated: boolean;
  readonly consumedMark: boolean;
  readonly explodedTargetIds: readonly number[];
  readonly visualEvents: readonly ResonanceVisualEvent[];
}

function assertTick(tick: number): void {
  if (!Number.isInteger(tick) || tick < 0) {
    throw new RangeError('tick must be a non-negative integer');
  }
}

function assertEntityId(entityId: number, name: string): void {
  if (!Number.isSafeInteger(entityId) || entityId <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function assertRank(rank: number): void {
  if (!Number.isInteger(rank) || rank <= 0) {
    throw new RangeError('detonatorRank must be a positive integer');
  }
}

function assertFinitePosition(position: Vec2): void {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new RangeError('resonance target position must be finite');
  }
}

export function createResonanceState(): ResonanceState {
  return {
    marks: [],
    nextExplosionAllowedTickByTarget: {}
  };
}

export function pruneExpiredResonanceMarks(
  state: ResonanceState,
  currentTick: number
): ResonanceState {
  assertTick(currentTick);

  const marks = state.marks.filter(
    (mark) => mark.expiresAtTick > currentTick
  );

  if (marks.length === state.marks.length) {
    return state;
  }

  return {
    ...state,
    marks
  };
}

export function hasResonanceMark(
  state: ResonanceState,
  targetEntityId: number,
  currentTick: number
): boolean {
  assertEntityId(targetEntityId, 'targetEntityId');
  assertTick(currentTick);

  return state.marks.some(
    (mark) =>
      mark.targetEntityId === targetEntityId &&
      mark.expiresAtTick > currentTick
  );
}

export function applyResonancePrimer(
  state: ResonanceState,
  targetEntityId: number,
  currentTick: number
): {
  readonly state: ResonanceState;
  readonly visualEvent: ResonanceVisualEvent;
} {
  assertEntityId(targetEntityId, 'targetEntityId');
  assertTick(currentTick);

  const pruned = pruneExpiredResonanceMarks(state, currentTick);
  const marks = pruned.marks.filter(
    (mark) => mark.targetEntityId !== targetEntityId
  );

  return {
    state: {
      ...pruned,
      marks: [
        ...marks,
        {
          targetEntityId,
          expiresAtTick: currentTick + RESONANCE_MARK_DURATION_TICKS
        }
      ].sort((a, b) => a.targetEntityId - b.targetEntityId)
    },
    visualEvent: {
      kind: 'mark_changed',
      targetEntityId,
      active: true,
      cue: 'outline_and_icon'
    }
  };
}

function campaignPowerMultiplier(rank: number): number {
  return 1 + 0.04 * (rank - 1);
}

function findTarget(
  targets: readonly ResonanceTarget[],
  entityId: number
): ResonanceTarget | null {
  return targets.find((target) => target.entityId === entityId) ?? null;
}

export function tryDetonateResonance(
  state: ResonanceState,
  input: {
    readonly triggerKind: ResonanceTriggerKind;
    readonly primaryTargetEntityId: number;
    readonly detonatorEntityId: number;
    readonly detonatorRank: number;
    readonly currentTick: number;
    readonly primaryHitConfirmed?: boolean;
  },
  targets: readonly ResonanceTarget[]
): ResonanceDetonationResult {
  assertEntityId(input.primaryTargetEntityId, 'primaryTargetEntityId');
  assertEntityId(input.detonatorEntityId, 'detonatorEntityId');
  assertRank(input.detonatorRank);
  assertTick(input.currentTick);

  for (const target of targets) {
    assertEntityId(target.entityId, 'target entityId');
    assertFinitePosition(target.position);
  }

  const pruned = pruneExpiredResonanceMarks(state, input.currentTick);

  if (input.triggerKind !== 'detonator') {
    return {
      state: pruned,
      targets,
      detonated: false,
      consumedMark: false,
      explodedTargetIds: [],
      visualEvents: []
    };
  }

  if (!hasResonanceMark(
    pruned,
    input.primaryTargetEntityId,
    input.currentTick
  )) {
    return {
      state: pruned,
      targets,
      detonated: false,
      consumedMark: false,
      explodedTargetIds: [],
      visualEvents: []
    };
  }

  const primary = findTarget(targets, input.primaryTargetEntityId);
  if (
    !primary ||
    (
      !primary.health.alive &&
      input.primaryHitConfirmed !== true
    )
  ) {
    return {
      state: pruned,
      targets,
      detonated: false,
      consumedMark: false,
      explodedTargetIds: [],
      visualEvents: []
    };
  }

  const marks = pruned.marks.filter(
    (mark) => mark.targetEntityId !== input.primaryTargetEntityId
  );
  let nextExplosionAllowedTickByTarget = {
    ...pruned.nextExplosionAllowedTickByTarget
  };
  const explodedTargetIds: number[] = [];
  const visualEvents: ResonanceVisualEvent[] = [
    {
      kind: 'mark_changed',
      targetEntityId: input.primaryTargetEntityId,
      active: false,
      cue: 'outline_and_icon'
    }
  ];

  const powerMultiplier = campaignPowerMultiplier(input.detonatorRank);

  const updatedTargets = [...targets]
    .sort((a, b) => a.entityId - b.entityId)
    .map((target): ResonanceTarget => {
      if (!target.health.alive) {
        return target;
      }

      const distance = Math.hypot(
        target.position.x - primary.position.x,
        target.position.y - primary.position.y
      );

      if (
        target.entityId !== primary.entityId &&
        distance > RESONANCE_EXPLOSION_RADIUS_PX
      ) {
        return target;
      }

      const nextAllowed =
        nextExplosionAllowedTickByTarget[String(target.entityId)] ?? 0;

      if (
        input.currentTick < nextAllowed ||
        target.invulnerable === true
      ) {
        return target;
      }

      const damage = applyDamage(target.health, {
        base: RESONANCE_EXPLOSION_BASE_DAMAGE,
        powerMultiplier,
        incomingModifiers: [
          getIncomingStatusMultiplier(target.status)
        ]
      });

      const status = damage.state.alive
        ? applyStatus(target.status, {
            kind: 'slow',
            sourceId: 'resonance_explosion',
            magnitude: RESONANCE_SLOW_MAGNITUDE,
            durationTicks: RESONANCE_SLOW_DURATION_TICKS
          }, {
            isBoss: false
          }).state
        : target.status;

      nextExplosionAllowedTickByTarget[String(target.entityId)] =
        input.currentTick + RESONANCE_VICTIM_COOLDOWN_TICKS;
      explodedTargetIds.push(target.entityId);
      visualEvents.push({
        kind: 'explosion',
        targetEntityId: target.entityId,
        cue: 'radial_burst'
      });

      return {
        ...target,
        health: damage.state,
        status
      };
    });

  return {
    state: {
      marks,
      nextExplosionAllowedTickByTarget
    },
    targets: updatedTargets,
    detonated: true,
    consumedMark: true,
    explodedTargetIds,
    visualEvents
  };
}
