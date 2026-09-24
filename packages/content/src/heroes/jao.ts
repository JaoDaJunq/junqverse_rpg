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


export const JAO_W_DEFINITION = {
  id: 'jao_w',
  nameKey: 'jao_w_deducao',
  costFocus: 15,
  cooldownTicks: 600,
  windupTicks: 9,
  recoveryTicks: 9,
  target: 'self_area',
  radiusPx: 240,
  revealDurationTicks: 300,
  vulnerableDurationTicks: 180
} as const;

export const JAO_E_DEFINITION = {
  id: 'jao_e',
  nameKey: 'jao_e_corte_aurora',
  costFocus: 25,
  cooldownTicks: 420,
  windupTicks: 0,
  target: 'direction',
  coneAngleDegrees: 55,
  rangePx: 110,
  minChargeTicks: 12,
  maxChargeTicks: 60,
  recoveryTicks: 15,
  minBaseDamage: 40,
  maxBaseDamage: 80,
  movementMultiplierWhileCharging: 0.5,
  resonanceDetonator: true
} as const;

export const JAO_R_DEFINITION = {
  id: 'jao_r',
  nameKey: 'jao_r_campo_absoluto',
  ultimateChargeCost: 100,
  durationTicks: 360,
  windupTicks: 12,
  recoveryTicks: 12,
  hasteMagnitude: 0.20,
  eMaxChargeTicks: 12,
  basicCadenceMultiplier: 0.8,
  resetsQOnceOnActivation: true,
  worldTimeScale: 1
} as const;
