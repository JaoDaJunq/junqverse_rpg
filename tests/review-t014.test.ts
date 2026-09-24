import { describe, expect, it } from 'vitest';
import {
  ECO_RASTEIRO_DEFINITION
} from '../packages/content/src/index.js';
import {
  createEnemyAiState,
  stepEnemyAi,
  type GridSpec
} from '../packages/sim/src/index.js';

const GRID: GridSpec = {
  width: 8,
  height: 8,
  tileSize: 32
};

describe('T014 independent review', () => {
  it('does not let rastreador attack if attacks are disabled during telegraph', () => {
    let state = createEnemyAiState();
    const target = {
      entityId: 1,
      position: { x: 40, y: 0 }
    };

    const started = stepEnemyAi({
      state,
      archetype: 'eco_rasteiro',
      currentTick: 0,
      enemyEntityId: 2,
      position: { x: 0, y: 0 },
      target,
      blockers: [],
      grid: GRID,
      attacksEnabled: true
    });

    state = started.state;
    expect(started.events[0]?.kind).toBe('telegraph');

    for (
      let tick = 1;
      tick < ECO_RASTEIRO_DEFINITION.telegraphTicks;
      tick += 1
    ) {
      state = stepEnemyAi({
        state,
        archetype: 'eco_rasteiro',
        currentTick: tick,
        enemyEntityId: 2,
        position: { x: 0, y: 0 },
        target,
        blockers: [],
        grid: GRID,
        attacksEnabled: false
      }).state;
    }

    const resolved = stepEnemyAi({
      state,
      archetype: 'eco_rasteiro',
      currentTick: ECO_RASTEIRO_DEFINITION.telegraphTicks,
      enemyEntityId: 2,
      position: { x: 0, y: 0 },
      target,
      blockers: [],
      grid: GRID,
      attacksEnabled: false
    });

    expect(resolved.events).toEqual([]);
    expect(resolved.state.phase).toBe('approach');
  });

  it('materializes the attack phase before recovery', () => {
    let state = createEnemyAiState();
    const target = {
      entityId: 1,
      position: { x: 40, y: 0 }
    };

    state = stepEnemyAi({
      state,
      archetype: 'eco_rasteiro',
      currentTick: 0,
      enemyEntityId: 7,
      position: { x: 0, y: 0 },
      target,
      blockers: [],
      grid: GRID
    }).state;

    for (
      let tick = 1;
      tick < ECO_RASTEIRO_DEFINITION.telegraphTicks;
      tick += 1
    ) {
      state = stepEnemyAi({
        state,
        archetype: 'eco_rasteiro',
        currentTick: tick,
        enemyEntityId: 7,
        position: { x: 0, y: 0 },
        target,
        blockers: [],
        grid: GRID
      }).state;
    }

    const attack = stepEnemyAi({
      state,
      archetype: 'eco_rasteiro',
      currentTick: ECO_RASTEIRO_DEFINITION.telegraphTicks,
      enemyEntityId: 7,
      position: { x: 0, y: 0 },
      target,
      blockers: [],
      grid: GRID
    });

    expect(attack.events).toHaveLength(1);
    expect(attack.events[0]?.kind).toBe('attack');
    expect(attack.state.phase).toBe('attack');

    const recovery = stepEnemyAi({
      state: attack.state,
      archetype: 'eco_rasteiro',
      currentTick: ECO_RASTEIRO_DEFINITION.telegraphTicks + 1,
      enemyEntityId: 7,
      position: { x: 0, y: 0 },
      target,
      blockers: [],
      grid: GRID
    });

    expect(recovery.events).toEqual([]);
    expect(recovery.state.phase).toBe('recovery');
  });

  it('keeps enemy action ids unique after cancelled telegraphs', () => {
    let state = createEnemyAiState();
    const target = {
      entityId: 1,
      position: { x: 40, y: 0 }
    };

    const first = stepEnemyAi({
      state,
      archetype: 'eco_rasteiro',
      currentTick: 0,
      enemyEntityId: 4,
      position: { x: 0, y: 0 },
      target,
      blockers: [],
      grid: GRID
    });

    expect(first.events[0]?.enemyActionId).toBe('enemy_action:4:0');
    state = first.state;

    for (
      let tick = 1;
      tick <= ECO_RASTEIRO_DEFINITION.telegraphTicks;
      tick += 1
    ) {
      state = stepEnemyAi({
        state,
        archetype: 'eco_rasteiro',
        currentTick: tick,
        enemyEntityId: 4,
        position: { x: 0, y: 0 },
        target,
        blockers: [],
        grid: GRID,
        attacksEnabled: false
      }).state;
    }

    const restarted = stepEnemyAi({
      state,
      archetype: 'eco_rasteiro',
      currentTick: ECO_RASTEIRO_DEFINITION.telegraphTicks + 6,
      enemyEntityId: 4,
      position: { x: 0, y: 0 },
      target,
      blockers: [],
      grid: GRID,
      attacksEnabled: true
    });

    const telegraph = restarted.events.find((event) => event.kind === 'telegraph');
    expect(telegraph?.enemyActionId).toBe('enemy_action:4:1');
  });

  it('does not emit an attack when target disappears during telegraph', () => {
    let state = createEnemyAiState();
    const target = {
      entityId: 1,
      position: { x: 40, y: 0 }
    };

    const started = stepEnemyAi({
      state,
      archetype: 'eco_rasteiro',
      currentTick: 0,
      enemyEntityId: 3,
      position: { x: 0, y: 0 },
      target,
      blockers: [],
      grid: GRID
    });
    state = started.state;

    const vanished = stepEnemyAi({
      state,
      archetype: 'eco_rasteiro',
      currentTick: 1,
      enemyEntityId: 3,
      position: { x: 0, y: 0 },
      target: null,
      blockers: [],
      grid: GRID
    });

    expect(vanished.events).toEqual([]);
    expect(vanished.state.phase).toBe('idle');
    expect(vanished.state.pendingActionId).toBeNull();
  });
});
