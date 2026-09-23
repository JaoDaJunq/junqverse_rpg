import type { Vec2 } from '@junqverse/content';
import {
  firstSegmentHit,
  isCirclePositionFree,
  type Aabb
} from './geometry.js';
import { TICKS_PER_SECOND } from './clock.js';

const CONTACT_EPSILON = 1e-7;

export interface MovementResult {
  readonly position: Vec2;
  readonly collided: boolean;
}

export function normalizeMovementInput(input: Vec2): Vec2 {
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) {
    throw new RangeError('movement input must be finite');
  }

  const length = Math.hypot(input.x, input.y);

  if (length <= 1 || length === 0) {
    return { x: input.x, y: input.y };
  }

  return {
    x: input.x / length,
    y: input.y / length
  };
}

export function movementDeltaPerTick(input: Vec2, speedPxPerSecond: number): Vec2 {
  if (!Number.isFinite(speedPxPerSecond) || speedPxPerSecond < 0) {
    throw new RangeError('speed must be non-negative and finite');
  }

  const normalized = normalizeMovementInput(input);
  const distance = speedPxPerSecond / TICKS_PER_SECOND;

  return {
    x: normalized.x * distance,
    y: normalized.y * distance
  };
}

function moveAlongAxis(
  position: Vec2,
  delta: Vec2,
  radius: number,
  blockers: readonly Aabb[]
): MovementResult {
  if (delta.x === 0 && delta.y === 0) {
    return { position, collided: false };
  }

  const end = {
    x: position.x + delta.x,
    y: position.y + delta.y
  };
  const hit = firstSegmentHit(position, end, blockers, radius);

  if (!hit) {
    return { position: end, collided: false };
  }

  const length = Math.hypot(delta.x, delta.y);
  const retreat = length === 0 ? 0 : Math.min(hit.fraction, CONTACT_EPSILON / length);
  const fraction = Math.max(0, hit.fraction - retreat);

  return {
    position: {
      x: position.x + delta.x * fraction,
      y: position.y + delta.y * fraction
    },
    collided: true
  };
}

export function moveCircle(
  position: Vec2,
  delta: Vec2,
  radius: number,
  blockers: readonly Aabb[]
): MovementResult {
  if (!Number.isFinite(radius) || radius < 0) {
    throw new RangeError('radius must be non-negative and finite');
  }

  if (!isCirclePositionFree(position, radius, blockers)) {
    throw new Error('movement start position overlaps a blocker');
  }

  const horizontal = moveAlongAxis(
    position,
    { x: delta.x, y: 0 },
    radius,
    blockers
  );
  const vertical = moveAlongAxis(
    horizontal.position,
    { x: 0, y: delta.y },
    radius,
    blockers
  );

  return {
    position: vertical.position,
    collided: horizontal.collided || vertical.collided
  };
}

export function moveCircleForTick(
  position: Vec2,
  input: Vec2,
  speedPxPerSecond: number,
  radius: number,
  blockers: readonly Aabb[]
): MovementResult {
  return moveCircle(
    position,
    movementDeltaPerTick(input, speedPxPerSecond),
    radius,
    blockers
  );
}

export function moveCircleAlongSegment(
  start: Vec2,
  end: Vec2,
  radius: number,
  blockers: readonly Aabb[]
): MovementResult {
  if (!isCirclePositionFree(start, radius, blockers)) {
    throw new Error('segment start position overlaps a blocker');
  }

  const delta = {
    x: end.x - start.x,
    y: end.y - start.y
  };
  const hit = firstSegmentHit(start, end, blockers, radius);

  if (!hit) {
    return { position: end, collided: false };
  }

  const length = Math.hypot(delta.x, delta.y);
  const retreat = length === 0 ? 0 : Math.min(hit.fraction, CONTACT_EPSILON / length);
  const fraction = Math.max(0, hit.fraction - retreat);

  return {
    position: {
      x: start.x + delta.x * fraction,
      y: start.y + delta.y * fraction
    },
    collided: true
  };
}
