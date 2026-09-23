import { describe, expect, it } from 'vitest';
import {
  createHitRegistry,
  createProjectile,
  createZone,
  hasRegisteredHit,
  resolveConeHits,
  segmentCircleEntryFraction,
  stepProjectile,
  stepZone,
  type AttackTarget
} from '../packages/sim/src/index.js';

const t = (entityId: number, x: number, y: number, radius = 5): AttackTarget => ({
  entityId,
  position: { x, y },
  radius
});

describe('T010 independent review', () => {
  it('counts a tangent segment-circle contact as a swept hit', () => {
    const fraction = segmentCircleEntryFraction(
      { x: 0, y: 5 },
      { x: 100, y: 5 },
      { x: 50, y: 0 },
      5
    );

    expect(fraction).toBeCloseTo(0.5, 10);
  });

  it('chooses the lowest entity id when targets are hit at the same fraction', () => {
    const projectile = createProjectile({
      projectileId: 'tie_target',
      attackInstanceId: 'attack:tie:0',
      ownerEntityId: 1,
      position: { x: 0, y: 0 },
      velocityPxPerSecond: { x: 6000, y: 0 },
      radius: 1
    });

    const result = stepProjectile(
      projectile,
      [],
      [t(5, 50, 0), t(2, 50, 0)],
      createHitRegistry()
    );

    expect(result.impact?.targetEntityId).toBe(2);
  });

  it('lets the wall win when wall and target entry fractions tie', () => {
    const projectile = createProjectile({
      projectileId: 'wall_tie',
      attackInstanceId: 'attack:wall_tie:0',
      ownerEntityId: 1,
      position: { x: 0, y: 0 },
      velocityPxPerSecond: { x: 6000, y: 0 },
      radius: 0
    });

    const result = stepProjectile(
      projectile,
      [{ x: 50, y: -10, width: 5, height: 20 }],
      [t(2, 55, 0, 5)],
      createHitRegistry()
    );

    expect(result.impact?.kind).toBe('wall');
    expect(hasRegisteredHit(result.registry, 'attack:wall_tie:0', 2)).toBe(false);
  });

  it('orders cone hit output deterministically by entity id', () => {
    const result = resolveConeHits({
      attackInstanceId: 'attack:cone_order:0',
      ownerEntityId: 1,
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      rangePx: 100,
      halfAngleRadians: Math.PI / 2
    }, [
      t(9, 40, 0),
      t(2, 50, 5),
      t(5, 60, -5)
    ], [], createHitRegistry());

    expect(result.targetEntityIds).toEqual([2, 5, 9]);
  });

  it('emits pulses on exact simulation tick spacing', () => {
    let zone = createZone({
      zoneId: 'exact_zone',
      attackInstanceId: 'attack:zone_exact:0',
      ownerEntityId: 1,
      center: { x: 0, y: 0 },
      radius: 10,
      durationTicks: 181,
      pulseIntervalTicks: 60
    });
    let registry = createHitRegistry();
    const pulseTicks: number[] = [];

    for (let tick = 1; tick <= 181 && zone; tick += 1) {
      const result = stepZone(zone, [t(2, 0, 0)], registry);
      registry = result.registry;
      if (result.pulse) pulseTicks.push(tick);
      if (!result.zone) break;
      zone = result.zone;
    }

    expect(pulseTicks).toEqual([1, 61, 121, 181]);
  });

  it('delays the first zone pulse by the requested full tick count', () => {
    let zone = createZone({
      zoneId: 'delayed_zone',
      attackInstanceId: 'attack:zone_delay:0',
      ownerEntityId: 1,
      center: { x: 0, y: 0 },
      radius: 10,
      durationTicks: 10,
      pulseIntervalTicks: 3,
      firstPulseDelayTicks: 2
    });
    let registry = createHitRegistry();
    const pulseTicks: number[] = [];

    for (let tick = 1; tick <= 10 && zone; tick += 1) {
      const result = stepZone(zone, [t(2, 0, 0)], registry);
      registry = result.registry;
      if (result.pulse) pulseTicks.push(tick);
      if (!result.zone) break;
      zone = result.zone;
    }

    expect(pulseTicks).toEqual([3, 6, 9]);
  });

  it('rejects invalid target geometry rather than silently hitting it', () => {
    expect(() => resolveConeHits({
      attackInstanceId: 'attack:invalid:0',
      ownerEntityId: 1,
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      rangePx: 100,
      halfAngleRadians: 1
    }, [{
      entityId: 2,
      position: { x: Number.NaN, y: 0 },
      radius: 5
    }], [], createHitRegistry())).toThrow('finite coordinates');
  });
});
