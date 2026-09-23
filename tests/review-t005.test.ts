import { describe, expect, it } from 'vitest';
import { InputFrameSchema } from '../packages/protocol/src/index.js';
import { InputMapper } from '../apps/client/src/input/index.js';

type Listener = (event: unknown) => void;

class FakeTarget {
  private readonly listeners = new Map<string, Set<Listener>>();

  public addEventListener(type: string, listener: Listener): void {
    const bucket = this.listeners.get(type) ?? new Set<Listener>();
    bucket.add(listener);
    this.listeners.set(type, bucket);
  }

  public removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  public emit(type: string, event: unknown = {}): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  public count(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

describe('T005 independent review', () => {
  it('detaches DOM listeners and clears held input', () => {
    const keyboard = new FakeTarget();
    const pointer = new FakeTarget();
    const mapper = new InputMapper();

    const detach = mapper.attachDom({
      keyboardTarget: keyboard as unknown as Window,
      pointerTarget: pointer as unknown as HTMLElement,
      screenToWorld: (x, y) => ({ x, y })
    });

    expect(keyboard.count('keydown')).toBe(1);
    expect(pointer.count('pointerdown')).toBe(1);

    keyboard.emit('keydown', { code: 'KeyW', repeat: false });
    pointer.emit('pointerdown', { clientX: 4, clientY: 5, button: 0 });

    const held = mapper.nextFrame(1);
    expect(held.moveY).toBe(-1);
    expect(held.basicHeld).toBe(true);

    detach();

    expect(keyboard.count('keydown')).toBe(0);
    expect(pointer.count('pointerdown')).toBe(0);

    const cleared = mapper.nextFrame(2);
    expect(cleared.moveY).toBe(0);
    expect(cleared.basicHeld).toBe(false);

    keyboard.emit('keydown', { code: 'KeyD', repeat: false });
    expect(mapper.nextFrame(3).moveX).toBe(0);
  });

  it('does not duplicate listeners when attachDom is called twice', () => {
    const keyboard = new FakeTarget();
    const pointer = new FakeTarget();
    const mapper = new InputMapper();

    const attachment = {
      keyboardTarget: keyboard as unknown as Window,
      pointerTarget: pointer as unknown as HTMLElement,
      screenToWorld: (x: number, y: number) => ({ x, y })
    };

    mapper.attachDom(attachment);
    mapper.attachDom(attachment);

    expect(keyboard.count('keydown')).toBe(1);
    expect(keyboard.count('blur')).toBe(1);
    expect(pointer.count('pointermove')).toBe(1);
  });

  it('keeps sequence monotonic across clear and scene changes', () => {
    const mapper = new InputMapper();

    expect(mapper.nextFrame(1).seq).toBe(0);
    mapper.clear();
    expect(mapper.nextFrame(2).seq).toBe(1);
    mapper.sceneChanged();
    expect(mapper.nextFrame(3).seq).toBe(2);
  });

  it('does not emit release for a key that was never held', () => {
    const mapper = new InputMapper();

    mapper.handleKeyUp('Digit3');
    mapper.handleKeyUp('KeyF');

    expect(mapper.nextFrame(1).released).toEqual([]);
  });

  it('clears held state when remapping', () => {
    const mapper = new InputMapper();

    mapper.handleKeyDown('KeyW');
    expect(mapper.nextFrame(1).moveY).toBe(-1);

    mapper.rebind('move_up', 'ArrowUp');
    expect(mapper.nextFrame(2).moveY).toBe(0);

    mapper.handleKeyDown('ArrowUp');
    expect(mapper.nextFrame(3).moveY).toBe(-1);
  });

  it('produces a valid frame with simultaneous movement, cast, interact and basic', () => {
    const mapper = new InputMapper();

    mapper.handleKeyDown('KeyW');
    mapper.handleKeyDown('KeyD');
    mapper.handleKeyDown('Digit1');
    mapper.handleKeyDown('KeyF');
    mapper.handlePointerDown(0, false);
    mapper.updatePointer(20, 30, (x, y) => ({ x: x * 2, y: y * 2 }));

    const frame = mapper.nextFrame(9);

    expect(frame.moveX).toBe(1);
    expect(frame.moveY).toBe(-1);
    expect(frame.pressed).toEqual(['q', 'interact']);
    expect(frame.interactHeld).toBe(true);
    expect(frame.basicHeld).toBe(true);
    expect(frame.aimX).toBe(40);
    expect(frame.aimY).toBe(60);
    expect(InputFrameSchema.safeParse(frame).success).toBe(true);
  });

  it('rejects non-finite camera conversion results', () => {
    const mapper = new InputMapper();

    expect(() => mapper.updatePointer(1, 2, () => ({ x: Number.NaN, y: 0 })))
      .toThrow('finite coordinates');
  });
});
