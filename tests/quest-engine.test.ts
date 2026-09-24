import { describe, expect, it } from 'vitest';
import {
  QuestDefinitionSchema,
  type QuestDefinition
} from '../packages/content/src/index.js';
import type { EventEnvelope } from '../packages/protocol/src/index.js';
import {
  activateQuest,
  applyQuestEvent,
  createQuestEngineState,
  refreshQuestAvailability
} from '../packages/sim/src/index.js';

function event(
  eventId: string,
  type: EventEnvelope['type'],
  payload: EventEnvelope['payload'],
  runId = 'run_quest'
): EventEnvelope {
  return {
    eventId,
    tick: 1,
    runId,
    type,
    payload
  };
}

function definition(
  overrides: Partial<QuestDefinition> = {}
): QuestDefinition {
  return QuestDefinitionSchema.parse({
    id: 'quest_m01',
    kind: 'main',
    titleKey: 'quest_m01_title',
    mapId: 'map_m01',
    prerequisites: [],
    stages: [
      {
        id: 'stage_one',
        objective: {
          type: 'enter_area',
          areaId: 'praca_centro'
        },
        entryActions: [{
          id: 'stage_one_entry',
          type: 'open_exit'
        }],
        completionActions: [{
          id: 'stage_one_complete',
          type: 'set_flag',
          key: 'stage_one_done',
          value: true
        }],
        checkpointAfter: false,
        nextStageId: 'stage_two'
      },
      {
        id: 'stage_two',
        objective: {
          type: 'collect',
          itemIds: ['eco_a', 'eco_b'],
          requiredCount: 2
        },
        entryActions: [{
          id: 'stage_two_entry',
          type: 'spawn_encounter',
          encounterId: 'enc_stage_two'
        }],
        completionActions: [{
          id: 'stage_two_complete',
          type: 'complete_quest'
        }],
        checkpointAfter: true,
        nextStageId: null
      }
    ],
    rewards: {},
    firstClearFlag: 'quest_m01_first_clear',
    ...overrides
  });
}

describe('T018 quest engine', () => {
  it('moves locked to available only after prerequisites are satisfied', () => {
    const quest = definition({
      prerequisites: ['quest_m02']
    });
    const locked = createQuestEngineState(
      quest,
      'run_quest'
    );

    expect(locked.status).toBe('locked');

    const stillLocked = refreshQuestAvailability(
      quest,
      locked,
      []
    );
    expect(stillLocked).toBe(locked);

    const available = refreshQuestAvailability(
      quest,
      locked,
      ['quest_m02']
    );
    expect(available.status).toBe('available');
  });

  it('activates exactly one stage and emits entry actions once', () => {
    const quest = definition();
    const available = createQuestEngineState(
      quest,
      'run_quest'
    );

    const activated = activateQuest(quest, available);
    expect(activated.state.status).toBe('active');
    expect(activated.state.currentStageId).toBe('stage_one');
    expect(activated.actions.map((action) => action.id)).toEqual([
      'stage_one_entry'
    ]);

    const repeated = activateQuest(
      quest,
      activated.state
    );
    expect(repeated.state).toBe(activated.state);
    expect(repeated.actions).toEqual([]);
  });

  it('transitions one stage and keeps completion/entry actions idempotent', () => {
    const quest = definition();
    const active = activateQuest(
      quest,
      createQuestEngineState(quest, 'run_quest')
    ).state;

    const advanced = applyQuestEvent(
      quest,
      active,
      event(
        'event_enter_praca',
        'area_entered',
        { areaId: 'praca_centro' }
      )
    );

    expect(advanced.state.status).toBe('active');
    expect(advanced.state.currentStageId).toBe('stage_two');
    expect(advanced.state.completedStageIds).toEqual([
      'stage_one'
    ]);
    expect(advanced.actions.map((action) => action.id)).toEqual([
      'stage_one_complete',
      'stage_two_entry'
    ]);

    const duplicate = applyQuestEvent(
      quest,
      advanced.state,
      event(
        'event_enter_praca',
        'area_entered',
        { areaId: 'praca_centro' }
      )
    );

    expect(duplicate.state).toBe(advanced.state);
    expect(duplicate.actions).toEqual([]);
  });

  it('does not let one duplicated event advance two equivalent stages', () => {
    const quest = definition({
      stages: [
        {
          id: 'stage_one',
          objective: {
            type: 'enter_area',
            areaId: 'same_area'
          },
          entryActions: [],
          completionActions: [],
          checkpointAfter: false,
          nextStageId: 'stage_two'
        },
        {
          id: 'stage_two',
          objective: {
            type: 'enter_area',
            areaId: 'same_area'
          },
          entryActions: [],
          completionActions: [],
          checkpointAfter: false,
          nextStageId: null
        }
      ]
    });
    const active = activateQuest(
      quest,
      createQuestEngineState(quest, 'run_quest')
    ).state;
    const firstEvent = event(
      'same_event',
      'area_entered',
      { areaId: 'same_area' }
    );

    const once = applyQuestEvent(
      quest,
      active,
      firstEvent
    );
    expect(once.state.status).toBe('active');
    expect(once.state.currentStageId).toBe('stage_two');

    const duplicate = applyQuestEvent(
      quest,
      once.state,
      firstEvent
    );
    expect(duplicate.state).toBe(once.state);

    const newEvent = applyQuestEvent(
      quest,
      once.state,
      event(
        'new_event',
        'area_entered',
        { areaId: 'same_area' }
      )
    );
    expect(newEvent.state.status).toBe('completed');
  });

  it('completes the final objective once and freezes the completed quest', () => {
    const quest = definition();
    let state = activateQuest(
      quest,
      createQuestEngineState(quest, 'run_quest')
    ).state;

    state = applyQuestEvent(
      quest,
      state,
      event(
        'event_enter',
        'area_entered',
        { areaId: 'praca_centro' }
      )
    ).state;

    state = applyQuestEvent(
      quest,
      state,
      event(
        'event_collect_a',
        'item_collected',
        { itemId: 'eco_a' }
      )
    ).state;
    expect(state.status).toBe('active');

    const completed = applyQuestEvent(
      quest,
      state,
      event(
        'event_collect_b',
        'item_collected',
        { itemId: 'eco_b' }
      )
    );

    expect(completed.state.status).toBe('completed');
    expect(completed.state.completedStageIds).toEqual([
      'stage_one',
      'stage_two'
    ]);
    expect(completed.state.collectedIds).toEqual([
      'eco_a',
      'eco_b'
    ]);
    expect(completed.actions.map((action) => action.id)).toEqual([
      'stage_two_complete'
    ]);

    const repeated = applyQuestEvent(
      quest,
      completed.state,
      event(
        'event_collect_b_again',
        'item_collected',
        { itemId: 'eco_b' }
      )
    );
    expect(repeated.state).toBe(completed.state);
    expect(repeated.actions).toEqual([]);
  });

  it('ignores events from another run', () => {
    const quest = definition();
    const active = activateQuest(
      quest,
      createQuestEngineState(quest, 'run_quest')
    ).state;

    const ignored = applyQuestEvent(
      quest,
      active,
      event(
        'event_other_run',
        'area_entered',
        { areaId: 'praca_centro' },
        'run_other'
      )
    );

    expect(ignored.state).toBe(active);
    expect(ignored.actions).toEqual([]);
  });

  it('rejects duplicate stage ids and duplicate action ids', () => {
    expect(() => createQuestEngineState(
      definition({
        stages: [
          {
            id: 'same_stage',
            objective: {
              type: 'enter_area',
              areaId: 'area_a'
            },
            entryActions: [],
            completionActions: [],
            checkpointAfter: false,
            nextStageId: null
          },
          {
            id: 'same_stage',
            objective: {
              type: 'enter_area',
              areaId: 'area_b'
            },
            entryActions: [],
            completionActions: [],
            checkpointAfter: false,
            nextStageId: null
          }
        ]
      }),
      'run_quest'
    )).toThrow('stage ids must be unique');

    expect(() => createQuestEngineState(
      definition({
        stages: [
          {
            id: 'stage_unique',
            objective: {
              type: 'enter_area',
              areaId: 'area_a'
            },
            entryActions: [{
              id: 'duplicate_action',
              type: 'open_exit'
            }],
            completionActions: [{
              id: 'duplicate_action',
              type: 'set_flag'
            }],
            checkpointAfter: false,
            nextStageId: null
          }
        ]
      }),
      'run_quest'
    )).toThrow('action ids must be unique');
  });
});
