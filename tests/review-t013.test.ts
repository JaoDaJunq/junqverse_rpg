import { describe, expect, it } from 'vitest';
import {
  addJaoUltimateCharge,
  applyStatus,
  clearJaoTransientBuffsOnDeath,
  createCombatantState,
  createCombatResources,
  createHealthState,
  createJaoECharge,
  createJaoPassiveState,
  createJaoRevealState,
  createJaoUltimateState,
  createResonanceState,
  createStatusState,
  createWorld,
  getJaoEMaxChargeTicks,
  getJaoHasteMagnitude,
  getJaoUltimateCastSpec,
  getJaoWorldTimeScale,
  isJaoUltimateActive,
  planJaoERelease,
  resolveJaoERelease,
  resolveJaoW,
  startCooldown,
  stepCombatant,
  stepStatuses,
  stepWorld,
  tryAcceptAbility,
  tryActivateJaoUltimate,
  type JaoCombatTarget
} from '../packages/sim/src/index.js';
import {
  JAO_R_DEFINITION
} from '../packages/content/src/index.js';
import {
  JAO_CAMPO_ABSOLUTO_PRESENTATION
} from '../apps/client/src/presentation/heroVfx.js';

function target(
  entityId: number,
  x: number,
  y: number,
  status = createStatusState()
): JaoCombatTarget {
  return {
    entityId,
    position: { x, y },
    radius: 12,
    health: createHealthState(100),
    status
  };
}

function stepStatusMany(
  status: ReturnType<typeof createStatusState>,
  ticks: number
) {
  let next = status;
  for (let index = 0; index < ticks; index += 1) {
    next = stepStatuses(next);
  }
  return next;
}

describe('T013 independent review', () => {
  it('keeps Campo Absoluto inactive during windup and active exactly after 12 ticks', () => {
    const result = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(100),
      resources: createCombatResources(),
      currentTick: 40
    });

    expect(result.accepted).toBe(true);
    expect(result.ultimate.activeFromTick).toBe(52);
    expect(result.ultimate.activeUntilTick).toBe(412);
    expect(isJaoUltimateActive(result.ultimate, 51)).toBe(false);
    expect(isJaoUltimateActive(result.ultimate, 52)).toBe(true);
    expect(isJaoUltimateActive(result.ultimate, 411)).toBe(true);
    expect(isJaoUltimateActive(result.ultimate, 412)).toBe(false);
  });

  it('runs Campo Absoluto through generic windup active and recovery phases', () => {
    const accepted = tryAcceptAbility(
      createCombatantState(5),
      getJaoUltimateCastSpec(),
      {
        targetValid: true,
        stunned: false
      }
    );

    expect(accepted.state.activeCast?.phase).toBe('windup');

    let combatant = accepted.state;
    for (let index = 0; index < JAO_R_DEFINITION.windupTicks; index += 1) {
      combatant = stepCombatant(combatant);
    }

    expect(combatant.activeCast?.phase).toBe('active');

    combatant = stepCombatant(combatant);
    expect(combatant.activeCast?.phase).toBe('recovery');
    expect(combatant.activeCast?.phaseTicksRemaining)
      .toBe(JAO_R_DEFINITION.recoveryTicks);

    for (let index = 0; index < JAO_R_DEFINITION.recoveryTicks; index += 1) {
      combatant = stepCombatant(combatant);
    }

    expect(combatant.activeCast).toBeNull();
  });

  it('snapshots fast E charge when accepted on the final active tick of Campo Absoluto', () => {
    const activated = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(100),
      resources: createCombatResources(),
      currentTick: 0
    });

    expect(isJaoUltimateActive(activated.ultimate, 371)).toBe(true);

    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'review:e:last_active_tick',
      startedAtTick: 371,
      direction: { x: 1, y: 0 },
      ultimate: activated.ultimate
    });

    expect(charge.maxChargeTicks).toBe(12);

    const plan = planJaoERelease({
      charge,
      requestedReleaseTick: 999
    });

    expect(plan.releaseTick).toBe(383);
    expect(plan.chargeTicks).toBe(12);
    expect(plan.baseDamage).toBe(80);
    expect(isJaoUltimateActive(activated.ultimate, plan.releaseTick)).toBe(false);
  });

  it('uses normal E charge when accepted after Campo Absoluto has expired', () => {
    const activated = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(100),
      resources: createCombatResources(),
      currentTick: 0
    });

    expect(getJaoEMaxChargeTicks(activated.ultimate, 372)).toBe(60);

    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'review:e:expired',
      startedAtTick: 372,
      direction: { x: 1, y: 0 },
      ultimate: activated.ultimate
    });

    expect(charge.maxChargeTicks).toBe(60);
  });

  it('refreshes W reveal and vulnerable without stacking duplicate effects', () => {
    const first = resolveJaoW({
      currentTick: 0,
      origin: { x: 0, y: 0 },
      reveal: createJaoRevealState(),
      targets: [target(2, 100, 0)],
      revealables: []
    });

    const progressedStatus = stepStatusMany(first.targets[0]!.status, 100);

    const second = resolveJaoW({
      currentTick: 100,
      origin: { x: 0, y: 0 },
      reveal: first.reveal,
      targets: [target(2, 100, 0, progressedStatus)],
      revealables: []
    });

    const vulnerable = second.targets[0]!.status.effects.filter(
      (effect) => effect.kind === 'vulnerable'
    );
    const enemyReveal = second.reveal.entries.filter(
      (entry) => entry.id === 'enemy:2'
    );

    expect(vulnerable).toHaveLength(1);
    expect(vulnerable[0]?.remainingTicks).toBe(180);
    expect(enemyReveal).toHaveLength(1);
    expect(enemyReveal[0]?.expiresAtTick).toBe(400);
  });

  it('keeps clue and trap with the same raw id as separate reveal entries', () => {
    const result = resolveJaoW({
      currentTick: 0,
      origin: { x: 0, y: 0 },
      reveal: createJaoRevealState(),
      targets: [],
      revealables: [
        { id: 'shared', kind: 'clue', position: { x: 10, y: 0 } },
        { id: 'shared', kind: 'trap', position: { x: 20, y: 0 } }
      ]
    });

    expect(result.reveal.entries.map((entry) => entry.id)).toEqual([
      'clue:shared',
      'trap:shared'
    ]);
  });

  it('locks E direction at charge acceptance even if a later aim would differ', () => {
    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'review:e:locked_aim',
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
        target(2, 80, 0),
        target(3, 0, 80)
      ],
      passive: createJaoPassiveState(),
      resonance: createResonanceState()
    });

    expect(result.hitTargetIds).toEqual([2]);
  });

  it('does not let E hit through a wall', () => {
    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'review:e:wall',
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
      blockers: [{ x: 40, y: -20, width: 5, height: 40 }],
      targets: [target(2, 80, 0)],
      passive: createJaoPassiveState(),
      resonance: createResonanceState()
    });

    expect(result.hitTargetIds).toEqual([]);
    expect(result.targets[0]?.health.health).toBe(100);
  });

  it('does not reset Q when ultimate charge is insufficient', () => {
    const resources = startCooldown(
      createCombatResources(),
      'jao_q',
      222
    );

    const result = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(99),
      resources,
      currentTick: 0
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('insufficient_charge');
    expect(result.qResetApplied).toBe(false);
    expect(result.resources.cooldowns.jao_q).toBe(222);
  });

  it('does not reset Q again while the ultimate is committed but still in windup', () => {
    const first = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(100),
      resources: startCooldown(
        createCombatResources(),
        'jao_q',
        300
      ),
      currentTick: 0
    });

    const withChargeAgain = addJaoUltimateCharge(
      first.ultimate,
      100
    );
    const resourcesWithQAgain = startCooldown(
      first.resources,
      'jao_q',
      180
    );

    const recast = tryActivateJaoUltimate({
      ultimate: withChargeAgain,
      resources: resourcesWithQAgain,
      currentTick: 1
    });

    expect(recast.accepted).toBe(false);
    expect(recast.qResetApplied).toBe(false);
    expect(recast.resources.cooldowns.jao_q).toBe(180);
  });

  it('does not alter the authoritative world clock or enemy presentation speed', () => {
    const world = stepWorld(
      createWorld('review_campo_clock', 123),
      [],
      360
    ).world;

    expect(world.tick).toBe(360);
    expect(getJaoWorldTimeScale()).toBe(1);
    expect(JAO_CAMPO_ABSOLUTO_PRESENTATION.worldTimeScale).toBe(1);
    expect(JAO_CAMPO_ABSOLUTO_PRESENTATION.enemyTimeScale).toBe(1);

    const activated = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(100),
      resources: createCombatResources(),
      currentTick: 0
    });
    const shared = applyStatus(createStatusState(), {
      kind: 'haste',
      sourceId: 'review_shared',
      magnitude: 0.15,
      durationTicks: 180
    }, { isBoss: false }).state;

    expect(getJaoHasteMagnitude(activated.ultimate, shared, 12)).toBe(0.2);
  });

  it('clears pending or active local Campo state and E charge on death', () => {
    const activated = tryActivateJaoUltimate({
      ultimate: createJaoUltimateState(100),
      resources: createCombatResources(),
      currentTick: 0
    });
    const charge = createJaoECharge({
      ownerEntityId: 1,
      attackInstanceId: 'review:e:death',
      startedAtTick: 12,
      direction: { x: 1, y: 0 },
      ultimate: activated.ultimate
    });

    const cleared = clearJaoTransientBuffsOnDeath({
      ultimate: activated.ultimate,
      eCharge: charge
    });

    expect(cleared.ultimate.activeFromTick).toBeNull();
    expect(cleared.ultimate.activeUntilTick).toBeNull();
    expect(cleared.eCharge).toBeNull();
  });
});
