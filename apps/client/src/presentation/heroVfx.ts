export interface JaoUltimateVfxState {
  readonly afterimageEnabled: boolean;
  readonly localMotionEmphasis: number;
}

export function createJaoUltimateVfxState(
  active: boolean
): JaoUltimateVfxState {
  return {
    afterimageEnabled: active,
    localMotionEmphasis: active ? 1 : 0
  };
}
