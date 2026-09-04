import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { server, tool, z } from '@noodleseed/one';
import { noodlePlatform } from '@noodleseed/one/platform';
import { runSessionTransition, gateSessionCommit } from '../src/domain/session-runtime.js';
import {
  sessionAggregateSchema,
  sessionTransitionInputSchema,
  sessionTransitionOutputSchema,
  sessionCommitOutputSchema,
  type SessionAggregate,
  type SessionTransitionInput,
} from '../src/domain/session-schemas.js';
import { wayfareSessionConnector, wayfareSessionHandle } from '../src/domain/session-connector.js';

const NOW = 1_788_480_000_000;
const DRAFT = `draft_${'a'.repeat(32)}`;
const KEY = `request_${'1'.repeat(32)}`;
const key = (n: number) => `request_${n.toString(16).padStart(32, '0')}`;
const initialize = (overrides: Partial<SessionTransitionInput> = {}): SessionTransitionInput => ({
  state: null,
  storageRevision: 0,
  nowEpochMs: NOW,
  issuedDraftId: DRAFT,
  request: { operation: 'initialize', idempotencyKey: KEY },
  ...overrides,
});
function initialized(): SessionAggregate {
  const proposed = runSessionTransition(initialize());
  if (proposed.kind !== 'proposal') throw new Error('Expected initialization proposal');
  return proposed.nextState;
}
function invalidation(state = initialized(), overrides: Partial<SessionTransitionInput> = {}): SessionTransitionInput {
  return {
    state,
    storageRevision: 7,
    nowEpochMs: NOW + 1_000,
    request: {
      operation: 'invalidate_draft', idempotencyKey: key(2),
      expectedDraftId: state?.draft.id ?? DRAFT, expectedDraftRevision: 1, reason: 'flight_selection',
    },
    ...overrides,
  };
}

describe('inactive Wayfare session foundation', () => {
  it('proposes initialization with bounded lifetime and separates storage from draft revision', () => {
    const proposal = runSessionTransition(initialize({ storageRevision: 12 }));
    expect(proposal).toMatchObject({
      kind: 'proposal', expectedStorageRevision: 12,
      nextState: { version: 1, createdAtMs: NOW, expiresAtMs: NOW + 1_800_000,
        draft: { id: DRAFT, revision: 1 }, idempotency: [{ key: KEY }] },
      result: { operation: 'initialize', draftId: DRAFT, draftRevision: 1 },
    });
    if (proposal.kind !== 'proposal') throw new Error('No proposal');
    expect(sessionAggregateSchema.safeParse(proposal.nextState).success).toBe(true);
    expect(sessionTransitionOutputSchema.safeParse(proposal).success).toBe(true);
  });

  it('invalidates a quote and review on material changes without mutating the snapshot', () => {
    const state = initialized();
    state.draft.quote = { id: `quote_${'b'.repeat(32)}`, draftRevision: 1,
      createdAtMs: NOW, expiresAtMs: NOW + 600_000 };
    state.draft.review = { id: `review_${'c'.repeat(32)}`, draftRevision: 1,
      createdAtMs: NOW, expiresAtMs: NOW + 300_000 };
    const input = invalidation(state);
    const before = JSON.stringify(input);
    const proposal = runSessionTransition(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(proposal).toMatchObject({ kind: 'proposal', expectedStorageRevision: 7,
      nextState: { draft: { id: DRAFT, revision: 2 } },
      result: { operation: 'invalidate_draft', draftRevision: 2 },
    });
    if (proposal.kind !== 'proposal') throw new Error('No proposal');
    expect(proposal.nextState.draft).not.toHaveProperty('quote');
    expect(proposal.nextState.draft).not.toHaveProperty('review');
    proposal.nextState.idempotency[0].result.draftRevision = 99;
    expect(JSON.stringify(input)).toBe(before);
  });

  it('replays the complete result after prior review expiry and before stale revision checks', () => {
    const reviewed = initialized();
    reviewed.draft.quote = { id: `quote_${'b'.repeat(32)}`, draftRevision: 1,
      createdAtMs: NOW, expiresAtMs: NOW + 600_000 };
    reviewed.draft.review = { id: `review_${'c'.repeat(32)}`, draftRevision: 1,
      createdAtMs: NOW, expiresAtMs: NOW + 300_000 };
    const input = invalidation(reviewed);
    const proposal = runSessionTransition(input);
    if (proposal.kind !== 'proposal') throw new Error('No proposal');
    const replay = runSessionTransition({ ...input, state: proposal.nextState,
      storageRevision: 8, nowEpochMs: NOW + 301_000 });
    expect(replay).toEqual({ kind: 'replay', result: proposal.result });
    expect(gateSessionCommit({ transition: replay })).toEqual({ kind: 'success', result: proposal.result, replayed: true });
  });

  it('rejects reuse of a key for a different operation or request body', () => {
    const state = initialized();
    const wrongOperation = invalidation(state);
    wrongOperation.request.idempotencyKey = KEY;
    expect(runSessionTransition(wrongOperation)).toMatchObject({ kind: 'error', error: { code: 'IDEMPOTENCY_CONFLICT' } });
    const proposal = runSessionTransition(invalidation(state));
    if (proposal.kind !== 'proposal') throw new Error('No proposal');
    const wrongBody = invalidation(proposal.nextState);
    if (wrongBody.request.operation !== 'invalidate_draft') throw new Error('Wrong request');
    wrongBody.request.reason = 'hotel_selection';
    expect(runSessionTransition(wrongBody)).toMatchObject({ kind: 'error', error: { code: 'IDEMPOTENCY_CONFLICT' } });
  });

  it('does not mutate input on error and rejects stale, absent, malformed or expired state', () => {
    const input = invalidation();
    if (input.request.operation !== 'invalidate_draft') throw new Error('Wrong request');
    input.request.expectedDraftRevision = 2;
    const before = JSON.stringify(input);
    expect(runSessionTransition(input)).toMatchObject({ kind: 'error', error: { code: 'DRAFT_CONFLICT' } });
    expect(JSON.stringify(input)).toBe(before);
    expect(runSessionTransition(invalidation(null as unknown as SessionAggregate))).toMatchObject({ kind: 'error', error: { code: 'SELECTION_NOT_FOUND' } });
    expect(runSessionTransition(invalidation(initialized(), { nowEpochMs: NOW + 1_800_000 }))).toMatchObject({ kind: 'error', error: { code: 'SELECTION_NOT_FOUND' } });
    expect(runSessionTransition({ ...initialize(), nowEpochMs: Number.NaN })).toMatchObject({ kind: 'error', error: { code: 'INVALID_TRIP_INPUT' } });
    expect(runSessionTransition({ ...initialize(), principal: 'someone-else' } as never)).toMatchObject({ kind: 'error', error: { code: 'INVALID_TRIP_INPUT' } });
    expect(runSessionTransition(invalidation({ ...initialized(), balance: 100 } as never))).toMatchObject({ kind: 'error', error: { code: 'INVALID_TRIP_INPUT' } });
  });

  it('explicitly starts a fresh session over retained expired state using its current CAS revision', () => {
    const expired = initialized();
    const input = initialize({
      state: expired, storageRevision: 9, nowEpochMs: NOW + 1_800_000,
      issuedDraftId: `draft_${'e'.repeat(32)}`,
      request: { operation: 'initialize', idempotencyKey: key(66) },
    });
    const before = JSON.stringify(input);
    const proposal = runSessionTransition(input);
    expect(proposal).toMatchObject({ kind: 'proposal', expectedStorageRevision: 9,
      nextState: { createdAtMs: NOW + 1_800_000, expiresAtMs: NOW + 3_600_000,
        draft: { id: `draft_${'e'.repeat(32)}`, revision: 1 } },
    });
    if (proposal.kind !== 'proposal') throw new Error('No restart proposal');
    expect(proposal.nextState.idempotency).toHaveLength(1);
    expect(proposal.nextState.idempotency[0].key).toBe(key(66));
    expect(JSON.stringify(input)).toBe(before);
    expect(gateSessionCommit({ transition: proposal, patchOk: false })).toMatchObject({
      kind: 'error', error: { code: 'DRAFT_CONFLICT' },
    });
    expect(gateSessionCommit({ transition: proposal, patchOk: true })).toMatchObject({ kind: 'success' });
  });

  it('never restarts expired state for late mutation or a reused initialization key or draft ID', () => {
    const expired = initialized();
    const fresh = initialize({ state: expired, nowEpochMs: NOW + 1_800_000,
      issuedDraftId: `draft_${'e'.repeat(32)}`,
      request: { operation: 'initialize', idempotencyKey: key(66) },
    });
    expect(runSessionTransition({ ...fresh, request: { operation: 'initialize', idempotencyKey: KEY } })).toMatchObject({
      kind: 'error', error: { code: 'IDEMPOTENCY_CONFLICT' },
    });
    expect(runSessionTransition({ ...fresh, issuedDraftId: DRAFT })).toMatchObject({
      kind: 'error', error: { code: 'DRAFT_CONFLICT' },
    });
    expect(runSessionTransition(initialize({ state: expired, nowEpochMs: NOW + 1_800_000 }))).toMatchObject({ kind: 'error' });
    expect(runSessionTransition(invalidation(expired, { nowEpochMs: NOW + 1_800_000 }))).toMatchObject({
      kind: 'error', error: { code: 'SELECTION_NOT_FOUND' },
    });
  });

  it('rejects a delayed old-draft mutation after a fresh draft restarts at the same revision', () => {
    const oldState = initialized();
    const delayed = invalidation(oldState);
    const reset = runSessionTransition(initialize({
      state: oldState, storageRevision: 9, nowEpochMs: NOW + 1_800_000,
      issuedDraftId: `draft_${'e'.repeat(32)}`,
      request: { operation: 'initialize', idempotencyKey: key(66) },
    }));
    if (reset.kind !== 'proposal') throw new Error('No restart proposal');
    expect(reset.nextState.draft.revision).toBe(oldState.draft.revision);
    const before = JSON.stringify(reset.nextState);
    expect(runSessionTransition({ ...delayed, state: reset.nextState,
      storageRevision: 10, nowEpochMs: NOW + 1_801_000,
    })).toMatchObject({ kind: 'error', error: { code: 'DRAFT_CONFLICT' } });
    expect(JSON.stringify(reset.nextState)).toBe(before);
  });

  it('binds an idempotency key to the expected draft identity as well as revision and reason', () => {
    const input = invalidation();
    const proposal = runSessionTransition(input);
    if (proposal.kind !== 'proposal') throw new Error('No proposal');
    const changedDraft = { ...input, state: proposal.nextState, request: {
      ...input.request, expectedDraftId: `draft_${'e'.repeat(32)}`,
    } };
    expect(runSessionTransition(changedDraft)).toMatchObject({
      kind: 'error', error: { code: 'IDEMPOTENCY_CONFLICT' },
    });
    expect(runSessionTransition({ ...input, state: proposal.nextState })).toEqual({
      kind: 'replay', result: proposal.result,
    });
  });

  it('does not silently evict replay records when its bounded operation budget is full', () => {
    let state = initialized();
    for (let i = 2; i <= 64; i++) {
      const proposal = runSessionTransition(invalidation(state, { request: {
        operation: 'invalidate_draft', idempotencyKey: key(i), expectedDraftId: DRAFT, expectedDraftRevision: i - 1, reason: 'trip_intent',
      } }));
      if (proposal.kind !== 'proposal') throw new Error(`No proposal at ${i}`);
      state = proposal.nextState;
    }
    const before = JSON.stringify(state);
    expect(runSessionTransition(invalidation(state, { request: {
      operation: 'invalidate_draft', idempotencyKey: key(65), expectedDraftId: DRAFT, expectedDraftRevision: 64, reason: 'trip_intent',
    } }))).toMatchObject({ kind: 'error', error: { code: 'DRAFT_CONFLICT' } });
    expect(JSON.stringify(state)).toBe(before);
    expect(runSessionTransition(initialize({ state, nowEpochMs: NOW + 2_000 }))).toMatchObject({ kind: 'replay', result: { draftRevision: 1 } });
  });

  it('enforces quote/review lifetime and revision consistency inside serialized compute', () => {
    const state = initialized();
    state.draft.quote = { id: `quote_${'b'.repeat(32)}`, draftRevision: 1,
      createdAtMs: NOW, expiresAtMs: NOW + 600_000 };
    state.draft.review = { id: `review_${'c'.repeat(32)}`, draftRevision: 1,
      createdAtMs: NOW, expiresAtMs: NOW + 300_001 };
    expect(runSessionTransition(invalidation(state))).toMatchObject({ kind: 'error', error: { code: 'INVALID_TRIP_INPUT' } });
    state.draft.review.expiresAtMs = NOW + 300_000;
    state.draft.review.draftRevision = 2;
    expect(runSessionTransition(invalidation(state))).toMatchObject({ kind: 'error', error: { code: 'INVALID_TRIP_INPUT' } });
  });

  it('never reports proposed success on failed or missing compare-and-swap evidence', () => {
    const transition = runSessionTransition(invalidation());
    for (const patchOk of [false, undefined, 'true', 1]) {
      expect(gateSessionCommit({ transition, patchOk } as never)).toMatchObject({ kind: 'error', error: { code: 'DRAFT_CONFLICT' } });
    }
    const accepted = gateSessionCommit({ transition, patchOk: true });
    expect(accepted).toMatchObject({ kind: 'success', replayed: false });
    expect(sessionCommitOutputSchema.safeParse(accepted).success).toBe(true);
  });

  it('keeps commit errors fixed even if an internal error object contains unexpected prose', () => {
    const result = gateSessionCommit({ transition: { kind: 'error', error: {
      code: 'DRAFT_CONFLICT', message: 'untrusted detail', retryable: true,
    } } });
    expect(result).toEqual({ kind: 'error', error: { code: 'DRAFT_CONFLICT',
      message: 'The trip selections conflict. Review the dates, participants, and schedules.', retryable: false,
    } });
  });

  it('allows only one concurrent proposal to commit in an explicit test CAS adapter', () => {
    // This is a model of a CAS port, not proof of hosted storage or isolation.
    let stored = { revision: 7, value: initialized() };
    const snapshot = stored;
    const first = runSessionTransition(invalidation(snapshot.value));
    const second = runSessionTransition(invalidation(snapshot.value, { request: {
      operation: 'invalidate_draft', idempotencyKey: key(3), expectedDraftId: DRAFT, expectedDraftRevision: 1, reason: 'hotel_selection',
    } }));
    const commit = (transition: typeof first) => {
      const ok = transition.kind === 'proposal' && transition.expectedStorageRevision === stored.revision;
      if (ok && transition.kind === 'proposal') stored = { revision: stored.revision + 1, value: transition.nextState };
      return gateSessionCommit({ transition, patchOk: ok });
    };
    expect(commit(first).kind).toBe('success');
    expect(commit(second)).toMatchObject({ kind: 'error', error: { code: 'DRAFT_CONFLICT' } });
    expect(stored.revision).toBe(8);
    expect(stored.value.draft.revision).toBe(2);
  });

  it('does not share replay results between independently supplied caller snapshots', () => {
    const a = runSessionTransition(initialize());
    const b = runSessionTransition(initialize({ issuedDraftId: `draft_${'d'.repeat(32)}` }));
    if (a.kind !== 'proposal' || b.kind !== 'proposal') throw new Error('No proposals');
    const replayA = runSessionTransition(initialize({ state: a.nextState }));
    const replayB = runSessionTransition(initialize({ state: b.nextState }));
    expect(replayA).toMatchObject({ kind: 'replay', result: { draftId: DRAFT } });
    expect(replayB).toMatchObject({ kind: 'replay', result: { draftId: `draft_${'d'.repeat(32)}` } });
    // Platform partition selection is still an integration responsibility;
    // the reducer cannot authenticate an arbitrarily supplied snapshot.
  });

  it('serializes into a VM with no Date, Intl, process, require or imported closure', () => {
    const input = initialize();
    const runtime = runInNewContext(`(${runSessionTransition.toString()})`, {
      Date: undefined, Intl: undefined, process: undefined, require: undefined,
    });
    const gate = runInNewContext(`(${gateSessionCommit.toString()})`, {
      Date: undefined, Intl: undefined, process: undefined, require: undefined,
    });
    expect(runtime(input)).toEqual(runSessionTransition(input));
    const proposal = runtime(invalidation());
    expect(proposal).toEqual(runSessionTransition(invalidation()));
    expect(runtime(invalidation(proposal.nextState))).toMatchObject({ kind: 'replay' });
    expect(runtime(invalidation(proposal.nextState, { nowEpochMs: NOW + 1_800_000 }))).toMatchObject({ kind: 'error' });
    expect(gate({ transition: runtime(input), patchOk: true }).kind).toBe('success');
  });

  it('emits caller-scoped state and pure compute declarations without activating production tools', async () => {
    const fixture = server('wayfare_session_foundation_test', {
      title: 'Session foundation test', version: '0.1.0',
      use: { session: wayfareSessionConnector, state: noodlePlatform.state.v1 },
      state: { handles: { wayfare_session: wayfareSessionHandle } },
    }, [tool('propose_test_transition', {
      description: 'Test-only compilation fixture for the internal transition connector.',
      input: z.object({}), output: z.object({ transition: sessionTransitionOutputSchema }),
      fulfil: ({ connectors }) => ({ transition: connectors.session.propose_transition(initialize()) }),
    })]);
    const manifest = await fixture.toManifest();
    expect(manifest).toMatchObject({ state: { handles: {
      wayfare_session: { kind: 'session', scope: 'caller', version: 'v1', ttlSeconds: 1_800 },
    } } });
    const catalogConnector = fixture.toConnectorCatalog()?.connectors.find((c) => c.id === 'wayfare_session_foundation');
    expect(catalogConnector).toBeDefined();
    const operation = catalogConnector?.operations.propose_transition as { code: string };
    const emitted = runInNewContext(`(${operation.code})`, { Date: undefined, Intl: undefined, process: undefined, require: undefined });
    expect(emitted(initialize())).toEqual(runSessionTransition(initialize()));
    expect(sessionTransitionInputSchema.safeParse({ ...initialize(), user: { subject: 'x' } }).success).toBe(false);
  });
});
