import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createCombatResources,
  createHealthState,
  createJaoUltimateState,
  startCooldown
} from '../packages/sim/src/index.js';
import {
  calculateHudLayout,
  cooldownSeconds,
  createHudSlots,
  createJaoHudSnapshot,
  formatBindingCode
} from '../apps/client/src/presentation/hud-model.js';
import {
  DEFAULT_BINDINGS,
  rebindInput
} from '../apps/client/src/input/bindings.js';

describe('T016 HUD model', () => {
  it('shows remapped keys in the corresponding ability slot', () => {
    const remapped = rebindInput(DEFAULT_BINDINGS, 'q', 'KeyQ');
    const slots = createHudSlots(remapped, {});

    expect(slots.find((slot) => slot.id === 'q')?.key).toBe('Q');
    expect(slots.find((slot) => slot.id === 'w')?.key).toBe('2');
    expect(formatBindingCode('Space')).toBe('␣');
  });

  it('exposes numeric cooldowns in seconds', () => {
    expect(cooldownSeconds(0)).toBe(0);
    expect(cooldownSeconds(1)).toBe(0.1);
    expect(cooldownSeconds(60)).toBe(1);
    expect(cooldownSeconds(61)).toBe(1.1);
  });

  it('maps actual combat state into the HUD snapshot', () => {
    let resources = createCombatResources(72);
    resources = startCooldown(resources, 'jao_q', 90);

    const snapshot = createJaoHudSnapshot({
      health: createHealthState(320, 0, 215),
      resources: {
        ...resources,
        dodgeCharges: 1,
        dodgeRechargeTicksRemaining: 120
      },
      ultimate: createJaoUltimateState(45),
      bindings: DEFAULT_BINDINGS,
      objective: 'Sobreviva ao encontro',
      targetLabel: 'ECO RASTEIRO',
      telegraphProgress: 0.5
    });

    expect(snapshot).toMatchObject({
      health: 215,
      maxHealth: 320,
      focus: 72,
      ultimateCharge: 45,
      dodgeCharges: 1,
      objective: 'Sobreviva ao encontro',
      targetLabel: 'ECO RASTEIRO',
      telegraphProgress: 0.5
    });
    expect(snapshot.slots[0]).toMatchObject({
      id: 'q',
      key: '1',
      cooldownTicks: 90
    });
  });

  for (const [width, height] of [[960, 540], [1280, 720]] as const) {
    it(`keeps the HUD inside ${width}x${height}`, () => {
      const layout = calculateHudLayout(width, height);
      const slotsRight =
        layout.slotsStartX +
        layout.slotSize * 4 +
        layout.slotGap * 3;

      expect(layout.resourceX).toBeGreaterThanOrEqual(0);
      expect(layout.resourceX + layout.resourceWidth).toBeLessThanOrEqual(width);
      expect(layout.resourceY).toBeGreaterThanOrEqual(0);
      expect(layout.slotsStartX).toBeGreaterThanOrEqual(0);
      expect(slotsRight).toBeLessThanOrEqual(width);
      expect(layout.slotsY).toBeGreaterThanOrEqual(0);
      expect(layout.slotsY + layout.slotSize).toBeLessThanOrEqual(height);
      expect(layout.dodgeX).toBeLessThanOrEqual(width);
      expect(layout.dodgeY).toBeLessThanOrEqual(height);
      expect(layout.telegraphX).toBeGreaterThan(0);
      expect(layout.telegraphX).toBeLessThan(width);
    });
  }

  it('keeps the combat HUD non-interactive', () => {
    const source = readFileSync(
      'apps/client/src/presentation/Hud.ts',
      'utf8'
    );

    expect(source).not.toContain('.setInteractive(');
    expect(source).not.toContain('pointerdown');
    expect(source).not.toContain('pointerup');
  });
});
