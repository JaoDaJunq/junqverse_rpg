import { describe, expect, it } from 'vitest';
import {
  QuestProgressSchema,
  type QuestDefinition
} from '../packages/content/src/index.js';
import {
  EventEnvelopeSchema,
  type EventEnvelope
} from '../packages/protocol/src/index.js';
import {
  activateQuest,
  applyQuestObjectiveEvent,
  createQuestProgress
} from '../packages/sim/src/index.js';

function event(
  eventId: string,
  type:
    | 'item_collected'
    | 'interaction_completed'
    | 'entity_died',
  payload: Record<string, string>,
  runId = 'run_m01_1'
): EventEnvelope {
  return EventEnvelopeSchema.parse({
    eventId,
    tick: 10,
    runId,
    type,
    payload
  });
}

function collectQuest(): QuestDefinition {
  return {
    id: 'quest_m01',
    kind: 'main',
    titleKey: 'quest_m01_title',
    mapId: 'map_m01',
    prerequisites: [],
    stages: [
      {
        id: 'stage_collect',
        objective: {
          type: 'collect',
          itemId: 'memory_shard',
          count: 2
        },
        entryActions: [],
        completionActions: [
          { type: 'open_exit', exitId: 'door_r2' }
        ],
        checkpointAfter: true,
        nextStageId: 'stage_interact'
      },
      {
        id: 'stage_interact',
        objective: {
          type: 'interact',
          targetId: 'terminal_a'
        },
        entryActions: [
          { type: 'reveal_interactable', targetId: 'terminal_a' }
        ],
        completionActions: [
          { type: 'complete_quest' }
        ],
        checkpointAfter: false,
        nextStageId: null
      }
    ],
    rewards: {},
    firstClearFlag: 'quest_m01_first_clear'
  };
}

function repeatedTargetQuest(): QuestDefinition {
  return {
    ...collectQuest(),
    stages: [
      {
        id: 'stage_a',
        objective: {
          type: 'interact',
          targetId: 'terminal_a'
        },
        entryActions: [],
        completionActions: [],
        checkpointAfter: false,
        nextStageId: 'stage_b'
      },
      {
        id: 'stage_b',
        objective: {
          type: 'interact',
          targetId: 'terminal_a'
        },
        entryActions: [],
        completionActions: [],
        checkpointAfter: false,
        nextStageId: null
      }
    ]
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

describe('T020 quest objective progress', () => {
  it('counts unique collection events and completes the stage at the target', () => {
    const quest = collectQuest();
    let progress = activeProgress(quest);

    const first = applyQuestObjectiveEvent(
      progress,
      quest,
      event(
        'collect:1',
        'item_collected',
        {
          itemId: 'memory_shard',
          collectibleId: 'pickup_a'
        }
      )
    );

    expect(first.reason).toBe('progressed');
    expect(first.progress.objectiveState.count).toBe(1);
    expect(first.progress.currentStageId).toBe('stage_collect');
    progress = first.progress;

    const second = applyQuestObjectiveEvent(
      progress,
      quest,
      event(
        'collect:2',
        'item_collected',
        {
          itemId: 'memory_shard',
          collectibleId: 'pickup_b'
        }
      )
    );

    expect(second.reason).toBe('stage_completed');
    expect(second.stageCompleted).toBe(true);
    expect(second.progress.currentStageId).toBe('stage_interact');
    expect(second.progress.completedStageIds).toEqual(['stage_collect']);
    expect(second.progress.collectedIds).toEqual([
      'pickup_a',
      'pickup_b'
    ]);
    expect(second.actions.map((action) => action.action.type)).toEqual([
      'open_exit',
      'reveal_interactable'
    ]);
  });

  it('does not count the same event id twice', () => {
    const quest = collectQuest();
    const progress = activeProgress(quest);
    const sameEvent = event(
      'collect:same',
      'item_collected',
      {
        itemId: 'memory_shard',
        collectibleId: 'pickup_a'
      }
    );

    const first = applyQuestObjectiveEvent(
      progress,
      quest,
      sameEvent
    );
    const repeated = applyQuestObjectiveEvent(
      first.progress,
      quest,
      sameEvent
    );

    expect(first.progress.objectiveState.count).toBe(1);
    expect(repeated.reason).toBe('duplicate_event');
    expect(repeated.progress.objectiveState.count).toBe(1);
  });

  it('does not count the same collectible with a different event id', () => {
    const quest = collectQuest();
    let progress = activeProgress(quest);

    progress = applyQuestObjectiveEvent(
      progress,
      quest,
      event(
        'collect:a',
        'item_collected',
        {
          itemId: 'memory_shard',
          collectibleId: 'pickup_a'
        }
      )
    ).progress;

    const duplicate = applyQuestObjectiveEvent(
      progress,
      quest,
      event(
        'collect:b',
        'item_collected',
        {
          itemId: 'memory_shard',
          collectibleId: 'pickup_a'
        }
      )
    );

    expect(duplicate.reason).toBe('duplicate_collectible');
    expect(duplicate.progress.objectiveState.count).toBe(1);
    expect(duplicate.progress.collectedIds).toEqual(['pickup_a']);
  });

  it('preserves processed event ids across stage transitions', () => {
    const quest = repeatedTargetQuest();
    const progress = activeProgress(quest);
    const interaction = event(
      'interaction:same',
      'interaction_completed',
      {
        targetId: 'terminal_a'
      }
    );

    const first = applyQuestObjectiveEvent(
      progress,
      quest,
      interaction
    );

    expect(first.progress.currentStageId).toBe('stage_b');

    const replay = applyQuestObjectiveEvent(
      first.progress,
      quest,
      interaction
    );

    expect(replay.reason).toBe('duplicate_event');
    expect(replay.progress.currentStageId).toBe('stage_b');
    expect(replay.progress.status).toBe('active');
  });

  it('completes a terminal direct objective and keeps progress serializable', () => {
    const quest = repeatedTargetQuest();
    let progress = activeProgress(quest);

    progress = applyQuestObjectiveEvent(
      progress,
      quest,
      event(
        'interaction:a',
        'interaction_completed',
        { targetId: 'terminal_a' }
      )
    ).progress;

    const completed = applyQuestObjectiveEvent(
      progress,
      quest,
      event(
        'interaction:b',
        'interaction_completed',
        { targetId: 'terminal_a' }
      )
    );

    expect(completed.reason).toBe('stage_completed');
    expect(completed.progress.status).toBe('completed');
    expect(
      QuestProgressSchema.safeParse(completed.progress).success
    ).toBe(true);
  });

  it('ignores events from another run without mutating progress', () => {
    const quest = collectQuest();
    const progress = activeProgress(quest);

    const result = applyQuestObjectiveEvent(
      progress,
      quest,
      event(
        'collect:other',
        'item_collected',
        {
          itemId: 'memory_shard',
          collectibleId: 'pickup_other'
        },
        'run_other'
      )
    );

    expect(result.reason).toBe('run_mismatch');
    expect(result.progress).toEqual(progress);
  });

  it('rejects invalid event ids before storing them in QuestProgress', () => {
    const quest = collectQuest();
    const progress = activeProgress(quest);

    const result = applyQuestObjectiveEvent(
      progress,
      quest,
      {
        eventId: 'INVALID EVENT',
        tick: 1,
        runId: 'run_m01_1',
        type: 'item_collected',
        payload: {
          itemId: 'memory_shard'
        }
      }
    );

    expect(result.reason).toBe('invalid_event');
    expect(result.progress).toEqual(progress);
  });

  it('requires multiple unique defeat events when defeat count is greater than one', () => {
    const quest: QuestDefinition = {
      ...collectQuest(),
      stages: [{
        id: 'stage_defeat',
        objective: {
          type: 'defeat',
          encounterId: 'm01_clear',
          count: 2
        },
        entryActions: [],
        completionActions: [
          { type: 'complete_quest' }
        ],
        checkpointAfter: false,
        nextStageId: null
      }]
    };
    let progress = activeProgress(quest);

    const first = applyQuestObjectiveEvent(
      progress,
      quest,
      event(
        'enemy_died:1',
        'entity_died',
        { encounterId: 'm01_clear' }
      )
    );

    expect(first.reason).toBe('progressed');
    expect(first.progress.objectiveState.count).toBe(1);
    progress = first.progress;

    const second = applyQuestObjectiveEvent(
      progress,
      quest,
      event(
        'enemy_died:2',
        'entity_died',
        { encounterId: 'm01_clear' }
      )
    );

    expect(second.reason).toBe('stage_completed');
    expect(second.progress.status).toBe('completed');
    expect(second.progress.completedStageIds).toEqual([
      'stage_defeat'
    ]);
  });

});
