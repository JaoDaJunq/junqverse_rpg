export type SharedStatusKind =
  | 'slow'
  | 'root'
  | 'stun'
  | 'vulnerable'
  | 'haste';

export type CombatMode = 'pve' | 'arena';

export interface TimedStatusEffect {
  readonly kind: SharedStatusKind;
  readonly sourceId: string;
  readonly magnitude: number;
  readonly remainingTicks: number;
}

export interface StatusState {
  readonly effects: readonly TimedStatusEffect[];
  readonly bossControlConversionImmunityTicks: number;
  readonly strongControlImmunityTicks: number;
}

export interface StatusApplication {
  readonly kind: SharedStatusKind;
  readonly sourceId: string;
  readonly magnitude?: number;
  readonly durationTicks: number;
}

export interface StatusContext {
  readonly isBoss: boolean;
  readonly mode?: CombatMode;
}

export interface StatusApplicationResult {
  readonly state: StatusState;
  readonly outcome: 'applied' | 'ignored' | 'converted';
}

const PVE_ROOT_CAP_TICKS = 90;
const PVE_STUN_CAP_TICKS = 60;
const ARENA_STRONG_CONTROL_CAP_TICKS = 45;
const ARENA_CONTROL_IMMUNITY_TICKS = 120;
const BOSS_CONVERSION_VULNERABLE_TICKS = 120;
const BOSS_CONVERSION_IMMUNITY_TICKS = 240;
const VULNERABLE_MAGNITUDE = 0.15;
const VULNERABLE_CAP_TICKS = 180;
const SHARED_HASTE_MAGNITUDE = 0.15;
const SHARED_HASTE_CAP_TICKS = 180;
const PVE_SLOW_CAP = 0.5;
const ARENA_SLOW_CAP = 0.3;

function assertStableId(id: string, name: string): void {
  if (!/^[a-z0-9_:-]{1,96}$/.test(id) || id === '__proto__') {
    throw new RangeError(`${name} must be a valid stable id`);
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be non-negative and finite`);
  }
}

export function createStatusState(): StatusState {
  return {
    effects: [],
    bossControlConversionImmunityTicks: 0,
    strongControlImmunityTicks: 0
  };
}

function hasStrongControl(effects: readonly TimedStatusEffect[]): boolean {
  return effects.some((effect) => effect.kind === 'root' || effect.kind === 'stun');
}

function normalizedStatus(
  application: StatusApplication,
  mode: CombatMode
): TimedStatusEffect {
  assertStableId(application.sourceId, 'status sourceId');
  assertPositiveInteger(application.durationTicks, 'status durationTicks');

  const requestedMagnitude = application.magnitude ?? 0;
  assertFiniteNonNegative(requestedMagnitude, 'status magnitude');

  if (application.kind === 'root') {
    return {
      kind: 'root',
      sourceId: application.sourceId,
      magnitude: 0,
      remainingTicks: Math.min(
        application.durationTicks,
        mode === 'arena' ? ARENA_STRONG_CONTROL_CAP_TICKS : PVE_ROOT_CAP_TICKS
      )
    };
  }

  if (application.kind === 'stun') {
    return {
      kind: 'stun',
      sourceId: application.sourceId,
      magnitude: 0,
      remainingTicks: Math.min(
        application.durationTicks,
        mode === 'arena' ? ARENA_STRONG_CONTROL_CAP_TICKS : PVE_STUN_CAP_TICKS
      )
    };
  }

  if (application.kind === 'slow') {
    return {
      kind: 'slow',
      sourceId: application.sourceId,
      magnitude: Math.min(
        requestedMagnitude,
        mode === 'arena' ? ARENA_SLOW_CAP : PVE_SLOW_CAP
      ),
      remainingTicks: application.durationTicks
    };
  }

  if (application.kind === 'vulnerable') {
    return {
      kind: 'vulnerable',
      sourceId: application.sourceId,
      magnitude: VULNERABLE_MAGNITUDE,
      remainingTicks: Math.min(application.durationTicks, VULNERABLE_CAP_TICKS)
    };
  }

  return {
    kind: 'haste',
    sourceId: application.sourceId,
    magnitude: Math.min(
      requestedMagnitude === 0 ? SHARED_HASTE_MAGNITUDE : requestedMagnitude,
      SHARED_HASTE_MAGNITUDE
    ),
    remainingTicks: Math.min(application.durationTicks, SHARED_HASTE_CAP_TICKS)
  };
}

function upsertEffect(
  effects: readonly TimedStatusEffect[],
  incoming: TimedStatusEffect
): readonly TimedStatusEffect[] {
  const existing = effects.find(
    (effect) =>
      effect.kind === incoming.kind &&
      effect.sourceId === incoming.sourceId
  );

  const rest = effects.filter(
    (effect) =>
      !(
        effect.kind === incoming.kind &&
        effect.sourceId === incoming.sourceId
      )
  );

  if (!existing) {
    return [...rest, incoming];
  }

  return [
    ...rest,
    {
      ...incoming,
      magnitude: Math.max(existing.magnitude, incoming.magnitude),
      remainingTicks: Math.max(existing.remainingTicks, incoming.remainingTicks)
    }
  ];
}

export function applyStatus(
  state: StatusState,
  application: StatusApplication,
  context: StatusContext
): StatusApplicationResult {
  const mode = context.mode ?? 'pve';

  if (
    mode === 'arena' &&
    state.strongControlImmunityTicks > 0 &&
    (application.kind === 'root' || application.kind === 'stun')
  ) {
    return { state, outcome: 'ignored' };
  }

  if (
    context.isBoss &&
    (application.kind === 'root' || application.kind === 'stun')
  ) {
    if (state.bossControlConversionImmunityTicks > 0) {
      return { state, outcome: 'ignored' };
    }

    const converted = normalizedStatus(
      {
        kind: 'vulnerable',
        sourceId: 'boss_control_conversion',
        magnitude: VULNERABLE_MAGNITUDE,
        durationTicks: BOSS_CONVERSION_VULNERABLE_TICKS
      },
      mode
    );

    return {
      outcome: 'converted',
      state: {
        ...state,
        effects: upsertEffect(state.effects, converted),
        bossControlConversionImmunityTicks: BOSS_CONVERSION_IMMUNITY_TICKS
      }
    };
  }

  const effect = normalizedStatus(application, mode);

  return {
    outcome: 'applied',
    state: {
      ...state,
      effects: upsertEffect(state.effects, effect)
    }
  };
}

export function stepStatuses(
  state: StatusState,
  mode: CombatMode = 'pve'
): StatusState {
  const hadStrongControl = hasStrongControl(state.effects);
  const effects = state.effects
    .map((effect) => ({
      ...effect,
      remainingTicks: effect.remainingTicks - 1
    }))
    .filter((effect) => effect.remainingTicks > 0);
  const hasStrongControlNow = hasStrongControl(effects);

  let strongControlImmunityTicks = Math.max(
    0,
    state.strongControlImmunityTicks - 1
  );

  if (
    mode === 'arena' &&
    hadStrongControl &&
    !hasStrongControlNow
  ) {
    strongControlImmunityTicks = ARENA_CONTROL_IMMUNITY_TICKS;
  }

  return {
    effects,
    bossControlConversionImmunityTicks: Math.max(
      0,
      state.bossControlConversionImmunityTicks - 1
    ),
    strongControlImmunityTicks
  };
}

function maxMagnitude(
  state: StatusState,
  kind: SharedStatusKind
): number {
  return state.effects
    .filter((effect) => effect.kind === kind)
    .reduce((max, effect) => Math.max(max, effect.magnitude), 0);
}

export function isRooted(state: StatusState): boolean {
  return state.effects.some((effect) => effect.kind === 'root');
}

export function isStunned(state: StatusState): boolean {
  return state.effects.some((effect) => effect.kind === 'stun');
}

export function hasVulnerable(state: StatusState): boolean {
  return state.effects.some((effect) => effect.kind === 'vulnerable');
}

export function getSlowMagnitude(state: StatusState): number {
  return maxMagnitude(state, 'slow');
}

export function getHasteMagnitude(state: StatusState): number {
  return maxMagnitude(state, 'haste');
}

export function getIncomingStatusMultiplier(state: StatusState): number {
  return hasVulnerable(state) ? 1 + VULNERABLE_MAGNITUDE : 1;
}

export function getStatusMovementMultiplier(state: StatusState): number {
  return (1 + getHasteMagnitude(state)) * (1 - getSlowMagnitude(state));
}

export function canApplyDisplacement(isBoss: boolean): boolean {
  return !isBoss;
}
