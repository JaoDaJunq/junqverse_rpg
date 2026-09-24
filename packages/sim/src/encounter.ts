import type { Vec2 } from '@junqverse/content';
import {
  createCombatantState,
  killCombatant,
  type CombatantState
} from './abilities.js';
import {
  createHealthState,
  type HealthState
} from './damage.js';
import {
  createHitRegistry,
  type HitRegistry
} from './hit-registry.js';
import type { ProjectileState } from './projectiles.js';
import {
  createResonanceState,
  type ResonanceState
} from './resonance.js';
import {
  createStatusState,
  type StatusState
} from './status.js';
import type { ZoneState } from './areas.js';
import {
  clearJaoTransientBuffsOnDeath,
  createJaoUltimateState,
  type JaoTransientAbilityState
} from './heroes/jao-advanced.js';

export interface EncounterCheckpoint {
  readonly checkpointId: string;
  readonly playerEntityId: number;
  readonly playerSpawn: Vec2;
  readonly playerMaxHealth: number;
  readonly playerArmor: number;
  readonly ultimateCharge: number;
  readonly enemyEntityIds: readonly number[];
}

export interface EncounterPlayerState {
  readonly position: Vec2;
  readonly health: HealthState;
  readonly combatant: CombatantState;
  readonly status: StatusState;
  readonly transient: JaoTransientAbilityState;
}

export interface EncounterState {
  readonly checkpoint: EncounterCheckpoint;
  readonly generation: number;
  readonly defeated: boolean;
  readonly player: EncounterPlayerState;
  readonly activeEnemyEntityIds: readonly number[];
  readonly projectiles: readonly ProjectileState[];
  readonly zones: readonly ZoneState[];
  readonly hitRegistry: HitRegistry;
  readonly resonance: ResonanceState;
}

function assertStableId(value: string, name: string): void {
  if (!/^[a-z0-9_:-]{1,96}$/.test(value) || value === '__proto__') {
    throw new RangeError(`${name} must be a valid stable id`);
  }
}

function assertEntityId(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function assertFiniteVec(value: Vec2, name: string): void {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new RangeError(`${name} must contain finite coordinates`);
  }
}

function cloneCheckpoint(checkpoint: EncounterCheckpoint): EncounterCheckpoint {
  assertStableId(checkpoint.checkpointId, 'checkpointId');
  assertEntityId(checkpoint.playerEntityId, 'playerEntityId');
  assertFiniteVec(checkpoint.playerSpawn, 'playerSpawn');

  if (!Number.isFinite(checkpoint.playerMaxHealth) || checkpoint.playerMaxHealth <= 0) {
    throw new RangeError('playerMaxHealth must be positive and finite');
  }
  if (!Number.isFinite(checkpoint.playerArmor) || checkpoint.playerArmor < 0) {
    throw new RangeError('playerArmor must be non-negative and finite');
  }
  if (
    !Number.isFinite(checkpoint.ultimateCharge) ||
    checkpoint.ultimateCharge < 0 ||
    checkpoint.ultimateCharge > 100
  ) {
    throw new RangeError('ultimateCharge must be between 0 and 100');
  }

  const enemyEntityIds = [...checkpoint.enemyEntityIds];
  const seen = new Set<number>();

  for (const entityId of enemyEntityIds) {
    assertEntityId(entityId, 'enemyEntityId');
    if (entityId === checkpoint.playerEntityId) {
      throw new Error('playerEntityId cannot also be an enemyEntityId');
    }
    if (seen.has(entityId)) {
      throw new Error('enemyEntityIds must be unique');
    }
    seen.add(entityId);
  }

  return {
    ...checkpoint,
    playerSpawn: { ...checkpoint.playerSpawn },
    enemyEntityIds
  };
}

function createEncounterStateFromCheckpoint(
  checkpoint: EncounterCheckpoint,
  generation: number
): EncounterState {
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new RangeError('generation must be a non-negative safe integer');
  }

  const snapshot = cloneCheckpoint(checkpoint);
  const ultimate = createJaoUltimateState(snapshot.ultimateCharge);

  return {
    checkpoint: snapshot,
    generation,
    defeated: false,
    player: {
      position: { ...snapshot.playerSpawn },
      health: createHealthState(
        snapshot.playerMaxHealth,
        snapshot.playerArmor
      ),
      combatant: createCombatantState(snapshot.playerEntityId),
      status: createStatusState(),
      transient: {
        ultimate,
        eCharge: null
      }
    },
    activeEnemyEntityIds: [...snapshot.enemyEntityIds],
    projectiles: [],
    zones: [],
    hitRegistry: createHitRegistry(),
    resonance: createResonanceState()
  };
}

export function createEncounterState(
  checkpoint: EncounterCheckpoint
): EncounterState {
  return createEncounterStateFromCheckpoint(checkpoint, 0);
}

export function defeatEncounter(state: EncounterState): EncounterState {
  if (state.defeated) {
    return state;
  }

  return {
    ...state,
    defeated: true,
    player: {
      ...state.player,
      health: {
        ...state.player.health,
        health: 0,
        alive: false,
        shields: { bySource: {} }
      },
      combatant: killCombatant(state.player.combatant),
      status: createStatusState(),
      transient: clearJaoTransientBuffsOnDeath(state.player.transient)
    },
    activeEnemyEntityIds: [],
    projectiles: [],
    zones: [],
    hitRegistry: createHitRegistry(),
    resonance: createResonanceState()
  };
}

export function restartEncounter(state: EncounterState): EncounterState {
  if (state.generation >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError('encounter generation overflow');
  }

  return createEncounterStateFromCheckpoint(
    state.checkpoint,
    state.generation + 1
  );
}
