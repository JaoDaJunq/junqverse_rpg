import { describe, expect, it } from 'vitest';
import { InputFrameSchema } from '../packages/protocol/src/index.js';
import {
  DEFAULT_BINDINGS,
  InputMapper,
  rebindInput
} from '../apps/client/src/input/index.js';

describe('T005 input mapper', () => {
  it('keeps W as movement and Digit2 as the W ability slot', () => {
    const mapper = new InputMapper();

    mapper.handleKeyDown('KeyW');
    const moving = mapper.nextFrame(1);
    expect(moving.moveY).toBe(-1);
    expect(moving.pressed).toEqual([]);

    mapper.handleKeyDown('Digit2');
    const casting = mapper.nextFrame(2);
    expect(casting.moveY).toBe(-1);
    expect(casting.pressed).toEqual(['w']);
  });

  it('emits one pressed edge while an ability key is held', () => {
    const mapper = new InputMapper();

    mapper.handleKeyDown('Digit1');
    mapper.handleKeyDown('Digit1', true);

    expect(mapper.nextFrame(1).pressed).toEqual(['q']);
    expect(mapper.nextFrame(2).pressed).toEqual([]);

    mapper.handleKeyUp('Digit1');
    mapper.handleKeyDown('Digit1');
    expect(mapper.nextFrame(3).pressed).toEqual(['q']);
  });

  it('keeps basic held until release and suppresses UI pointer down', () => {
    const mapper = new InputMapper();

    mapper.handlePointerDown(0, true);
    expect(mapper.nextFrame(1).basicHeld).toBe(false);

    mapper.handlePointerDown(0, false);
    expect(mapper.nextFrame(2).basicHeld).toBe(true);
    expect(mapper.nextFrame(3).basicHeld).toBe(true);

    mapper.handlePointerUp(0);
    expect(mapper.nextFrame(4).basicHeld).toBe(false);
  });

  it('clears movement, interaction and basic input on blur or scene change', () => {
    const mapper = new InputMapper();

    mapper.handleKeyDown('KeyD');
    mapper.handleKeyDown('KeyF');
    mapper.handlePointerDown(0, false);
    mapper.clear();

    const afterBlur = mapper.nextFrame(1);
    expect(afterBlur.moveX).toBe(0);
    expect(afterBlur.interactHeld).toBe(false);
    expect(afterBlur.basicHeld).toBe(false);
    expect(afterBlur.pressed).toEqual([]);

    mapper.handleKeyDown('KeyA');
    mapper.sceneChanged();
    expect(mapper.nextFrame(2).moveX).toBe(0);
  });

  it('emits release edges only for contract-supported actions', () => {
    const mapper = new InputMapper();

    mapper.handleKeyDown('Digit3');
    mapper.handleKeyDown('KeyF');
    mapper.nextFrame(1);

    mapper.handleKeyUp('Digit3');
    mapper.handleKeyUp('KeyF');

    expect(mapper.nextFrame(2).released).toEqual(['e', 'interact']);
  });

  it('converts pointer coordinates through the supplied camera transform', () => {
    const mapper = new InputMapper();

    mapper.updatePointer(10, 20, (x, y) => ({ x: x + 100, y: y - 5 }));
    const frame = mapper.nextFrame(1);

    expect(frame.aimX).toBe(110);
    expect(frame.aimY).toBe(15);
    expect(InputFrameSchema.safeParse(frame).success).toBe(true);
  });

  it('rejects conflicting remaps', () => {
    expect(() => rebindInput(DEFAULT_BINDINGS, 'q', 'KeyW'))
      .toThrow('binding conflict');

    const mapper = new InputMapper();
    expect(() => mapper.rebind('w', 'KeyW')).toThrow('binding conflict');
  });

  it('normalizes opposing movement keys to zero', () => {
    const mapper = new InputMapper();

    mapper.handleKeyDown('KeyA');
    mapper.handleKeyDown('KeyD');

    expect(mapper.nextFrame(1).moveX).toBe(0);
  });
});
