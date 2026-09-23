import { describe, expect, it } from 'vitest';
import {
  allocateEntityId,
  createWorld,
  emitWorldEvent,
  nextWorldRandom,
  stepWorld,
  ticksToSeconds
} from '../packages/sim/src/index.js';

describe('T004 independent review', () => {
  it('advances 600 individual fixed steps to ten seconds', () => {
    let world = createWorld('review_clock', 42);

    for (let index = 0; index < 600; index += 1) {
      world = stepWorld(world, [], 1).world;
    }

    expect(world.tick).toBe(600);
    expect(ticksToSeconds(world.tick)).toBe(10);
  });

  it('does not mutate prior world states', () => {
    const original = createWorld('review_pure', 42);
    const allocated = allocateEntityId(original);
    const random = nextWorldRandom(original);
    const emitted = emitWorldEvent(original, 'entity_spawned', { entityId: 1 });
    const stepped = stepWorld(original, [], 1);

    expect(original).toEqual(createWorld('review_pure', 42));
    expect(allocated.world).not.toBe(original);
    expect(random.world).not.toBe(original);
    expect(emitted.world).not.toBe(original);
    expect(stepped.world).not.toBe(original);
  });

  it('is deterministic across independently-created worlds', () => {
    const run = () => {
      let world = createWorld('review_determinism', 987654321);
      const trace: unknown[] = [];

      for (let index = 0; index < 16; index += 1) {
        const random = nextWorldRandom(world);
        world = random.world;
        trace.push(random.value);

        const entity = allocateEntityId(world);
        world = entity.world;
        trace.push(entity.entityId);

        const event = emitWorldEvent(world, 'entity_spawned', { entityId: entity.entityId });
        world = event.world;
        trace.push(event.event);

        world = stepWorld(world, [], 1).world;
      }

      return { world, trace };
    };

    expect(run()).toEqual(run());
  });

  it('keeps event counters ordered within tick and resets only on step', () => {
    let world = createWorld('review_events', 1);
    const events = [];

    for (let index = 0; index < 4; index += 1) {
      const emitted = emitWorldEvent(world, 'entity_spawned', { index });
      world = emitted.world;
      events.push(emitted.event);
    }

    expect(events.map((event) => event.counter)).toEqual([0, 1, 2, 3]);
    expect(new Set(events.map((event) => event.eventId)).size).toBe(4);

    world = stepWorld(world, [], 1).world;
    const afterStep = emitWorldEvent(world, 'entity_moved', {});
    expect(afterStep.event.counter).toBe(0);
    expect(afterStep.event.tick).toBe(1);
  });

  it('uses different deterministic streams for different seeds', () => {
    const a = nextWorldRandom(createWorld('seed_a', 1)).value;
    const b = nextWorldRandom(createWorld('seed_b', 2)).value;

    expect(a).not.toBe(b);
  });
});
