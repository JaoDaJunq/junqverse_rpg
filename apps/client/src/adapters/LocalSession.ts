import type { InputFrame } from '@junqverse/protocol';
import {
  TICKS_PER_SECOND,
  createPrototypeSnapshot,
  stepPrototypeWorld,
  type PrototypeSnapshot,
  type PrototypeWorldState
} from '@junqverse/sim';

const TICK_MS = 1000 / TICKS_PER_SECOND;
const LOOP_EPSILON_MS = 1e-7;

export interface SessionInputSource {
  nextFrame(clientTick: number): InputFrame;
  clear(): void;
}

export interface GameSession {
  advance(renderDeltaMs: number): PrototypeSnapshot;
  getSnapshot(): PrototypeSnapshot;
  setPaused(paused: boolean): void;
  isPaused(): boolean;
  stop(): void;
}

export class LocalSession implements GameSession {
  private state: PrototypeWorldState;
  private readonly input: SessionInputSource;
  private accumulatorMs = 0;
  private paused = false;
  private stopped = false;

  public constructor(
    initialState: PrototypeWorldState,
    input: SessionInputSource
  ) {
    this.state = initialState;
    this.input = input;
  }

  public advance(renderDeltaMs: number): PrototypeSnapshot {
    if (!Number.isFinite(renderDeltaMs) || renderDeltaMs < 0) {
      throw new RangeError('render delta must be non-negative and finite');
    }

    if (this.stopped || this.paused) {
      return this.getSnapshot();
    }

    this.accumulatorMs += renderDeltaMs;

    while (this.accumulatorMs + LOOP_EPSILON_MS >= TICK_MS) {
      const frame = this.input.nextFrame(this.state.tick);
      this.state = stepPrototypeWorld(this.state, {
        x: frame.moveX,
        y: frame.moveY
      });
      this.accumulatorMs = Math.max(0, this.accumulatorMs - TICK_MS);
    }

    return this.getSnapshot();
  }

  public getSnapshot(): PrototypeSnapshot {
    return createPrototypeSnapshot(
      this.state,
      this.accumulatorMs / TICK_MS
    );
  }

  public setPaused(paused: boolean): void {
    if (this.stopped || this.paused === paused) {
      return;
    }

    this.paused = paused;
    this.input.clear();

    if (paused) {
      this.accumulatorMs = 0;
    }
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public stop(): void {
    if (this.stopped) {
      return;
    }

    this.stopped = true;
    this.paused = true;
    this.accumulatorMs = 0;
    this.input.clear();
  }
}
