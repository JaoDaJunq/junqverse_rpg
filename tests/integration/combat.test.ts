import { describe, expect, it } from 'vitest';
import type { InputFrame } from '../../packages/protocol/src/index.js';
import { createPrototypeWorld } from '../../packages/sim/src/index.js';
import {
  LocalSession,
  type SessionInputSource
} from '../../apps/client/src/adapters/LocalSession.js';

class GateInput implements SessionInputSource {
  public clears = 0;

  public nextFrame(clientTick: number): InputFrame {
    const pressed: InputFrame['pressed'] = [];

    if (clientTick === 10) pressed.push('q');
    if (clientTick === 100) pressed.push('w');
    if (clientTick === 200) pressed.push('e');
    if (clientTick === 400) pressed.push('r');
    if (clientTick === 600) pressed.push('dodge');

    return {
      seq: clientTick,
      clientTick,
      moveX: 0,
      moveY: 0,
      aimX: 300,
      aimY: 100,
      basicHeld: clientTick % 120 === 20,
      pressed,
      released: clientTick === 220 ? ['e'] : [],
      interactHeld: false
    };
  }

  public clear(): void {
    this.clears += 1;
  }
}

class IdleInput implements SessionInputSource {
  public clears = 0;

  public nextFrame(clientTick: number): InputFrame {
    return {
      seq: clientTick,
      clientTick,
      moveX: 0,
      moveY: 0,
      aimX: 200,
      aimY: 100,
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

function runFiveMinutes(renderFps: 30 | 60) {
  const session = new LocalSession(
    createPrototypeWorld(
      `gate_five_minutes_${renderFps}`,
      20260924,
      { x: 100, y: 100 },
      []
    ),
    new GateInput(),
    { initialUltimateCharge: 100 }
  );

  const totalFrames = renderFps * 60 * 5;
  const delta = 1000 / renderFps;

  for (let frame = 0; frame < totalFrames; frame += 1) {
    session.advance(delta);
  }

  return session.getSnapshot();
}

describe('T017 integrated combat gate', () => {
  it('runs five simulated minutes deterministically at 30 and 60 FPS', () => {
    const at30 = runFiveMinutes(30);
    const at60 = runFiveMinutes(60);

    expect(at30.tick).toBe(18_000);
    expect(at60.tick).toBe(18_000);
    expect(at30.player).toEqual(at60.player);
    expect(at30.combat).toEqual(at60.combat);
    expect(at30.player.alive).toBe(true);
    expect(at30.combat.resources.focus).toBe(100);
    expect(at30.combat.ultimateActive).toBe(false);
  });

  it('freezes the simulation while paused and resumes without skipped ticks', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'gate_pause_resume',
        1,
        { x: 100, y: 100 },
        []
      ),
      new IdleInput()
    );

    session.advance(1000);
    const beforePause = session.getSnapshot();

    session.setPaused(true);
    session.advance(30_000);
    const paused = session.getSnapshot();

    expect(paused.tick).toBe(beforePause.tick);
    expect(paused).toEqual(beforePause);

    session.setPaused(false);
    session.advance(1000);

    expect(session.getSnapshot().tick).toBe(beforePause.tick + 60);
  });

  it('restarts after real defeat without duplicating enemies or stale combat state', () => {
    const enemySpawns = Array.from(
      { length: 27 },
      () => ({
        archetype: 'eco_rasteiro' as const,
        position: { x: 140, y: 100 }
      })
    );
    const session = new LocalSession(
      createPrototypeWorld(
        'gate_defeat_restart',
        1,
        { x: 100, y: 100 },
        [],
        { enemySpawns }
      ),
      new IdleInput(),
      { enemyAttacksEnabled: true }
    );

    session.advance((1000 / 60) * 45);
    const defeated = session.getSnapshot();

    expect(defeated.player.alive).toBe(false);
    expect(defeated.player.health).toBe(0);
    expect(session.isPaused()).toBe(true);

    const restarted = session.restart();

    expect(restarted.tick).toBe(0);
    expect(restarted.player.health).toBe(320);
    expect(restarted.player.alive).toBe(true);
    expect(restarted.enemies).toHaveLength(27);
    expect(restarted.combat.activeAbilityId).toBeNull();
    expect(restarted.combat.resources.cooldowns).toEqual({});

    session.advance((1000 / 60) * 45);
    expect(session.getSnapshot().player.alive).toBe(false);
  });
});
