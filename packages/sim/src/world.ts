import type { JsonObject } from '@junqverse/content';
import { createRng, nextFloat01, type RngState } from './rng.js';

export const WORLD_STEP_ORDER = [
  'validate_inputs',
  'expire_states',
  'movement_collision',
  'casts_projectiles',
  'impacts_damage',
  'deaths',
  'objectives',
  'rewards_checkpoint',
  'snapshot'
] as const;

export interface WorldState {
  readonly runId: string;
  readonly tick: number;
  readonly rng: RngState;
  readonly nextEntityId: number;
  readonly nextEventCounter: number;
}

export interface WorldEvent {
  readonly eventId: string;
  readonly runId: string;
  readonly tick: number;
  readonly counter: number;
  readonly type: string;
  readonly payload: JsonObject;
}

export interface StepWorldResult {
  readonly world: WorldState;
  readonly events: readonly WorldEvent[];
}

export interface AllocatedEntity {
  readonly world: WorldState;
  readonly entityId: number;
}

export interface WorldRandomResult {
  readonly world: WorldState;
  readonly value: number;
}

export function createWorld(runId: string, seed: number): WorldState {
  if (!/^[a-z0-9_:-]{1,96}$/.test(runId) || runId === '__proto__') {
    throw new RangeError('runId must be a valid stable id');
  }

  return {
    runId,
    tick: 0,
    rng: createRng(seed),
    nextEntityId: 1,
    nextEventCounter: 0
  };
}

export function allocateEntityId(world: WorldState): AllocatedEntity {
  return {
    entityId: world.nextEntityId,
    world: {
      ...world,
      nextEntityId: world.nextEntityId + 1
    }
  };
}

export function nextWorldRandom(world: WorldState): WorldRandomResult {
  const result = nextFloat01(world.rng);
  return {
    value: result.value,
    world: {
      ...world,
      rng: result.state
    }
  };
}

export function emitWorldEvent(
  world: WorldState,
  type: string,
  payload: JsonObject
): { readonly world: WorldState; readonly event: WorldEvent } {
  if (!/^[a-z0-9_:-]{1,96}$/.test(type) || type === '__proto__') {
    throw new RangeError('event type must be a valid stable id');
  }

  const counter = world.nextEventCounter;
  const event: WorldEvent = {
    eventId: `${world.runId}:${world.tick}:${counter}`,
    runId: world.runId,
    tick: world.tick,
    counter,
    type,
    payload
  };

  return {
    event,
    world: {
      ...world,
      nextEventCounter: counter + 1
    }
  };
}

export function stepWorld(
  world: WorldState,
  inputs: readonly unknown[],
  ticks = 1
): StepWorldResult {
  if (inputs.length > 0) {
    throw new Error('base stepWorld does not process direct inputs; use a simulation adapter');
  }

  if (!Number.isInteger(ticks) || ticks < 0) {
    throw new RangeError('ticks must be a non-negative integer');
  }

  let next = world;

  for (let index = 0; index < ticks; index += 1) {
    next = {
      ...next,
      tick: next.tick + 1,
      nextEventCounter: 0
    };
  }

  return {
    world: next,
    events: []
  };
}
