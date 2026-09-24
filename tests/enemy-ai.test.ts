import { describe, expect, it } from 'vitest';
import {
  ECO_ATIRADOR_DEFINITION,
  ECO_RASTEIRO_DEFINITION
} from '../packages/content/src/index.js';
import {
  buildBlockedGridCells,
  createEnemyAiState,
  findGridPath,
  gridCellCenter,
  moveCircleForTick,
  stepEnemyAi,
  type Aabb,
  type EnemyAiState,
  type GridSpec
} from '../packages/sim/src/index.js';

const GRID: GridSpec = {
  width: 8,
  height: 8,
  tileSize: 32
};

describe('T014 enemy AI and pathfinding', () => {
  it('keeps the documented initial enemy values', () => {
    expect(ECO_RASTEIRO_DEFINITION).toMatchObject({
      maxHealth: 70,
      armor: 0,
      baseDamage: 12,
      speedPxPerSecond: 95,
      telegraphTicks: 39,
      cooldownTicks: 90,
      attackRangePx: 48
    });

    expect(ECO_ATIRADOR_DEFINITION).toMatchObject({
      maxHealth: 80,
      armor: 0,
      baseDamage: 14,
      speedPxPerSecond: 60,
      telegraphTicks: 54,
      cooldownTicks: 132,
      projectileSpeedPxPerSecond: 300
    });
  });

  it('finds a deterministic A* path around a blocked corner', () => {
    const blockers: Aabb[] = [
      { x: 96, y: 0, width: 32, height: 160 }
    ];
    const blocked = buildBlockedGridCells(blockers, GRID);

    const path = findGridPath({
      start: { x: 1, y: 1 },
      goal: { x: 6, y: 1 },
      grid: GRID,
      blocked
    });

    expect(path).not.toBeNull();
    expect(path?.[0]).toEqual({ x: 1, y: 1 });
    expect(path?.at(-1)).toEqual({ x: 6, y: 1 });
    expect(path?.some((cell) => cell.y >= 5)).toBe(true);

    for (const cell of path ?? []) {
      expect(blocked.has(`${cell.x},${cell.y}`)).toBe(false);
      expect(gridCellCenter(cell, GRID)).toEqual({
        x: (cell.x + 0.5) * 32,
        y: (cell.y + 0.5) * 32
      });
    }
  });

  it('atirador does not start an attack through a wall', () => {
    const wall: Aabb[] = [
      { x: 96, y: 0, width: 32, height: 256 }
    ];

    const result = stepEnemyAi({
      state: createEnemyAiState(),
      archetype: 'eco_atirador',
      currentTick: 0,
      enemyEntityId: 2,
      position: { x: 48, y: 48 },
      target: {
        entityId: 1,
        position: { x: 208, y: 48 }
      },
      blockers: wall,
      grid: GRID
    });

    expect(result.events).toEqual([]);
    expect(result.state.phase).toBe('approach');
  });

  it('atirador cancels the shot if line of sight becomes blocked during telegraph', () => {
    let state = createEnemyAiState();
    const target = {
      entityId: 1,
      position: { x: 208, y: 48 }
    };

    const start = stepEnemyAi({
      state,
      archetype: 'eco_atirador',
      currentTick: 0,
      enemyEntityId: 2,
      position: { x: 48, y: 48 },
      target,
      blockers: [],
      grid: GRID
    });

    state = start.state;
    expect(start.events).toHaveLength(1);
    expect(start.events[0]?.kind).toBe('telegraph');

    for (
      let tick = 1;
      tick < ECO_ATIRADOR_DEFINITION.telegraphTicks;
      tick += 1
    ) {
      state = stepEnemyAi({
        state,
        archetype: 'eco_atirador',
        currentTick: tick,
        enemyEntityId: 2,
        position: { x: 48, y: 48 },
        target,
        blockers: [],
        grid: GRID
      }).state;
    }

    const blockedAttack = stepEnemyAi({
      state,
      archetype: 'eco_atirador',
      currentTick: ECO_ATIRADOR_DEFINITION.telegraphTicks,
      enemyEntityId: 2,
      position: { x: 48, y: 48 },
      target,
      blockers: [{ x: 96, y: 0, width: 32, height: 256 }],
      grid: GRID
    });

    expect(blockedAttack.events).toEqual([]);
    expect(blockedAttack.state.phase).toBe('approach');
  });

  it('uses the same enemyActionId for telegraph and its single attack event', () => {
    let state = createEnemyAiState();
    const target = {
      entityId: 1,
      position: { x: 40, y: 0 }
    };

    const telegraph = stepEnemyAi({
      state,
      archetype: 'eco_rasteiro',
      currentTick: 0,
      enemyEntityId: 7,
      position: { x: 0, y: 0 },
      target,
      blockers: [],
      grid: GRID
    });
    state = telegraph.state;

    expect(telegraph.events).toEqual([{
      kind: 'telegraph',
      enemyEntityId: 7,
      targetEntityId: 1,
      enemyActionId: 'enemy_action:7:0',
      familyId: ECO_RASTEIRO_DEFINITION.attackFamilyId
    }]);

    const attackEvents = [];

    for (
      let tick = 1;
      tick <= ECO_RASTEIRO_DEFINITION.telegraphTicks + 20;
      tick += 1
    ) {
      const stepped = stepEnemyAi({
        state,
        archetype: 'eco_rasteiro',
        currentTick: tick,
        enemyEntityId: 7,
        position: { x: 0, y: 0 },
        target,
        blockers: [],
        grid: GRID
      });
      state = stepped.state;
      attackEvents.push(
        ...stepped.events.filter((event) => event.kind === 'attack')
      );
    }

    expect(attackEvents).toHaveLength(1);
    expect(attackEvents[0]?.enemyActionId).toBe('enemy_action:7:0');
    expect(attackEvents[0]?.familyId).toBe(
      ECO_RASTEIRO_DEFINITION.attackFamilyId
    );
    expect(state.phase).toBe('recovery');
  });

  it('does not apply attacks per frame while recovering', () => {
    let state = createEnemyAiState();
    const target = {
      entityId: 1,
      position: { x: 40, y: 0 }
    };
    let attacks = 0;

    for (let tick = 0; tick < 100; tick += 1) {
      const stepped = stepEnemyAi({
        state,
        archetype: 'eco_rasteiro',
        currentTick: tick,
        enemyEntityId: 3,
        position: { x: 0, y: 0 },
        target,
        blockers: [],
        grid: GRID
      });

      state = stepped.state;
      attacks += stepped.events.filter(
        (event) => event.kind === 'attack'
      ).length;
    }

    expect(attacks).toBe(1);
  });

  it('rastreador navigates around a wall corner until it reaches attack range', () => {
    const blockers: Aabb[] = [
      { x: 96, y: 0, width: 32, height: 160 }
    ];
    const target = {
      entityId: 1,
      position: { x: 208, y: 48 }
    };

    let state: EnemyAiState = createEnemyAiState();
    let position = { x: 48, y: 48 };
    let reachedTelegraph = false;

    for (let tick = 0; tick < 900; tick += 1) {
      const stepped = stepEnemyAi({
        state,
        archetype: 'eco_rasteiro',
        currentTick: tick,
        enemyEntityId: 2,
        position,
        target,
        blockers,
        grid: GRID
      });

      state = stepped.state;

      if (stepped.events.some((event) => event.kind === 'telegraph')) {
        reachedTelegraph = true;
        break;
      }

      position = moveCircleForTick(
        position,
        state.desiredMovement,
        ECO_RASTEIRO_DEFINITION.speedPxPerSecond,
        12,
        blockers
      ).position;
    }

    expect(reachedTelegraph).toBe(true);
    expect(Math.hypot(
      target.position.x - position.x,
      target.position.y - position.y
    )).toBeLessThanOrEqual(ECO_RASTEIRO_DEFINITION.attackRangePx);
  });


  it('rastreador cancels a telegraphed attack when attacks become disabled', () => {
    let state = createEnemyAiState();
    const target = {
      entityId: 1,
      position: { x: 40, y: 0 }
    };

    const started = stepEnemyAi({
      state,
      archetype: 'eco_rasteiro',
      currentTick: 0,
      enemyEntityId: 6,
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
        enemyEntityId: 6,
        position: { x: 0, y: 0 },
        target,
        blockers: [],
        grid: GRID,
        attacksEnabled: false
      }).state;
    }

    const cancelled = stepEnemyAi({
      state,
      archetype: 'eco_rasteiro',
      currentTick: ECO_RASTEIRO_DEFINITION.telegraphTicks,
      enemyEntityId: 6,
      position: { x: 0, y: 0 },
      target,
      blockers: [],
      grid: GRID,
      attacksEnabled: false
    });

    expect(cancelled.events).toEqual([]);
    expect(cancelled.state.phase).toBe('approach');
    expect(cancelled.state.pendingActionId).toBeNull();
  });

  it('emits distinct action ids across repeated attacks of the same family', () => {
    let state = createEnemyAiState();
    const target = {
      entityId: 1,
      position: { x: 40, y: 0 }
    };
    const telegraphIds: string[] = [];

    for (let tick = 0; tick < 300; tick += 1) {
      const stepped = stepEnemyAi({
        state,
        archetype: 'eco_rasteiro',
        currentTick: tick,
        enemyEntityId: 5,
        position: { x: 0, y: 0 },
        target,
        blockers: [],
        grid: GRID
      });
      state = stepped.state;

      for (const event of stepped.events) {
        if (event.kind === 'telegraph') {
          telegraphIds.push(event.enemyActionId);
        }
      }

      if (telegraphIds.length >= 2) {
        break;
      }
    }

    expect(telegraphIds).toEqual([
      'enemy_action:5:0',
      'enemy_action:5:1'
    ]);
  });
});
