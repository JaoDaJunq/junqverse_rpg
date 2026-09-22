import {
  HeroDefinitionSchema,
  IdSchema,
  MapDefinitionSchema,
  QuestDefinitionSchema,
  type HeroDefinition,
  type MapDefinition,
  type QuestDefinition
} from './contracts.js';

export type ContentDocument =
  | { file: string; kind: 'asset'; data: unknown }
  | { file: string; kind: 'hero'; data: unknown }
  | { file: string; kind: 'map'; data: unknown }
  | { file: string; kind: 'quest'; data: unknown };

export type ContentValidationError = {
  file: string;
  id: string;
  code:
    | 'schema_error'
    | 'duplicate_id'
    | 'missing_asset'
    | 'missing_map'
    | 'missing_prerequisite'
    | 'prerequisite_cycle'
    | 'duplicate_stage'
    | 'missing_stage'
    | 'stage_cycle'
    | 'unreachable_stage'
    | 'missing_terminal';
  message: string;
};

export type ContentValidationResult = {
  ok: boolean;
  errors: ContentValidationError[];
};

type Sourced<T> = {
  file: string;
  value: T;
};

function getCandidateId(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  if (
    data !== null &&
    typeof data === 'object' &&
    'id' in data &&
    typeof (data as { id?: unknown }).id === 'string'
  ) {
    return (data as { id: string }).id;
  }
  return '<unknown>';
}

function pushSchemaErrors(
  errors: ContentValidationError[],
  document: ContentDocument,
  issues: readonly { path: PropertyKey[]; message: string }[]
): void {
  const id = getCandidateId(document.data);
  for (const issue of issues) {
    const path = issue.path.length > 0 ? ` at ${issue.path.join('.')}` : '';
    errors.push({
      file: document.file,
      id,
      code: 'schema_error',
      message: `${document.file} [${id}] schema error${path}: ${issue.message}`
    });
  }
}

function addUnique<T extends { id: string }>(
  map: Map<string, Sourced<T>>,
  file: string,
  value: T,
  errors: ContentValidationError[]
): void {
  const existing = map.get(value.id);
  if (existing) {
    errors.push({
      file,
      id: value.id,
      code: 'duplicate_id',
      message: `${file} [${value.id}] duplicates ID already declared in ${existing.file}`
    });
    return;
  }
  map.set(value.id, { file, value });
}

function validateQuestStages(
  quest: Sourced<QuestDefinition>,
  errors: ContentValidationError[]
): void {
  const stageMap = new Map<string, typeof quest.value.stages[number]>();

  for (const stage of quest.value.stages) {
    if (stageMap.has(stage.id)) {
      errors.push({
        file: quest.file,
        id: quest.value.id,
        code: 'duplicate_stage',
        message: `${quest.file} [${quest.value.id}] duplicate stage ID: ${stage.id}`
      });
      continue;
    }
    stageMap.set(stage.id, stage);
  }

  for (const stage of quest.value.stages) {
    if (stage.nextStageId !== null && !stageMap.has(stage.nextStageId)) {
      errors.push({
        file: quest.file,
        id: quest.value.id,
        code: 'missing_stage',
        message: `${quest.file} [${quest.value.id}] stage ${stage.id} references missing nextStageId ${stage.nextStageId}`
      });
    }
  }

  const firstStage = quest.value.stages[0];
  if (!firstStage) {
    return;
  }

  const visited = new Set<string>();
  let currentId: string | null = firstStage.id;
  let reachedTerminal = false;
  let detectedCycle = false;

  while (currentId !== null) {
    if (visited.has(currentId)) {
      detectedCycle = true;
      errors.push({
        file: quest.file,
        id: quest.value.id,
        code: 'stage_cycle',
        message: `${quest.file} [${quest.value.id}] stage cycle detected at ${currentId}`
      });
      break;
    }

    const current = stageMap.get(currentId);
    if (!current) {
      break;
    }

    visited.add(currentId);
    currentId = current.nextStageId;
    if (currentId === null) {
      reachedTerminal = true;
    }
  }

  for (const stageId of stageMap.keys()) {
    if (!visited.has(stageId)) {
      errors.push({
        file: quest.file,
        id: quest.value.id,
        code: 'unreachable_stage',
        message: `${quest.file} [${quest.value.id}] stage is unreachable from first stage: ${stageId}`
      });
    }
  }

  if (!reachedTerminal && !detectedCycle) {
    errors.push({
      file: quest.file,
      id: quest.value.id,
      code: 'missing_terminal',
      message: `${quest.file} [${quest.value.id}] has no reachable terminal stage with nextStageId null`
    });
  }
}

function validatePrerequisiteGraph(
  quests: Map<string, Sourced<QuestDefinition>>,
  errors: ContentValidationError[]
): void {
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const reportedCycles = new Set<string>();

  const visit = (questId: string): void => {
    const currentState = state.get(questId) ?? 0;
    if (currentState === 2) {
      return;
    }

    if (currentState === 1) {
      const cycleStart = stack.indexOf(questId);
      const cycle = [...stack.slice(cycleStart), questId];
      const key = [...new Set(cycle)].sort().join('|');
      if (!reportedCycles.has(key)) {
        reportedCycles.add(key);
        const quest = quests.get(questId);
        if (quest) {
          errors.push({
            file: quest.file,
            id: questId,
            code: 'prerequisite_cycle',
            message: `${quest.file} [${questId}] prerequisite cycle: ${cycle.join(' -> ')}`
          });
        }
      }
      return;
    }

    const quest = quests.get(questId);
    if (!quest) {
      return;
    }

    state.set(questId, 1);
    stack.push(questId);

    for (const prerequisiteId of quest.value.prerequisites) {
      if (quests.has(prerequisiteId)) {
        visit(prerequisiteId);
      }
    }

    stack.pop();
    state.set(questId, 2);
  };

  for (const questId of quests.keys()) {
    visit(questId);
  }
}

export function validateContent(documents: readonly ContentDocument[]): ContentValidationResult {
  const errors: ContentValidationError[] = [];
  const assets = new Map<string, Sourced<{ id: string }>>();
  const heroes = new Map<string, Sourced<HeroDefinition>>();
  const maps = new Map<string, Sourced<MapDefinition>>();
  const quests = new Map<string, Sourced<QuestDefinition>>();

  for (const document of documents) {
    if (document.kind === 'asset') {
      const parsed = IdSchema.safeParse(document.data);
      if (!parsed.success) {
        pushSchemaErrors(errors, document, parsed.error.issues);
        continue;
      }
      addUnique(assets, document.file, { id: parsed.data }, errors);
      continue;
    }

    if (document.kind === 'hero') {
      const parsed = HeroDefinitionSchema.safeParse(document.data);
      if (!parsed.success) {
        pushSchemaErrors(errors, document, parsed.error.issues);
        continue;
      }
      addUnique(heroes, document.file, parsed.data, errors);
      continue;
    }

    if (document.kind === 'map') {
      const parsed = MapDefinitionSchema.safeParse(document.data);
      if (!parsed.success) {
        pushSchemaErrors(errors, document, parsed.error.issues);
        continue;
      }
      addUnique(maps, document.file, parsed.data, errors);
      continue;
    }

    const parsed = QuestDefinitionSchema.safeParse(document.data);
    if (!parsed.success) {
      pushSchemaErrors(errors, document, parsed.error.issues);
      continue;
    }
    addUnique(quests, document.file, parsed.data, errors);
  }

  for (const hero of heroes.values()) {
    if (!assets.has(hero.value.assetId)) {
      errors.push({
        file: hero.file,
        id: hero.value.id,
        code: 'missing_asset',
        message: `${hero.file} [${hero.value.id}] references missing assetId ${hero.value.assetId}`
      });
    }
  }

  for (const quest of quests.values()) {
    if (!maps.has(quest.value.mapId)) {
      errors.push({
        file: quest.file,
        id: quest.value.id,
        code: 'missing_map',
        message: `${quest.file} [${quest.value.id}] references missing mapId ${quest.value.mapId}`
      });
    }

    for (const prerequisiteId of quest.value.prerequisites) {
      if (!quests.has(prerequisiteId)) {
        errors.push({
          file: quest.file,
          id: quest.value.id,
          code: 'missing_prerequisite',
          message: `${quest.file} [${quest.value.id}] references missing prerequisite ${prerequisiteId}`
        });
      }
    }

    validateQuestStages(quest, errors);
  }

  validatePrerequisiteGraph(quests, errors);

  return {
    ok: errors.length === 0,
    errors
  };
}

export function assertValidContent(documents: readonly ContentDocument[]): void {
  const result = validateContent(documents);
  if (result.ok) {
    return;
  }

  throw new Error(
    ['Content validation failed:', ...result.errors.map((error) => `- ${error.message}`)].join('\n')
  );
}
