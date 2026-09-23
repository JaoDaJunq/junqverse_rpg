export const MAX_FOCUS = 100;
export const FOCUS_REGEN_DELAY_TICKS = 60;
export const FOCUS_REGEN_INTERVAL_TICKS = 6;

export const MAX_DODGE_CHARGES = 2;
export const DODGE_RECHARGE_TICKS = 240;
export const DODGE_DURATION_TICKS = 12;
export const DODGE_INVULNERABLE_START_TICK = 2;
export const DODGE_INVULNERABLE_END_TICK = 8;

export interface CombatResources {
  readonly focus: number;
  readonly focusRegenDelayTicks: number;
  readonly focusRegenProgressTicks: number;
  readonly cooldowns: Readonly<Record<string, number>>;
  readonly dodgeCharges: number;
  readonly dodgeRechargeTicksRemaining: number | null;
}

function assertStableId(id: string, name: string): void {
  if (!/^[a-z0-9_:-]{1,96}$/.test(id) || id === '__proto__') {
    throw new RangeError(`${name} must be a valid stable id`);
  }
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

export function createCombatResources(focus = MAX_FOCUS): CombatResources {
  assertNonNegativeInteger(focus, 'focus');
  if (focus > MAX_FOCUS) {
    throw new RangeError('focus cannot exceed MAX_FOCUS');
  }

  return {
    focus,
    focusRegenDelayTicks: 0,
    focusRegenProgressTicks: 0,
    cooldowns: {},
    dodgeCharges: MAX_DODGE_CHARGES,
    dodgeRechargeTicksRemaining: null
  };
}

export function isAbilityOnCooldown(
  resources: CombatResources,
  abilityId: string
): boolean {
  assertStableId(abilityId, 'abilityId');
  return (resources.cooldowns[abilityId] ?? 0) > 0;
}

export function spendFocus(
  resources: CombatResources,
  amount: number
): { readonly accepted: boolean; readonly resources: CombatResources } {
  assertNonNegativeInteger(amount, 'focus cost');

  if (resources.focus < amount) {
    return { accepted: false, resources };
  }

  if (amount === 0) {
    return { accepted: true, resources };
  }

  return {
    accepted: true,
    resources: {
      ...resources,
      focus: resources.focus - amount,
      focusRegenDelayTicks: FOCUS_REGEN_DELAY_TICKS,
      focusRegenProgressTicks: 0
    }
  };
}

export function startCooldown(
  resources: CombatResources,
  abilityId: string,
  cooldownTicks: number
): CombatResources {
  assertStableId(abilityId, 'abilityId');
  assertNonNegativeInteger(cooldownTicks, 'cooldownTicks');

  if (cooldownTicks === 0) {
    const { [abilityId]: _removed, ...rest } = resources.cooldowns;
    return {
      ...resources,
      cooldowns: rest
    };
  }

  return {
    ...resources,
    cooldowns: {
      ...resources.cooldowns,
      [abilityId]: cooldownTicks
    }
  };
}

export function spendDodgeCharge(
  resources: CombatResources
): { readonly accepted: boolean; readonly resources: CombatResources } {
  if (resources.dodgeCharges <= 0) {
    return { accepted: false, resources };
  }

  return {
    accepted: true,
    resources: {
      ...resources,
      dodgeCharges: resources.dodgeCharges - 1,
      dodgeRechargeTicksRemaining:
        resources.dodgeRechargeTicksRemaining ?? DODGE_RECHARGE_TICKS
    }
  };
}

export function stepCombatResources(resources: CombatResources): CombatResources {
  const cooldowns: Record<string, number> = {};

  for (const [abilityId, remaining] of Object.entries(resources.cooldowns)) {
    assertNonNegativeInteger(remaining, `cooldown ${abilityId}`);
    if (remaining > 1) {
      cooldowns[abilityId] = remaining - 1;
    }
  }

  let focus = resources.focus;
  let focusRegenDelayTicks = resources.focusRegenDelayTicks;
  let focusRegenProgressTicks = resources.focusRegenProgressTicks;

  if (focus < MAX_FOCUS) {
    if (focusRegenDelayTicks > 0) {
      focusRegenDelayTicks -= 1;
    } else {
      focusRegenProgressTicks += 1;
      if (focusRegenProgressTicks >= FOCUS_REGEN_INTERVAL_TICKS) {
        focus = Math.min(MAX_FOCUS, focus + 1);
        focusRegenProgressTicks = 0;
      }
    }
  } else {
    focusRegenDelayTicks = 0;
    focusRegenProgressTicks = 0;
  }

  let dodgeCharges = resources.dodgeCharges;
  let dodgeRechargeTicksRemaining = resources.dodgeRechargeTicksRemaining;

  if (dodgeCharges < MAX_DODGE_CHARGES && dodgeRechargeTicksRemaining !== null) {
    if (dodgeRechargeTicksRemaining > 1) {
      dodgeRechargeTicksRemaining -= 1;
    } else {
      dodgeCharges += 1;
      dodgeRechargeTicksRemaining =
        dodgeCharges < MAX_DODGE_CHARGES ? DODGE_RECHARGE_TICKS : null;
    }
  } else if (dodgeCharges >= MAX_DODGE_CHARGES) {
    dodgeRechargeTicksRemaining = null;
  }

  return {
    focus,
    focusRegenDelayTicks,
    focusRegenProgressTicks,
    cooldowns,
    dodgeCharges,
    dodgeRechargeTicksRemaining
  };
}
