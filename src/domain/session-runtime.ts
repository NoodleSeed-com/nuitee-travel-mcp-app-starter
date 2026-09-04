import type {
  SessionAggregate, SessionCommitInput, SessionCommitResult,
  SessionResult, SessionTransition, SessionTransitionInput,
} from './session-schemas.js';

/**
 * Pure proposal only: never persists and never claims a write succeeded.
 * Serialized by Noodle compute; all executable helpers deliberately live inside.
 * Strict runtime checks are necessary: Zod refinements are not shipped as code.
 * Trusted integration must supply a caller-scoped read, invocation clock and a
 * securely issued draft ID. These are internal inputs, not model authority.
 */
export function runSessionTransition(input: SessionTransitionInput): SessionTransition {
  const lifetime = 1_800_000;
  const reviewLifetime = 300_000;
  const maxRecords = 64;
  const maxRevision = Number.MAX_SAFE_INTEGER - 1;
  const maxEpoch = Number.MAX_SAFE_INTEGER - lifetime;
  const object = (v: unknown): v is Record<string, any> => v !== null && typeof v === 'object' && !Array.isArray(v);
  const exact = (v: unknown, required: string[], optional: string[] = []): v is Record<string, any> =>
    object(v) && required.every((k) => Object.prototype.hasOwnProperty.call(v, k))
      && Object.keys(v).every((k) => required.includes(k) || optional.includes(k));
  const integer = (v: unknown, min: number, max: number): v is number =>
    typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
  const epoch = (v: unknown): v is number => integer(v, 0, maxEpoch);
  const revision = (v: unknown): v is number => integer(v, 1, maxRevision);
  const id = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z0-9_]{0,23}_[a-f0-9]{32}$/.test(v);
  const error = (code: 'INVALID_TRIP_INPUT' | 'DRAFT_CONFLICT' | 'SELECTION_NOT_FOUND' | 'IDEMPOTENCY_CONFLICT'): SessionTransition => {
    const messages = {
      INVALID_TRIP_INPUT: 'The trip information is invalid. Check the requested dates, party, and selections.',
      DRAFT_CONFLICT: 'The trip selections conflict. Review the dates, participants, and schedules.',
      SELECTION_NOT_FOUND: 'This selection is unavailable in the current session. Reopen current results.',
      IDEMPOTENCY_CONFLICT: 'This confirmation reference was used for a different action. Stop and review the current state.',
    };
    return { kind: 'error', error: { code, message: messages[code], retryable: false } };
  };
  const validResult = (v: unknown): v is SessionResult => exact(v, ['operation', 'draftId', 'draftRevision'])
    && ['initialize', 'invalidate_draft'].includes(v.operation) && id(v.draftId) && revision(v.draftRevision);
  const validReference = (v: unknown, state: SessionAggregate, ttl: number): boolean =>
    exact(v, ['id', 'draftRevision', 'createdAtMs', 'expiresAtMs'])
      && id(v.id) && v.draftRevision === state.draft.revision
      && epoch(v.createdAtMs) && epoch(v.expiresAtMs)
      && v.createdAtMs >= state.createdAtMs && v.createdAtMs <= state.updatedAtMs
      && v.expiresAtMs > v.createdAtMs && v.expiresAtMs <= v.createdAtMs + ttl
      && v.expiresAtMs <= state.expiresAtMs;
  const validState = (v: unknown): v is SessionAggregate => {
    if (!exact(v, ['version', 'createdAtMs', 'updatedAtMs', 'expiresAtMs', 'draft', 'idempotency'])
      || v.version !== 1 || !epoch(v.createdAtMs) || !epoch(v.updatedAtMs) || !epoch(v.expiresAtMs)
      || v.expiresAtMs !== v.createdAtMs + lifetime
      || v.updatedAtMs < v.createdAtMs || v.updatedAtMs >= v.expiresAtMs
      || !exact(v.draft, ['id', 'revision', 'updatedAtMs'], ['quote', 'review'])
      || !id(v.draft.id) || !revision(v.draft.revision) || v.draft.updatedAtMs !== v.updatedAtMs
      || !Array.isArray(v.idempotency) || v.idempotency.length < 1 || v.idempotency.length > maxRecords) return false;
    const state = v as SessionAggregate;
    if (v.draft.quote !== undefined && !validReference(v.draft.quote, state, lifetime)) return false;
    if (v.draft.review !== undefined && (!v.draft.quote || !validReference(v.draft.review, state, reviewLifetime)
      || v.draft.review.expiresAtMs > v.draft.quote.expiresAtMs)) return false;
    const keys: string[] = [];
    for (const record of v.idempotency) {
      if (!exact(record, ['key', 'binding', 'createdAtMs', 'expiresAtMs', 'result']) || !id(record.key)
        || keys.includes(record.key) || typeof record.binding !== 'string' || record.binding.length < 1 || record.binding.length > 160
        || !epoch(record.createdAtMs) || record.createdAtMs < v.createdAtMs || record.createdAtMs > v.updatedAtMs
        || record.expiresAtMs !== v.expiresAtMs || !validResult(record.result)
        || record.result.draftId !== v.draft.id || record.result.draftRevision > v.draft.revision) return false;
      keys.push(record.key);
    }
    return true;
  };
  if (!exact(input, ['state', 'storageRevision', 'nowEpochMs', 'request'], ['issuedDraftId'])
    || !integer(input.storageRevision, 0, maxRevision) || !epoch(input.nowEpochMs)
    || (input.issuedDraftId !== undefined && !id(input.issuedDraftId))
    || !object(input.request) || !id(input.request.idempotencyKey)) return error('INVALID_TRIP_INPUT');
  const request = input.request;
  if (request.operation === 'initialize') {
    if (!exact(request, ['operation', 'idempotencyKey'])) return error('INVALID_TRIP_INPUT');
  } else if (request.operation === 'invalidate_draft') {
    if (!exact(request, ['operation', 'idempotencyKey', 'expectedDraftId', 'expectedDraftRevision', 'reason'])
      || !id(request.expectedDraftId) || !revision(request.expectedDraftRevision)
      || !['trip_intent', 'flight_selection', 'hotel_selection', 'experience_selection', 'voucher_selection'].includes(request.reason)) {
      return error('INVALID_TRIP_INPUT');
    }
  } else return error('INVALID_TRIP_INPUT');
  const binding = request.operation === 'initialize' ? 'initialize'
    : JSON.stringify(['invalidate_draft', request.expectedDraftId, request.expectedDraftRevision, request.reason]);
  let existing = input.state;
  if (existing !== null && !validState(existing)) return error('INVALID_TRIP_INPUT');
  if (existing !== null) {
    if (input.nowEpochMs < existing.updatedAtMs) return error('INVALID_TRIP_INPUT');
    const recorded = existing.idempotency.find((entry) => entry.key === request.idempotencyKey);
    // Storage may retain a value after the aggregate's hard expiry. Only an
    // explicit initialization can propose replacing it, with fresh issuance and
    // a fresh request key, still guarded by the current storage CAS revision.
    if (input.nowEpochMs >= existing.expiresAtMs) {
      if (request.operation !== 'initialize') return error('SELECTION_NOT_FOUND');
      if (recorded) return error('IDEMPOTENCY_CONFLICT');
      if (input.issuedDraftId === existing.draft.id) return error('DRAFT_CONFLICT');
      existing = null;
    } else if (recorded) {
      if (recorded.binding !== binding) return error('IDEMPOTENCY_CONFLICT');
      // Return the entire original successful result before expected revision or
      // any later review/offer expiry checks. Future confirmation must do likewise.
      return { kind: 'replay', result: { ...recorded.result } };
    }
  }
  let nextState: SessionAggregate;
  if (request.operation === 'initialize') {
    if (existing !== null) return error('DRAFT_CONFLICT');
    if (!input.issuedDraftId || input.nowEpochMs + lifetime > maxEpoch) return error('INVALID_TRIP_INPUT');
    nextState = {
      version: 1, createdAtMs: input.nowEpochMs, updatedAtMs: input.nowEpochMs,
      expiresAtMs: input.nowEpochMs + lifetime,
      draft: { id: input.issuedDraftId, revision: 1, updatedAtMs: input.nowEpochMs },
      idempotency: [],
    };
  } else {
    if (existing === null) return error('SELECTION_NOT_FOUND');
    // Draft identity remains part of the precondition when revisions restart at
    // one after expiry; a client reference cannot select another caller's state.
    if (existing.draft.id !== request.expectedDraftId || existing.draft.revision !== request.expectedDraftRevision
      || existing.draft.revision >= maxRevision || existing.idempotency.length >= maxRecords) return error('DRAFT_CONFLICT');
    nextState = {
      version: 1, createdAtMs: existing.createdAtMs, updatedAtMs: input.nowEpochMs, expiresAtMs: existing.expiresAtMs,
      draft: { id: existing.draft.id, revision: existing.draft.revision + 1, updatedAtMs: input.nowEpochMs },
      idempotency: existing.idempotency.map((entry) => ({ ...entry, result: { ...entry.result } })),
    };
  }
  const result: SessionResult = { operation: request.operation, draftId: nextState.draft.id, draftRevision: nextState.draft.revision };
  nextState.idempotency.push({ key: request.idempotencyKey, binding, createdAtMs: input.nowEpochMs,
    expiresAtMs: nextState.expiresAtMs, result: { ...result } });
  return { kind: 'proposal', expectedStorageRevision: input.storageRevision, nextState, result };
}

/** A later recorded flow must map patch_state.ok here, never status strings. */
export function gateSessionCommit(input: SessionCommitInput): SessionCommitResult {
  const transition = input.transition;
  if (transition.kind === 'error') {
    const messages = {
      INVALID_TRIP_INPUT: 'The trip information is invalid. Check the requested dates, party, and selections.',
      DRAFT_CONFLICT: 'The trip selections conflict. Review the dates, participants, and schedules.',
      SELECTION_NOT_FOUND: 'This selection is unavailable in the current session. Reopen current results.',
      IDEMPOTENCY_CONFLICT: 'This confirmation reference was used for a different action. Stop and review the current state.',
    };
    const requestedCode = transition.error.code;
    const code = Object.prototype.hasOwnProperty.call(messages, requestedCode)
      ? requestedCode as keyof typeof messages : 'INVALID_TRIP_INPUT';
    return { kind: 'error', error: { code, message: messages[code], retryable: false } };
  }
  if (transition.kind === 'replay') return { kind: 'success', result: { ...transition.result }, replayed: true };
  if (transition.kind === 'proposal' && input.patchOk === true) {
    return { kind: 'success', result: { ...transition.result }, replayed: false };
  }
  return { kind: 'error', error: {
    code: 'DRAFT_CONFLICT',
    message: 'The trip selections conflict. Review the dates, participants, and schedules.',
    retryable: false,
  } };
}
