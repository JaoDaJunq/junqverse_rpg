import { describe, expect, it } from 'vitest';
import {
  JAO_E_DEFINITION,
  JAO_R_DEFINITION,
  JAO_W_DEFINITION
} from '../packages/content/src/index.js';
import {
  addJaoUltimateCharge,
  applyResonancePrimer,
  applyStatus,
  clearJaoTransientBuffsOnDeath,
  createCombatantState,
  createCombatResources,
  createHealthState,
  createJaoBasicState,
  createJaoECharge,
  createJaoPassiveState,
  createJaoRevealState,
  createJaoUltimateState,
  createResonanceState,
  createStatusState,
  getHasteMagnitude,
  getJaoBasicCadenceTicks,
  getJaoEBaseDamage,
  getJaoEChargeMovementMultiplier,
  getJaoHasteMagnitude,
  getJaoWorldTimeScale,
  hasResonanceMark,
  isJaoUltimateActive,
  planJaoERelease,
  pruneJaoRevealState,
  resolveJaoBasicAttack,
  resolveJaoERelease,
  resolveJaoW,
  startCooldown,
  tryAcceptAbility,
  tryActivateJaoUltimate,
  type JaoCombatTarget
} from '../packages/sim/src/index.js';
import { JAO_CAMPO_ABSOLUTO_PRESENTATION } from '../apps/client/src/presentation/heroVfx.js';

function target(
  entityId: number,
  x: number,
  y: number,
  options: {
    invulnerable?: boolean;
    isBoss?: boolean;
  } = {}
): JaoCombatTarget {
  return {
    entityId,
    position: { x, y },
    radius: 12,
    health: createHealthState(100),
    status: createStatusState(),
    ...(options.invulnerable === undefined
      ? {}
      : { invulnerable: options.invulnerable }),
    ...(options.isBoss === undefined ? {} : { isBoss: options.isBoss })
  };
}

describe('T013 Jão W E and Campo Absoluto', () => {
  it('keeps documented W E and R values', () => {
    expect(JAO_W_DEFINITION).toMatchObject({
      costFocus: 15,
      cooldownTicks: 600,
      windupTicks: 9,
      recoveryTicks: 9,
      radiusPx: 240,
      revealDurationTicks: 300,
      vulnerableDurationTicks: 180
    });

    expect(JAO_E_DEFINITION).toMatchObject({
      costFocus: 25,
      cooldownTicks: 420,
      coneAngleDegrees: 55,
      rangePx: 110,
      minChargeTicks: 12,
      maxChargeTicks: 60,
      recoveryTicks: 15,
      minBaseDamage: 40,
      maxBaseDamage: 80,
      movementMultiplierWhileCharging: 0.5
    });

    expect(JAO_R_DEFINITION).toMatchObject({
      ultimateChargeCost: 100,
      durationTicks: 360,
      hasteMagnitude: 0.2,
      eMaxChargeTicks: 12,
      basicCadenceMultiplier: 0.8,
      worldTimeScale: 1
    });
  });

  it('W reveals enemies objects and applies vulnerable inside radius', () => {
    const result = resolveJaoW({
      currentTick: 10,
      origin: { x: 0, y: 0 },
      reveal: createJaoRevealState(),
      targets: [
        target(2, 240, 0),
        target(3, 241, 0)
      ],
      revealables: [
        { id: 'clue_a', kind: 'clue', position: { x: 100, y: 0 } },
        { id: 'trap_a', kind: 'trap', position: { x: 200, y: 0 } },
        { id: 'clue_far', kind: 'clue', position: { x: 300, y: 0 } }
      ]
    });

    expect(result.revealedEnemyIds).toEqual([2]);
    expect(result.revealedObjectIds).toEqual(['clue_a', 'trap_a']);

    const inside = result.targets.find((item) => item.entityId === 2)!;
    const outside = result.targets.find((item) => item.entityId === 3)!;

    expect(inside.status.effects.some((effect) => effect.kind === 'vulnerable')).toBe(true);
    expect(outside.status.effects).toEqual([]);

    expect(result.reveal.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'enemy:2',
        kind: 'enemy',
        expiresAtTick: 310
      }),
      expect.objectContaining({
        id: 'clue:clue_a',
        kind: 'clue',
        expiresAtTick: 310
      }),
      expect.objectContaining({
        id: 'trap:trap_a',
        kind: 'trap',
        expiresAtTick: 310
      })
    ]));
  });

  it('W still reveals an invulnerable target but does not apply vulnerable', () => {
    const result = resolveJaoW({
      currentTick: 0,
      origin: { x: 0, y: 0 },
      reveal: createJaoRevealState(),
      targets: [target(2, 100, 0, { invulnerable: true })],
      revealables: []
    });

    expect(result.revealedEnemyIds).toEqual([2]);
    expect(result.targets[0]?.status.effects).toEqual([]);
  });

  it('prunes reveal entries at exactly their expiry tick', () => {
    const revealed = resolveJaoW({
      currentTick: 50,
      origin: { x: 0, y: 0 },
      reveal: createJaoRevealState(),
      targets: [target(2, 100, 0)],
      revealables: []
    });

    expect(pruneJaoRevealState(revealed.reveal, 349).entries).toHaveLength(1);
    expect(pruneJaoRevealState(revealed.reveal, 350).entries).toEqual([]);
  });

  it('plans E early release at minimum charge and late release at maximum', () => {
    const inactive = createJaoUltimateState();

    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'attack:e:0',
      startedAtTick: 100,
      direction: { x: 1, y: 0 },
      ultimate: inactive
    });

    const early = planJaoERelease({
      charge,
      requestedReleaseTick: 105
    });
    expect(early.releaseTick).toBe(112);
    expect(early.chargeTicks).toBe(12);
    expect(early.baseDamage).toBe(40);

    const full = planJaoERelease({
      charge,
      requestedReleaseTick: 200
    });
    expect(full.releaseTick).toBe(160);
    expect(full.chargeTicks).toBe(60);
    expect(full.baseDamage).toBe(80);
  });

  it('interpolates E damage linearly between minimum and maximum charge', () => {
    expect(getJaoEBaseDamage(12)).toBe(40);
    expect(getJaoEBaseDamage(36)).toBe(60);
    expect(getJaoEBaseDamage(60)).toBe(80);
  });

  it('Campo Absoluto snapshots E max charge at 12 ticks on charge acceptance', () => {
    const activated = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(100),
      resources: createCombatResources(),
      currentTick: 100
    });

    expect(activated.accepted).toBe(true);

    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'attack:e:campo',
      startedAtTick: 200,
      direction: { x: 1, y: 0 },
      ultimate: activated.ultimate
    });

    expect(charge.maxChargeTicks).toBe(12);

    const plan = planJaoERelease({
      charge,
      requestedReleaseTick: 999
    });

    expect(plan.releaseTick).toBe(212);
    expect(plan.chargeTicks).toBe(12);
    expect(plan.baseDamage).toBe(80);
  });

  it('E minimum charge damages and detonates an existing Resonance mark', () => {
    const primed = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    ).state;

    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'attack:e:detonate',
      startedAtTick: 0,
      direction: { x: 1, y: 0 },
      ultimate: createJaoUltimateState()
    });
    const plan = planJaoERelease({
      charge,
      requestedReleaseTick: 12
    });

    const result = resolveJaoERelease({
      plan,
      currentTick: 12,
      origin: { x: 0, y: 0 },
      rank: 1,
      blockers: [],
      targets: [target(2, 80, 0)],
      passive: createJaoPassiveState(),
      resonance: primed
    });

    expect(result.hitTargetIds).toEqual([2]);
    expect(result.targets[0]?.health.health).toBe(35);
    expect(hasResonanceMark(result.resonance, 2, 12)).toBe(false);
    expect(result.targets[0]?.status.effects.some(
      (effect) => effect.kind === 'slow' && effect.magnitude === 0.2
    )).toBe(true);
  });

  it('E does not detonate a mark when direct damage is blocked by invulnerability', () => {
    const primed = applyResonancePrimer(
      createResonanceState(),
      2,
      0
    ).state;

    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'attack:e:blocked',
      startedAtTick: 0,
      direction: { x: 1, y: 0 },
      ultimate: createJaoUltimateState()
    });

    const result = resolveJaoERelease({
      plan: planJaoERelease({
        charge,
        requestedReleaseTick: 12
      }),
      currentTick: 12,
      origin: { x: 0, y: 0 },
      rank: 1,
      blockers: [],
      targets: [target(2, 80, 0, { invulnerable: true })],
      passive: createJaoPassiveState(),
      resonance: primed
    });

    expect(result.targets[0]?.health.health).toBe(100);
    expect(hasResonanceMark(result.resonance, 2, 12)).toBe(true);
  });

  it('E cannot resolve before its planned minimum release tick', () => {
    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'attack:e:too_early',
      startedAtTick: 50,
      direction: { x: 1, y: 0 },
      ultimate: createJaoUltimateState()
    });
    const plan = planJaoERelease({
      charge,
      requestedReleaseTick: 51
    });

    expect(() => resolveJaoERelease({
      plan,
      currentTick: 61,
      origin: { x: 0, y: 0 },
      rank: 1,
      blockers: [],
      targets: [target(2, 80, 0)],
      passive: createJaoPassiveState(),
      resonance: createResonanceState()
    })).toThrow('not ready');
  });

  it('Campo Absoluto consumes 100 charge and resets Q only once', () => {
    const withQCooldown = startCooldown(
      createCombatResources(),
      'jao_q',
      360
    );

    const first = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(100),
      resources: withQCooldown,
      currentTick: 10
    });

    expect(first.accepted).toBe(true);
    expect(first.qResetApplied).toBe(true);
    expect(first.ultimate.charge).toBe(0);
    expect(first.resources.cooldowns.jao_q).toBeUndefined();

    const resourcesWithQAgain = startCooldown(
      first.resources,
      'jao_q',
      300
    );
    const refilledWhileActive = addJaoUltimateCharge(
      first.ultimate,
      100
    );
    const invalidRecast = tryActivateJaoUltimate({
      ultimate: refilledWhileActive,
      resources: resourcesWithQAgain,
      currentTick: 20
    });

    expect(invalidRecast.accepted).toBe(false);
    expect(invalidRecast.reason).toBe('already_active');
    expect(invalidRecast.qResetApplied).toBe(false);
    expect(invalidRecast.resources.cooldowns.jao_q).toBe(300);
  });

  it('Campo Absoluto uses local hero modifiers without slowing world or enemies', () => {
    const activated = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(100),
      resources: createCombatResources(),
      currentTick: 0
    });

    let sharedStatus = createStatusState();
    sharedStatus = applyStatus(sharedStatus, {
      kind: 'haste',
      sourceId: 'shared_haste',
      magnitude: 0.15,
      durationTicks: 180
    }, { isBoss: false }).state;

    expect(getHasteMagnitude(sharedStatus)).toBe(0.15);
    expect(getJaoHasteMagnitude(
      activated.ultimate,
      sharedStatus,
      1
    )).toBe(0.2);

    expect(getJaoBasicCadenceTicks(activated.ultimate, 1)).toBe(27);
    expect(getJaoWorldTimeScale()).toBe(1);
    expect(JAO_CAMPO_ABSOLUTO_PRESENTATION.worldTimeScale).toBe(1);
    expect(JAO_CAMPO_ABSOLUTO_PRESENTATION.enemyTimeScale).toBe(1);
  });

  it('basic can consume the ultimate-adjusted cadence deterministically', () => {
    const activated = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(100),
      resources: createCombatResources(),
      currentTick: 0
    });
    const cadence = getJaoBasicCadenceTicks(
      activated.ultimate,
      1
    );

    const result = resolveJaoBasicAttack({
      state: createJaoBasicState(),
      currentTick: 1,
      ownerEntityId: 1,
      attackInstanceId: 'attack:basic:campo',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      rank: 1,
      blockers: [],
      targets: [target(2, 50, 0)],
      passive: createJaoPassiveState(),
      cadenceTicks: cadence
    });

    expect(result.state.nextAllowedTick).toBe(28);
  });

  it('ultimate expires exactly at duration and clears local buffs on death', () => {
    const activated = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(100),
      resources: createCombatResources(),
      currentTick: 100
    });

    expect(isJaoUltimateActive(activated.ultimate, 459)).toBe(true);
    expect(isJaoUltimateActive(activated.ultimate, 460)).toBe(false);

    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'attack:e:death',
      startedAtTick: 110,
      direction: { x: 1, y: 0 },
      ultimate: activated.ultimate
    });

    const cleared = clearJaoTransientBuffsOnDeath({
      ultimate: activated.ultimate,
      eCharge: charge
    });

    expect(cleared.ultimate.activeUntilTick).toBeNull();
    expect(cleared.eCharge).toBeNull();
  });


  it('W and E use the generic focus and cooldown acceptance rules', () => {
    const combatant = createCombatantState(1);

    const w = tryAcceptAbility(combatant, {
      ability: JAO_W_DEFINITION
    }, {
      targetValid: true,
      stunned: false
    });

    expect(w.accepted).toBe(true);
    expect(w.state.resources.focus).toBe(85);
    expect(w.state.resources.cooldowns.jao_w).toBe(600);

    const e = tryAcceptAbility(
      createCombatantState(2),
      {
        ability: JAO_E_DEFINITION
      },
      {
        targetValid: true,
        stunned: false
      }
    );

    expect(e.accepted).toBe(true);
    expect(e.state.resources.focus).toBe(75);
    expect(e.state.resources.cooldowns.jao_e).toBe(420);
  });

  it('a lethal E hit still consumes the mark and explodes around the primary target', () => {
    let resonance = createResonanceState();
    resonance = applyResonancePrimer(resonance, 2, 0).state;

    const lowHealthPrimary: JaoCombatTarget = {
      ...target(2, 80, 0),
      health: createHealthState(100, 0, 30)
    };

    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'attack:e:lethal',
      startedAtTick: 0,
      direction: { x: 1, y: 0 },
      ultimate: createJaoUltimateState()
    });

    const result = resolveJaoERelease({
      plan: planJaoERelease({
        charge,
        requestedReleaseTick: 12
      }),
      currentTick: 12,
      origin: { x: 0, y: 0 },
      rank: 1,
      blockers: [],
      targets: [
        lowHealthPrimary,
        target(3, 100, 0)
      ],
      passive: createJaoPassiveState(),
      resonance
    });

    expect(result.targets.find((item) => item.entityId === 2)?.health.alive).toBe(false);
    expect(hasResonanceMark(result.resonance, 2, 12)).toBe(false);
    expect(result.targets.find((item) => item.entityId === 3)?.health.health).toBe(75);
  });

  it('charging E uses half movement speed', () => {
    expect(getJaoEChargeMovementMultiplier()).toBe(0.5);
  });
});
