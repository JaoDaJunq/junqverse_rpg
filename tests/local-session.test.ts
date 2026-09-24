import { describe, expect, it } from 'vitest';
import type { InputFrame } from '../packages/protocol/src/index.js';
import { createPrototypeWorld } from '../packages/sim/src/index.js';
import {
  LocalSession,
  type SessionInputSource
} from '../apps/client/src/adapters/LocalSession.js';

class ConstantInput implements SessionInputSource {
  public clears = 0;

  public constructor(
    private readonly moveX: number,
    private readonly moveY: number
  ) {}

  public nextFrame(clientTick: number): InputFrame {
    return {
      seq: clientTick,
      clientTick,
      moveX: this.moveX,
      moveY: this.moveY,
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

class OneShotActionInput implements SessionInputSource {
  public clears = 0;

  public constructor(
    private readonly action: InputFrame['pressed'][number],
    private readonly aim = { x: 200, y: 100 }
  ) {}

  public nextFrame(clientTick: number): InputFrame {
    return {
      seq: clientTick,
      clientTick,
      moveX: 0,
      moveY: 0,
      aimX: this.aim.x,
      aimY: this.aim.y,
      basicHeld: false,
      pressed: clientTick === 0 ? [this.action] : [],
      released: [],
      interactHeld: false
    };
  }

  public clear(): void {
    this.clears += 1;
  }
}

function makeSession(input = new ConstantInput(1, 0)): LocalSession {
  return new LocalSession(
    createPrototypeWorld(
      'local_session_test',
      1,
      { x: 100, y: 100 },
      [],
      { speedPxPerSecond: 180 }
    ),
    input
  );
}

describe('T007 local session', () => {
  it('reaches equivalent simulation state at 30 and 60 render FPS', () => {
    const at30 = makeSession();
    const at60 = makeSession();

    for (let frame = 0; frame < 30; frame += 1) {
      at30.advance(1000 / 30);
    }

    for (let frame = 0; frame < 60; frame += 1) {
      at60.advance(1000 / 60);
    }

    const snapshot30 = at30.getSnapshot();
    const snapshot60 = at60.getSnapshot();

    expect(snapshot30.tick).toBe(60);
    expect(snapshot60.tick).toBe(60);
    expect(snapshot30.player.position.x)
      .toBeCloseTo(snapshot60.player.position.x, 8);
  });

  it('freezes solo simulation while paused', () => {
    const input = new ConstantInput(1, 0);
    const session = makeSession(input);

    session.advance(1000 / 60);
    const before = session.getSnapshot();

    session.setPaused(true);
    session.advance(5000);
    const paused = session.getSnapshot();

    expect(paused.tick).toBe(before.tick);
    expect(paused.player.position).toEqual(before.player.position);
    expect(paused.combat).toEqual(before.combat);
    expect(input.clears).toBeGreaterThanOrEqual(1);
  });

  it('stops cleanly and ignores later render updates', () => {
    const input = new ConstantInput(1, 0);
    const session = makeSession(input);

    session.advance(1000 / 60);
    session.stop();
    const stopped = session.getSnapshot();
    session.advance(1000);

    expect(session.getSnapshot()).toEqual(stopped);
    expect(input.clears).toBeGreaterThanOrEqual(1);
  });

  it('creates exactly one prototype entity on repeated session restarts', () => {
    const entityIds: number[] = [];

    for (let restart = 0; restart < 5; restart += 1) {
      const session = makeSession();
      entityIds.push(session.getSnapshot().player.entityId);
      session.stop();
    }

    expect(entityIds).toEqual([1, 1, 1, 1, 1]);
  });

  it('keeps player collision authoritative in the sim snapshot', () => {
    const input = new ConstantInput(1, 0);
    const session = new LocalSession(
      createPrototypeWorld(
        'wall_session_test',
        1,
        { x: 60, y: 100 },
        [{ x: 100, y: 0, width: 8, height: 200 }],
        { radius: 12, speedPxPerSecond: 180 }
      ),
      input
    );

    for (let frame = 0; frame < 60; frame += 1) {
      session.advance(1000 / 60);
    }

    expect(session.getSnapshot().player.position.x).toBeLessThanOrEqual(88);
  });

  it('restarts the same room ten times without duplicating the prototype entity', () => {
    const input = new ConstantInput(1, 0);
    const session = makeSession(input);

    for (let restart = 0; restart < 10; restart += 1) {
      session.advance(1000 / 30);
      expect(session.getSnapshot().player.position.x).toBeGreaterThan(100);

      const restarted = session.restart();
      expect(restarted.tick).toBe(0);
      expect(restarted.player.entityId).toBe(1);
      expect(restarted.player.position).toEqual({ x: 100, y: 100 });
      expect(restarted.combat.resources.focus).toBe(100);
      expect(restarted.combat.resources.dodgeCharges).toBe(2);
      expect(restarted.combat.resources.cooldowns).toEqual({});
      expect(session.isPaused()).toBe(false);
    }

    session.advance(1000 / 30);
    expect(session.getSnapshot().player.position.x).toBeGreaterThan(100);
    expect(input.clears).toBeGreaterThanOrEqual(10);
  });

  it('does not allow a stopped session to be resurrected by restart', () => {
    const session = makeSession();
    session.stop();

    expect(() => session.restart()).toThrow('stopped session');
  });
});

describe('T017 combat input bridge', () => {
  it('bridges Q acceptance into real focus cooldown and dash movement', () => {
    const session = makeSession(new OneShotActionInput('q'));

    const accepted = session.advance(1000 / 60);

    expect(accepted.combat.resources.focus).toBe(80);
    expect(accepted.combat.resources.cooldowns.jao_q).toBe(360);
    expect(accepted.combat.activeAbilityId).toBe('jao_q');
    expect(accepted.combat.qDashActive).toBe(true);

    session.advance((1000 / 60) * 11);
    const finished = session.getSnapshot();

    expect(finished.player.position.x).toBeCloseTo(260, 6);
    expect(finished.player.position.y).toBeCloseTo(100, 6);
    expect(finished.combat.qDashActive).toBe(false);
  });

  it('rejects Q with zero aim without spending focus or cooldown', () => {
    const session = makeSession(
      new OneShotActionInput('q', { x: 100, y: 100 })
    );

    session.advance(1000 / 60);
    const snapshot = session.getSnapshot();

    expect(snapshot.combat.resources.focus).toBe(100);
    expect(snapshot.combat.resources.cooldowns.jao_q).toBeUndefined();
    expect(snapshot.combat.qDashActive).toBe(false);
  });

  it('stops Q dash at a wall', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'q_wall_test',
        1,
        { x: 60, y: 100 },
        [{ x: 100, y: 0, width: 8, height: 200 }],
        { radius: 12, speedPxPerSecond: 180 }
      ),
      new OneShotActionInput('q', { x: 200, y: 100 })
    );

    session.advance((1000 / 60) * 12);
    const snapshot = session.getSnapshot();

    expect(snapshot.player.position.x).toBeLessThanOrEqual(88);
  });

  it('bridges W acceptance into real focus and cooldown state', () => {
    const session = makeSession(new OneShotActionInput('w'));

    const snapshot = session.advance(1000 / 60);

    expect(snapshot.combat.resources.focus).toBe(85);
    expect(snapshot.combat.resources.cooldowns.jao_w).toBe(600);
    expect(snapshot.combat.activeAbilityId).toBe('jao_w');
  });

  it('bridges dodge into the authoritative combat resource state', () => {
    const session = makeSession(new OneShotActionInput('dodge'));

    const snapshot = session.advance(1000 / 60);

    expect(snapshot.combat.resources.dodgeCharges).toBe(1);
    expect(snapshot.combat.dodgeActive).toBe(true);
  });
});
