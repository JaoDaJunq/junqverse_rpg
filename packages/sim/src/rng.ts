export type RngState = {
  readonly value: number;
};

export type RandomSample = {
  readonly state: RngState;
  readonly uint32: number;
  readonly unit: number;
};

const UINT32_RANGE = 0x1_0000_0000;
const ZERO_SEED_FALLBACK = 0x6d2b79f5;

function toUint32(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError('seed must be a safe integer');
  }
  return value >>> 0;
}

export function createRng(seed: number): RngState {
  const normalized = toUint32(seed);
  return {
    value: normalized === 0 ? ZERO_SEED_FALLBACK : normalized
  };
}

/**
 * xorshift32. The RNG state is explicit and serializable so simulation
 * randomness is reproducible and never depends on Math.random.
 */
export function nextRandom(state: RngState): RandomSample {
  let value = state.value >>> 0;

  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  value >>>= 0;

  return {
    state: { value },
    uint32: value,
    unit: value / UINT32_RANGE
  };
}
