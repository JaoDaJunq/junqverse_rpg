import type { HealthState, CombatResources, JaoUltimateState } from '@junqverse/sim';
import type { InputBindings } from '../input/bindings.js';

export interface CombatHudSlot {
  readonly id: 'q' | 'w' | 'e' | 'r';
  readonly label: string;
  readonly key: string;
  readonly cooldownTicks: number;
}

export interface CombatHudSnapshot {
  readonly health: number;
  readonly maxHealth: number;
  readonly focus: number;
  readonly maxFocus: number;
  readonly ultimateCharge: number;
  readonly maxUltimateCharge: number;
  readonly dodgeCharges: number;
  readonly maxDodgeCharges: number;
  readonly slots: readonly CombatHudSlot[];
  readonly objective: string | null;
  readonly targetLabel: string | null;
  readonly telegraphProgress: number | null;
}

export interface HudLayout {
  readonly width: number;
  readonly height: number;
  readonly margin: number;
  readonly resourceX: number;
  readonly resourceY: number;
  readonly resourceWidth: number;
  readonly slotSize: number;
  readonly slotGap: number;
  readonly slotsStartX: number;
  readonly slotsY: number;
  readonly dodgeX: number;
  readonly dodgeY: number;
  readonly objectiveX: number;
  readonly objectiveY: number;
  readonly objectiveWidth: number;
  readonly telegraphX: number;
  readonly telegraphY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateHudLayout(width: number, height: number): HudLayout {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 640 || height < 360) {
    throw new RangeError('HUD viewport must be at least 640x360');
  }

  const margin = Math.round(clamp(width * 0.018, 14, 28));
  const slotSize = Math.round(clamp(height * 0.088, 44, 64));
  const slotGap = Math.round(clamp(width * 0.008, 7, 12));
  const slotsWidth = slotSize * 4 + slotGap * 3;

  return {
    width,
    height,
    margin,
    resourceX: margin,
    resourceY: height - margin - 56,
    resourceWidth: Math.round(clamp(width * 0.23, 210, 300)),
    slotSize,
    slotGap,
    slotsStartX: Math.round((width - slotsWidth) / 2),
    slotsY: height - margin - slotSize,
    dodgeX: width - margin,
    dodgeY: height - margin - 26,
    objectiveX: margin,
    objectiveY: margin + 58,
    objectiveWidth: Math.round(clamp(width * 0.38, 280, 500)),
    telegraphX: Math.round(width / 2),
    telegraphY: Math.round(clamp(height * 0.12, 54, 90))
  };
}

export function formatBindingCode(code: string): string {
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Key')) return code.slice(3);
  if (code === 'Space') return '␣';
  if (code.startsWith('Arrow')) return code.slice(5);
  return code;
}

export function cooldownSeconds(cooldownTicks: number): number {
  if (!Number.isInteger(cooldownTicks) || cooldownTicks < 0) {
    throw new RangeError('cooldownTicks must be a non-negative integer');
  }
  return cooldownTicks === 0 ? 0 : Math.ceil(cooldownTicks / 6) / 10;
}

export function createHudSlots(
  bindings: InputBindings,
  cooldowns: Readonly<Record<string, number>>
): readonly CombatHudSlot[] {
  return [
    { id: 'q', label: 'Passo', key: formatBindingCode(bindings.q), cooldownTicks: cooldowns.jao_q ?? 0 },
    { id: 'w', label: 'Dedução', key: formatBindingCode(bindings.w), cooldownTicks: cooldowns.jao_w ?? 0 },
    { id: 'e', label: 'Aurora', key: formatBindingCode(bindings.e), cooldownTicks: cooldowns.jao_e ?? 0 },
    { id: 'r', label: 'Campo', key: formatBindingCode(bindings.r), cooldownTicks: 0 }
  ];
}

export function createJaoHudSnapshot(input: {
  readonly health: HealthState;
  readonly resources: CombatResources;
  readonly ultimate: JaoUltimateState;
  readonly bindings: InputBindings;
  readonly objective?: string | null;
  readonly targetLabel?: string | null;
  readonly telegraphProgress?: number | null;
}): CombatHudSnapshot {
  return {
    health: input.health.health,
    maxHealth: input.health.maxHealth,
    focus: input.resources.focus,
    maxFocus: 100,
    ultimateCharge: input.ultimate.charge,
    maxUltimateCharge: 100,
    dodgeCharges: input.resources.dodgeCharges,
    maxDodgeCharges: 2,
    slots: createHudSlots(input.bindings, input.resources.cooldowns),
    objective: input.objective ?? null,
    targetLabel: input.targetLabel ?? null,
    telegraphProgress: input.telegraphProgress ?? null
  };
}
