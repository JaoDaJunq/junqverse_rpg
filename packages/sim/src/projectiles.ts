import type { Vec2 } from '@junqverse/content';
import { TICKS_PER_SECOND } from './clock.js';
import {
  firstSegmentHit,
  segmentCircleEntryFraction,
  type Aabb
} from './geometry.js';
import {
  hasRegisteredHit,
  registerHit,
  type HitRegistry
} from './hit-registry.js';

const IMPACT_EPSILON = 1e-9;

export interface AttackTarget {
  readonly entityId: number;
  readonly position: Vec2;
  readonly radius: number;
  readonly alive?: boolean;
}

export interface ProjectileState {
  readonly projectileId: string;
  readonly attackInstanceId: string;
  readonly ownerEntityId: number;
  readonly position: Vec2;
  readonly velocityPxPerSecond: Vec2;
  readonly radius: number;
}

export interface ProjectileImpact {
  readonly kind: 'wall' | 'target';
  readonly point: Vec2;
  readonly targetEntityId: number | null;
}

export interface ProjectileStepResult {
  readonly projectile: ProjectileState | null;
  readonly registry: HitRegistry;
  readonly impact: ProjectileImpact | null;
}

function assertFiniteVec(value: Vec2, name: string): void {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new RangeError(`${name} must contain finite coordinates`);
  }
}

function assertPositiveEntityId(entityId: number): void {
  if (!Number.isSafeInteger(entityId) || entityId <= 0) {
    throw new RangeError('ownerEntityId must be a positive safe integer');
  }
}

function assertStableId(value: string, name: string): void {
  if (!/^[a-z0-9_:-]{1,128}$/.test(value) || value === '__proto__') {
    throw new RangeError(`${name} must be a valid stable id`);
  }
}

export function createProjectile(input: ProjectileState): ProjectileState {
  assertStableId(input.projectileId, 'projectileId');
  assertStableId(input.attackInstanceId, 'attackInstanceId');
  assertPositiveEntityId(input.ownerEntityId);
  assertFiniteVec(input.position, 'projectile position');
  assertFiniteVec(input.velocityPxPerSecond, 'projectile velocity');
  if (!Number.isFinite(input.radius) || input.radius < 0) {
    throw new RangeError('projectile radius must be non-negative and finite');
  }

  return {
    ...input,
    position: { ...input.position },
    velocityPxPerSecond: { ...input.velocityPxPerSecond }
  };
}

function firstTargetHit(
  start: Vec2,
  end: Vec2,
  projectile: ProjectileState,
  targets: readonly AttackTarget[],
  registry: HitRegistry
): { readonly fraction: number; readonly target: AttackTarget } | null {
  let best: { readonly fraction: number; readonly target: AttackTarget } | null = null;

  for (const target of targets) {
    if (
      target.entityId === projectile.ownerEntityId ||
      target.alive === false ||
      hasRegisteredHit(registry, projectile.attackInstanceId, target.entityId)
    ) {
      continue;
    }

    if (!Number.isFinite(target.radius) || target.radius < 0) {
      throw new RangeError('target radius must be non-negative and finite');
    }

    const fraction = segmentCircleEntryFraction(
      start,
      end,
      target.position,
      projectile.radius + target.radius
    );

    if (fraction === null) {
      continue;
    }

    if (
      best === null ||
      fraction < best.fraction - IMPACT_EPSILON ||
      (
        Math.abs(fraction - best.fraction) <= IMPACT_EPSILON &&
        target.entityId < best.target.entityId
      )
    ) {
      best = { fraction, target };
    }
  }

  return best;
}

export function stepProjectile(
  projectile: ProjectileState,
  blockers: readonly Aabb[],
  targets: readonly AttackTarget[],
  registry: HitRegistry
): ProjectileStepResult {
  const start = projectile.position;
  const end = {
    x: start.x + projectile.velocityPxPerSecond.x / TICKS_PER_SECOND,
    y: start.y + projectile.velocityPxPerSecond.y / TICKS_PER_SECOND
  };

  const wall = firstSegmentHit(start, end, blockers, projectile.radius);
  const target = firstTargetHit(start, end, projectile, targets, registry);

  if (
    wall &&
    (
      target === null ||
      wall.fraction <= target.fraction + IMPACT_EPSILON
    )
  ) {
    return {
      projectile: null,
      registry,
      impact: {
        kind: 'wall',
        point: wall.point,
        targetEntityId: null
      }
    };
  }

  if (target) {
    const point = {
      x: start.x + (end.x - start.x) * target.fraction,
      y: start.y + (end.y - start.y) * target.fraction
    };

    return {
      projectile: null,
      registry: registerHit(
        registry,
        projectile.attackInstanceId,
        target.target.entityId
      ),
      impact: {
        kind: 'target',
        point,
        targetEntityId: target.target.entityId
      }
    };
  }

  return {
    projectile: {
      ...projectile,
      position: end
    },
    registry,
    impact: null
  };
}

export function removeProjectilesOwnedBy(
  projectiles: readonly ProjectileState[],
  ownerEntityId: number
): readonly ProjectileState[] {
  assertPositiveEntityId(ownerEntityId);
  return projectiles.filter(
    (projectile) => projectile.ownerEntityId !== ownerEntityId
  );
}
