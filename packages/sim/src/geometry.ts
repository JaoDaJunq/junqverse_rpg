import type { Vec2 } from '@junqverse/content';

export interface Aabb {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SegmentHit {
  readonly fraction: number;
  readonly point: Vec2;
  readonly blockerIndex: number;
}

const EPSILON = 1e-9;

function assertFiniteVec2(value: Vec2, name: string): void {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new RangeError(`${name} must contain finite coordinates`);
  }
}

function assertAabb(aabb: Aabb): void {
  if (
    !Number.isFinite(aabb.x) ||
    !Number.isFinite(aabb.y) ||
    !Number.isFinite(aabb.width) ||
    !Number.isFinite(aabb.height) ||
    aabb.width < 0 ||
    aabb.height < 0
  ) {
    throw new RangeError('AABB must contain finite non-negative dimensions');
  }
}

export function expandAabb(aabb: Aabb, amount: number): Aabb {
  assertAabb(aabb);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError('expand amount must be non-negative and finite');
  }

  return {
    x: aabb.x - amount,
    y: aabb.y - amount,
    width: aabb.width + amount * 2,
    height: aabb.height + amount * 2
  };
}

export function circleIntersectsAabb(
  center: Vec2,
  radius: number,
  aabb: Aabb
): boolean {
  assertFiniteVec2(center, 'center');
  assertAabb(aabb);
  if (!Number.isFinite(radius) || radius < 0) {
    throw new RangeError('radius must be non-negative and finite');
  }

  const closestX = Math.max(aabb.x, Math.min(center.x, aabb.x + aabb.width));
  const closestY = Math.max(aabb.y, Math.min(center.y, aabb.y + aabb.height));
  const dx = center.x - closestX;
  const dy = center.y - closestY;

  return dx * dx + dy * dy < radius * radius - EPSILON;
}

export function isCirclePositionFree(
  center: Vec2,
  radius: number,
  blockers: readonly Aabb[]
): boolean {
  return blockers.every((blocker) => !circleIntersectsAabb(center, radius, blocker));
}

export function segmentAabbEntryFraction(
  start: Vec2,
  end: Vec2,
  aabb: Aabb
): number | null {
  assertFiniteVec2(start, 'start');
  assertFiniteVec2(end, 'end');
  assertAabb(aabb);

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  let enter = 0;
  let exit = 1;

  const axes = [
    { start: start.x, delta: deltaX, min: aabb.x, max: aabb.x + aabb.width },
    { start: start.y, delta: deltaY, min: aabb.y, max: aabb.y + aabb.height }
  ];

  for (const axis of axes) {
    if (Math.abs(axis.delta) <= EPSILON) {
      if (axis.start < axis.min || axis.start > axis.max) {
        return null;
      }
      continue;
    }

    let near = (axis.min - axis.start) / axis.delta;
    let far = (axis.max - axis.start) / axis.delta;

    if (near > far) {
      [near, far] = [far, near];
    }

    enter = Math.max(enter, near);
    exit = Math.min(exit, far);

    if (enter - exit > EPSILON) {
      return null;
    }
  }

  const intervalStart = Math.max(0, enter);
  const intervalEnd = Math.min(1, exit);

  if (intervalStart > 1 || intervalEnd < 0 || intervalEnd - intervalStart <= EPSILON) {
    return null;
  }

  const probeFraction = intervalStart + (intervalEnd - intervalStart) * 0.5;
  const probeX = start.x + deltaX * probeFraction;
  const probeY = start.y + deltaY * probeFraction;
  const strictlyInside =
    probeX > aabb.x + EPSILON &&
    probeX < aabb.x + aabb.width - EPSILON &&
    probeY > aabb.y + EPSILON &&
    probeY < aabb.y + aabb.height - EPSILON;

  return strictlyInside ? intervalStart : null;
}

export function firstSegmentHit(
  start: Vec2,
  end: Vec2,
  blockers: readonly Aabb[],
  radius = 0
): SegmentHit | null {
  assertFiniteVec2(start, 'start');
  assertFiniteVec2(end, 'end');

  if (!Number.isFinite(radius) || radius < 0) {
    throw new RangeError('radius must be non-negative and finite');
  }

  let best: SegmentHit | null = null;

  blockers.forEach((blocker, blockerIndex) => {
    const fraction = segmentAabbEntryFraction(
      start,
      end,
      radius === 0 ? blocker : expandAabb(blocker, radius)
    );

    if (fraction === null) {
      return;
    }

    if (
      best === null ||
      fraction < best.fraction - EPSILON ||
      (Math.abs(fraction - best.fraction) <= EPSILON && blockerIndex < best.blockerIndex)
    ) {
      best = {
        fraction,
        blockerIndex,
        point: {
          x: start.x + (end.x - start.x) * fraction,
          y: start.y + (end.y - start.y) * fraction
        }
      };
    }
  });

  return best;
}

export function segmentIntersectsAnyAabb(
  start: Vec2,
  end: Vec2,
  blockers: readonly Aabb[]
): boolean {
  return firstSegmentHit(start, end, blockers) !== null;
}

export function hasLineOfSight(
  start: Vec2,
  end: Vec2,
  blockers: readonly Aabb[]
): boolean {
  return !segmentIntersectsAnyAabb(start, end, blockers);
}
