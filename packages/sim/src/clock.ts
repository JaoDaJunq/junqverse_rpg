export const TICKS_PER_SECOND = 60;
export const FIXED_DT_SECONDS = 1 / TICKS_PER_SECOND;

export function ticksToSeconds(ticks: number): number {
  if (!Number.isInteger(ticks) || ticks < 0) {
    throw new RangeError('ticks must be a non-negative integer');
  }

  return ticks / TICKS_PER_SECOND;
}

export function secondsToTicks(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError('seconds must be a non-negative finite number');
  }

  return Math.round(seconds * TICKS_PER_SECOND);
}
