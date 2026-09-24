import type { InputFrame } from '@junqverse/protocol';
import {
  TICKS_PER_SECOND,
  applyPrototypeEnemyAttacks,
  applyPrototypePlayerDelta,
  createPrototypeCombatSnapshot,
  createPrototypeCombatState,
  defeatPrototypeCombat,
  createPrototypeSnapshot,
  isDodgeInvulnerable,
  resolvePrototypeBasicAttack,
  resolvePrototypeE,
  resolvePrototypeQ,
  resolvePrototypeW,
  stepPrototypeCombat,
  stepPrototypeEnemyAi,
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

export interface LocalSessionOptions {
  readonly initialUltimateCharge?: number;
  readonly enemyAiEnabled?: boolean;
  readonly enemyAttacksEnabled?: boolean;
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
    grid: { ...state.grid },
    player: {
      ...state.player,
      previousPosition: { ...state.player.previousPosition },
      position: { ...state.player.position },
      health: {
        ...state.player.health,
        shields: {
          bySource: { ...state.player.health.shields.bySource }
        }
      }
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
      },
      ai: {
        ...enemy.ai,
        desiredMovement: { ...enemy.ai.desiredMovement }
      }
    }))
  };
}

function combatCommandFromFrame(
  frame: InputFrame,
  state: PrototypeWorldState,
  lastAimDirection: { readonly x: number; readonly y: number }
): {
  readonly command: PrototypeCombatCommand;
  readonly nextAimDirection: { readonly x: number; readonly y: number };
} {
  const aimDelta = {
    x: frame.aimX - state.player.position.x,
    y: frame.aimY - state.player.position.y
  };
  const aimLength = Math.hypot(aimDelta.x, aimDelta.y);
  const nextAimDirection = aimLength > AIM_EPSILON
    ? {
        x: aimDelta.x / aimLength,
        y: aimDelta.y / aimLength
      }
    : lastAimDirection;
  const aimDirection = nextAimDirection;
  const moveLength = Math.hypot(frame.moveX, frame.moveY);
  const dodgeDirection = moveLength > AIM_EPSILON
    ? {
        x: frame.moveX / moveLength,
        y: frame.moveY / moveLength
      }
    : aimDirection;

  return {
    command: {
      qPressed: frame.pressed.includes('q'),
    qDirection: aimDirection,
    wPressed: frame.pressed.includes('w'),
    rPressed: frame.pressed.includes('r'),
    ePressed: frame.pressed.includes('e'),
    eReleased: frame.released.includes('e'),
    eDirection: aimDirection,
    dodgePressed: frame.pressed.includes('dodge'),
    dodgeDirection,
      basicHeld: frame.basicHeld,
      basicDirection: aimDirection
    },
    nextAimDirection
  };
}

export class LocalSession implements GameSession {
  private state: PrototypeWorldState;
  private combat: PrototypeCombatState;
  private readonly initialState: PrototypeWorldState;
  private readonly input: SessionInputSource;
  private readonly initialUltimateCharge: number;
  private readonly enemyAiEnabled: boolean;
  private readonly enemyAttacksEnabled: boolean;
  private lastAimDirection = { x: 1, y: 0 };
  private accumulatorMs = 0;
  private paused = false;
  private stopped = false;

  public constructor(
    initialState: PrototypeWorldState,
    input: SessionInputSource,
    options: LocalSessionOptions = {}
  ) {
    this.initialState = clonePrototypeWorldState(initialState);
    this.state = clonePrototypeWorldState(initialState);
    this.initialUltimateCharge = options.initialUltimateCharge ?? 0;
    this.enemyAttacksEnabled =
      options.enemyAttacksEnabled ?? false;
    this.enemyAiEnabled =
      options.enemyAiEnabled ?? this.enemyAttacksEnabled;
    this.combat = createPrototypeCombatState(
      this.state.player.entityId,
      this.initialUltimateCharge
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
      const mapped = combatCommandFromFrame(
        frame,
        this.state,
        this.lastAimDirection
      );
      this.lastAimDirection = mapped.nextAimDirection;
      const combatStep = stepPrototypeCombat(
        this.combat,
        mapped.command,
        this.state.tick
      );
      this.combat = combatStep.state;

      let normalMovement = combatStep.movement.kind === 'normal'
        ? {
            x: frame.moveX * combatStep.movement.multiplier,
            y: frame.moveY * combatStep.movement.multiplier
          }
        : { x: 0, y: 0 };

      if (
        frame.pressed.includes('q') &&
        combatStep.movement.kind === 'q_dash'
      ) {
        const attackInstanceId =
          this.combat.combatant.activeCast?.attackInstanceId;

        if (attackInstanceId !== undefined) {
          const q = resolvePrototypeQ(
            this.combat,
            this.state,
            attackInstanceId,
            combatStep.movement.direction
          );
          this.combat = q.state;
          this.state = q.world;
        }
      }

      if (combatStep.wActivated) {
        const w = resolvePrototypeW(
          this.combat,
          this.state
        );
        this.combat = w.state;
        this.state = w.world;
      }

      if (combatStep.eReleasePlan !== null) {
        const e = resolvePrototypeE(
          this.combat,
          this.state,
          combatStep.eReleasePlan
        );
        this.combat = e.state;
        this.state = e.world;
        normalMovement = { x: 0, y: 0 };
      }

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

      if (
        combatStep.movement.kind === 'q_dash' ||
        combatStep.movement.kind === 'dodge_dash'
      ) {
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

      if (this.enemyAiEnabled) {
        const ai = stepPrototypeEnemyAi(
          this.state,
          this.enemyAttacksEnabled
        );
        this.state = applyPrototypeEnemyAttacks(
          ai.state,
          ai.events,
          isDodgeInvulnerable(this.combat.combatant)
        );
      }

      if (!this.state.player.health.alive) {
        this.combat = defeatPrototypeCombat(this.combat);
        this.paused = true;
        this.accumulatorMs = 0;
        this.input.clear();
        break;
      }

      this.accumulatorMs = Math.max(0, this.accumulatorMs - TICK_MS);
    }

    return this.getSnapshot();
  }

  public getSnapshot(): LocalSessionSnapshot {
    return {
      ...createPrototypeSnapshot(
        this.state,
        this.accumulatorMs / TICK_MS,
        this.combat.resonance
      ),
      combat: createPrototypeCombatSnapshot(
        this.combat,
        this.state.tick
      )
    };
  }

  public restart(): LocalSessionSnapshot {
    if (this.stopped) {
      throw new Error('cannot restart a stopped session');
    }

    this.state = clonePrototypeWorldState(this.initialState);
    this.combat = createPrototypeCombatState(
      this.state.player.entityId,
      this.initialUltimateCharge
    );
    this.lastAimDirection = { x: 1, y: 0 };
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
