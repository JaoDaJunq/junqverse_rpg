import { describe, expect, it } from 'vitest';
import type {
  QuestDefinition,
  QuestId
} from '../packages/content/src/index.js';
import {
  activateQuest,
  completeQuestStage,
  createQuestProgress,
  refreshQuestAvailability
} from '../packages/sim/src/index.js';

function definition(
  prerequisites: QuestId[] = []
): QuestDefinition {
  return {
    id: 'quest_m02',
    kind: 'main',
    titleKey: 'quest_m02_title',
    mapId: 'map_m02',
    prerequisites,
    stages: [
      {
        id: 'stage_intro',
        objective: { type: 'interact', targetId: 'console_a' },
        entryActions: [
          { type: 'start_dialogue', dialogueId: 'm02_intro' }
        ],
        completionActions: [
          { type: 'open_exit', exitId: 'door_r2' }
        ],
        checkpointAfter: true,
        nextStageId: 'stage_clear'
      },
      {
        id: 'stage_clear',
        objective: { type: 'defeat', encounterId: 'm02_clear' },
        entryActions: [
          { type: 'spawn_encounter', encounterId: 'm02_clear' }
        ],
        completionActions: [
          { type: 'complete_quest' }
        ],
        checkpointAfter: false,
        nextStageId: null
      }
    ],
    rewards: {},
    firstClearFlag: 'quest_m02_first_clear'
  };
}

describe('T018 quest runtime', () => {
  it('starts locked until every prerequisite is completed', () => {
    const quest = definition(['quest_m01']);
    const locked = createQuestProgress(
      quest,
      'run_m02_1',
      []
    );

    expect(locked.status).toBe('locked');

    const available = refreshQuestAvailability(
      locked,
      quest,
      ['quest_m01']
    );

    expect(available.status).toBe('available');
    expect(available.currentStageId).toBe('stage_intro');
  });

  it('activates an available quest and emits entry actions once', () => {
    const quest = definition();
    const initial = createQuestProgress(
      quest,
      'run_m02_1',
      []
    );

    const activated = activateQuest(initial, quest);

    expect(activated.accepted).toBe(true);
    expect(activated.progress.status).toBe('active');
    expect(activated.actions).toHaveLength(1);
    expect(activated.actions[0]).toMatchObject({
      executionId: 'quest_m02:stage_intro:entry:0',
      stageId: 'stage_intro',
      phase: 'entry'
    });

    const repeated = activateQuest(activated.progress, quest);
    expect(repeated.accepted).toBe(false);
    expect(repeated.actions).toEqual([]);
  });

  it('completes a stage, checkpoints, then enters the next stage in order', () => {
    const quest = definition();
    const active = activateQuest(
      createQuestProgress(quest, 'run_m02_1', []),
      quest
    ).progress;

    const result = completeQuestStage(
      active,
      quest,
      'stage_intro'
    );

    expect(result.accepted).toBe(true);
    expect(result.progress.currentStageId).toBe('stage_clear');
    expect(result.progress.completedStageIds).toEqual(['stage_intro']);
    expect(result.progress.checkpointId).toBe(
      'checkpoint:quest_m02:stage_intro'
    );
    expect(result.actions.map((action) => action.executionId)).toEqual([
      'quest_m02:stage_intro:completion:0',
      'quest_m02:stage_clear:entry:0'
    ]);
  });

  it('ignores a repeated stale completion without duplicating actions', () => {
    const quest = definition();
    const active = activateQuest(
      createQuestProgress(quest, 'run_m02_1', []),
      quest
    ).progress;
    const advanced = completeQuestStage(
      active,
      quest,
      'stage_intro'
    ).progress;

    const repeated = completeQuestStage(
      advanced,
      quest,
      'stage_intro'
    );

    expect(repeated.accepted).toBe(false);
    expect(repeated.reason).toBe('stale_stage');
    expect(repeated.actions).toEqual([]);
    expect(repeated.progress.executedActionIds).toEqual(
      advanced.executedActionIds
    );
  });

  it('completes the quest on a terminal stage without replaying prior actions', () => {
    const quest = definition();
    let progress = activateQuest(
      createQuestProgress(quest, 'run_m02_1', []),
      quest
    ).progress;
    progress = completeQuestStage(
      progress,
      quest,
      'stage_intro'
    ).progress;

    const completed = completeQuestStage(
      progress,
      quest,
      'stage_clear'
    );

    expect(completed.accepted).toBe(true);
    expect(completed.progress.status).toBe('completed');
    expect(completed.progress.completedStageIds).toEqual([
      'stage_intro',
      'stage_clear'
    ]);
    expect(completed.actions.map((action) => action.executionId)).toEqual([
      'quest_m02:stage_clear:completion:0'
    ]);

    const repeated = completeQuestStage(
      completed.progress,
      quest,
      'stage_clear'
    );
    expect(repeated.accepted).toBe(false);
    expect(repeated.reason).toBe('not_active');
    expect(repeated.actions).toEqual([]);
  });
});
