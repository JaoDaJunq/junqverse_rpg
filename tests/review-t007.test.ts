import { describe, expect, it } from 'vitest';
import type { InputFrame } from '../packages/protocol/src/index.js';
import { createPrototypeWorld } from '../packages/sim/src/index.js';
import {
  LocalSession,
  type SessionInputSource
} from '../apps/client/src/adapters/LocalSession.js';

class Input implements SessionInputSource {
  public moveX = 1;
  public moveY = 0;
  public clears = 0;

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

function createSession(input = new Input()): LocalSession {
  return new LocalSession(
    createPrototypeWorld(
      'review_t007',
      77,
      { x: 100, y: 100 },
      [],
      { speedPxPerSecond: 180, radius: 12 }
    ),
    input
  );
}

describe('T007 independent session review', () => {
  it('reaches the same tick/position at 30, 60 and 144 render fps', () => {
    const run = (fps: number) => {
      const session = createSession();
      for (let frame = 0; frame < fps; frame += 1) {
        session.advance(1000 / fps);
      }
      return session.getSnapshot();
    };

    const a = run(30);
    const b = run(60);
    const c = run(144);

    expect(a.tick).toBe(60);
    expect(b.tick).toBe(60);
    expect(c.tick).toBe(60);
    expect(a.player.position.x).toBeCloseTo(b.player.position.x, 8);
    expect(b.player.position.x).toBeCloseTo(c.player.position.x, 8);
  });

  it('discards partial accumulated render time when pausing', () => {
    const session = createSession();

    session.advance(8);
    expect(session.getSnapshot().tick).toBe(0);

    session.setPaused(true);
    session.setPaused(false);
    session.advance(8);

    expect(session.getSnapshot().tick).toBe(0);
  });

  it('interpolates between previous and current simulation positions', () => {
    const session = createSession();

    session.advance(1000 / 60);
    session.advance(1000 / 120);

    const snapshot = session.getSnapshot();

    expect(snapshot.tick).toBe(1);
    expect(snapshot.player.position.x).toBeCloseTo(101.5, 6);
  });

  it('keeps scene-facing snapshots immutable from input changes', () => {
    const input = new Input();
    const session = createSession(input);
    const before = session.getSnapshot();

    input.moveX = -1;
    session.advance(1000 / 60);

    expect(before.player.position).toEqual({ x: 100, y: 100 });
  });
});
