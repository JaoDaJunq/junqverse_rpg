import { describe, expect, it } from 'vitest';
import {
  JAO_E_DEFINITION,
  JAO_Q_DEFINITION,
  JAO_R_DEFINITION,
  JAO_W_DEFINITION
} from '../packages/content/src/index.js';
import {
  activateJaoUltimate,
  applyResonancePrimer,
  calculateJaoEBaseDamage,
  createCombatantState,
  createHealthState,
  createJaoBasicState,
  createJaoECharge,
  createJaoKitState,
  createJaoPassiveState,
  createResonanceState,
  createStatusState,
  createWorld,
  getIncomingStatusMultiplier,
  getJaoBasicCadenceTicks,
  getJaoEChargeMovementMultiplier,
  getJaoUltimateHasteMagnitude,
  hasResonanceMark,
  planJaoERelease,
  resolveJaoBasicAttack,
  resolveJaoERelease,
  resolveJaoWDeduction,
  startCooldown,
  stepJaoKitState,
  stepWorld,
  type JaoCombatTarget
} from '../packages/sim/src/index.js';

function target(entityId: number, x: number, y: number, health = 100): JaoCombatTarget {
  return {
    entityId,
    position: { x, y },
    radius: 12,
    health: createHealthState(health),
    status: createStatusState()
  };
}

describe('T013 Jão W E and ultimate', () => {
  it('keeps the documented W E R values', () => {
    expect(JAO_W_DEFINITION).toMatchObject({
      costFocus: 15,
      cooldownTicks: 600,
      radiusPx: 240,
      revealDurationTicks: 300,
      vulnerableDurationTicks: 180
    });
    expect(JAO_E_DEFINITION).toMatchObject({
      costFocus: 25,
      cooldownTicks: 420,
      minChargeTicks: 12,
      maxChargeTicks: 60,
      minBaseDamage: 40,
      maxBaseDamage: 80,
      coneAngleDegrees: 55,
      rangePx: 110,
      recoveryTicks: 15,
      chargeMovementMultiplier: 0.5
    });
    expect(JAO_R_DEFINITION).toMatchObject({
      ultimateCost: 100,
      durationTicks: 360,
      hasteMagnitude: 0.20,
      qResetCount: 1,
      eFullChargeTicks: 12,
      basicCadenceMultiplier: 0.8
    });
  });

  it('W reveals and applies vulnerable only inside its radius', () => {
    const result = resolveJaoWDeduction({
      origin: { x: 0, y: 0 },
      currentTick: 10,
      targets: [
        target(2, 100, 0),
        target(3, 300, 0)
      ]
    });

    expect(result.revealedTargetIds).toEqual([2]);
    expect(result.revealUntilTick).toBe(310);
    expect(getIncomingStatusMultiplier(result.targets[0]!.status)).toBe(1.15);
    expect(getIncomingStatusMultiplier(result.targets[1]!.status)).toBe(1);
  });

  it('plans early release at the minimum and normal full charge at one second', () => {
    const charge = createJaoECharge(100, { x: 1, y: 0 });

    expect(planJaoERelease(charge, 105, false)).toEqual({
      releaseTick: 112,
      chargeTicks: 12
    });
    expect(planJaoERelease(charge, 160, false)).toEqual({
      releaseTick: 160,
      chargeTicks: 60
    });
  });

  it('Campo Absoluto makes E reach full charge in 0.2 seconds', () => {
    const charge = createJaoECharge(100, { x: 1, y: 0 });

    expect(planJaoERelease(charge, 101, true)).toEqual({
      releaseTick: 112,
      chargeTicks: 60
    });
  });

  it('calculates exact minimum and maximum E base damage', () => {
    expect(calculateJaoEBaseDamage(12)).toBe(40);
    expect(calculateJaoEBaseDamage(60)).toBe(80);
    expect(calculateJaoEBaseDamage(36)).toBe(60);
  });

  it('E deals minimum and maximum charged damage', () => {
    const common = {
      ownerEntityId: 1,
      attackInstanceId: 'attack:e:0',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      currentTick: 10,
      rank: 1,
      blockers: [],
      passive: createJaoPassiveState()
    } as const;

    const minimum = resolveJaoERelease({
      ...common,
      chargeTicks: 12,
      targets: [target(2, 50, 0)],
      resonance: createResonanceState()
    });
    const maximum = resolveJaoERelease({
      ...common,
      attackInstanceId: 'attack:e:1',
      chargeTicks: 60,
      targets: [target(2, 50, 0)],
      resonance: createResonanceState()
    });

    expect(minimum.baseDamage).toBe(40);
    expect(minimum.targets[0]?.health.health).toBe(60);
    expect(maximum.baseDamage).toBe(80);
    expect(maximum.targets[0]?.health.health).toBe(20);
  });

  it('E detonates an existing resonance mark even when the combined hit is lethal', () => {
    const resonance = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    ).state;

    const result = resolveJaoERelease({
      ownerEntityId: 1,
      attackInstanceId: 'attack:e:detonate',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      chargeTicks: 12,
      currentTick: 1,
      rank: 1,
      blockers: [],
      targets: [target(2, 50, 0, 30)],
      registry: undefined,
      resonance,
      passive: createJaoPassiveState()
    });

    expect(result.explodedTargetIds).toContain(2);
    expect(result.targets[0]?.health.health).toBe(0);
    expect(hasResonanceMark(result.resonance, 2, 1)).toBe(false);
  });

  it('ultimate spends full charge and resets Q cooldown exactly once', () => {
    const initial = createCombatantState(1);
    const withQCooldown = {
      ...initial,
      resources: startCooldown(initial.resources, JAO_Q_DEFINITION.id, 300)
    };

    const first = activateJaoUltimate(
      createJaoKitState(100),
      withQCooldown,
      50
    );

    expect(first.accepted).toBe(true);
    expect(first.qResetApplied).toBe(true);
    expect(first.kit.ultimateCharge).toBe(0);
    expect(first.combatant.resources.cooldowns[JAO_Q_DEFINITION.id]).toBeUndefined();

    const qCoolingAgain = {
      ...first.combatant,
      resources: startCooldown(
        first.combatant.resources,
        JAO_Q_DEFINITION.id,
        200
      )
    };
    const forcedChargeWhileActive = {
      ...first.kit,
      ultimateCharge: 100
    };

    const invalidRecast = activateJaoUltimate(
      forcedChargeWhileActive,
      qCoolingAgain,
      60
    );

    expect(invalidRecast.accepted).toBe(false);
    expect(invalidRecast.reason).toBe('already_active');
    expect(invalidRecast.qResetApplied).toBe(false);
    expect(invalidRecast.combatant.resources.cooldowns[JAO_Q_DEFINITION.id]).toBe(200);
  });

  it('ultimate changes only Jão modifiers and never slows the world clock', () => {
    const activation = activateJaoUltimate(
      createJaoKitState(100),
      createCombatantState(1),
      0
    );

    expect(getJaoUltimateHasteMagnitude(activation.kit, 0)).toBe(0.2);
    expect(getJaoBasicCadenceTicks(activation.kit, 0)).toBe(27);

    const world = stepWorld(createWorld('jao_ultimate_clock', 1), [], 60).world;
    expect(world.tick).toBe(60);
  });

  it('basic actually uses the accelerated cadence while ultimate is active', () => {
    const activation = activateJaoUltimate(
      createJaoKitState(100),
      createCombatantState(1),
      0
    );

    const result = resolveJaoBasicAttack({
      state: createJaoBasicState(),
      currentTick: 0,
      ownerEntityId: 1,
      attackInstanceId: 'attack:basic:ult',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      rank: 1,
      blockers: [],
      targets: [target(2, 50, 0)],
      passive: createJaoPassiveState(),
      kit: activation.kit
    });

    expect(result.state.nextAllowedTick).toBe(27);
  });

  it('removes ultimate buff on death and keeps E charge movement at half speed', () => {
    const activation = activateJaoUltimate(
      createJaoKitState(100),
      createCombatantState(1),
      0
    );

    expect(stepJaoKitState(activation.kit, 1, false).ultimate).toBeNull();
    expect(getJaoEChargeMovementMultiplier()).toBe(0.5);
  });
});
