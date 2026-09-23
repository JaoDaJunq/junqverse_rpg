export interface RngState {
  readonly value: number;
}

export interface RngResult<T> {
  readonly state: RngState;
  readonly value: T;
}

function normalizeSeed(seed: number): number {
  if (!Number.isInteger(seed) || !Number.isFinite(seed)) {
    throw new RangeError('seed must be a finite integer');
  }

  const normalized = seed >>> 0;
  return normalized === 0 ? 0x6d2b79f5 : normalized;
}

export function createRng(seed: number): RngState {
  return { value: normalizeSeed(seed) };
}

export function nextUint32(state: RngState): RngResult<number> {
  let value = state.value >>> 0;

  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;

  const next = value >>> 0;
  return {
    state: { value: next },
    value: next
  };
}

export function nextFloat01(state: RngState): RngResult<number> {
  const result = nextUint32(state);
  return {
    state: result.state,
    value: result.value / 0x1_0000_0000
  };
}
