import { z } from 'zod';

const ID_PATTERN = /^[a-z0-9_:-]{1,96}$/;
const FORBIDDEN_KEYS = new Set(['__proto__']);

export const IdSchema = z.string().regex(ID_PATTERN).refine((value) => !FORBIDDEN_KEYS.has(value), {
  message: 'forbidden id'
});
export type Id = z.infer<typeof IdSchema>;

export const HeroIdSchema = z.enum(['jao', 'alice', 'kauan', 'gui', 'thomas']);
export type HeroId = z.infer<typeof HeroIdSchema>;

const MAIN_QUEST_IDS = Array.from({ length: 8 }, (_, index) => `quest_m${String(index + 1).padStart(2, '0')}`);
const SIDE_QUEST_IDS = Array.from({ length: 10 }, (_, index) => `quest_s${String(index + 1).padStart(2, '0')}`);
export const QUEST_IDS = [...MAIN_QUEST_IDS, ...SIDE_QUEST_IDS] as const;
export const QuestIdSchema = z.enum(QUEST_IDS);
export type QuestId = z.infer<typeof QuestIdSchema>;

export const TickSchema = z.number().int().nonnegative().finite();
export type Tick = z.infer<typeof TickSchema>;

export const FiniteNumberSchema = z.number().finite();
export const NonNegativeIntegerSchema = z.number().int().nonnegative().finite();

export const Vec2Schema = z.object({
  x: FiniteNumberSchema,
  y: FiniteNumberSchema
}).strict();
export type Vec2 = z.infer<typeof Vec2Schema>;

const SafeRecordKeySchema = z.string().min(1).refine((key) => !FORBIDDEN_KEYS.has(key), {
  message: 'forbidden object key'
});

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(SafeRecordKeySchema, JsonValueSchema)
  ])
);

export const JsonObjectSchema = z.record(SafeRecordKeySchema, JsonValueSchema);
export type JsonObject = z.infer<typeof JsonObjectSchema>;

export const AbilityEffectTypeSchema = z.enum([
  'damage',
  'heal',
  'shield',
  'status',
  'dash',
  'projectile',
  'zone',
  'device',
  'reveal'
]);

export const AbilityEffectSchema = z.object({
  type: AbilityEffectTypeSchema
}).catchall(JsonValueSchema);
export type AbilityEffect = z.infer<typeof AbilityEffectSchema>;

export const AbilityTargetSchema = z.enum(['self', 'point', 'direction', 'entity', 'area']);

export const AbilityDefinitionSchema = z.object({
  id: IdSchema,
  nameKey: IdSchema,
  costFocus: NonNegativeIntegerSchema,
  cooldownTicks: TickSchema,
  windupTicks: TickSchema,
  recoveryTicks: TickSchema,
  target: AbilityTargetSchema,
  rangePx: z.number().nonnegative().finite(),
  shapes: z.array(JsonObjectSchema),
  effects: z.array(AbilityEffectSchema),
  tags: z.array(IdSchema),
  limits: JsonObjectSchema
}).strict();
export type AbilityDefinition = z.infer<typeof AbilityDefinitionSchema>;

export const HeroDefinitionSchema = z.object({
  id: HeroIdSchema,
  nameKey: IdSchema,
  roleKey: IdSchema,
  hp: z.number().positive().finite(),
  speedPxPerSecond: z.number().positive().finite(),
  basic: JsonObjectSchema,
  passive: JsonObjectSchema,
  abilities: z.object({
    q: AbilityDefinitionSchema,
    w: AbilityDefinitionSchema,
    e: AbilityDefinitionSchema,
    r: AbilityDefinitionSchema
  }).strict(),
  assetId: IdSchema
}).strict();
export type HeroDefinition = z.infer<typeof HeroDefinitionSchema>;

export const MapDefinitionSchema = z.object({
  id: IdSchema,
  tileSize: z.literal(32),
  widthTiles: z.number().int().positive().finite(),
  heightTiles: z.number().int().positive().finite(),
  rooms: z.array(JsonObjectSchema),
  spawnPoints: z.array(JsonObjectSchema),
  blockers: z.array(JsonObjectSchema),
  interactables: z.array(JsonObjectSchema),
  exits: z.array(JsonObjectSchema)
}).strict();
export type MapDefinition = z.infer<typeof MapDefinitionSchema>;

export const QuestObjectiveTypeSchema = z.enum([
  'enter_area',
  'interact',
  'collect',
  'defeat',
  'survive',
  'escort',
  'sequence',
  'choose',
  'all',
  'any'
]);

export const QuestObjectiveSchema = z.object({
  type: QuestObjectiveTypeSchema
}).catchall(JsonValueSchema);
export type QuestObjective = z.infer<typeof QuestObjectiveSchema>;

export const QuestActionSchema = z.object({
  type: IdSchema
}).catchall(JsonValueSchema);
export type QuestAction = z.infer<typeof QuestActionSchema>;

export const QuestStageSchema = z.object({
  id: IdSchema,
  objective: QuestObjectiveSchema,
  entryActions: z.array(QuestActionSchema),
  completionActions: z.array(QuestActionSchema),
  checkpointAfter: z.boolean(),
  nextStageId: IdSchema.nullable()
}).strict();
export type QuestStage = z.infer<typeof QuestStageSchema>;

export const QuestDefinitionSchema = z.object({
  id: QuestIdSchema,
  kind: z.enum(['main', 'side']),
  titleKey: IdSchema,
  mapId: IdSchema,
  prerequisites: z.array(QuestIdSchema),
  stages: z.array(QuestStageSchema).min(1),
  rewards: JsonObjectSchema,
  firstClearFlag: IdSchema
}).strict();
export type QuestDefinition = z.infer<typeof QuestDefinitionSchema>;

export const QuestProgressSchema = z.object({
  questId: QuestIdSchema,
  runId: IdSchema,
  currentStageId: IdSchema,
  completedStageIds: z.array(IdSchema),
  objectiveState: JsonObjectSchema,
  flags: z.record(SafeRecordKeySchema, z.union([z.boolean(), z.string()])),
  collectedIds: z.array(IdSchema),
  executedActionIds: z.array(IdSchema),
  checkpointId: IdSchema.nullable(),
  status: z.enum(['locked', 'available', 'active', 'completed'])
}).strict();
export type QuestProgress = z.infer<typeof QuestProgressSchema>;

const LoadoutSchema = z.array(IdSchema).max(2).superRefine((items, ctx) => {
  if (new Set(items).size !== items.length) {
    ctx.addIssue({
      code: 'custom',
      message: 'loadout entries must be unique'
    });
  }
});

export const CheckpointSaveSchema = JsonObjectSchema;
export type CheckpointSave = z.infer<typeof CheckpointSaveSchema>;

export const SettingsSchema = JsonObjectSchema;
export type Settings = z.infer<typeof SettingsSchema>;

export const RewardLedgerEntrySchema = z.object({
  xp: NonNegativeIntegerSchema,
  fragments: NonNegativeIntegerSchema
}).strict();

export const SaveGameSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: IdSchema,
  profileId: IdSchema,
  updatedAt: z.string().datetime({ offset: true }),
  xp: NonNegativeIntegerSchema,
  fragments: NonNegativeIntegerSchema,
  unlockedHeroes: z.array(HeroIdSchema),
  unlockedRelics: z.array(IdSchema),
  loadouts: z.record(HeroIdSchema, LoadoutSchema),
  completedQuests: z.array(QuestIdSchema),
  storyFlags: z.record(SafeRecordKeySchema, z.union([z.boolean(), z.string()])),
  cosmetics: z.array(IdSchema),
  mastery: z.record(HeroIdSchema, NonNegativeIntegerSchema),
  rewardLedger: z.record(IdSchema, RewardLedgerEntrySchema),
  activeRun: CheckpointSaveSchema.nullable(),
  settings: SettingsSchema
}).strict();
export type SaveGame = z.infer<typeof SaveGameSchema>;

export function parseSaveGameJson(payload: string): SaveGame {
  if (new TextEncoder().encode(payload).byteLength > 2 * 1024 * 1024) {
    throw new Error('save payload exceeds 2 MiB');
  }
  return SaveGameSchema.parse(JSON.parse(payload) as unknown);
}
