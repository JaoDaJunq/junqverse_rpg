import { describe, expect, it } from 'vitest';
import {
  clearTransientEffects,
  createHitRegistry,
  createProjectile,
  createZone,
  hasRegisteredHit,
  removeTransientEffectsOwnedBy,
  resolveConeHits,
  segmentCircleEntryFraction,
  stepProjectile,
  stepZone,
  type AttackTarget,
  type ProjectileState,
  type ZoneState
} from '../packages/sim/src/index.js';

const target = (
  entityId: number,
  x: number,
  y: number,
  radius = 12
): AttackTarget => ({
  entityId,
  position: { x, y },
  radius
});

describe('T010 projectiles, cones and zones', () => {
  it('detects a fast projectile crossing a target in one tick', () => {
    const projectile = createProjectile({
      projectileId: 'fast',
      attackInstanceId: 'attack:1:0',
      ownerEntityId: 1,
      position: { x: 0, y: 50 },
      velocityPxPerSecond: { x: 12_000, y: 0 },
      radius: 2
    });

    const result = stepProjectile(
      projectile,
      [],
      [target(2, 100, 50)],
      createHitRegistry()
    );

    expect(result.projectile).toBeNull();
    expect(result.impact?.kind).toBe('target');
    expect(result.impact?.targetEntityId).toBe(2);
    expect(hasRegisteredHit(result.registry, 'attack:1:0', 2)).toBe(true);
  });

  it('lets a wall win before a target behind it', () => {
    const projectile = createProjectile({
      projectileId: 'wall_first',
      attackInstanceId: 'attack:1:1',
      ownerEntityId: 1,
      position: { x: 0, y: 50 },
      velocityPxPerSecond: { x: 12_000, y: 0 },
      radius: 2
    });

    const result = stepProjectile(
      projectile,
      [{ x: 50, y: 0, width: 4, height: 100 }],
      [target(2, 100, 50)],
      createHitRegistry()
    );

    expect(result.impact?.kind).toBe('wall');
    expect(hasRegisteredHit(result.registry, 'attack:1:1', 2)).toBe(false);
  });

  it('prevents multiple projectiles from the same attack hitting one target twice', () => {
    const makeProjectile = (id: string): ProjectileState => createProjectile({
      projectileId: id,
      attackInstanceId: 'attack:fan:0',
      ownerEntityId: 1,
      position: { x: 0, y: 50 },
      velocityPxPerSecond: { x: 12_000, y: 0 },
      radius: 2
    });

    const first = stepProjectile(
      makeProjectile('fan_a'),
      [],
      [target(2, 100, 50)],
      createHitRegistry()
    );
    const second = stepProjectile(
      makeProjectile('fan_b'),
      [],
      [target(2, 100, 50)],
      first.registry
    );

    expect(first.impact?.targetEntityId).toBe(2);
    expect(second.impact).toBeNull();
    expect(second.projectile).not.toBeNull();
  });

  it('hits a cone target once and respects line of sight', () => {
    const cone = {
      attackInstanceId: 'attack:cone:0',
      ownerEntityId: 1,
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      rangePx: 120,
      halfAngleRadians: Math.PI / 4
    };

    const first = resolveConeHits(
      cone,
      [target(2, 80, 0), target(3, 80, 30)],
      [{ x: 40, y: 20, width: 8, height: 40 }],
      createHitRegistry()
    );

    expect(first.targetEntityIds).toEqual([2]);

    const repeated = resolveConeHits(
      cone,
      [target(2, 80, 0)],
      [],
      first.registry
    );

    expect(repeated.targetEntityIds).toEqual([]);
  });

  it('pulses a zone on simulation ticks rather than render frames', () => {
    const run = (renderFps: number): number[] => {
      let zone: ZoneState | null = createZone({
        zoneId: 'zone',
        attackInstanceId: 'attack:zone:0',
        ownerEntityId: 1,
        center: { x: 0, y: 0 },
        radius: 50,
        durationTicks: 181,
        pulseIntervalTicks: 60
      });
      let registry = createHitRegistry();
      const pulses: number[] = [];

      const renderFrames = renderFps * 3;
      let accumulator = 0;

      for (let frame = 0; frame < renderFrames && zone; frame += 1) {
        accumulator += 60 / renderFps;

        while (accumulator >= 1 && zone) {
          const result = stepZone(zone, [target(2, 0, 0)], registry);
          zone = result.zone;
          registry = result.registry;
          if (result.pulse) pulses.push(result.pulse.pulseIndex);
          accumulator -= 1;
        }
      }

      return pulses;
    };

    expect(run(30)).toEqual(run(60));
    expect(run(60)).toEqual([0, 1, 2]);
  });

  it('allows the same target once per zone pulse', () => {
    let zone: ZoneState | null = createZone({
      zoneId: 'zone_pulses',
      attackInstanceId: 'attack:zone:1',
      ownerEntityId: 1,
      center: { x: 0, y: 0 },
      radius: 50,
      durationTicks: 3,
      pulseIntervalTicks: 1
    });
    let registry = createHitRegistry();
    const hitCounts: number[] = [];

    while (zone) {
      const result = stepZone(zone, [target(2, 0, 0)], registry);
      zone = result.zone;
      registry = result.registry;
      hitCounts.push(result.pulse?.targetEntityIds.length ?? 0);
    }

    expect(hitCounts).toEqual([1, 1, 1]);
  });

  it('removes owner transient effects on death and clears all on room end', () => {
    const projectiles = [
      createProjectile({
        projectileId: 'p1',
        attackInstanceId: 'attack:1:0',
        ownerEntityId: 1,
        position: { x: 0, y: 0 },
        velocityPxPerSecond: { x: 1, y: 0 },
        radius: 1
      }),
      createProjectile({
        projectileId: 'p2',
        attackInstanceId: 'attack:2:0',
        ownerEntityId: 2,
        position: { x: 0, y: 0 },
        velocityPxPerSecond: { x: 1, y: 0 },
        radius: 1
      })
    ];
    const zones = [
      createZone({
        zoneId: 'z1',
        attackInstanceId: 'attack:1:1',
        ownerEntityId: 1,
        center: { x: 0, y: 0 },
        radius: 10,
        durationTicks: 10,
        pulseIntervalTicks: 2
      }),
      createZone({
        zoneId: 'z2',
        attackInstanceId: 'attack:2:1',
        ownerEntityId: 2,
        center: { x: 0, y: 0 },
        radius: 10,
        durationTicks: 10,
        pulseIntervalTicks: 2
      })
    ];

    const afterDeath = removeTransientEffectsOwnedBy(
      projectiles,
      zones,
      1
    );

    expect(afterDeath.projectiles.map((item) => item.projectileId)).toEqual(['p2']);
    expect(afterDeath.zones.map((item) => item.zoneId)).toEqual(['z2']);

    expect(clearTransientEffects()).toEqual({
      projectiles: [],
      zones: []
    });
  });

  it('calculates segment-circle entry for swept target tests', () => {
    expect(segmentCircleEntryFraction(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 0 },
      10
    )).toBeCloseTo(0.4, 10);

    expect(segmentCircleEntryFraction(
      { x: 0, y: 20 },
      { x: 100, y: 20 },
      { x: 50, y: 0 },
      10
    )).toBeNull();
  });
});
