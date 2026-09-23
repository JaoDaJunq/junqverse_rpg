import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  allocateEntityId,
  createWorld,
  emitWorldEvent,
  nextWorldRandom,
  stepWorld,
  ticksToSeconds
} from '../packages/sim/src/index.js';

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? listTypeScriptFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('T004 deterministic simulation core', () => {
  it('produces the same state and RNG sequence for the same seed and inputs', () => {
    let worldA = createWorld('run_test', 123456);
    let worldB = createWorld('run_test', 123456);

    const valuesA: number[] = [];
    const valuesB: number[] = [];

    for (let index = 0; index < 8; index += 1) {
      const randomA = nextWorldRandom(worldA);
      const randomB = nextWorldRandom(worldB);
      worldA = randomA.world;
      worldB = randomB.world;
      valuesA.push(randomA.value);
      valuesB.push(randomB.value);
    }

    worldA = stepWorld(worldA, [], 12).world;
    worldB = stepWorld(worldB, [], 12).world;

    expect(valuesA).toEqual(valuesB);
    expect(worldA).toEqual(worldB);
  });

  it('advances 600 fixed ticks to exactly ten seconds', () => {
    const world = stepWorld(createWorld('run_clock', 1), [], 600).world;

    expect(world.tick).toBe(600);
    expect(ticksToSeconds(world.tick)).toBe(10);
  });

  it('allocates monotonic entity ids', () => {
    const first = allocateEntityId(createWorld('run_entities', 1));
    const second = allocateEntityId(first.world);
    const third = allocateEntityId(second.world);

    expect([first.entityId, second.entityId, third.entityId]).toEqual([1, 2, 3]);
  });

  it('creates unique stable ordered event ids', () => {
    const world = createWorld('run_events', 1);
    const first = emitWorldEvent(world, 'entity_spawned', { entityId: 1 });
    const second = emitWorldEvent(first.world, 'entity_spawned', { entityId: 2 });
    const nextTick = stepWorld(second.world, [], 1).world;
    const third = emitWorldEvent(nextTick, 'entity_moved', { entityId: 1 });

    expect([first.event.eventId, second.event.eventId, third.event.eventId]).toEqual([
      'run_events:0:0',
      'run_events:0:1',
      'run_events:1:0'
    ]);
    expect([first.event.counter, second.event.counter, third.event.counter]).toEqual([0, 1, 0]);
  });

  it('does not allow real-time, random or rendering dependencies in sim', () => {
    const source = listTypeScriptFiles('packages/sim/src')
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');

    for (const forbidden of [
      'Date.now',
      'new Date(',
      'Math.random',
      'setTimeout',
      'setInterval',
      "from 'phaser'",
      'from "phaser"',
      'document.',
      'window.'
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('rejects non-empty input before T005 rather than silently ignoring it', () => {
    expect(() => stepWorld(createWorld('run_input', 1), [{ seq: 1 }], 1))
      .toThrow('not implemented before T005');
  });
});
