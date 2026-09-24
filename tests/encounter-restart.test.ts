import { describe, expect, it } from 'vitest';
import {
  createEncounterState,
  defeatEncounter,
  restartEncounter,
  type EncounterCheckpoint,
  type EncounterState
} from '../packages/sim/src/index.js';

const CHECKPOINT: EncounterCheckpoint = {
  checkpointId: 'checkpoint_room_test',
  playerEntityId: 1,
  playerSpawn: { x: 160, y: 160 },
  playerMaxHealth: 320,
  playerArmor: 0,
  ultimateCharge: 42,
  enemyEntityIds: [2, 3]
};

function dirtyEncounter(): EncounterState {
  const state = createEncounterState(CHECKPOINT);

  return {
    ...state,
    player: {
      ...state.player,
      position: { x: 500, y: 400 },
      health: {
        ...state.player.health,
        health: 1,
        shields: { bySource: { temporary_shield: 80 } }
      },
      combatant: {
        ...state.player.combatant,
        resources: {
          ...state.player.combatant.resources,
          focus: 7,
          cooldowns: { jao_q: 99 },
          dodgeCharges: 0,
          dodgeRechargeTicksRemaining: 123
        },
        activeCast: {
          abilityId: 'jao_q',
          attackInstanceId: 'attack:1:0',
          phase: 'windup',
          phaseTicksRemaining: 4,
          activeTicks: 1,
          recoveryTicks: 9
        },
        nextAttackInstanceCounter: 1
      },
      status: {
        effects: [{
          kind: 'slow',
          sourceId: 'enemy_slow',
          magnitude: 0.3,
          remainingTicks: 60
        }],
        bossControlConversionImmunityTicks: 0,
        strongControlImmunityTicks: 0
      },
      transient: {
        ultimate: {
          charge: 0,
          activeFromTick: 10,
          activeUntilTick: 370
        },
        eCharge: {
          ownerEntityId: 1,
          attackInstanceId: 'attack:1:1',
          startedAtTick: 20,
          direction: { x: 1, y: 0 },
          maxChargeTicks: 60
        }
      }
    },
    projectiles: [{
      projectileId: 'projectile_1',
      attackInstanceId: 'attack:2:0',
      ownerEntityId: 2,
      position: { x: 200, y: 200 },
      velocityPxPerSecond: { x: 300, y: 0 },
      radius: 4
    }],
    zones: [{
      zoneId: 'zone_1',
      attackInstanceId: 'attack:3:0',
      ownerEntityId: 3,
      center: { x: 240, y: 200 },
      radius: 72,
      remainingTicks: 120,
      pulseIntervalTicks: 60,
      ticksUntilNextPulse: 20,
      nextPulseIndex: 1
    }],
    hitRegistry: {
      byAttackOrPulse: {
        'attack:2:0': [1]
      }
    },
    resonance: {
      marks: [{
        targetEntityId: 2,
        expiresAtTick: 200
      }],
      nextExplosionAllowedTickByTarget: {
        '2': 100
      }
    }
  };
}

describe('T015 encounter defeat and restart', () => {
  it('finalizes transient encounter effects on defeat', () => {
    const defeated = defeatEncounter(dirtyEncounter());

    expect(defeated.defeated).toBe(true);
    expect(defeated.player.combatant.alive).toBe(false);
    expect(defeated.player.combatant.activeCast).toBeNull();
    expect(defeated.player.transient.eCharge).toBeNull();
    expect(defeated.player.transient.ultimate.activeFromTick).toBeNull();
    expect(defeated.player.transient.ultimate.activeUntilTick).toBeNull();
    expect(defeated.projectiles).toEqual([]);
    expect(defeated.zones).toEqual([]);
    expect(defeated.activeEnemyEntityIds).toEqual([]);
    expect(defeated.hitRegistry.byAttackOrPulse).toEqual({});
    expect(defeated.resonance.marks).toEqual([]);
  });

  it('reconstructs the checkpoint with full health focus dodge and checkpoint ultimate', () => {
    const restarted = restartEncounter(defeatEncounter(dirtyEncounter()));

    expect(restarted.generation).toBe(1);
    expect(restarted.defeated).toBe(false);
    expect(restarted.player.position).toEqual(CHECKPOINT.playerSpawn);
    expect(restarted.player.health.health).toBe(320);
    expect(restarted.player.health.maxHealth).toBe(320);
    expect(restarted.player.health.shields.bySource).toEqual({});
    expect(restarted.player.combatant.alive).toBe(true);
    expect(restarted.player.combatant.resources.focus).toBe(100);
    expect(restarted.player.combatant.resources.dodgeCharges).toBe(2);
    expect(restarted.player.combatant.resources.cooldowns).toEqual({});
    expect(restarted.player.combatant.activeCast).toBeNull();
    expect(restarted.player.transient.ultimate.charge).toBe(42);
    expect(restarted.player.transient.ultimate.activeFromTick).toBeNull();
    expect(restarted.player.transient.eCharge).toBeNull();
    expect(restarted.player.status.effects).toEqual([]);
    expect(restarted.activeEnemyEntityIds).toEqual([2, 3]);
    expect(restarted.projectiles).toEqual([]);
    expect(restarted.zones).toEqual([]);
    expect(restarted.resonance.marks).toEqual([]);
  });

  it('remains clean through ten consecutive room restarts', () => {
    let state = dirtyEncounter();

    for (let restart = 1; restart <= 10; restart += 1) {
      state = restartEncounter(defeatEncounter(state));

      expect(state.generation).toBe(restart);
      expect(state.projectiles).toHaveLength(0);
      expect(state.zones).toHaveLength(0);
      expect(state.activeEnemyEntityIds).toEqual([2, 3]);
      expect(state.player.combatant.entityId).toBe(1);
      expect(state.player.combatant.nextAttackInstanceCounter).toBe(0);
    }
  });

  it('treats repeated defeat calls as idempotent', () => {
    const first = defeatEncounter(dirtyEncounter());
    const second = defeatEncounter(first);

    expect(second).toBe(first);
  });

  it('rejects duplicate enemy ids in checkpoints', () => {
    expect(() => createEncounterState({
      ...CHECKPOINT,
      enemyEntityIds: [2, 2]
    })).toThrow('unique');
  });
});
