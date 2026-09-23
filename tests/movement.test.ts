import { describe, expect, it } from 'vitest';
import {
  circleIntersectsAabb,
  firstSegmentHit,
  hasLineOfSight,
  isCirclePositionFree,
  moveCircle,
  moveCircleAlongSegment,
  moveCircleForTick,
  movementDeltaPerTick,
  normalizeMovementInput,
  segmentIntersectsAnyAabb,
  type Aabb
} from '../packages/sim/src/index.js';

const THIN_WALL: Aabb = { x: 100, y: 0, width: 4, height: 200 };

describe('T006 shared movement and collision', () => {
  it('normalizes diagonal movement so it is not faster than cardinal movement', () => {
    const diagonal = normalizeMovementInput({ x: 1, y: 1 });
    const cardinal = normalizeMovementInput({ x: 1, y: 0 });

    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1, 12);
    expect(Math.hypot(cardinal.x, cardinal.y)).toBeCloseTo(1, 12);

    const diagonalDelta = movementDeltaPerTick({ x: 1, y: 1 }, 180);
    const cardinalDelta = movementDeltaPerTick({ x: 1, y: 0 }, 180);

    expect(Math.hypot(diagonalDelta.x, diagonalDelta.y))
      .toBeCloseTo(Math.hypot(cardinalDelta.x, cardinalDelta.y), 12);
  });

  it('moves by fixed tick distance independent of render FPS', () => {
    const runTicks = (ticks: number) => {
      let position = { x: 0, y: 50 };
      for (let index = 0; index < ticks; index += 1) {
        position = moveCircleForTick(position, { x: 1, y: 0 }, 180, 12, []).position;
      }
      return position;
    };

    expect(runTicks(60).x).toBeCloseTo(180, 10);
    expect(runTicks(30).x).toBeCloseTo(90, 10);
  });

  it('stops a moving circle before a thin wall', () => {
    const result = moveCircle(
      { x: 20, y: 80 },
      { x: 200, y: 0 },
      12,
      [THIN_WALL]
    );

    expect(result.collided).toBe(true);
    expect(result.position.x).toBeLessThanOrEqual(88);
    expect(circleIntersectsAabb(result.position, 12, THIN_WALL)).toBe(false);
  });

  it('slides along a wall when the other axis remains free', () => {
    const result = moveCircle(
      { x: 80, y: 40 },
      { x: 40, y: 30 },
      12,
      [THIN_WALL]
    );

    expect(result.collided).toBe(true);
    expect(result.position.x).toBeLessThanOrEqual(88);
    expect(result.position.y).toBeCloseTo(70, 6);
  });

  it('prevents a dash from crossing a thin wall', () => {
    const dash = moveCircleAlongSegment(
      { x: 20, y: 80 },
      { x: 220, y: 80 },
      12,
      [THIN_WALL]
    );

    expect(dash.collided).toBe(true);
    expect(dash.position.x).toBeLessThanOrEqual(88);
    expect(circleIntersectsAabb(dash.position, 12, THIN_WALL)).toBe(false);
  });

  it('detects a projectile segment crossing a thin wall', () => {
    expect(segmentIntersectsAnyAabb(
      { x: 20, y: 80 },
      { x: 220, y: 80 },
      [THIN_WALL]
    )).toBe(true);

    const hit = firstSegmentHit(
      { x: 20, y: 80 },
      { x: 220, y: 80 },
      [THIN_WALL]
    );

    expect(hit?.point.x).toBeCloseTo(100, 8);
  });

  it('provides line-of-sight helpers', () => {
    expect(hasLineOfSight(
      { x: 20, y: 80 },
      { x: 220, y: 80 },
      [THIN_WALL]
    )).toBe(false);

    expect(hasLineOfSight(
      { x: 20, y: 240 },
      { x: 220, y: 240 },
      [THIN_WALL]
    )).toBe(true);
  });

  it('supports safe spawn checks in corridor/corner fixtures', () => {
    const blockers: Aabb[] = [
      { x: 0, y: 0, width: 256, height: 16 },
      { x: 0, y: 144, width: 256, height: 16 },
      { x: 120, y: 16, width: 16, height: 80 }
    ];

    expect(isCirclePositionFree({ x: 40, y: 80 }, 12, blockers)).toBe(true);
    expect(isCirclePositionFree({ x: 124, y: 50 }, 12, blockers)).toBe(false);
  });

  it('rejects movement that starts inside a blocker', () => {
    expect(() => moveCircle(
      { x: 102, y: 80 },
      { x: 1, y: 0 },
      12,
      [THIN_WALL]
    )).toThrow('overlaps a blocker');
  });
});
