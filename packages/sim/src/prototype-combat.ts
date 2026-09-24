import {
  JAO_Q_DEFINITION,
  JAO_W_DEFINITION
} from '@junqverse/content';
import {
  createCombatantState,
  stepCombatant,
  tryAcceptAbility,
  tryStartDodge,
  type CombatantState
} from './abilities.js';
import {
  createJaoUltimateState,
  type JaoUltimateState
} from './heroes/jao-advanced.js';
import type { CombatResources } from './resources.js';

export interface PrototypeCombatCommand {
  readonly qPressed: boolean;
  readonly wPressed: boolean;
  readonly dodgePressed: boolean;
}

export interface PrototypeCombatState {
  readonly combatant: CombatantState;
  readonly ultimate: JaoUltimateState;
}

export interface PrototypeCombatSnapshot {
  readonly resources: CombatResources;
  readonly ultimate: JaoUltimateState;
  readonly activeAbilityId: string | null;
  readonly dodgeActive: boolean;
}

export function createPrototypeCombatState(
  playerEntityId: number,
  ultimateCharge = 0
): PrototypeCombatState {
  return {
    combatant: createCombatantState(playerEntityId),
    ultimate: createJaoUltimateState(ultimateCharge)
  };
}

export function stepPrototypeCombat(
  state: PrototypeCombatState,
  command: PrototypeCombatCommand
): PrototypeCombatState {
  let combatant = stepCombatant(state.combatant);

  if (command.dodgePressed) {
    combatant = tryStartDodge(combatant, {
      stunned: false
    }).state;

    return {
      ...state,
      combatant
    };
  }

  const ability = command.qPressed
    ? JAO_Q_DEFINITION
    : command.wPressed
      ? JAO_W_DEFINITION
      : null;

  if (ability !== null) {
    combatant = tryAcceptAbility(
      combatant,
      { ability },
      {
        targetValid: true,
        stunned: false
      }
    ).state;
  }

  return {
    ...state,
    combatant
  };
}

export function createPrototypeCombatSnapshot(
  state: PrototypeCombatState
): PrototypeCombatSnapshot {
  return {
    resources: state.combatant.resources,
    ultimate: state.ultimate,
    activeAbilityId: state.combatant.activeCast?.abilityId ?? null,
    dodgeActive: state.combatant.dodge !== null
  };
}
