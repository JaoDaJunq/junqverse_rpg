export type InputBindingAction =
  | 'move_up'
  | 'move_down'
  | 'move_left'
  | 'move_right'
  | 'q'
  | 'w'
  | 'e'
  | 'r'
  | 'dodge'
  | 'interact';

export type InputBindings = Readonly<Record<InputBindingAction, string>>;

export const DEFAULT_BINDINGS: InputBindings = {
  move_up: 'KeyW',
  move_down: 'KeyS',
  move_left: 'KeyA',
  move_right: 'KeyD',
  q: 'Digit1',
  w: 'Digit2',
  e: 'Digit3',
  r: 'KeyR',
  dodge: 'Space',
  interact: 'KeyF'
};

export function validateBindings(bindings: InputBindings): void {
  const seen = new Map<string, InputBindingAction>();

  for (const [action, code] of Object.entries(bindings) as Array<[InputBindingAction, string]>) {
    if (code.length === 0) {
      throw new Error(`binding for ${action} cannot be empty`);
    }

    const existing = seen.get(code);
    if (existing) {
      throw new Error(`binding conflict: ${code} is already used by ${existing}`);
    }

    seen.set(code, action);
  }
}

export function rebindInput(
  bindings: InputBindings,
  action: InputBindingAction,
  code: string
): InputBindings {
  const next: InputBindings = {
    ...bindings,
    [action]: code
  };

  validateBindings(next);
  return next;
}

export function actionForCode(
  bindings: InputBindings,
  code: string
): InputBindingAction | null {
  for (const [action, bindingCode] of Object.entries(bindings) as Array<[InputBindingAction, string]>) {
    if (bindingCode === code) {
      return action;
    }
  }

  return null;
}
