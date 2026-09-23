import type { InputFrame } from '@junqverse/protocol';
import {
  DEFAULT_BINDINGS,
  actionForCode,
  rebindInput,
  validateBindings,
  type InputBindingAction,
  type InputBindings
} from './bindings.js';

type PressedAction = InputFrame['pressed'][number];
type ReleasedAction = InputFrame['released'][number];

export type ScreenToWorld = (
  screenX: number,
  screenY: number
) => { readonly x: number; readonly y: number };

export interface DomInputAttachment {
  readonly keyboardTarget: Window;
  readonly pointerTarget: HTMLElement;
  readonly screenToWorld: ScreenToWorld;
  readonly isPointerOverUi?: (event: PointerEvent) => boolean;
}

export class InputMapper {
  private bindings: InputBindings;
  private readonly heldCodes = new Set<string>();
  private readonly pressedActions = new Set<PressedAction>();
  private readonly releasedActions = new Set<ReleasedAction>();
  private sequence = 0;
  private basicHeld = false;
  private interactHeld = false;
  private aimX = 0;
  private aimY = 0;
  private detachDom: (() => void) | null = null;

  public constructor(bindings: InputBindings = DEFAULT_BINDINGS) {
    validateBindings(bindings);
    this.bindings = { ...bindings };
  }

  public getBindings(): InputBindings {
    return { ...this.bindings };
  }

  public rebind(action: InputBindingAction, code: string): void {
    this.bindings = rebindInput(this.bindings, action, code);
    this.clear();
  }

  public handleKeyDown(code: string, repeat = false): void {
    const action = actionForCode(this.bindings, code);
    if (!action) {
      return;
    }

    if (repeat || this.heldCodes.has(code)) {
      return;
    }

    this.heldCodes.add(code);

    if (action === 'interact') {
      this.interactHeld = true;
      this.pressedActions.add('interact');
      return;
    }

    if (
      action === 'q' ||
      action === 'w' ||
      action === 'e' ||
      action === 'r' ||
      action === 'dodge'
    ) {
      this.pressedActions.add(action);
    }
  }

  public handleKeyUp(code: string): void {
    const action = actionForCode(this.bindings, code);
    if (!action) {
      return;
    }

    const wasHeld = this.heldCodes.delete(code);
    if (!wasHeld) {
      return;
    }

    if (action === 'e') {
      this.releasedActions.add('e');
    }

    if (action === 'interact') {
      this.interactHeld = false;
      this.releasedActions.add('interact');
    }
  }

  public handlePointerDown(button: number, pointerOverUi: boolean): void {
    if (button === 0 && !pointerOverUi) {
      this.basicHeld = true;
    }
  }

  public handlePointerUp(button: number): void {
    if (button === 0) {
      this.basicHeld = false;
    }
  }

  public updatePointer(
    screenX: number,
    screenY: number,
    screenToWorld: ScreenToWorld
  ): void {
    const world = screenToWorld(screenX, screenY);

    if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) {
      throw new RangeError('screenToWorld must return finite coordinates');
    }

    this.aimX = world.x;
    this.aimY = world.y;
  }

  public nextFrame(clientTick: number): InputFrame {
    if (!Number.isInteger(clientTick) || clientTick < 0) {
      throw new RangeError('clientTick must be a non-negative integer');
    }

    const frame: InputFrame = {
      seq: this.sequence,
      clientTick,
      moveX: this.axis('move_left', 'move_right'),
      moveY: this.axis('move_up', 'move_down'),
      aimX: this.aimX,
      aimY: this.aimY,
      basicHeld: this.basicHeld,
      pressed: [...this.pressedActions],
      released: [...this.releasedActions],
      interactHeld: this.interactHeld
    };

    this.sequence += 1;
    this.pressedActions.clear();
    this.releasedActions.clear();

    return frame;
  }

  public clear(): void {
    this.heldCodes.clear();
    this.pressedActions.clear();
    this.releasedActions.clear();
    this.basicHeld = false;
    this.interactHeld = false;
  }

  public sceneChanged(): void {
    this.clear();
  }

  public attachDom(attachment: DomInputAttachment): () => void {
    this.detach();

    const {
      keyboardTarget,
      pointerTarget,
      screenToWorld,
      isPointerOverUi = () => false
    } = attachment;

    const onKeyDown = (event: KeyboardEvent): void => {
      this.handleKeyDown(event.code, event.repeat);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      this.handleKeyUp(event.code);
    };
    const onBlur = (): void => {
      this.clear();
    };
    const onPointerMove = (event: PointerEvent): void => {
      this.updatePointer(event.clientX, event.clientY, screenToWorld);
    };
    const onPointerDown = (event: PointerEvent): void => {
      this.updatePointer(event.clientX, event.clientY, screenToWorld);
      this.handlePointerDown(event.button, isPointerOverUi(event));
    };
    const onPointerUp = (event: PointerEvent): void => {
      this.handlePointerUp(event.button);
    };

    keyboardTarget.addEventListener('keydown', onKeyDown);
    keyboardTarget.addEventListener('keyup', onKeyUp);
    keyboardTarget.addEventListener('blur', onBlur);
    pointerTarget.addEventListener('pointermove', onPointerMove);
    pointerTarget.addEventListener('pointerdown', onPointerDown);
    pointerTarget.addEventListener('pointerup', onPointerUp);

    const detach = (): void => {
      keyboardTarget.removeEventListener('keydown', onKeyDown);
      keyboardTarget.removeEventListener('keyup', onKeyUp);
      keyboardTarget.removeEventListener('blur', onBlur);
      pointerTarget.removeEventListener('pointermove', onPointerMove);
      pointerTarget.removeEventListener('pointerdown', onPointerDown);
      pointerTarget.removeEventListener('pointerup', onPointerUp);
      this.clear();

      if (this.detachDom === detach) {
        this.detachDom = null;
      }
    };

    this.detachDom = detach;
    return detach;
  }

  public detach(): void {
    this.detachDom?.();
  }

  private axis(negativeAction: InputBindingAction, positiveAction: InputBindingAction): number {
    const negativeCode = this.bindings[negativeAction];
    const positiveCode = this.bindings[positiveAction];
    const negative = this.heldCodes.has(negativeCode) ? 1 : 0;
    const positive = this.heldCodes.has(positiveCode) ? 1 : 0;

    return positive - negative;
  }
}
