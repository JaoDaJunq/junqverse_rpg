import type { InputFrame } from '@junqverse/protocol';
import {
  TICKS_PER_SECOND,
  applyPrototypePlayerDelta,
  createPrototypeCombatSnapshot,
  createPrototypeCombatState,
  createPrototypeSnapshot,
  resolvePrototypeBasicAttack,
  stepPrototypeCombat,
  stepPrototypeWorld,
  type PrototypeCombatCommand,
  type PrototypeCombatSnapshot,
  type PrototypeCombatState,
  type PrototypeSnapshot,
  type PrototypeWorldState
} from '@junqverse/sim';

const TICK_MS = 1000 / TICKS_PER_SECOND;
const LOOP_EPSILON_MS = 1e-7;
const AIM_EPSILON = 1e-9;

export interface SessionInputSource {
  nextFrame(clientTick: number): InputFrame;
  clear(): void;
}

export interface LocalSessionSnapshot extends PrototypeSnapshot {
  readonly combat: PrototypeCombatSnapshot;
}

export interface GameSession {
  advance(renderDeltaMs: number): LocalSessionSnapshot;
  getSnapshot(): LocalSessionSnapshot;
  restart(): LocalSessionSnapshot;
  setPaused(paused: boolean): void;
  isPaused(): boolean;
  stop(): void;
}

function clonePrototypeWorldState(
  state: PrototypeWorldState
): PrototypeWorldState {
  return {
    ...state,
    rng: { ...state.rng },
    blockers: state.blockers.map((blocker) => ({ ...blocker })),
    player: {
      ...state.player,
      previousPosition: { ...state.player.previousPosition },
      position: { ...state.player.position }
    },
    enemies: state.enemies.map((enemy) => ({
      ...enemy,
      previousPosition: { ...enemy.previousPosition },
      position: { ...enemy.position },
      health: {
        ...enemy.health,
        shields: {
          bySource: { ...enemy.health.shields.bySource }
        }
      },
      status: {
        ...enemy.status,
        effects: enemy.status.effects.map((effect) => ({ ...effect }))
      }
    }))
  };
}

function combatCommandFromFrame(
  frame: InputFrame,
  state: PrototypeWorldState
): PrototypeCombatCommand {
  const aimDelta = {
    x: frame.aimX - state.player.position.x,
    y: frame.aimY - state.player.position.y
  };
  const aimLength = Math.hypot(aimDelta.x, aimDelta.y);
  const aimDirection = aimLength > AIM_EPSILON
    ? {
        x: aimDelta.x / aimLength,
        y: aimDelta.y / aimLength
      }
    : null;

  return {
    qPressed: frame.pressed.includes('q'),
    qDirection: aimDirection,
    wPressed: frame.pressed.includes('w'),
    dodgePressed: frame.pressed.includes('dodge'),
    basicHeld: frame.basicHeld,
    basicDirection: aimDirection
  };
}

export class LocalSession implements GameSession {
  private state: PrototypeWorldState;
  private combat: PrototypeCombatState;
  private readonly initialState: PrototypeWorldState;
  private readonly input: SessionInputSource;
  private accumulatorMs = 0;
  private paused = false;
  private stopped = false;

  public constructor(
    initialState: PrototypeWorldState,
    input: SessionInputSource
  ) {
    this.initialState = clonePrototypeWorldState(initialState);
    this.state = clonePrototypeWorldState(initialState);
    this.combat = createPrototypeCombatState(
      this.state.player.entityId
    );
    this.input = input;
  }

  public advance(renderDeltaMs: number): LocalSessionSnapshot {
    if (!Number.isFinite(renderDeltaMs) || renderDeltaMs < 0) {
      throw new RangeError('render delta must be non-negative and finite');
    }

    if (this.stopped || this.paused) {
      return this.getSnapshot();
    }

    this.accumulatorMs += renderDeltaMs;

    while (this.accumulatorMs + LOOP_EPSILON_MS >= TICK_MS) {
      const frame = this.input.nextFrame(this.state.tick);
      const combatStep = stepPrototypeCombat(
        this.combat,
        combatCommandFromFrame(frame, this.state)
      );
      this.combat = combatStep.state;

      let normalMovement = combatStep.movement.kind === 'normal'
        ? { x: frame.moveX, y: frame.moveY }
        : { x: 0, y: 0 };

      if (combatStep.basicDirection !== null) {
        const basic = resolvePrototypeBasicAttack(
          this.combat,
          this.state,
          combatStep.basicDirection
        );
        this.combat = basic.state;
        this.state = basic.world;

        if (basic.accepted) {
          normalMovement = { x: 0, y: 0 };
        }
      }

      this.state = stepPrototypeWorld(
        this.state,
        normalMovement
      );

      if (combatStep.movement.kind === 'q_dash') {
        const movement = combatStep.movement;
        const moved = applyPrototypePlayerDelta(
          this.state,
          {
            x: movement.direction.x * movement.distancePx,
            y: movement.direction.y * movement.distancePx
          }
        );
        this.state = moved.state;
      }

      this.accumulatorMs = Math.max(0, this.accumulatorMs - TICK_MS);
    }

    return this.getSnapshot();
  }

  public getSnapshot(): LocalSessionSnapshot {
    return {
      ...createPrototypeSnapshot(
        this.state,
        this.accumulatorMs / TICK_MS
      ),
      combat: createPrototypeCombatSnapshot(this.combat)
    };
  }

  public restart(): LocalSessionSnapshot {
    if (this.stopped) {
      throw new Error('cannot restart a stopped session');
    }

    this.state = clonePrototypeWorldState(this.initialState);
    this.combat = createPrototypeCombatState(
      this.state.player.entityId
    );
    this.accumulatorMs = 0;
    this.paused = false;
    this.input.clear();

    return this.getSnapshot();
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
