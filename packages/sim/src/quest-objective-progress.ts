import type {
  JsonObject,
  QuestDefinition,
  QuestProgress,
  QuestStage
} from '@junqverse/content';
import {
  matchQuestObjectiveEvent,
  type QuestObjectiveEvent,
  type QuestObjectiveMatchReason
} from './quest-objective-matcher.js';
import {
  completeQuestStage,
  type QuestActionExecution
} from './quest-runtime.js';

const ID_PATTERN = /^[a-z0-9_:-]{1,96}$/;

export type QuestObjectiveProgressReason =
  | QuestObjectiveMatchReason
  | 'not_active'
  | 'duplicate_event'
  | 'duplicate_collectible'
  | 'invalid_event'
  | 'progressed'
  | 'stage_completed';

export interface QuestObjectiveProgressResult {
  readonly matched: boolean;
  readonly stageCompleted: boolean;
  readonly reason: QuestObjectiveProgressReason;
  readonly progress: QuestProgress;
  readonly actions: readonly QuestActionExecution[];
}

function getCurrentStage(
  progress: QuestProgress,
  definition: QuestDefinition
): QuestStage {
  if (progress.questId !== definition.id) {
    throw new Error(
      `quest progress ${progress.questId} does not match ${definition.id}`
    );
  }

  const stage = definition.stages.find(
    (item) => item.id === progress.currentStageId
  );

  if (!stage) {
    throw new Error(
      `quest ${definition.id} has no stage ${progress.currentStageId}`
    );
  }

  return stage;
}

function processedEventIds(
  objectiveState: JsonObject
): readonly string[] {
  const value = objectiveState.processedEventIds;

  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string')
  ) {
    return [];
  }

  return value;
}

function currentCount(objectiveState: JsonObject): number {
  const value = objectiveState.count;
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0
  )
    ? value
    : 0;
}

function isStableId(value: string): boolean {
  return ID_PATTERN.test(value) && value !== '__proto__';
}

function requiredCount(stage: QuestStage): number | null {
  if (
    stage.objective.type !== 'collect' &&
    stage.objective.type !== 'defeat'
  ) {
    return 1;
  }

  const configured = stage.objective.count;
  if (configured === undefined) {
    return 1;
  }

  return (
    typeof configured === 'number' &&
    Number.isInteger(configured) &&
    configured > 0
  )
    ? configured
    : null;
}

function collectibleId(
  event: QuestObjectiveEvent
): string | null {
  const configured = event.payload.collectibleId;

  if (configured === undefined) {
    return event.eventId;
  }

  return typeof configured === 'string' && isStableId(configured)
    ? configured
    : null;
}

function result(
  progress: QuestProgress,
  reason: QuestObjectiveProgressReason,
  matched = false,
  stageCompleted = false,
  actions: readonly QuestActionExecution[] = []
): QuestObjectiveProgressResult {
  return {
    matched,
    stageCompleted,
    reason,
    progress,
    actions
  };
}

export function applyQuestObjectiveEvent(
  progress: QuestProgress,
  definition: QuestDefinition,
  event: QuestObjectiveEvent
): QuestObjectiveProgressResult {
  if (progress.status !== 'active') {
    return result(progress, 'not_active');
  }

  if (!isStableId(event.eventId)) {
    return result(progress, 'invalid_event');
  }

  const stage = getCurrentStage(progress, definition);
  const matched = matchQuestObjectiveEvent(
    stage.objective,
    event,
    {
      questId: progress.questId,
      runId: progress.runId
    }
  );

  if (!matched.matched) {
    return result(progress, matched.reason);
  }

  const seen = processedEventIds(progress.objectiveState);
  if (seen.includes(event.eventId)) {
    return result(
      progress,
      'duplicate_event',
      true
    );
  }

  const nextProcessed = [...seen, event.eventId];
  let collectedIds = [...progress.collectedIds];

  if (stage.objective.type === 'collect') {
    const collectedId = collectibleId(event);

    if (collectedId === null) {
      return result(progress, 'invalid_event');
    }

    if (collectedIds.includes(collectedId)) {
      return result(
        {
          ...progress,
          objectiveState: {
            ...progress.objectiveState,
            processedEventIds: nextProcessed
          }
        },
        'duplicate_collectible',
        true
      );
    }

    collectedIds.push(collectedId);
  }

  const targetCount = requiredCount(stage);
  if (targetCount === null) {
    return result(progress, 'invalid_objective');
  }

  const nextCount = currentCount(progress.objectiveState) + 1;
  const progressed: QuestProgress = {
    ...progress,
    collectedIds,
    objectiveState: {
      ...progress.objectiveState,
      processedEventIds: nextProcessed,
      count: nextCount
    }
  };

  if (nextCount < targetCount) {
    return result(
      progressed,
      'progressed',
      true
    );
  }

  const transition = completeQuestStage(
    progressed,
    definition,
    stage.id
  );

  if (!transition.accepted) {
    throw new Error(
      `quest stage ${stage.id} could not complete after objective satisfaction`
    );
  }

  const transitioned: QuestProgress = {
    ...transition.progress,
    objectiveState: {
      ...transition.progress.objectiveState,
      processedEventIds: nextProcessed
    }
  };

  return result(
    transitioned,
    'stage_completed',
    true,
    true,
    transition.actions
  );
}
