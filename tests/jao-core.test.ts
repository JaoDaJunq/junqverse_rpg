import { describe, expect, it } from 'vitest';
import {
  JAO_BASIC_DEFINITION,
  JAO_PASSIVE_DEFINITION,
  JAO_Q_DEFINITION
} from '../packages/content/src/index.js';
import {
  applyShield,
  createHealthState,
  createJaoBasicState,
  createJaoPassiveState,
  createResonanceState,
  createStatusState,
  getJaoOutgoingMultiplier,
  hasResonanceMark,
  isJaoTargetAnalyzed,
  observeJaoEnemyAction,
  resolveJaoBasicAttack,
  resolveJaoQDash,
  type JaoCombatTarget
} from '../packages/sim/src/index.js';
import {
  createJaoReadingTestRoom,
  observeJaoTestRoomEnemyAction
} from '../packages/sim/src/testing/jao-reading-room.js';

function target(
  entityId: number,
  x: number,
  y: number
): JaoCombatTarget {
  return {
    entityId,
    position: { x, y },
    radius: 12,
    health: createHealthState(100),
    status: createStatusState()
  };
}

describe('T012 Jão basic passive and Q', () => {
  it('keeps the documented basic and Q timings/numbers', () => {
    expect(JAO_BASIC_DEFINITION).toMatchObject({
      baseDamage: 26,
      coneAngleDegrees: 80,
      rangePx: 60,
      cadenceTicks: 33,
      windupTicks: 8,
      recoveryTicks: 11
    });

    expect(JAO_Q_DEFINITION).toMatchObject({
      costFocus: 20,
      cooldownTicks: 360,
      recoveryTicks: 9,
      rangePx: 160,
      dashDurationTicks: 11,
      baseDamage: 32,
      appliesResonancePrimer: true,
      grantsInvulnerability: false
    });
  });

  it('does not count multiple projectiles from the same enemyActionId as repetitions', () => {
    let room = createJaoReadingTestRoom();

    let observed = observeJaoTestRoomEnemyAction(room, 'enemy_attack:1', 0);
    room = observed.state;
    expect(observed.analyzedApplied).toBe(false);

    for (const tick of [1, 2, 3, 30]) {
      observed = observeJaoTestRoomEnemyAction(room, 'enemy_attack:1', tick);
      room = observed.state;
      expect(observed.analyzedApplied).toBe(false);
    }

    observed = observeJaoTestRoomEnemyAction(room, 'enemy_attack:2', 120);
    room = observed.state;

    expect(observed.analyzedApplied).toBe(true);
    expect(isJaoTargetAnalyzed(room.passive, room.enemyEntityId, 120)).toBe(true);
  });

  it('requires the repeated family to be observed within range and six seconds', () => {
    let passive = createJaoPassiveState();

    passive = observeJaoEnemyAction(passive, {
      jaoPosition: { x: 0, y: 0 },
      enemyEntityId: 2,
      enemyPosition: { x: 400, y: 0 },
      familyId: 'slash',
      enemyActionId: 'slash:1',
      currentTick: 0
    }).state;

    const tooFarSecond = observeJaoEnemyAction(passive, {
      jaoPosition: { x: 0, y: 0 },
      enemyEntityId: 2,
      enemyPosition: { x: 100, y: 0 },
      familyId: 'slash',
      enemyActionId: 'slash:2',
      currentTick: 100
    });
    expect(tooFarSecond.analyzedApplied).toBe(false);

    passive = tooFarSecond.state;
    const tooLate = observeJaoEnemyAction(passive, {
      jaoPosition: { x: 0, y: 0 },
      enemyEntityId: 2,
      enemyPosition: { x: 100, y: 0 },
      familyId: 'slash',
      enemyActionId: 'slash:3',
      currentTick: 461
    });
    expect(tooLate.analyzedApplied).toBe(false);
  });

  it('keeps analyzed for five seconds and grants x1.10 outgoing only while active', () => {
    let passive = createJaoPassiveState();

    passive = observeJaoEnemyAction(passive, {
      jaoPosition: { x: 0, y: 0 },
      enemyEntityId: 2,
      enemyPosition: { x: 100, y: 0 },
      familyId: 'shot',
      enemyActionId: 'shot:1',
      currentTick: 0
    }).state;
    passive = observeJaoEnemyAction(passive, {
      jaoPosition: { x: 0, y: 0 },
      enemyEntityId: 2,
      enemyPosition: { x: 100, y: 0 },
      familyId: 'shot',
      enemyActionId: 'shot:2',
      currentTick: 10
    }).state;

    expect(getJaoOutgoingMultiplier(passive, 2, 309)).toBe(
      JAO_PASSIVE_DEFINITION.analyzedOutgoingMultiplier
    );
    expect(getJaoOutgoingMultiplier(passive, 2, 310)).toBe(1);
  });

  it('basic hits a target once per attackInstanceId and obeys cadence', () => {
    const passive = createJaoPassiveState();
    const initialTarget = target(2, 50, 0);

    const first = resolveJaoBasicAttack({
      state: createJaoBasicState(),
      currentTick: 0,
      ownerEntityId: 1,
      attackInstanceId: 'attack:basic:0',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      rank: 1,
      blockers: [],
      targets: [initialTarget],
      passive
    });

    expect(first.accepted).toBe(true);
    expect(first.hitTargetIds).toEqual([2]);
    expect(first.targets[0]?.health.health).toBe(74);

    const tooSoon = resolveJaoBasicAttack({
      state: first.state,
      currentTick: 32,
      ownerEntityId: 1,
      attackInstanceId: 'attack:basic:1',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      rank: 1,
      blockers: [],
      targets: first.targets,
      registry: first.registry,
      passive
    });

    expect(tooSoon.accepted).toBe(false);
    expect(tooSoon.targets[0]?.health.health).toBe(74);

    const repeatedSameAttack = resolveJaoBasicAttack({
      state: first.state,
      currentTick: 33,
      ownerEntityId: 1,
      attackInstanceId: 'attack:basic:0',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      rank: 1,
      blockers: [],
      targets: first.targets,
      registry: first.registry,
      passive
    });

    expect(repeatedSameAttack.accepted).toBe(true);
    expect(repeatedSameAttack.hitTargetIds).toEqual([]);
    expect(repeatedSameAttack.targets[0]?.health.health).toBe(74);
  });

  it('basic gets the analyzed outgoing multiplier', () => {
    let passive = createJaoPassiveState();

    passive = observeJaoEnemyAction(passive, {
      jaoPosition: { x: 0, y: 0 },
      enemyEntityId: 2,
      enemyPosition: { x: 50, y: 0 },
      familyId: 'strike',
      enemyActionId: 'strike:1',
      currentTick: 0
    }).state;
    passive = observeJaoEnemyAction(passive, {
      jaoPosition: { x: 0, y: 0 },
      enemyEntityId: 2,
      enemyPosition: { x: 50, y: 0 },
      familyId: 'strike',
      enemyActionId: 'strike:2',
      currentTick: 1
    }).state;

    const result = resolveJaoBasicAttack({
      state: createJaoBasicState(),
      currentTick: 2,
      ownerEntityId: 1,
      attackInstanceId: 'attack:analyzed:0',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      rank: 1,
      blockers: [],
      targets: [target(2, 50, 0)],
      passive
    });

    expect(result.targets[0]?.health.health).toBe(72);
  });

  it('Q stops at a wall, damages crossed targets and applies primer', () => {
    const resonance = createResonanceState();
    const result = resolveJaoQDash({
      ownerEntityId: 1,
      attackInstanceId: 'attack:q:0',
      start: { x: 20, y: 80 },
      direction: { x: 1, y: 0 },
      currentTick: 10,
      rank: 1,
      blockers: [{ x: 100, y: 0, width: 4, height: 200 }],
      targets: [
        target(2, 60, 80),
        target(3, 140, 80)
      ],
      resonance,
      passive: createJaoPassiveState()
    });

    expect(result.movement.collided).toBe(true);
    expect(result.movement.position.x).toBeLessThanOrEqual(88);
    expect(result.hitTargetIds).toEqual([2]);
    expect(result.targets.find((item) => item.entityId === 2)?.health.health).toBe(68);
    expect(result.targets.find((item) => item.entityId === 3)?.health.health).toBe(100);
    expect(hasResonanceMark(result.resonance, 2, 10)).toBe(true);
    expect(hasResonanceMark(result.resonance, 3, 10)).toBe(false);
  });

  it('Q applies primer when damage is absorbed by shield but not while invulnerable', () => {
    const shieldedBase = target(2, 60, 0);
    const shielded: JaoCombatTarget = {
      ...shieldedBase,
      health: applyShield(shieldedBase.health, 'test_shield', 40).state
    };

    const shieldResult = resolveJaoQDash({
      ownerEntityId: 1,
      attackInstanceId: 'attack:q:shield',
      start: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      currentTick: 5,
      rank: 1,
      blockers: [],
      targets: [shielded],
      resonance: createResonanceState(),
      passive: createJaoPassiveState()
    });

    expect(shieldResult.targets[0]?.health.health).toBe(100);
    expect(hasResonanceMark(shieldResult.resonance, 2, 5)).toBe(true);

    const invulnerable: JaoCombatTarget = {
      ...target(3, 60, 0),
      invulnerable: true
    };
    const invulnerableResult = resolveJaoQDash({
      ownerEntityId: 1,
      attackInstanceId: 'attack:q:invulnerable',
      start: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      currentTick: 5,
      rank: 1,
      blockers: [],
      targets: [invulnerable],
      resonance: createResonanceState(),
      passive: createJaoPassiveState()
    });

    expect(invulnerableResult.targets[0]?.health.health).toBe(100);
    expect(hasResonanceMark(invulnerableResult.resonance, 3, 5)).toBe(false);
  });

  it('Q registry prevents the same attack instance from damaging a target twice', () => {
    const initial = resolveJaoQDash({
      ownerEntityId: 1,
      attackInstanceId: 'attack:q:same',
      start: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      currentTick: 1,
      rank: 1,
      blockers: [],
      targets: [target(2, 60, 0)],
      resonance: createResonanceState(),
      passive: createJaoPassiveState()
    });

    const repeated = resolveJaoQDash({
      ownerEntityId: 1,
      attackInstanceId: 'attack:q:same',
      start: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      currentTick: 2,
      rank: 1,
      blockers: [],
      targets: initial.targets,
      registry: initial.registry,
      resonance: initial.resonance,
      passive: createJaoPassiveState()
    });

    expect(initial.targets[0]?.health.health).toBe(68);
    expect(repeated.hitTargetIds).toEqual([]);
    expect(repeated.targets[0]?.health.health).toBe(68);
  });
});
