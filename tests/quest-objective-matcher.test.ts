import { describe, expect, it } from 'vitest';
import type {
  QuestId,
  QuestObjective
} from '../packages/content/src/index.js';
import {
  EventEnvelopeSchema
} from '../packages/protocol/src/index.js';
import {
  matchQuestObjectiveEvent
} from '../packages/sim/src/index.js';

const context = {
  questId: 'quest_m01' as QuestId,
  runId: 'run_m01_1'
};

function event(
  type:
    | 'area_entered'
    | 'interaction_completed'
    | 'item_collected'
    | 'entity_died'
    | 'choice_committed',
  payload: Record<string, string>,
  runId = context.runId
) {
  return EventEnvelopeSchema.parse({
    eventId: `event:${type}:1`,
    tick: 10,
    runId,
    type,
    payload
  });
}

describe('T019 quest objective matcher', () => {
  it('accepts a protocol EventEnvelope for a matching interaction', () => {
    const objective: QuestObjective = {
      type: 'interact',
      targetId: 'terminal_a'
    };
    const envelope = event(
      'interaction_completed',
      {
        questId: 'quest_m01',
        targetId: 'terminal_a'
      }
    );

    expect(
      matchQuestObjectiveEvent(objective, envelope, context)
    ).toEqual({
      matched: true,
      reason: 'matched'
    });
  });

  it('rejects an event from another run before target matching', () => {
    const objective: QuestObjective = {
      type: 'interact',
      targetId: 'terminal_a'
    };

    expect(
      matchQuestObjectiveEvent(
        objective,
        event(
          'interaction_completed',
          { targetId: 'terminal_a' },
          'run_other'
        ),
        context
      )
    ).toEqual({
      matched: false,
      reason: 'run_mismatch'
    });
  });

  it('rejects an explicitly routed event from another quest', () => {
    const objective: QuestObjective = {
      type: 'interact',
      targetId: 'terminal_a'
    };

    expect(
      matchQuestObjectiveEvent(
        objective,
        event('interaction_completed', {
          questId: 'quest_m02',
          targetId: 'terminal_a'
        }),
        context
      )
    ).toEqual({
      matched: false,
      reason: 'quest_mismatch'
    });
  });

  it('rejects the wrong event type and the wrong target separately', () => {
    const objective: QuestObjective = {
      type: 'interact',
      targetId: 'terminal_a'
    };

    expect(
      matchQuestObjectiveEvent(
        objective,
        event('area_entered', { areaId: 'terminal_a' }),
        context
      ).reason
    ).toBe('event_type_mismatch');

    expect(
      matchQuestObjectiveEvent(
        objective,
        event('interaction_completed', {
          targetId: 'terminal_b'
        }),
        context
      ).reason
    ).toBe('target_mismatch');
  });

  it.each([
    [
      { type: 'enter_area', areaId: 'room_r2' },
      'area_entered',
      { areaId: 'room_r2' }
    ],
    [
      { type: 'collect', itemId: 'memory_shard' },
      'item_collected',
      { itemId: 'memory_shard' }
    ],
    [
      { type: 'defeat', encounterId: 'm01_clear_r3' },
      'entity_died',
      { encounterId: 'm01_clear_r3' }
    ],
    [
      { type: 'choose', choiceId: 'm01_route' },
      'choice_committed',
      { choiceId: 'm01_route' }
    ]
  ] as const)(
    'matches direct objective %j',
    (objective, type, payload) => {
      expect(
        matchQuestObjectiveEvent(
          objective as QuestObjective,
          event(type, payload),
          context
        )
      ).toEqual({
        matched: true,
        reason: 'matched'
      });
    }
  );

  it('reports malformed direct objectives instead of matching them', () => {
    const objective: QuestObjective = {
      type: 'collect'
    };

    expect(
      matchQuestObjectiveEvent(
        objective,
        event('item_collected', { itemId: 'memory_shard' }),
        context
      )
    ).toEqual({
      matched: false,
      reason: 'invalid_objective'
    });
  });

  it('keeps composite and timed objectives outside this matcher', () => {
    for (const type of [
      'survive',
      'escort',
      'sequence',
      'all',
      'any'
    ] as const) {
      const objective: QuestObjective = { type };

      expect(
        matchQuestObjectiveEvent(
          objective,
          event('area_entered', { areaId: 'room_r2' }),
          context
        )
      ).toEqual({
        matched: false,
        reason: 'unsupported_objective'
      });
    }
  });
});
