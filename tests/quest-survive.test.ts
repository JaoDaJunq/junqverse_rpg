import { describe, expect, it } from 'vitest';
import {
  QuestProgressSchema,
  type QuestDefinition
} from '../packages/content/src/index.js';
import {
  activateQuest,
  createQuestProgress,
  stepQuestSurviveObjective
} from '../packages/sim/src/index.js';

function surviveQuest(
  nextStageId: string | null = 'stage_after'
): QuestDefinition {
  return {
    id: 'quest_m01',
    kind: 'main',
    titleKey: 'quest_m01_title',
    mapId: 'map_m01',
    prerequisites: [],
    stages: [
      {
        id: 'stage_survive',
        objective: {
          type: 'survive',
          durationTicks: 180
        },
        entryActions: [
          { type: 'spawn_encounter', encounterId: 'wave_01' }
        ],
        completionActions: [
          { type: 'open_exit', exitId: 'door_after' }
        ],
        checkpointAfter: true,
        nextStageId
      },
      ...(nextStageId === null
        ? []
        : [{
            id: 'stage_after',
            objective: {
              type: 'interact',
              targetId: 'terminal_after'
            },
            entryActions: [
              {
                type: 'reveal_interactable',
                targetId: 'terminal_after'
              }
            ],
            completionActions: [
              { type: 'complete_quest' }
            ],
            checkpointAfter: false,
            nextStageId: null
          }])
    ],
    rewards: {},
    firstClearFlag: 'quest_m01_first_clear'
  };
}

function activeProgress(quest: QuestDefinition) {
  return activateQuest(
    createQuestProgress(
      quest,
      'run_m01_1',
      []
    ),
    quest
  ).progress;
}

describe('T021 survive objective', () => {
  it('starts timing from the first authoritative tick', () => {
    const quest = surviveQuest();
    const progress = activeProgress(quest);

    const started = stepQuestSurviveObjective(
      progress,
      quest,
      600
    );

    expect(started.reason).toBe('progressed');
    expect(started.elapsedTicks).toBe(0);
    expect(started.remainingTicks).toBe(180);
    expect(
      started.progress.objectiveState.surviveStartedAtTick
    ).toBe(600);
  });

  it('does not advance when the same tick is processed more than once', () => {
    const quest = surviveQuest();
    const progress = activeProgress(quest);

    const started = stepQuestSurviveObjective(
      progress,
      quest,
      600
    );
    const repeated = stepQuestSurviveObjective(
      started.progress,
      quest,
      600
    );

    expect(repeated.reason).toBe('progressed');
    expect(repeated.elapsedTicks).toBe(0);
    expect(repeated.remainingTicks).toBe(180);
  });

  it('uses absolute simulation ticks instead of call count', () => {
    const quest = surviveQuest();
    const progress = activeProgress(quest);

    const started = stepQuestSurviveObjective(
      progress,
      quest,
      100
    );
    const halfway = stepQuestSurviveObjective(
      started.progress,
      quest,
      190
    );

    expect(halfway.elapsedTicks).toBe(90);
    expect(halfway.remainingTicks).toBe(90);
    expect(halfway.progress.currentStageId).toBe(
      'stage_survive'
    );
  });

  it('completes at the target duration and emits stage transition actions', () => {
    const quest = surviveQuest();
    let progress = activeProgress(quest);

    progress = stepQuestSurviveObjective(
      progress,
      quest,
      100
    ).progress;

    const completed = stepQuestSurviveObjective(
      progress,
      quest,
      280
    );

    expect(completed.reason).toBe('stage_completed');
    expect(completed.stageCompleted).toBe(true);
    expect(completed.elapsedTicks).toBe(180);
    expect(completed.remainingTicks).toBe(0);
    expect(completed.progress.currentStageId).toBe(
      'stage_after'
    );
    expect(completed.progress.completedStageIds).toEqual([
      'stage_survive'
    ]);
    expect(completed.progress.checkpointId).toContain(
      'stage_survive'
    );
    expect(
      completed.actions.map((action) => action.action.type)
    ).toEqual([
      'open_exit',
      'reveal_interactable'
    ]);
  });

  it('preserves processed event ids across a survive stage transition', () => {
    const quest = surviveQuest();
    let progress = {
      ...activeProgress(quest),
      objectiveState: {
        processedEventIds: [
          'interaction:before_survive'
        ]
      }
    };

    progress = stepQuestSurviveObjective(
      progress,
      quest,
      50
    ).progress;

    const completed = stepQuestSurviveObjective(
      progress,
      quest,
      230
    );

    expect(
      completed.progress.objectiveState.processedEventIds
    ).toEqual(['interaction:before_survive']);
  });

  it('can complete a terminal survive stage and remain serializable', () => {
    const quest = surviveQuest(null);
    let progress = activeProgress(quest);

    progress = stepQuestSurviveObjective(
      progress,
      quest,
      10
    ).progress;

    const completed = stepQuestSurviveObjective(
      progress,
      quest,
      190
    );

    expect(completed.progress.status).toBe('completed');
    expect(completed.progress.completedStageIds).toEqual([
      'stage_survive'
    ]);
    expect(
      QuestProgressSchema.safeParse(completed.progress).success
    ).toBe(true);
  });

  it('rejects invalid duration, invalid ticks and non-survive stages', () => {
    const quest = surviveQuest();
    const progress = activeProgress(quest);

    const invalidDuration: QuestDefinition = {
      ...quest,
      stages: [
        {
          ...quest.stages[0]!,
          objective: {
            type: 'survive',
            durationTicks: 0
          }
        },
        ...quest.stages.slice(1)
      ]
    };

    expect(
      stepQuestSurviveObjective(
        progress,
        invalidDuration,
        10
      ).reason
    ).toBe('invalid_objective');

    expect(
      stepQuestSurviveObjective(
        progress,
        quest,
        -1
      ).reason
    ).toBe('invalid_tick');

    const interactQuest: QuestDefinition = {
      ...quest,
      stages: [{
        id: 'stage_interact',
        objective: {
          type: 'interact',
          targetId: 'terminal'
        },
        entryActions: [],
        completionActions: [],
        checkpointAfter: false,
        nextStageId: null
      }]
    };
    const interactProgress = activeProgress(interactQuest);

    expect(
      stepQuestSurviveObjective(
        interactProgress,
        interactQuest,
        10
      ).reason
    ).toBe('not_survive_objective');
  });

  it('rejects a tick before a persisted survive start tick', () => {
    const quest = surviveQuest();
    const progress = {
      ...activeProgress(quest),
      objectiveState: {
        surviveStartedAtTick: 100,
        elapsedTicks: 20
      }
    };

    const result = stepQuestSurviveObjective(
      progress,
      quest,
      99
    );

    expect(result.reason).toBe('invalid_tick');
    expect(result.progress).toEqual(progress);
  });
});
