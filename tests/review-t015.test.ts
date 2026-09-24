import { describe, expect, it } from 'vitest';
import type { InputFrame } from '../packages/protocol/src/index.js';
import {
  createEncounterState,
  defeatEncounter,
  restartEncounter,
  createPrototypeWorld,
  type EncounterCheckpoint
} from '../packages/sim/src/index.js';
import {
  LocalSession,
  type SessionInputSource
} from '../apps/client/src/adapters/LocalSession.js';

class ReviewInput implements SessionInputSource {
  public clears = 0;

  public nextFrame(clientTick: number): InputFrame {
    return {
      seq: clientTick,
      clientTick,
      moveX: 1,
      moveY: 0,
      aimX: 0,
      aimY: 0,
      basicHeld: false,
      pressed: [],
      released: [],
      interactHeld: false
    };
  }

  public clear(): void {
    this.clears += 1;
  }
}

const checkpoint: EncounterCheckpoint = {
  checkpointId: 'review_checkpoint',
  playerEntityId: 1,
  playerSpawn: { x: 100, y: 120 },
  playerMaxHealth: 320,
  playerArmor: 0,
  ultimateCharge: 77,
  enemyEntityIds: [2, 3, 4]
};

describe('T015 independent review', () => {
  it('does not mutate the checkpoint source or prior encounter states', () => {
    const source = {
      ...checkpoint,
      playerSpawn: { ...checkpoint.playerSpawn },
      enemyEntityIds: [...checkpoint.enemyEntityIds]
    };

    const created = createEncounterState(source);
    const defeated = defeatEncounter(created);
    const restarted = restartEncounter(defeated);

    expect(source).toEqual(checkpoint);
    expect(created.defeated).toBe(false);
    expect(created.player.health.health).toBe(320);
    expect(defeated).not.toBe(created);
    expect(restarted).not.toBe(defeated);
    expect(restarted.checkpoint).not.toBe(source);
    expect(restarted.checkpoint.playerSpawn).not.toBe(source.playerSpawn);
    expect(restarted.checkpoint.enemyEntityIds).not.toBe(source.enemyEntityIds);
  });

  it('increments generation monotonically and restores checkpoint resources every time', () => {
    let state = createEncounterState(checkpoint);

    for (let generation = 1; generation <= 25; generation += 1) {
      state = restartEncounter(defeatEncounter(state));

      expect(state.generation).toBe(generation);
      expect(state.player.health.health).toBe(320);
      expect(state.player.combatant.resources.focus).toBe(100);
      expect(state.player.combatant.resources.dodgeCharges).toBe(2);
      expect(state.player.transient.ultimate.charge).toBe(77);
      expect(state.projectiles).toEqual([]);
      expect(state.zones).toEqual([]);
      expect(state.resonance.marks).toEqual([]);
      expect(state.activeEnemyEntityIds).toEqual([2, 3, 4]);
    }
  });

  it('restart clears pause and resumes control without replacing the input source', () => {
    const input = new ReviewInput();
    const session = new LocalSession(
      createPrototypeWorld(
        'review_restart',
        7,
        { x: 100, y: 100 },
        [],
        { speedPxPerSecond: 180 }
      ),
      input
    );

    session.setPaused(true);
    expect(session.isPaused()).toBe(true);

    const reset = session.restart();
    expect(session.isPaused()).toBe(false);
    expect(reset.tick).toBe(0);
    expect(reset.player.position).toEqual({ x: 100, y: 100 });

    session.advance(1000 / 30);
    expect(session.getSnapshot().player.position.x).toBeGreaterThan(100);
    expect(input.clears).toBeGreaterThanOrEqual(2);
  });

  it('restart reconstructs state from the original room, not from the current mutated state', () => {
    const input = new ReviewInput();
    const session = new LocalSession(
      createPrototypeWorld(
        'review_origin',
        99,
        { x: 150, y: 160 },
        [{ x: 300, y: 0, width: 32, height: 400 }],
        { speedPxPerSecond: 180 }
      ),
      input
    );

    for (let frame = 0; frame < 30; frame += 1) {
      session.advance(1000 / 60);
    }

    expect(session.getSnapshot().tick).toBeGreaterThan(0);

    const restarted = session.restart();
    expect(restarted.tick).toBe(0);
    expect(restarted.player.position).toEqual({ x: 150, y: 160 });
    expect(restarted.blockers).toEqual([
      { x: 300, y: 0, width: 32, height: 400 }
    ]);
  });
});
