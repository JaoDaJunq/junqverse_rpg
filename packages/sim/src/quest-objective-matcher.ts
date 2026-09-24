import type {
  QuestId,
  QuestObjective
} from '@junqverse/content';

export interface QuestObjectiveEvent {
  readonly eventId: string;
  readonly tick: number;
  readonly runId: string;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface QuestObjectiveMatchContext {
  readonly questId: QuestId;
  readonly runId: string;
}

export type QuestObjectiveMatchReason =
  | 'matched'
  | 'run_mismatch'
  | 'quest_mismatch'
  | 'event_type_mismatch'
  | 'target_mismatch'
  | 'invalid_objective'
  | 'unsupported_objective';

export interface QuestObjectiveMatchResult {
  readonly matched: boolean;
  readonly reason: QuestObjectiveMatchReason;
}

type DirectObjectiveType =
  | 'enter_area'
  | 'interact'
  | 'collect'
  | 'defeat'
  | 'choose';

interface DirectObjectiveRule {
  readonly eventType: string;
  readonly objectiveKey: string;
  readonly payloadKey: string;
}

const DIRECT_RULES: Readonly<Record<DirectObjectiveType, DirectObjectiveRule>> = {
  enter_area: {
    eventType: 'area_entered',
    objectiveKey: 'areaId',
    payloadKey: 'areaId'
  },
  interact: {
    eventType: 'interaction_completed',
    objectiveKey: 'targetId',
    payloadKey: 'targetId'
  },
  collect: {
    eventType: 'item_collected',
    objectiveKey: 'itemId',
    payloadKey: 'itemId'
  },
  defeat: {
    eventType: 'entity_died',
    objectiveKey: 'encounterId',
    payloadKey: 'encounterId'
  },
  choose: {
    eventType: 'choice_committed',
    objectiveKey: 'choiceId',
    payloadKey: 'choiceId'
  }
};

function stringField(
  value: Readonly<Record<string, unknown>>,
  key: string
): string | null {
  const candidate = value[key];
  return typeof candidate === 'string' ? candidate : null;
}

function isDirectObjectiveType(
  type: QuestObjective['type']
): type is DirectObjectiveType {
  return Object.prototype.hasOwnProperty.call(DIRECT_RULES, type);
}

function falseResult(
  reason: Exclude<QuestObjectiveMatchReason, 'matched'>
): QuestObjectiveMatchResult {
  return { matched: false, reason };
}

export function matchQuestObjectiveEvent(
  objective: QuestObjective,
  event: QuestObjectiveEvent,
  context: QuestObjectiveMatchContext
): QuestObjectiveMatchResult {
  if (event.runId !== context.runId) {
    return falseResult('run_mismatch');
  }

  const routedQuestId = event.payload.questId;
  if (
    routedQuestId !== undefined &&
    routedQuestId !== context.questId
  ) {
    return falseResult('quest_mismatch');
  }

  if (!isDirectObjectiveType(objective.type)) {
    return falseResult('unsupported_objective');
  }

  const rule = DIRECT_RULES[objective.type];

  if (event.type !== rule.eventType) {
    return falseResult('event_type_mismatch');
  }

  const objectiveRecord: Readonly<Record<string, unknown>> = objective;
  const configuredTarget = stringField(
    objectiveRecord,
    rule.objectiveKey
  );

  if (configuredTarget === null) {
    return falseResult('invalid_objective');
  }

  const eventTarget = stringField(
    event.payload,
    rule.payloadKey
  );

  if (eventTarget !== configuredTarget) {
    return falseResult('target_mismatch');
  }

  return {
    matched: true,
    reason: 'matched'
  };
}
