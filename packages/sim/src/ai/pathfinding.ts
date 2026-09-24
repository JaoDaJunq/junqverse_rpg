import type { Vec2 } from '@junqverse/content';
import type { Aabb } from '../geometry.js';

export interface GridSpec {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
}

export interface GridCell {
  readonly x: number;
  readonly y: number;
}

interface OpenNode {
  readonly cell: GridCell;
  readonly g: number;
  readonly h: number;
  readonly f: number;
}

function assertGrid(grid: GridSpec): void {
  if (
    !Number.isInteger(grid.width) ||
    !Number.isInteger(grid.height) ||
    grid.width <= 0 ||
    grid.height <= 0 ||
    !Number.isFinite(grid.tileSize) ||
    grid.tileSize <= 0
  ) {
    throw new RangeError('grid must have positive dimensions and tileSize');
  }
}

function key(cell: GridCell): string {
  return `${cell.x},${cell.y}`;
}

function inBounds(cell: GridCell, grid: GridSpec): boolean {
  return (
    cell.x >= 0 &&
    cell.y >= 0 &&
    cell.x < grid.width &&
    cell.y < grid.height
  );
}

function heuristic(a: GridCell, b: GridCell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function compareNode(a: OpenNode, b: OpenNode): number {
  return (
    a.f - b.f ||
    a.h - b.h ||
    a.cell.y - b.cell.y ||
    a.cell.x - b.cell.x
  );
}

export function worldToGridCell(
  position: Vec2,
  grid: GridSpec
): GridCell {
  assertGrid(grid);
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new RangeError('world position must be finite');
  }

  return {
    x: Math.floor(position.x / grid.tileSize),
    y: Math.floor(position.y / grid.tileSize)
  };
}

export function gridCellCenter(
  cell: GridCell,
  grid: GridSpec
): Vec2 {
  assertGrid(grid);
  if (!inBounds(cell, grid)) {
    throw new RangeError('grid cell is outside bounds');
  }

  return {
    x: (cell.x + 0.5) * grid.tileSize,
    y: (cell.y + 0.5) * grid.tileSize
  };
}

export function buildBlockedGridCells(
  blockers: readonly Aabb[],
  grid: GridSpec
): ReadonlySet<string> {
  assertGrid(grid);
  const blocked = new Set<string>();

  for (const blocker of blockers) {
    if (
      !Number.isFinite(blocker.x) ||
      !Number.isFinite(blocker.y) ||
      !Number.isFinite(blocker.width) ||
      !Number.isFinite(blocker.height) ||
      blocker.width < 0 ||
      blocker.height < 0
    ) {
      throw new RangeError('blockers must be finite AABBs');
    }

    const minX = Math.max(0, Math.floor(blocker.x / grid.tileSize));
    const minY = Math.max(0, Math.floor(blocker.y / grid.tileSize));
    const maxX = Math.min(
      grid.width - 1,
      Math.floor((blocker.x + Math.max(0, blocker.width - 1e-9)) / grid.tileSize)
    );
    const maxY = Math.min(
      grid.height - 1,
      Math.floor((blocker.y + Math.max(0, blocker.height - 1e-9)) / grid.tileSize)
    );

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        blocked.add(`${x},${y}`);
      }
    }
  }

  return blocked;
}

export function findGridPath(input: {
  readonly start: GridCell;
  readonly goal: GridCell;
  readonly grid: GridSpec;
  readonly blocked: ReadonlySet<string>;
}): readonly GridCell[] | null {
  assertGrid(input.grid);

  if (
    !inBounds(input.start, input.grid) ||
    !inBounds(input.goal, input.grid)
  ) {
    return null;
  }

  if (
    input.blocked.has(key(input.start)) ||
    input.blocked.has(key(input.goal))
  ) {
    return null;
  }

  if (
    input.start.x === input.goal.x &&
    input.start.y === input.goal.y
  ) {
    return [input.start];
  }

  const open: OpenNode[] = [{
    cell: input.start,
    g: 0,
    h: heuristic(input.start, input.goal),
    f: heuristic(input.start, input.goal)
  }];
  const bestG = new Map<string, number>([[key(input.start), 0]]);
  const cameFrom = new Map<string, GridCell>();
  const closed = new Set<string>();

  while (open.length > 0) {
    open.sort(compareNode);
    const current = open.shift();
    if (!current) {
      break;
    }

    const currentKey = key(current.cell);
    if (closed.has(currentKey)) {
      continue;
    }
    closed.add(currentKey);

    if (
      current.cell.x === input.goal.x &&
      current.cell.y === input.goal.y
    ) {
      const path: GridCell[] = [current.cell];
      let cursor = current.cell;

      while (key(cursor) !== key(input.start)) {
        const previous = cameFrom.get(key(cursor));
        if (!previous) {
          throw new Error('path reconstruction failed');
        }
        path.push(previous);
        cursor = previous;
      }

      return path.reverse();
    }

    const neighbors: readonly GridCell[] = [
      { x: current.cell.x, y: current.cell.y - 1 },
      { x: current.cell.x - 1, y: current.cell.y },
      { x: current.cell.x + 1, y: current.cell.y },
      { x: current.cell.x, y: current.cell.y + 1 }
    ];

    for (const neighbor of neighbors) {
      const neighborKey = key(neighbor);
      if (
        !inBounds(neighbor, input.grid) ||
        input.blocked.has(neighborKey) ||
        closed.has(neighborKey)
      ) {
        continue;
      }

      const g = current.g + 1;
      const known = bestG.get(neighborKey);

      if (known !== undefined && g >= known) {
        continue;
      }

      bestG.set(neighborKey, g);
      cameFrom.set(neighborKey, current.cell);
      const h = heuristic(neighbor, input.goal);
      open.push({
        cell: neighbor,
        g,
        h,
        f: g + h
      });
    }
  }

  return null;
}

export function findWorldGridPath(input: {
  readonly start: Vec2;
  readonly goal: Vec2;
  readonly blockers: readonly Aabb[];
  readonly grid: GridSpec;
}): readonly GridCell[] | null {
  const blocked = buildBlockedGridCells(input.blockers, input.grid);

  return findGridPath({
    start: worldToGridCell(input.start, input.grid),
    goal: worldToGridCell(input.goal, input.grid),
    grid: input.grid,
    blocked
  });
}

export function nextPathDirection(input: {
  readonly position: Vec2;
  readonly target: Vec2;
  readonly blockers: readonly Aabb[];
  readonly grid: GridSpec;
}): Vec2 {
  const path = findWorldGridPath({
    start: input.position,
    goal: input.target,
    blockers: input.blockers,
    grid: input.grid
  });

  if (!path || path.length < 2) {
    return { x: 0, y: 0 };
  }

  const next = gridCellCenter(path[1]!, input.grid);
  const dx = next.x - input.position.x;
  const dy = next.y - input.position.y;
  const length = Math.hypot(dx, dy);

  return length === 0
    ? { x: 0, y: 0 }
    : { x: dx / length, y: dy / length };
}
