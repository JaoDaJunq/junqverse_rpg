import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calculateHudLayout,
  cooldownSeconds,
  createHudSlots,
  createJaoHudSnapshot
} from '../apps/client/src/presentation/hud-model.js';
import {
  DEFAULT_BINDINGS,
  rebindInput
} from '../apps/client/src/input/bindings.js';
import {
  createCombatResources,
  createHealthState,
  createJaoUltimateState,
  startCooldown
} from '../packages/sim/src/index.js';

describe('T016 independent review', () => {
  it('keeps all major HUD regions inside the required viewports', () => {
    for (const [width, height] of [[960, 540], [1280, 720]] as const) {
      const layout = calculateHudLayout(width, height);
      const slotsRight =
        layout.slotsStartX +
        layout.slotSize * 4 +
        layout.slotGap * 3;

      expect(layout.resourceX).toBeGreaterThanOrEqual(0);
      expect(layout.resourceY).toBeGreaterThanOrEqual(0);
      expect(layout.resourceX + layout.resourceWidth).toBeLessThanOrEqual(width);
      expect(layout.slotsStartX).toBeGreaterThanOrEqual(0);
      expect(slotsRight).toBeLessThanOrEqual(width);
      expect(layout.slotsY + layout.slotSize).toBeLessThanOrEqual(height);
      expect(layout.dodgeX).toBeLessThanOrEqual(width);
      expect(layout.dodgeY).toBeLessThanOrEqual(height);
      expect(layout.objectiveX + layout.objectiveWidth).toBeLessThanOrEqual(width);
    }
  });

  it('reflects current remapped bindings and cooldowns', () => {
    let resources = createCombatResources(55);
    resources = startCooldown(resources, 'jao_q', 361);
    resources = startCooldown(resources, 'jao_e', 1);

    const bindings = rebindInput(
      rebindInput(DEFAULT_BINDINGS, 'q', 'KeyQ'),
      'e',
      'KeyE'
    );

    const snapshot = createJaoHudSnapshot({
      health: createHealthState(320, 0, 201),
      resources,
      ultimate: createJaoUltimateState(66),
      bindings,
      targetLabel: 'ECO ATIRADOR',
      telegraphProgress: 0.75
    });

    expect(snapshot.slots.find((slot) => slot.id === 'q')).toMatchObject({
      key: 'Q',
      cooldownTicks: 361
    });
    expect(snapshot.slots.find((slot) => slot.id === 'e')).toMatchObject({
      key: 'E',
      cooldownTicks: 1
    });
    expect(cooldownSeconds(361)).toBe(6.1);
    expect(cooldownSeconds(1)).toBe(0.1);
    expect(snapshot.targetLabel).toBe('ECO ATIRADOR');
    expect(snapshot.telegraphProgress).toBe(0.75);
  });

  it('keeps HUD presentation non-interactive', () => {
    const source = readFileSync(
      'apps/client/src/presentation/Hud.ts',
      'utf8'
    );

    expect(source).not.toContain('.setInteractive(');
    expect(source).not.toContain("on('pointer");
    expect(source).not.toContain('addEventListener');
  });

  it('keeps T015 defeat flow and HUD in the same scene cleanup', () => {
    const source = readFileSync(
      'apps/client/src/scenes/ExpeditionScene.ts',
      'utf8'
    );

    expect(source).toContain("import { Hud }");
    expect(source).toContain("import { DefeatPanel }");
    expect(source).toContain('this.hud?.destroy()');
    expect(source).toContain('this.defeatPanel?.destroy()');
    expect(source).toContain('this.session.restart()');
  });

  it('creates exactly four ability slots', () => {
    const slots = createHudSlots(DEFAULT_BINDINGS, {});
    expect(slots.map((slot) => slot.id)).toEqual(['q', 'w', 'e', 'r']);
  });
});
