import { z } from '@noodleseed/one';

export const domainErrorCodeSchema = z.enum([
  'INVALID_TRIP_INPUT', 'NO_RESULTS', 'UNSUPPORTED_DESTINATION',
  'PROVIDER_UNAVAILABLE', 'OFFER_EXPIRED', 'OFFER_CHANGED',
  'SELECTION_NOT_FOUND', 'DRAFT_CONFLICT', 'INSUFFICIENT_POINTS',
  'VOUCHER_INELIGIBLE', 'REVIEW_STALE', 'CONFIRMATION_REQUIRED',
  'IDEMPOTENCY_CONFLICT', 'TRIP_NOT_FOUND', 'CHANGE_NOT_ALLOWED',
  'CANCELLATION_NOT_ALLOWED',
]);
export type DomainErrorCode = z.infer<typeof domainErrorCodeSchema>;

const messages: Readonly<Record<DomainErrorCode, string>> = {
  INVALID_TRIP_INPUT: 'The trip information is invalid. Check the requested dates, party, and selections.',
  NO_RESULTS: 'No matching offers were found. Adjust one search preference and try again.',
  UNSUPPORTED_DESTINATION: 'Demo experiences are not available here. You can continue planning flights and hotels.',
  PROVIDER_UNAVAILABLE: 'The live travel service is unavailable. Your selections are unchanged; try again later.',
  OFFER_EXPIRED: 'This offer has expired. Search again for current options.',
  OFFER_CHANGED: 'This offer has changed. Review the current option before selecting it again.',
  SELECTION_NOT_FOUND: 'This selection is unavailable in the current session. Reopen current results.',
  DRAFT_CONFLICT: 'The trip selections conflict. Review the dates, participants, and schedules.',
  INSUFFICIENT_POINTS: 'The available points do not cover this redemption. Choose a smaller eligible amount.',
  VOUCHER_INELIGIBLE: 'This voucher cannot be applied to that selection. Review the eligible alternatives.',
  REVIEW_STALE: 'This review is no longer current. Prepare a new review before confirming.',
  CONFIRMATION_REQUIRED: 'Review the current preview and explicitly confirm before continuing.',
  IDEMPOTENCY_CONFLICT: 'This confirmation reference was used for a different action. Stop and review the current state.',
  TRIP_NOT_FOUND: 'This trip is unavailable in the current session. Check the active trip.',
  CHANGE_NOT_ALLOWED: 'The demo policy does not allow this change. Review the cancellation options.',
  CANCELLATION_NOT_ALLOWED: 'The demo cancellation cutoff has passed. The trip is unchanged.',
};

// Literal variants preserve the safe projection in generated JSON Schema too.
const errorVariants = domainErrorCodeSchema.options.map((code) => z.object({
  code: z.literal(code),
  message: z.literal(messages[code]),
  retryable: z.literal(code === 'PROVIDER_UNAVAILABLE'),
}).strict());
export const domainErrorSchema = z.discriminatedUnion('code', [errorVariants[0], ...errorVariants.slice(1)]);
export type PublicDomainError = z.infer<typeof domainErrorSchema>;

/** No provider exception, stack, identifier, or caller-supplied text is accepted. */
export function publicDomainError(code: DomainErrorCode): PublicDomainError {
  const checked = domainErrorCodeSchema.parse(code);
  return { code: checked, message: messages[checked], retryable: checked === 'PROVIDER_UNAVAILABLE' };
}

/** Internal throwable; return toPublic(), never serialize an Error or raw cause. */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode) {
    const projection = publicDomainError(code);
    super(projection.message);
    this.name = 'DomainError';
    this.code = projection.code;
  }

  toPublic(): PublicDomainError {
    return publicDomainError(this.code);
  }
}
