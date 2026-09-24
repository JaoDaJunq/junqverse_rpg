export const JAO_BASE_STATS = {
  heroId: 'jao',
  maxHealth: 320,
  speedPxPerSecond: 180,
  colliderRadiusPx: 12
} as const;

export const JAO_PASSIVE_DEFINITION = {
  observeRangePx: 300,
  repeatWindowTicks: 360,
  analyzedDurationTicks: 300,
  analyzedOutgoingMultiplier: 1.10
} as const;

export const JAO_BASIC_DEFINITION = {
  id: 'jao_basic',
  baseDamage: 26,
  coneAngleDegrees: 80,
  rangePx: 60,
  cadenceTicks: 33,
  windupTicks: 8,
  recoveryTicks: 11
} as const;

export const JAO_Q_DEFINITION = {
  id: 'jao_q',
  nameKey: 'jao_q_passo_relampago',
  costFocus: 20,
  cooldownTicks: 360,
  windupTicks: 0,
  recoveryTicks: 9,
  target: 'direction',
  rangePx: 160,
  dashDurationTicks: 11,
  baseDamage: 32,
  appliesResonancePrimer: true,
  grantsInvulnerability: false
} as const;
