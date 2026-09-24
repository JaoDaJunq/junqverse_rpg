import type {
  JsonObject,
  QuestDefinition,
  QuestProgress,
  QuestStage
} from '@junqverse/content';
import {
  completeQuestStage,
  type QuestActionExecution
} from './quest-runtime.js';

export type QuestSurviveReason =
  | 'not_active'
  | 'not_survive_objective'
  | 'invalid_objective'
  | 'invalid_tick'
  | 'invalid_objective_state'
  | 'progressed'
  | 'stage_completed';

export interface QuestSurviveProgressResult {
  readonly stageCompleted: boolean;
  readonly reason: QuestSurviveReason;
  readonly progress: QuestProgress;
  readonly actions: readonly QuestActionExecution[];
  readonly elapsedTicks: number | null;
  readonly remainingTicks: number | null;
}

function result(
  progress: QuestProgress,
  reason: QuestSurviveReason,
  elapsedTicks: number | null = null,
  remainingTicks: number | null = null,
  stageCompleted = false,
  actions: readonly QuestActionExecution[] = []
): QuestSurviveProgressResult {
  return {
    stageCompleted,
    reason,
    progress,
    actions,
    elapsedTicks,
    remainingTicks
  };
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

function durationTicks(stage: QuestStage): number | null {
  if (stage.objective.type !== 'survive') {
    return null;
  }

  const configured = stage.objective.durationTicks;

  return (
    typeof configured === 'number' &&
    Number.isInteger(configured) &&
    configured > 0
  )
    ? configured
    : null;
}

function startedAtTick(
  objectiveState: JsonObject
): number | null | 'invalid' {
  const value = objectiveState.surviveStartedAtTick;

  if (value === undefined) {
    return null;
  }

  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    return 'invalid';
  }

  return value;
}

function processedEventIds(
  objectiveState: JsonObject
): readonly string[] {
  const value = objectiveState.processedEventIds;

  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string')
  )
    ? value
    : [];
}

function withTimerState(
  progress: QuestProgress,
  startTick: number,
  elapsedTicks: number
): QuestProgress {
  return {
    ...progress,
    objectiveState: {
      ...progress.objectiveState,
      surviveStartedAtTick: startTick,
      elapsedTicks
    }
  };
}

export function stepQuestSurviveObjective(
  progress: QuestProgress,
  definition: QuestDefinition,
  currentTick: number
): QuestSurviveProgressResult {
  if (progress.status !== 'active') {
    return result(progress, 'not_active');
  }

  if (
    !Number.isInteger(currentTick) ||
    currentTick < 0
  ) {
    return result(progress, 'invalid_tick');
  }

  const stage = getCurrentStage(progress, definition);

  if (stage.objective.type !== 'survive') {
    return result(progress, 'not_survive_objective');
  }

  const targetDuration = durationTicks(stage);

  if (targetDuration === null) {
    return result(progress, 'invalid_objective');
  }

  const savedStart = startedAtTick(progress.objectiveState);

  if (savedStart === 'invalid') {
    return result(progress, 'invalid_objective_state');
  }

  const startTick = savedStart ?? currentTick;

  if (currentTick < startTick) {
    return result(progress, 'invalid_tick');
  }

  const elapsed = currentTick - startTick;
  const remaining = Math.max(0, targetDuration - elapsed);
  const progressed = withTimerState(
    progress,
    startTick,
    elapsed
  );

  if (elapsed < targetDuration) {
    return result(
      progressed,
      'progressed',
      elapsed,
      remaining
    );
  }

  const seenEvents = processedEventIds(progressed.objectiveState);
  const transition = completeQuestStage(
    progressed,
    definition,
    stage.id
  );

  if (!transition.accepted) {
    throw new Error(
      `survive stage ${stage.id} could not complete after duration elapsed`
    );
  }

  const transitioned: QuestProgress = {
    ...transition.progress,
    objectiveState: seenEvents.length > 0
      ? {
          ...transition.progress.objectiveState,
          processedEventIds: [...seenEvents]
        }
      : transition.progress.objectiveState
  };

  return result(
    transitioned,
    'stage_completed',
    elapsed,
    0,
    true,
    transition.actions
  );
}
