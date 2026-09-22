import { advanceTick, assertValidTick, type Tick } from './clock.js';
import { createRng, nextRandom, type RngState } from './rng.js';

export type EntityId = number;

export type WorldEvent = {
  readonly eventId: string;
  readonly runId: string;
  readonly tick: Tick;
  readonly counter: number;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
};

export type WorldState = {
  readonly runId: string;
  readonly tick: Tick;
  readonly rng: RngState;
  readonly nextEntityId: EntityId;
  readonly nextEventCounter: number;
};

export type WorldAllocation = {
  readonly world: WorldState;
  readonly entityId: EntityId;
};

export type WorldRandomSample = {
  readonly world: WorldState;
  readonly uint32: number;
  readonly unit: number;
};

export type WorldEventEmission = {
  readonly world: WorldState;
  readonly event: WorldEvent;
};

export type CreateWorldOptions = {
  readonly runId: string;
  readonly seed: number;
};

function assertCounter(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${label} must be a positive safe integer`);
  }
}

export function createWorld(options: CreateWorldOptions): WorldState {
  if (options.runId.length === 0) {
    throw new RangeError('runId must not be empty');
  }

  return {
    runId: options.runId,
    tick: 0,
    rng: createRng(options.seed),
    nextEntityId: 1,
    nextEventCounter: 1
  };
}

/**
 * T004 has only the clock system. Later tickets append systems after this
 * clock advance, keeping one explicit deterministic order per tick.
 */
function stepOneTick(world: WorldState): WorldState {
  return {
    ...world,
    tick: advanceTick(world.tick)
  };
}

export function stepWorld(world: WorldState, ticks = 1): WorldState {
  assertValidTick(ticks);

  let nextWorld = world;
  for (let index = 0; index < ticks; index += 1) {
    nextWorld = stepOneTick(nextWorld);
  }
  return nextWorld;
}

export function allocateEntityId(world: WorldState): WorldAllocation {
  assertCounter(world.nextEntityId, 'nextEntityId');
  if (world.nextEntityId === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('entityId overflow');
  }

  return {
    entityId: world.nextEntityId,
    world: {
      ...world,
      nextEntityId: world.nextEntityId + 1
    }
  };
}

export function sampleWorldRandom(world: WorldState): WorldRandomSample {
  const sample = nextRandom(world.rng);
  return {
    world: {
      ...world,
      rng: sample.state
    },
    uint32: sample.uint32,
    unit: sample.unit
  };
}

export function emitWorldEvent(
  world: WorldState,
  type: string,
  payload: Readonly<Record<string, unknown>> = {}
): WorldEventEmission {
  assertCounter(world.nextEventCounter, 'nextEventCounter');
  if (type.length === 0) {
    throw new RangeError('event type must not be empty');
  }
  if (world.nextEventCounter === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('event counter overflow');
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
