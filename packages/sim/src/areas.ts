import type { Vec2 } from '@junqverse/content';
import { hasLineOfSight, type Aabb } from './geometry.js';
import {
  hasRegisteredHit,
  registerHit,
  type HitRegistry
} from './hit-registry.js';
import type { AttackTarget, ProjectileState } from './projectiles.js';

const ANGLE_EPSILON = 1e-9;

export interface ConeAttack {
  readonly attackInstanceId: string;
  readonly ownerEntityId: number;
  readonly origin: Vec2;
  readonly direction: Vec2;
  readonly rangePx: number;
  readonly halfAngleRadians: number;
}

export interface ConeHitResult {
  readonly registry: HitRegistry;
  readonly targetEntityIds: readonly number[];
}

export interface ZoneState {
  readonly zoneId: string;
  readonly attackInstanceId: string;
  readonly ownerEntityId: number;
  readonly center: Vec2;
  readonly radius: number;
  readonly remainingTicks: number;
  readonly pulseIntervalTicks: number;
  readonly ticksUntilNextPulse: number;
  readonly nextPulseIndex: number;
}

export interface ZonePulse {
  readonly pulseIndex: number;
  readonly registryKey: string;
  readonly targetEntityIds: readonly number[];
}

export interface ZoneStepResult {
  readonly zone: ZoneState | null;
  readonly registry: HitRegistry;
  readonly pulse: ZonePulse | null;
}

function assertFiniteVec(value: Vec2, name: string): void {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new RangeError(`${name} must contain finite coordinates`);
  }
}

function assertStableId(value: string, name: string): void {
  if (!/^[a-z0-9_:-]{1,128}$/.test(value) || value === '__proto__') {
    throw new RangeError(`${name} must be a valid stable id`);
  }
}

function assertPositiveEntityId(entityId: number): void {
  if (!Number.isSafeInteger(entityId) || entityId <= 0) {
    throw new RangeError('ownerEntityId must be a positive safe integer');
  }
}

function normalizeDirection(direction: Vec2): Vec2 {
  assertFiniteVec(direction, 'cone direction');
  const length = Math.hypot(direction.x, direction.y);
  if (length <= ANGLE_EPSILON) {
    throw new RangeError('cone direction must be non-zero');
  }

  return {
    x: direction.x / length,
    y: direction.y / length
  };
}

export function resolveConeHits(
  cone: ConeAttack,
  targets: readonly AttackTarget[],
  blockers: readonly Aabb[],
  registry: HitRegistry
): ConeHitResult {
  assertStableId(cone.attackInstanceId, 'attackInstanceId');
  assertPositiveEntityId(cone.ownerEntityId);
  assertFiniteVec(cone.origin, 'cone origin');
  if (!Number.isFinite(cone.rangePx) || cone.rangePx < 0) {
    throw new RangeError('cone range must be non-negative and finite');
  }
  if (
    !Number.isFinite(cone.halfAngleRadians) ||
    cone.halfAngleRadians < 0 ||
    cone.halfAngleRadians > Math.PI
  ) {
    throw new RangeError('cone half angle must be between 0 and PI');
  }

  const direction = normalizeDirection(cone.direction);
  const minimumDot = Math.cos(cone.halfAngleRadians);
  const hits: number[] = [];
  let nextRegistry = registry;

  const orderedTargets = [...targets].sort((a, b) => a.entityId - b.entityId);

  for (const target of orderedTargets) {
    if (
      target.entityId === cone.ownerEntityId ||
      target.alive === false ||
      hasRegisteredHit(nextRegistry, cone.attackInstanceId, target.entityId)
    ) {
      continue;
    }

    const dx = target.position.x - cone.origin.x;
    const dy = target.position.y - cone.origin.y;
    const distance = Math.hypot(dx, dy);

    if (distance > cone.rangePx + target.radius) {
      continue;
    }

    if (distance > ANGLE_EPSILON) {
      const dot =
        direction.x * (dx / distance) +
        direction.y * (dy / distance);

      if (dot + ANGLE_EPSILON < minimumDot) {
        continue;
      }
    }

    if (!hasLineOfSight(cone.origin, target.position, blockers)) {
      continue;
    }

    nextRegistry = registerHit(
      nextRegistry,
      cone.attackInstanceId,
      target.entityId
    );
    hits.push(target.entityId);
  }

  return {
    registry: nextRegistry,
    targetEntityIds: hits
  };
}

export function createZone(input: {
  readonly zoneId: string;
  readonly attackInstanceId: string;
  readonly ownerEntityId: number;
  readonly center: Vec2;
  readonly radius: number;
  readonly durationTicks: number;
  readonly pulseIntervalTicks: number;
  readonly firstPulseDelayTicks?: number;
}): ZoneState {
  assertStableId(input.zoneId, 'zoneId');
  assertStableId(input.attackInstanceId, 'attackInstanceId');
  assertPositiveEntityId(input.ownerEntityId);
  assertFiniteVec(input.center, 'zone center');

  if (!Number.isFinite(input.radius) || input.radius < 0) {
    throw new RangeError('zone radius must be non-negative and finite');
  }
  if (!Number.isInteger(input.durationTicks) || input.durationTicks <= 0) {
    throw new RangeError('zone durationTicks must be a positive integer');
  }
  if (
    !Number.isInteger(input.pulseIntervalTicks) ||
    input.pulseIntervalTicks <= 0
  ) {
    throw new RangeError('zone pulseIntervalTicks must be a positive integer');
  }

  const firstPulseDelayTicks = input.firstPulseDelayTicks ?? 0;
  if (!Number.isInteger(firstPulseDelayTicks) || firstPulseDelayTicks < 0) {
    throw new RangeError('zone firstPulseDelayTicks must be non-negative');
  }

  return {
    zoneId: input.zoneId,
    attackInstanceId: input.attackInstanceId,
    ownerEntityId: input.ownerEntityId,
    center: { ...input.center },
    radius: input.radius,
    remainingTicks: input.durationTicks,
    pulseIntervalTicks: input.pulseIntervalTicks,
    ticksUntilNextPulse: firstPulseDelayTicks,
    nextPulseIndex: 0
  };
}

function targetsInsideZone(
  zone: ZoneState,
  targets: readonly AttackTarget[],
  registry: HitRegistry,
  registryKey: string
): {
  readonly registry: HitRegistry;
  readonly targetEntityIds: readonly number[];
} {
  let nextRegistry = registry;
  const hits: number[] = [];

  for (const target of [...targets].sort((a, b) => a.entityId - b.entityId)) {
    if (
      target.entityId === zone.ownerEntityId ||
      target.alive === false ||
      hasRegisteredHit(nextRegistry, registryKey, target.entityId)
    ) {
      continue;
    }

    const distance = Math.hypot(
      target.position.x - zone.center.x,
      target.position.y - zone.center.y
    );

    if (distance > zone.radius + target.radius) {
      continue;
    }

    nextRegistry = registerHit(nextRegistry, registryKey, target.entityId);
    hits.push(target.entityId);
  }

  return {
    registry: nextRegistry,
    targetEntityIds: hits
  };
}

export function stepZone(
  zone: ZoneState,
  targets: readonly AttackTarget[],
  registry: HitRegistry
): ZoneStepResult {
  const shouldPulse = zone.ticksUntilNextPulse === 0;
  let nextRegistry = registry;
  let pulse: ZonePulse | null = null;

  if (shouldPulse) {
    const registryKey =
      `${zone.attackInstanceId}:pulse:${zone.nextPulseIndex}`;
    const resolved = targetsInsideZone(
      zone,
      targets,
      nextRegistry,
      registryKey
    );
    nextRegistry = resolved.registry;
    pulse = {
      pulseIndex: zone.nextPulseIndex,
      registryKey,
      targetEntityIds: resolved.targetEntityIds
    };
  }

  const remainingTicks = zone.remainingTicks - 1;

  if (remainingTicks <= 0) {
    return {
      zone: null,
      registry: nextRegistry,
      pulse
    };
  }

  return {
    zone: {
      ...zone,
      remainingTicks,
      ticksUntilNextPulse: shouldPulse
        ? zone.pulseIntervalTicks - 1
        : zone.ticksUntilNextPulse - 1,
      nextPulseIndex: shouldPulse
        ? zone.nextPulseIndex + 1
        : zone.nextPulseIndex
    },
    registry: nextRegistry,
    pulse
  };
}

export function removeZonesOwnedBy(
  zones: readonly ZoneState[],
  ownerEntityId: number
): readonly ZoneState[] {
  assertPositiveEntityId(ownerEntityId);
  return zones.filter((zone) => zone.ownerEntityId !== ownerEntityId);
}

export function removeTransientEffectsOwnedBy(
  projectiles: readonly ProjectileState[],
  zones: readonly ZoneState[],
  ownerEntityId: number
): {
  readonly projectiles: readonly ProjectileState[];
  readonly zones: readonly ZoneState[];
} {
  assertPositiveEntityId(ownerEntityId);

  return {
    projectiles: projectiles.filter(
      (projectile) => projectile.ownerEntityId !== ownerEntityId
    ),
    zones: zones.filter((zone) => zone.ownerEntityId !== ownerEntityId)
  };
}

export function clearTransientEffects(): {
  readonly projectiles: readonly ProjectileState[];
  readonly zones: readonly ZoneState[];
} {
  return {
    projectiles: [],
    zones: []
  };
}
