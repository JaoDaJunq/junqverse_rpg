export interface HitRegistry {
  readonly byAttackOrPulse: Readonly<Record<string, readonly number[]>>;
}

function assertStableKey(key: string): void {
  if (!/^[a-z0-9_:-]{1,128}$/.test(key) || key === '__proto__') {
    throw new RangeError('hit registry key must be a valid stable id');
  }
}

function assertEntityId(entityId: number): void {
  if (!Number.isSafeInteger(entityId) || entityId <= 0) {
    throw new RangeError('entityId must be a positive safe integer');
  }
}

export function createHitRegistry(): HitRegistry {
  return { byAttackOrPulse: {} };
}

export function hasRegisteredHit(
  registry: HitRegistry,
  key: string,
  entityId: number
): boolean {
  assertStableKey(key);
  assertEntityId(entityId);
  return (registry.byAttackOrPulse[key] ?? []).includes(entityId);
}

export function registerHit(
  registry: HitRegistry,
  key: string,
  entityId: number
): HitRegistry {
  if (hasRegisteredHit(registry, key, entityId)) {
    return registry;
  }

  const hits = [...(registry.byAttackOrPulse[key] ?? []), entityId]
    .sort((a, b) => a - b);

  return {
    byAttackOrPulse: {
      ...registry.byAttackOrPulse,
      [key]: hits
    }
  };
}
