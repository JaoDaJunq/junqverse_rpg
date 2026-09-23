import { describe, expect, it } from 'vitest';
import {
  circleIntersectsAabb,
  firstSegmentHit,
  hasLineOfSight,
  isCirclePositionFree,
  moveCircle,
  moveCircleAlongSegment,
  moveCircleForTick,
  type Aabb
} from '../packages/sim/src/index.js';

const wall: Aabb = { x: 100, y: 20, width: 4, height: 160 };

describe('T006 independent review', () => {
  it('does not tunnel through a wall thinner than one tick of travel', () => {
    const result = moveCircle(
      { x: 20, y: 80 },
      { x: 500, y: 0 },
      12,
      [wall]
    );

    expect(result.collided).toBe(true);
    expect(result.position.x).toBeLessThanOrEqual(88);
    expect(circleIntersectsAabb(result.position, 12, wall)).toBe(false);
  });

  it('allows a tangent circle to leave the wall', () => {
    const result = moveCircle(
      { x: 88, y: 80 },
      { x: -30, y: 0 },
      12,
      [wall]
    );

    expect(result.collided).toBe(false);
    expect(result.position.x).toBeCloseTo(58, 8);
  });

  it('allows sliding exactly along a tangent wall', () => {
    const result = moveCircle(
      { x: 88, y: 80 },
      { x: 0, y: 40 },
      12,
      [wall]
    );

    expect(result.collided).toBe(false);
    expect(result.position.y).toBeCloseTo(120, 8);
  });

  it('blocks motion from tangent contact into the wall', () => {
    const result = moveCircle(
      { x: 88, y: 80 },
      { x: 20, y: 0 },
      12,
      [wall]
    );

    expect(result.collided).toBe(true);
    expect(result.position.x).toBeLessThanOrEqual(88);
  });

  it('allows a segment that only touches an AABB corner without entering', () => {
    const corner: Aabb = { x: 100, y: 100, width: 20, height: 20 };
    const hit = firstSegmentHit(
      { x: 80, y: 100 },
      { x: 100, y: 80 },
      [corner]
    );

    expect(hit).toBeNull();
  });

  it('stops a long dash before the first blocker in deterministic order', () => {
    const blockers: Aabb[] = [
      { x: 180, y: 20, width: 4, height: 160 },
      { x: 100, y: 20, width: 4, height: 160 }
    ];

    const result = moveCircleAlongSegment(
      { x: 20, y: 80 },
      { x: 300, y: 80 },
      12,
      blockers
    );

    expect(result.collided).toBe(true);
    expect(result.position.x).toBeLessThanOrEqual(88);
  });

  it('keeps fixed-tick movement deterministic over one second', () => {
    const run = () => {
      let position = { x: 20, y: 220 };

      for (let tick = 0; tick < 60; tick += 1) {
        position = moveCircleForTick(
          position,
          { x: 1, y: 1 },
          180,
          12,
          []
        ).position;
      }

      return position;
    };

    expect(run()).toEqual(run());
    expect(Math.hypot(run().x - 20, run().y - 220)).toBeCloseTo(180, 8);
  });

  it('provides stable line of sight and safe spawn checks', () => {
    expect(hasLineOfSight({ x: 20, y: 80 }, { x: 220, y: 80 }, [wall])).toBe(false);
    expect(hasLineOfSight({ x: 20, y: 220 }, { x: 220, y: 220 }, [wall])).toBe(true);

    expect(isCirclePositionFree({ x: 40, y: 80 }, 12, [wall])).toBe(true);
    expect(isCirclePositionFree({ x: 102, y: 80 }, 12, [wall])).toBe(false);
  });
});
