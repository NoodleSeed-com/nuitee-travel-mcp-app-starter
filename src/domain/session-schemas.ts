import { z } from '@noodleseed/one';
import { domainErrorSchema } from './errors.js';
import { opaqueIdSchema } from './primitives.js';

// Internal persistence contracts, never model inputs. Platform caller scope owns
// partitioning. No principal, balance, provider payload or arbitrary patch exists.
export const sessionPolicy = Object.freeze({
  lifetimeSeconds: 1_800,
  reviewLifetimeSeconds: 300,
  maxIdempotencyRecords: 64,
});
const epochMsSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1_800_000);
const revisionSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER - 1);
const operationSchema = z.enum(['initialize', 'invalidate_draft']);

export const sessionResultSchema = z.object({
  operation: operationSchema,
  draftId: opaqueIdSchema,
  draftRevision: revisionSchema,
}).strict();
export type SessionResult = z.infer<typeof sessionResultSchema>;

const referenceSchema = z.object({
  id: opaqueIdSchema,
  draftRevision: revisionSchema,
  createdAtMs: epochMsSchema,
  expiresAtMs: epochMsSchema,
}).strict();

export const sessionAggregateSchema = z.object({
  version: z.literal(1),
  createdAtMs: epochMsSchema,
  updatedAtMs: epochMsSchema,
  expiresAtMs: epochMsSchema,
  draft: z.object({
    id: opaqueIdSchema,
    revision: revisionSchema,
    updatedAtMs: epochMsSchema,
    quote: referenceSchema.optional(),
    review: referenceSchema.optional(),
  }).strict(),
  idempotency: z.array(z.object({
    key: opaqueIdSchema,
    binding: z.string().min(1).max(160),
    createdAtMs: epochMsSchema,
    expiresAtMs: epochMsSchema,
    result: sessionResultSchema,
  }).strict()).max(sessionPolicy.maxIdempotencyRecords),
}).strict();
export type SessionAggregate = z.infer<typeof sessionAggregateSchema>;

export const sessionRequestSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('initialize'), idempotencyKey: opaqueIdSchema }).strict(),
  z.object({
    operation: z.literal('invalidate_draft'),
    idempotencyKey: opaqueIdSchema,
    // A reference to compare with caller-owned state, never an identity issuer.
    expectedDraftId: opaqueIdSchema,
    expectedDraftRevision: revisionSchema,
    reason: z.enum(['trip_intent', 'flight_selection', 'hotel_selection', 'experience_selection', 'voucher_selection']),
  }).strict(),
]);

export const sessionTransitionInputSchema = z.object({
  state: sessionAggregateSchema.nullable(),
  storageRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1),
  // Trust integration code to bind the invocation clock and securely mint IDs.
  // Neither field is permitted on an eventual model-visible tool input.
  nowEpochMs: epochMsSchema,
  issuedDraftId: opaqueIdSchema.optional(),
  request: sessionRequestSchema,
}).strict();
export type SessionTransitionInput = z.infer<typeof sessionTransitionInputSchema>;

export const sessionTransitionOutputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('error'), error: domainErrorSchema }).strict(),
  z.object({ kind: z.literal('replay'), result: sessionResultSchema }).strict(),
  z.object({
    kind: z.literal('proposal'),
    expectedStorageRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1),
    nextState: sessionAggregateSchema,
    result: sessionResultSchema,
  }).strict(),
]);
export type SessionTransition = z.infer<typeof sessionTransitionOutputSchema>;

export const sessionCommitInputSchema = z.object({
  transition: sessionTransitionOutputSchema,
  patchOk: z.boolean().optional(),
}).strict();
export type SessionCommitInput = z.infer<typeof sessionCommitInputSchema>;
export const sessionCommitOutputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('error'), error: domainErrorSchema }).strict(),
  z.object({ kind: z.literal('success'), result: sessionResultSchema, replayed: z.boolean() }).strict(),
]);
export type SessionCommitResult = z.infer<typeof sessionCommitOutputSchema>;
