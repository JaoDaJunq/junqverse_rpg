import type { EventEnvelope } from '@junqverse/protocol';

const ID_PATTERN = /^[a-z0-9_:-]{1,96}$/;

export type BasicQuestObjectiveDefinition =
  | {
      readonly type: 'enter_area';
      readonly areaId: string;
    }
  | {
      readonly type: 'interact';
      readonly targetIds: readonly string[];
      readonly requiredCount: number;
      readonly holdTicks: number;
    }
  | {
      readonly type: 'collect';
      readonly itemIds: readonly string[];
      readonly requiredCount: number;
    }
  | {
      readonly type: 'defeat';
      readonly encounterId: string;
    }
  | {
      readonly type: 'survive';
      readonly durationTicks: number;
      readonly encounterId: string;
    }
  | {
      readonly type: 'all' | 'any';
      readonly children: readonly BasicQuestObjectiveDefinition[];
    };

export interface BasicObjectiveNodeState {
  readonly completed: boolean;
  readonly matchedIds: readonly string[];
  readonly elapsedTicks: number;
  readonly children: readonly BasicObjectiveNodeState[];
}

export interface BasicObjectiveState {
  readonly appliedEventIds: readonly string[];
  readonly node: BasicObjectiveNodeState;
}

function assertStableId(value: unknown, name: string): string {
  if (
    typeof value !== 'string' ||
    !ID_PATTERN.test(value) ||
    value === '__proto__'
  ) {
    throw new RangeError(`${name} must be a valid stable id`);
  }
  return value;
}

function assertNonNegativeInteger(
  value: unknown,
  name: string
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new RangeError(
      `${name} must be a non-negative safe integer`
    );
  }
  return value;
}

function asRecord(
  value: unknown,
  name: string
): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new TypeError(`${name} must be an object`);
  }

  return value as Readonly<Record<string, unknown>>;
}

function uniqueIds(
  value: unknown,
  name: string
): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError(`${name} must be a non-empty array`);
  }

  const ids = value.map((item, index) =>
    assertStableId(item, `${name}[${index}]`)
  );

  if (new Set(ids).size !== ids.length) {
    throw new Error(`${name} must contain unique ids`);
  }

  return ids;
}

function requiredCount(
  value: unknown,
  available: number,
  name: string
): number {
  const count = assertNonNegativeInteger(value, name);
  if (count <= 0 || count > available) {
    throw new RangeError(
      `${name} must be between 1 and the number of targets`
    );
  }
  return count;
}

function compileNode(
  value: unknown,
  compositionDepth: number
): BasicQuestObjectiveDefinition {
  const objective = asRecord(value, 'objective');
  const type = objective.type;

  if (type === 'enter_area') {
    return {
      type,
      areaId: assertStableId(objective.areaId, 'areaId')
    };
  }

  if (type === 'interact') {
    const targetIds = uniqueIds(
      objective.targetIds,
      'targetIds'
    );
    return {
      type,
      targetIds,
      requiredCount: requiredCount(
        objective.requiredCount,
        targetIds.length,
        'requiredCount'
      ),
      holdTicks: assertNonNegativeInteger(
        objective.holdTicks,
        'holdTicks'
      )
    };
  }

  if (type === 'collect') {
    const itemIds = uniqueIds(objective.itemIds, 'itemIds');
    return {
      type,
      itemIds,
      requiredCount: requiredCount(
        objective.requiredCount,
        itemIds.length,
        'requiredCount'
      )
    };
  }

  if (type === 'defeat') {
    return {
      type,
      encounterId: assertStableId(
        objective.encounterId,
        'encounterId'
      )
    };
  }

  if (type === 'survive') {
    const durationTicks = assertNonNegativeInteger(
      objective.durationTicks,
      'durationTicks'
    );
    if (durationTicks <= 0) {
      throw new RangeError('durationTicks must be positive');
    }

    return {
      type,
      durationTicks,
      encounterId: assertStableId(
        objective.encounterId,
        'encounterId'
      )
    };
  }

  if (type === 'all' || type === 'any') {
    if (compositionDepth >= 2) {
      throw new Error(
        'objective composition supports at most two levels'
      );
    }
    if (
      !Array.isArray(objective.children) ||
      objective.children.length === 0
    ) {
      throw new RangeError(
        'composite objective must contain children'
      );
    }

    return {
      type,
      children: objective.children.map((child) =>
        compileNode(child, compositionDepth + 1)
      )
    };
  }

  throw new Error(
    `objective type ${String(type)} is not supported by T018`
  );
}

export function compileBasicObjective(
  objective: unknown
): BasicQuestObjectiveDefinition {
  return compileNode(objective, 0);
}

function createNodeState(
  definition: BasicQuestObjectiveDefinition
): BasicObjectiveNodeState {
  if (definition.type === 'all' || definition.type === 'any') {
    return {
      completed: false,
      matchedIds: [],
      elapsedTicks: 0,
      children: definition.children.map(createNodeState)
    };
  }

  return {
    completed: false,
    matchedIds: [],
    elapsedTicks: 0,
    children: []
  };
}

export function createBasicObjectiveState(
  definition: BasicQuestObjectiveDefinition
): BasicObjectiveState {
  return {
    appliedEventIds: [],
    node: createNodeState(definition)
  };
}

function payloadString(
  event: EventEnvelope,
  key: string
): string | null {
  const value = event.payload[key];
  return typeof value === 'string' ? value : null;
}

function payloadBoolean(
  event: EventEnvelope,
  key: string
): boolean | null {
  const value = event.payload[key];
  return typeof value === 'boolean' ? value : null;
}

function withMatchedId(
  state: BasicObjectiveNodeState,
  id: string,
  required: number
): BasicObjectiveNodeState {
  if (state.completed || state.matchedIds.includes(id)) {
    return state;
  }

  const matchedIds = [...state.matchedIds, id];
  return {
    ...state,
    matchedIds,
    completed: matchedIds.length >= required
  };
}

function applyNodeEvent(
  definition: BasicQuestObjectiveDefinition,
  state: BasicObjectiveNodeState,
  event: EventEnvelope
): BasicObjectiveNodeState {
  if (state.completed) {
    return state;
  }

  if (definition.type === 'enter_area') {
    if (
      event.type !== 'area_entered' ||
      payloadString(event, 'areaId') !== definition.areaId
    ) {
      return state;
    }

    return {
      ...state,
      completed: true,
      matchedIds: [definition.areaId]
    };
  }

  if (definition.type === 'interact') {
    if (event.type !== 'interaction_completed') {
      return state;
    }
    const targetId = payloadString(event, 'targetId');
    if (
      targetId === null ||
      !definition.targetIds.includes(targetId)
    ) {
      return state;
    }

    return withMatchedId(
      state,
      targetId,
      definition.requiredCount
    );
  }

  if (definition.type === 'collect') {
    if (event.type !== 'item_collected') {
      return state;
    }
    const itemId = payloadString(event, 'itemId');
    if (
      itemId === null ||
      !definition.itemIds.includes(itemId)
    ) {
      return state;
    }

    return withMatchedId(
      state,
      itemId,
      definition.requiredCount
    );
  }

  if (definition.type === 'defeat') {
    if (
      event.type !== 'entity_died' ||
      payloadString(event, 'encounterId') !==
        definition.encounterId ||
      payloadBoolean(event, 'encounterCleared') !== true
    ) {
      return state;
    }

    return {
      ...state,
      completed: true,
      matchedIds: [definition.encounterId]
    };
  }

  const children = definition.children.map(
    (child, index) =>
      applyNodeEvent(
        child,
        state.children[index] ?? createNodeState(child),
        event
      )
  );
  const completed = definition.type === 'all'
    ? children.every((child) => child.completed)
    : children.some((child) => child.completed);

  if (
    completed === state.completed &&
    children.every(
      (child, index) => child === state.children[index]
    )
  ) {
    return state;
  }

  return {
    ...state,
    completed,
    children
  };
}

export function applyBasicObjectiveEvent(
  definition: BasicQuestObjectiveDefinition,
  state: BasicObjectiveState,
  event: EventEnvelope,
  runId: string
): BasicObjectiveState {
  assertStableId(runId, 'runId');

  if (
    state.node.completed ||
    event.runId !== runId ||
    state.appliedEventIds.includes(event.eventId)
  ) {
    return state;
  }

  return {
    appliedEventIds: [
      ...state.appliedEventIds,
      event.eventId
    ],
    node: applyNodeEvent(definition, state.node, event)
  };
}


function stepNodeTime(
  definition: BasicQuestObjectiveDefinition,
  state: BasicObjectiveNodeState,
  ticks: number
): BasicObjectiveNodeState {
  if (state.completed || ticks === 0) {
    return state;
  }

  if (definition.type === 'survive') {
    const elapsedTicks = Math.min(
      definition.durationTicks,
      state.elapsedTicks + ticks
    );

    return {
      ...state,
      elapsedTicks,
      completed: elapsedTicks >= definition.durationTicks
    };
  }

  if (
    definition.type !== 'all' &&
    definition.type !== 'any'
  ) {
    return state;
  }

  const children = definition.children.map(
    (child, index) =>
      stepNodeTime(
        child,
        state.children[index] ?? createNodeState(child),
        ticks
      )
  );
  const completed = definition.type === 'all'
    ? children.every((child) => child.completed)
    : children.some((child) => child.completed);

  if (
    completed === state.completed &&
    children.every(
      (child, index) => child === state.children[index]
    )
  ) {
    return state;
  }

  return {
    ...state,
    completed,
    children
  };
}

export function stepBasicObjectiveTime(
  definition: BasicQuestObjectiveDefinition,
  state: BasicObjectiveState,
  ticks = 1,
  paused = false
): BasicObjectiveState {
  const safeTicks = assertNonNegativeInteger(ticks, 'ticks');

  if (paused || state.node.completed || safeTicks === 0) {
    return state;
  }

  const node = stepNodeTime(
    definition,
    state.node,
    safeTicks
  );

  return node === state.node
    ? state
    : {
        ...state,
        node
      };
}

export function isBasicObjectiveComplete(
  state: BasicObjectiveState
): boolean {
  return state.node.completed;
}
