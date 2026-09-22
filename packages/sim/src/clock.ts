export const TICKS_PER_SECOND = 60 as const;
export const FIXED_DT_SECONDS = 1 / TICKS_PER_SECOND;

export type Tick = number;

export function assertValidTick(tick: number): asserts tick is Tick {
  if (!Number.isSafeInteger(tick) || tick < 0) {
    throw new RangeError('tick must be a non-negative safe integer');
  }
}

export function ticksToSeconds(ticks: number): number {
  assertValidTick(ticks);
  return ticks / TICKS_PER_SECOND;
}

export function advanceTick(tick: Tick): Tick {
  assertValidTick(tick);
  if (tick === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('tick overflow');
  }
  return tick + 1;
}
