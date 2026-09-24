import type {
  QuestAction,
  QuestDefinition,
  QuestId,
  QuestProgress,
  QuestStage
} from '@junqverse/content';

export type QuestActionPhase = 'entry' | 'completion';

export interface QuestActionExecution {
  readonly executionId: string;
  readonly questId: QuestId;
  readonly runId: string;
  readonly stageId: string;
  readonly phase: QuestActionPhase;
  readonly action: QuestAction;
}

export type QuestTransitionReason =
  | 'accepted'
  | 'not_available'
  | 'not_active'
  | 'stale_stage';

export interface QuestTransitionResult {
  readonly accepted: boolean;
  readonly reason: QuestTransitionReason;
  readonly progress: QuestProgress;
  readonly actions: readonly QuestActionExecution[];
}

function completedSet(
  completedQuestIds: readonly QuestId[]
): ReadonlySet<QuestId> {
  return new Set(completedQuestIds);
}

function prerequisitesMet(
  definition: QuestDefinition,
  completedQuestIds: readonly QuestId[]
): boolean {
  const completed = completedSet(completedQuestIds);
  return definition.prerequisites.every((questId) =>
    completed.has(questId)
  );
}

function getStage(
  definition: QuestDefinition,
  stageId: string
): QuestStage {
  const stage = definition.stages.find((item) => item.id === stageId);
  if (!stage) {
    throw new Error(
      `quest ${definition.id} references unknown stage ${stageId}`
    );
  }
  return stage;
}

function assertMatchesDefinition(
  progress: QuestProgress,
  definition: QuestDefinition
): void {
  if (progress.questId !== definition.id) {
    throw new Error(
      `quest progress ${progress.questId} does not match ${definition.id}`
    );
  }
}

function hashStableId(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stageStableFragment(stageId: string): string {
  return `${stageId.slice(0, 32)}:${hashStableId(stageId)}`;
}

function actionExecutionId(
  definition: QuestDefinition,
  stage: QuestStage,
  phase: QuestActionPhase,
  index: number
): string {
  return `quest_action:${definition.id}:${stageStableFragment(
    stage.id
  )}:${phase}:${index}`;
}

function applyActions(
  progress: QuestProgress,
  definition: QuestDefinition,
  stage: QuestStage,
  phase: QuestActionPhase
): {
  readonly progress: QuestProgress;
  readonly actions: readonly QuestActionExecution[];
} {
  const source =
    phase === 'entry' ? stage.entryActions : stage.completionActions;
  const executed = new Set(progress.executedActionIds);
  const actions: QuestActionExecution[] = [];
  const executedActionIds = [...progress.executedActionIds];

  source.forEach((action, index) => {
    const executionId = actionExecutionId(
      definition,
      stage,
      phase,
      index
    );

    if (executed.has(executionId)) {
      return;
    }

    executed.add(executionId);
    executedActionIds.push(executionId);
    actions.push({
      executionId,
      questId: definition.id,
      runId: progress.runId,
      stageId: stage.id,
      phase,
      action
    });
  });

  return {
    progress: {
      ...progress,
      executedActionIds
    },
    actions
  };
}

export function createQuestProgress(
  definition: QuestDefinition,
  runId: string,
  completedQuestIds: readonly QuestId[]
): QuestProgress {
  const firstStage = definition.stages[0];
  if (!firstStage) {
    throw new Error(`quest ${definition.id} has no stages`);
  }

  return {
    questId: definition.id,
    runId,
    currentStageId: firstStage.id,
    completedStageIds: [],
    objectiveState: {},
    flags: {},
    collectedIds: [],
    executedActionIds: [],
    checkpointId: null,
    status: prerequisitesMet(definition, completedQuestIds)
      ? 'available'
      : 'locked'
  };
}

export function refreshQuestAvailability(
  progress: QuestProgress,
  definition: QuestDefinition,
  completedQuestIds: readonly QuestId[]
): QuestProgress {
  assertMatchesDefinition(progress, definition);

  if (
    progress.status !== 'locked' ||
    !prerequisitesMet(definition, completedQuestIds)
  ) {
    return progress;
  }

  return {
    ...progress,
    status: 'available'
  };
}

export function activateQuest(
  progress: QuestProgress,
  definition: QuestDefinition
): QuestTransitionResult {
  assertMatchesDefinition(progress, definition);

  if (progress.status !== 'available') {
    return {
      accepted: false,
      reason: 'not_available',
      progress,
      actions: []
    };
  }

  const stage = getStage(definition, progress.currentStageId);
  const active: QuestProgress = {
    ...progress,
    status: 'active',
    objectiveState: {}
  };
  const entry = applyActions(active, definition, stage, 'entry');

  return {
    accepted: true,
    reason: 'accepted',
    progress: entry.progress,
    actions: entry.actions
  };
}

export function completeQuestStage(
  progress: QuestProgress,
  definition: QuestDefinition,
  expectedStageId: string
): QuestTransitionResult {
  assertMatchesDefinition(progress, definition);

  if (progress.status !== 'active') {
    return {
      accepted: false,
      reason: 'not_active',
      progress,
      actions: []
    };
  }

  if (progress.currentStageId !== expectedStageId) {
    return {
      accepted: false,
      reason: 'stale_stage',
      progress,
      actions: []
    };
  }

  const stage = getStage(definition, expectedStageId);
  const completion = applyActions(
    progress,
    definition,
    stage,
    'completion'
  );
  const completedStageIds = progress.completedStageIds.includes(stage.id)
    ? [...progress.completedStageIds]
    : [...progress.completedStageIds, stage.id];
  const checkpointId = stage.checkpointAfter
    ? `checkpoint:${definition.id}:${stageStableFragment(stage.id)}`
    : completion.progress.checkpointId;

  if (stage.nextStageId === null) {
    return {
      accepted: true,
      reason: 'accepted',
      progress: {
        ...completion.progress,
        completedStageIds,
        checkpointId,
        objectiveState: {},
        status: 'completed'
      },
      actions: completion.actions
    };
  }

  const nextStage = getStage(definition, stage.nextStageId);
  const advanced: QuestProgress = {
    ...completion.progress,
    currentStageId: nextStage.id,
    completedStageIds,
    checkpointId,
    objectiveState: {}
  };
  const entry = applyActions(
    advanced,
    definition,
    nextStage,
    'entry'
  );

  return {
    accepted: true,
    reason: 'accepted',
    progress: entry.progress,
    actions: [...completion.actions, ...entry.actions]
  };
}
