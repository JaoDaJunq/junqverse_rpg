export const ENEMY_AI_DECISION_INTERVAL_TICKS = 6;

export const ECO_RASTEIRO_DEFINITION = {
  id: 'eco_rasteiro',
  maxHealth: 70,
  armor: 0,
  baseDamage: 12,
  speedPxPerSecond: 95,
  telegraphTicks: 39,
  cooldownTicks: 90,
  attackFamilyId: 'eco_rasteiro_cone',
  attackKind: 'cone',
  attackRangePx: 48
} as const;

export const ECO_ATIRADOR_DEFINITION = {
  id: 'eco_atirador',
  maxHealth: 80,
  armor: 0,
  baseDamage: 14,
  speedPxPerSecond: 60,
  telegraphTicks: 54,
  cooldownTicks: 132,
  attackFamilyId: 'eco_atirador_shot',
  attackKind: 'projectile',
  projectileSpeedPxPerSecond: 300
} as const;

export const P0_ENEMY_DEFINITIONS = {
  eco_rasteiro: ECO_RASTEIRO_DEFINITION,
  eco_atirador: ECO_ATIRADOR_DEFINITION
} as const;

export type P0EnemyArchetype = keyof typeof P0_ENEMY_DEFINITIONS;
