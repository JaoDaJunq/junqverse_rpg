import type { Vec2 } from '@junqverse/content';
import {
  createJaoPassiveState,
  observeJaoEnemyAction,
  type JaoPassiveState
} from '../heroes/jao.js';

export interface JaoReadingTestRoomState {
  readonly jaoPosition: Vec2;
  readonly enemyEntityId: number;
  readonly enemyPosition: Vec2;
  readonly enemyFamilyId: string;
  readonly passive: JaoPassiveState;
}

export function createJaoReadingTestRoom(): JaoReadingTestRoomState {
  return {
    jaoPosition: { x: 0, y: 0 },
    enemyEntityId: 2,
    enemyPosition: { x: 120, y: 0 },
    enemyFamilyId: 'test_burst',
    passive: createJaoPassiveState()
  };
}

export function observeJaoTestRoomEnemyAction(
  state: JaoReadingTestRoomState,
  enemyActionId: string,
  currentTick: number
): {
  readonly state: JaoReadingTestRoomState;
  readonly analyzedApplied: boolean;
} {
  const observed = observeJaoEnemyAction(state.passive, {
    jaoPosition: state.jaoPosition,
    enemyEntityId: state.enemyEntityId,
    enemyPosition: state.enemyPosition,
    familyId: state.enemyFamilyId,
    enemyActionId,
    currentTick
  });

  return {
    state: {
      ...state,
      passive: observed.state
    },
    analyzedApplied: observed.analyzedApplied
  };
}
