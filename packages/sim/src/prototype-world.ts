import type { Vec2 } from '@junqverse/content';
import { allocateEntityId, createWorld, stepWorld, type WorldState } from './world.js';
import { isCirclePositionFree, type Aabb } from './geometry.js';
import {
  moveCircleAlongSegment,
  moveCircleForTick
} from './movement.js';

export interface PrototypePlayerState {
  readonly entityId: number;
  readonly previousPosition: Vec2;
  readonly position: Vec2;
  readonly radius: number;
  readonly speedPxPerSecond: number;
}

export interface PrototypeWorldState extends WorldState {
  readonly player: PrototypePlayerState;
  readonly blockers: readonly Aabb[];
}

export interface PrototypeSnapshot {
  readonly tick: number;
  readonly player: {
    readonly entityId: number;
    readonly position: Vec2;
    readonly radius: number;
  };
  readonly blockers: readonly Aabb[];
}

export interface PrototypeWorldOptions {
  readonly radius?: number;
  readonly speedPxPerSecond?: number;
}

export interface PrototypePlayerDeltaResult {
  readonly state: PrototypeWorldState;
  readonly collided: boolean;
}

export function createPrototypeWorld(
  runId: string,
  seed: number,
  spawn: Vec2,
  blockers: readonly Aabb[],
  options: PrototypeWorldOptions = {}
): PrototypeWorldState {
  const radius = options.radius ?? 12;
  const speedPxPerSecond = options.speedPxPerSecond ?? 180;

  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError('prototype player radius must be positive and finite');
  }
  if (!Number.isFinite(speedPxPerSecond) || speedPxPerSecond < 0) {
    throw new RangeError('prototype player speed must be non-negative and finite');
  }
  if (!isCirclePositionFree(spawn, radius, blockers)) {
    throw new Error('prototype spawn overlaps a blocker');
  }

  const allocated = allocateEntityId(createWorld(runId, seed));

  return {
    ...allocated.world,
    blockers: blockers.map((blocker) => ({ ...blocker })),
    player: {
      entityId: allocated.entityId,
      previousPosition: { ...spawn },
      position: { ...spawn },
      radius,
      speedPxPerSecond
    }
  };
}

export function stepPrototypeWorld(
  state: PrototypeWorldState,
  movement: Vec2
): PrototypeWorldState {
  const moved = moveCircleForTick(
    state.player.position,
    movement,
    state.player.speedPxPerSecond,
    state.player.radius,
    state.blockers
  );

  const clock = stepWorld(state, [], 1).world;

  return {
    ...state,
    ...clock,
    player: {
      ...state.player,
      previousPosition: state.player.position,
      position: moved.position
    }
  };
}

export function applyPrototypePlayerDelta(
  state: PrototypeWorldState,
  delta: Vec2
): PrototypePlayerDeltaResult {
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) {
    throw new RangeError('prototype player delta must be finite');
  }

  const start = state.player.position;
  const moved = moveCircleAlongSegment(
    start,
    {
      x: start.x + delta.x,
      y: start.y + delta.y
    },
    state.player.radius,
    state.blockers
  );

  return {
    state: {
      ...state,
      player: {
        ...state.player,
        previousPosition: start,
        position: moved.position
      }
    },
    collided: moved.collided
  };
}

export function createPrototypeSnapshot(
  state: PrototypeWorldState,
  interpolationAlpha: number
): PrototypeSnapshot {
  if (!Number.isFinite(interpolationAlpha)) {
    throw new RangeError('interpolation alpha must be finite');
  }

  const alpha = Math.max(0, Math.min(1, interpolationAlpha));
  const previous = state.player.previousPosition;
  const current = state.player.position;

  return {
    tick: state.tick,
    player: {
      entityId: state.player.entityId,
      radius: state.player.radius,
      position: {
        x: previous.x + (current.x - previous.x) * alpha,
        y: previous.y + (current.y - previous.y) * alpha
      }
    },
    blockers: state.blockers
  };
}
