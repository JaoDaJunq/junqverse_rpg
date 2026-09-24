import type {
  QuestAction,
  QuestDefinition,
  QuestStage
} from '@junqverse/content';
import type { EventEnvelope } from '@junqverse/protocol';
import {
  applyBasicObjectiveEvent,
  compileBasicObjective,
  createBasicObjectiveState,
  isBasicObjectiveComplete,
  type BasicObjectiveState
} from './objectives.js';

const ID_PATTERN = /^[a-z0-9_:-]{1,96}$/;

export type QuestEngineStatus =
  | 'locked'
  | 'available'
  | 'active'
  | 'completed';

export interface QuestEngineState {
  readonly questId: QuestDefinition['id'];
  readonly runId: string;
  readonly status: QuestEngineStatus;
  readonly currentStageId: string;
  readonly completedStageIds: readonly string[];
  readonly objectiveState: BasicObjectiveState | null;
  readonly appliedEventIds: readonly string[];
  readonly executedActionIds: readonly string[];
  readonly collectedIds: readonly string[];
}

export interface QuestEngineStepResult {
  readonly state: QuestEngineState;
  readonly actions: readonly QuestAction[];
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

function actionId(action: QuestAction): string {
  const record = action as Readonly<Record<string, unknown>>;
  return assertStableId(record.id, 'quest action id');
}

function validateDefinition(definition: QuestDefinition): void {
  if (definition.stages.length === 0) {
    throw new Error('quest must contain at least one stage');
  }

  const stageIds = definition.stages.map((stage) =>
    assertStableId(stage.id, 'stage id')
  );
  if (new Set(stageIds).size !== stageIds.length) {
    throw new Error('quest stage ids must be unique');
  }

  const stageIdSet = new Set(stageIds);
  const actionIds: string[] = [];

  for (const stage of definition.stages) {
    compileBasicObjective(stage.objective);

    if (
      stage.nextStageId !== null &&
      !stageIdSet.has(stage.nextStageId)
    ) {
      throw new Error(
        `stage ${stage.id} points to missing stage ${stage.nextStageId}`
      );
    }

    for (const action of [
      ...stage.entryActions,
      ...stage.completionActions
    ]) {
      actionIds.push(actionId(action));
    }
  }

  if (new Set(actionIds).size !== actionIds.length) {
    throw new Error('quest action ids must be unique');
  }
}

function stageById(
  definition: QuestDefinition,
  stageId: string
): QuestStage {
  const stage = definition.stages.find(
    (candidate) => candidate.id === stageId
  );
  if (!stage) {
    throw new Error(`quest stage ${stageId} does not exist`);
  }
  return stage;
}

function prerequisitesSatisfied(
  definition: QuestDefinition,
  completedQuestIds: readonly string[]
): boolean {
  const completed = new Set(completedQuestIds);
  return definition.prerequisites.every((questId) =>
    completed.has(questId)
  );
}

function emitActionsOnce(
  executedActionIds: readonly string[],
  actions: readonly QuestAction[]
): {
  readonly executedActionIds: readonly string[];
  readonly actions: readonly QuestAction[];
} {
  if (actions.length === 0) {
    return {
      executedActionIds,
      actions: []
    };
  }

  const seen = new Set(executedActionIds);
  const emitted: QuestAction[] = [];
  const nextExecuted = [...executedActionIds];

  for (const action of actions) {
    const id = actionId(action);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    nextExecuted.push(id);
    emitted.push(action);
  }

  return {
    executedActionIds: nextExecuted,
    actions: emitted
  };
}

function collectItemId(
  collectedIds: readonly string[],
  event: EventEnvelope
): readonly string[] {
  if (event.type !== 'item_collected') {
    return collectedIds;
  }

  const itemId = event.payload.itemId;
  if (
    typeof itemId !== 'string' ||
    !ID_PATTERN.test(itemId) ||
    itemId === '__proto__' ||
    collectedIds.includes(itemId)
  ) {
    return collectedIds;
  }

  return [...collectedIds, itemId];
}

function ensureDefinitionMatchesState(
  definition: QuestDefinition,
  state: QuestEngineState
): void {
  if (definition.id !== state.questId) {
    throw new Error(
      `quest definition ${definition.id} does not match state ${state.questId}`
    );
  }
}

export function createQuestEngineState(
  definition: QuestDefinition,
  runId: string,
  completedQuestIds: readonly string[] = []
): QuestEngineState {
  validateDefinition(definition);
  const stableRunId = assertStableId(runId, 'runId');
  const firstStage = definition.stages[0];

  if (!firstStage) {
    throw new Error('quest must contain at least one stage');
  }

  return {
    questId: definition.id,
    runId: stableRunId,
    status: prerequisitesSatisfied(
      definition,
      completedQuestIds
    )
      ? 'available'
      : 'locked',
    currentStageId: firstStage.id,
    completedStageIds: [],
    objectiveState: null,
    appliedEventIds: [],
    executedActionIds: [],
    collectedIds: []
  };
}

export function refreshQuestAvailability(
  definition: QuestDefinition,
  state: QuestEngineState,
  completedQuestIds: readonly string[]
): QuestEngineState {
  ensureDefinitionMatchesState(definition, state);

  if (
    state.status !== 'locked' ||
    !prerequisitesSatisfied(definition, completedQuestIds)
  ) {
    return state;
  }

  return {
    ...state,
    status: 'available'
  };
}

export function activateQuest(
  definition: QuestDefinition,
  state: QuestEngineState
): QuestEngineStepResult {
  ensureDefinitionMatchesState(definition, state);

  if (state.status !== 'available') {
    return {
      state,
      actions: []
    };
  }

  const stage = stageById(
    definition,
    state.currentStageId
  );
  const objective = compileBasicObjective(stage.objective);
  const entry = emitActionsOnce(
    state.executedActionIds,
    stage.entryActions
  );

  return {
    state: {
      ...state,
      status: 'active',
      objectiveState: createBasicObjectiveState(objective),
      executedActionIds: entry.executedActionIds
    },
    actions: entry.actions
  };
}

export function applyQuestEvent(
  definition: QuestDefinition,
  state: QuestEngineState,
  event: EventEnvelope
): QuestEngineStepResult {
  ensureDefinitionMatchesState(definition, state);

  if (
    state.status !== 'active' ||
    event.runId !== state.runId ||
    state.appliedEventIds.includes(event.eventId) ||
    state.objectiveState === null
  ) {
    return {
      state,
      actions: []
    };
  }

  const stage = stageById(
    definition,
    state.currentStageId
  );
  const objective = compileBasicObjective(stage.objective);
  const objectiveState = applyBasicObjectiveEvent(
    objective,
    state.objectiveState,
    event,
    state.runId
  );
  const appliedEventIds = [
    ...state.appliedEventIds,
    event.eventId
  ];
  const collectedIds = collectItemId(
    state.collectedIds,
    event
  );

  if (!isBasicObjectiveComplete(objectiveState)) {
    return {
      state: {
        ...state,
        objectiveState,
        appliedEventIds,
        collectedIds
      },
      actions: []
    };
  }

  const completedStageIds = state.completedStageIds.includes(
    stage.id
  )
    ? state.completedStageIds
    : [...state.completedStageIds, stage.id];

  const completion = emitActionsOnce(
    state.executedActionIds,
    stage.completionActions
  );

  if (stage.nextStageId === null) {
    return {
      state: {
        ...state,
        status: 'completed',
        completedStageIds,
        objectiveState,
        appliedEventIds,
        executedActionIds:
          completion.executedActionIds,
        collectedIds
      },
      actions: completion.actions
    };
  }

  const nextStage = stageById(
    definition,
    stage.nextStageId
  );
  const nextObjective = compileBasicObjective(
    nextStage.objective
  );
  const entry = emitActionsOnce(
    completion.executedActionIds,
    nextStage.entryActions
  );

  return {
    state: {
      ...state,
      status: 'active',
      currentStageId: nextStage.id,
      completedStageIds,
      objectiveState:
        createBasicObjectiveState(nextObjective),
      appliedEventIds,
      executedActionIds: entry.executedActionIds,
      collectedIds
    },
    actions: [
      ...completion.actions,
      ...entry.actions
    ]
  };
}
