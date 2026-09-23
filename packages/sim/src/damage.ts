export interface ShieldState {
  readonly bySource: Readonly<Record<string, number>>;
}

export interface HealthState {
  readonly maxHealth: number;
  readonly health: number;
  readonly armor: number;
  readonly alive: boolean;
  readonly shields: ShieldState;
}

export interface DamageSpec {
  readonly base: number;
  readonly powerMultiplier: number;
  readonly outgoingModifiers?: readonly number[];
  readonly incomingModifiers?: readonly number[];
  readonly invulnerable?: boolean;
}

export interface DamageResult {
  readonly state: HealthState;
  readonly calculatedDamage: number;
  readonly absorbedByShield: number;
  readonly healthDamage: number;
  readonly effectiveDamage: number;
  readonly diedNow: boolean;
}

export interface HealResult {
  readonly state: HealthState;
  readonly effectiveHealing: number;
}

export interface ShieldResult {
  readonly state: HealthState;
  readonly appliedAmount: number;
  readonly totalShield: number;
}

function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be non-negative and finite`);
  }
}

function assertStableId(id: string, name: string): void {
  if (!/^[a-z0-9_:-]{1,96}$/.test(id) || id === '__proto__') {
    throw new RangeError(`${name} must be a valid stable id`);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function combineCombatMultipliers(
  modifiers: readonly number[] = []
): number {
  let product = 1;

  for (const modifier of modifiers) {
    if (!Number.isFinite(modifier) || modifier < 0) {
      throw new RangeError('combat modifiers must be non-negative and finite');
    }
    product *= modifier;

    if (!Number.isFinite(product)) {
      throw new RangeError('combat modifier product overflow');
    }
  }

  return clamp(product, 0.25, 2);
}

export function calculateDamage(
  armor: number,
  spec: DamageSpec
): number {
  assertFiniteNonNegative(armor, 'armor');
  assertFiniteNonNegative(spec.base, 'base damage');
  assertFiniteNonNegative(spec.powerMultiplier, 'powerMultiplier');

  const outgoing = combineCombatMultipliers(spec.outgoingModifiers);
  const incoming = combineCombatMultipliers(spec.incomingModifiers);
  const raw =
    spec.base *
    spec.powerMultiplier *
    outgoing *
    incoming *
    (100 / (100 + armor));

  if (!Number.isFinite(raw)) {
    throw new RangeError('calculated damage overflow');
  }

  return Math.max(1, Math.floor(raw));
}

export function createHealthState(
  maxHealth: number,
  armor = 0,
  health = maxHealth
): HealthState {
  if (!Number.isFinite(maxHealth) || maxHealth <= 0) {
    throw new RangeError('maxHealth must be positive and finite');
  }
  assertFiniteNonNegative(armor, 'armor');
  assertFiniteNonNegative(health, 'health');
  if (health > maxHealth) {
    throw new RangeError('health cannot exceed maxHealth');
  }

  return {
    maxHealth,
    health,
    armor,
    alive: health > 0,
    shields: { bySource: {} }
  };
}

export function totalShield(shields: ShieldState): number {
  return Object.values(shields.bySource).reduce((sum, value) => {
    assertFiniteNonNegative(value, 'shield value');
    return sum + value;
  }, 0);
}

export function applyShield(
  state: HealthState,
  sourceId: string,
  amount: number
): ShieldResult {
  assertStableId(sourceId, 'shield sourceId');
  assertFiniteNonNegative(amount, 'shield amount');

  if (!state.alive || amount === 0) {
    return {
      state,
      appliedAmount: 0,
      totalShield: totalShield(state.shields)
    };
  }

  const current = state.shields.bySource[sourceId] ?? 0;
  const desired = Math.max(current, amount);

  if (desired === current) {
    return {
      state,
      appliedAmount: 0,
      totalShield: totalShield(state.shields)
    };
  }

  const cap = state.maxHealth * 0.5;
  const otherTotal = Object.entries(state.shields.bySource)
    .filter(([id]) => id !== sourceId)
    .reduce((sum, [, value]) => sum + value, 0);
  const allowedForSource = Math.max(0, cap - otherTotal);
  const nextValue = Math.min(desired, allowedForSource);
  const appliedAmount = Math.max(0, nextValue - current);

  if (nextValue === current) {
    return {
      state,
      appliedAmount: 0,
      totalShield: totalShield(state.shields)
    };
  }

  const bySource = { ...state.shields.bySource };
  if (nextValue > 0) {
    bySource[sourceId] = nextValue;
  } else {
    delete bySource[sourceId];
  }

  const nextState: HealthState = {
    ...state,
    shields: { bySource }
  };

  return {
    state: nextState,
    appliedAmount,
    totalShield: totalShield(nextState.shields)
  };
}

function absorbShield(
  shields: ShieldState,
  incomingDamage: number
): {
  readonly shields: ShieldState;
  readonly absorbed: number;
  readonly remainingDamage: number;
} {
  let remainingDamage = incomingDamage;
  let absorbed = 0;
  const bySource = { ...shields.bySource };

  for (const sourceId of Object.keys(bySource).sort()) {
    if (remainingDamage <= 0) break;

    const available = bySource[sourceId] ?? 0;
    const used = Math.min(available, remainingDamage);
    const remainingShield = available - used;

    absorbed += used;
    remainingDamage -= used;

    if (remainingShield > 0) {
      bySource[sourceId] = remainingShield;
    } else {
      delete bySource[sourceId];
    }
  }

  return {
    shields: { bySource },
    absorbed,
    remainingDamage
  };
}

export function applyDamage(
  state: HealthState,
  spec: DamageSpec
): DamageResult {
  if (!state.alive || spec.invulnerable === true) {
    return {
      state,
      calculatedDamage: 0,
      absorbedByShield: 0,
      healthDamage: 0,
      effectiveDamage: 0,
      diedNow: false
    };
  }

  const calculatedDamage = calculateDamage(state.armor, spec);
  const shield = absorbShield(state.shields, calculatedDamage);
  const healthDamage = Math.min(state.health, shield.remainingDamage);
  const health = Math.max(0, state.health - healthDamage);
  const diedNow = state.alive && health === 0;

  const nextState: HealthState = {
    ...state,
    health,
    alive: health > 0,
    shields: shield.shields
  };

  return {
    state: nextState,
    calculatedDamage,
    absorbedByShield: shield.absorbed,
    healthDamage,
    effectiveDamage: shield.absorbed + healthDamage,
    diedNow
  };
}

export function applyHealing(
  state: HealthState,
  amount: number
): HealResult {
  assertFiniteNonNegative(amount, 'healing amount');

  if (!state.alive || amount === 0) {
    return { state, effectiveHealing: 0 };
  }

  const health = Math.min(state.maxHealth, state.health + amount);
  const effectiveHealing = health - state.health;

  return {
    state: {
      ...state,
      health
    },
    effectiveHealing
  };
}
