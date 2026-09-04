import { connector } from '@noodleseed/one';
import { runSessionTransition, gateSessionCommit } from './session-runtime.js';
import {
  sessionAggregateSchema, sessionCommitInputSchema, sessionCommitOutputSchema,
  sessionPolicy, sessionTransitionInputSchema, sessionTransitionOutputSchema,
} from './session-schemas.js';

/** Inactive until M2 records read -> propose -> conditional CAS -> gate.
 * Use the public noodlePlatform.state.v1 for read_state/patch_state; the platform
 * resolves caller scope. Do not derive a key from user.subject or model inputs.
 * A failed CAS must be returned as a conflict or reread and recomputed; never
 * reuse a stale proposal with a newer expected storage revision.
 * M2 must extend this reducer with actual selection changes in the SAME state
 * proposal and bind the complete selection request. Calling invalidate_draft
 * after a separate selection write would not provide atomicity for that write.
 * The 64-record budget fails closed until session expiry; no replay record is
 * evicted. This is temporary session storage, not durable booking history.
 * Activation also requires a proven secure ID issuer and server temporal mapping:
 * model arguments cannot provide or override issuedDraftId, time or authority.
 * Check read_state.ok before proposing; a failed read must never become null
 * (fresh session). Hosted caller isolation and CAS behavior remain unproven.
 * Retained expired state can be replaced only by explicit initialization with a
 * new request key and newly issued draft ID, using that read's CAS revision.
 * Late mutations never create a replacement session or replay expired results.
 */
export const wayfareSessionHandle = {
  kind: 'session' as const,
  scope: 'caller' as const,
  version: 'v1',
  ttlSeconds: sessionPolicy.lifetimeSeconds,
  schema: sessionAggregateSchema,
};

export const wayfareSessionConnector = connector('wayfare_session_foundation')
  .version('1.0.0')
  .compute('propose_transition', {
    type: 'read', input: sessionTransitionInputSchema, output: sessionTransitionOutputSchema,
    limits: { timeoutMs: 1_000, maxOutputBytes: 65_536 }, run: runSessionTransition,
  })
  .compute('gate_commit', {
    type: 'read', input: sessionCommitInputSchema, output: sessionCommitOutputSchema,
    limits: { timeoutMs: 1_000, maxOutputBytes: 2_048 }, run: gateSessionCommit,
  });
