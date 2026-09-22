import { z } from 'zod';

const FORBIDDEN_KEYS = new Set(['__proto__']);
const SafeRecordKeySchema = z.string().min(1).refine((key) => !FORBIDDEN_KEYS.has(key), {
  message: 'forbidden object key'
});

export const SequenceSchema = z.number().int().nonnegative().finite();
export const ProtocolTickSchema = z.number().int().nonnegative().finite();
export const FiniteProtocolNumberSchema = z.number().finite();

export const InputActionSchema = z.enum(['q', 'w', 'e', 'r', 'dodge', 'interact']);
export const ReleasedInputActionSchema = z.enum(['e', 'interact']);

function uniqueArray<T extends z.ZodTypeAny>(itemSchema: T, max: number) {
  return z.array(itemSchema).max(max).superRefine((items, ctx) => {
    if (new Set(items).size !== items.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'actions must be unique'
      });
    }
  });
}

export const InputFrameSchema = z.object({
  seq: SequenceSchema,
  clientTick: ProtocolTickSchema,
  moveX: FiniteProtocolNumberSchema.min(-1).max(1),
  moveY: FiniteProtocolNumberSchema.min(-1).max(1),
  aimX: FiniteProtocolNumberSchema,
  aimY: FiniteProtocolNumberSchema,
  basicHeld: z.boolean(),
  pressed: uniqueArray(InputActionSchema, 6),
  released: uniqueArray(ReleasedInputActionSchema, 2),
  interactHeld: z.boolean()
}).strict();
export type InputFrame = z.infer<typeof InputFrameSchema>;

export type ProtocolJsonPrimitive = string | number | boolean | null;
export type ProtocolJsonValue =
  | ProtocolJsonPrimitive
  | ProtocolJsonValue[]
  | { [key: string]: ProtocolJsonValue };

export const ProtocolJsonValueSchema: z.ZodType<ProtocolJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(ProtocolJsonValueSchema),
    z.record(SafeRecordKeySchema, ProtocolJsonValueSchema)
  ])
);

export const DomainEventTypeSchema = z.enum([
  'entity_spawned',
  'entity_moved',
  'attack_started',
  'damage_applied',
  'entity_died',
  'status_applied',
  'item_collected',
  'interaction_completed',
  'area_entered',
  'choice_committed',
  'stage_completed',
  'quest_completed',
  'reward_granted',
  'checkpoint_committed'
]);

export const EventEnvelopeSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9_:-]{1,96}$/).refine((value) => value !== '__proto__'),
  tick: ProtocolTickSchema,
  runId: z.string().regex(/^[a-z0-9_:-]{1,96}$/).refine((value) => value !== '__proto__'),
  type: DomainEventTypeSchema,
  payload: z.record(SafeRecordKeySchema, ProtocolJsonValueSchema)
}).strict();
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
