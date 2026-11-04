import { z } from '@noodleseed/one';
import { domainErrorSchema } from './errors.js';
import { calendarDateSchema, instantSchema, liveProvenanceSchema, moneySchema, opaqueIdSchema } from './primitives.js';

export const missingFlightFactReasonSchema = z.enum([
  'NOT_AVAILABLE_IN_LEGACY_PROJECTION', 'AMBIGUOUS_LEGACY_DEFAULT',
  'INVALID_VALUE', 'UNSUPPORTED_CURRENCY',
]);
export type MissingFlightFactReason = z.infer<typeof missingFlightFactReasonSchema>;
const unknownFactSchema = z.object({ status: z.literal('UNKNOWN'), reason: missingFlightFactReasonSchema }).strict();
function fact<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion('status', [z.object({ status: z.literal('KNOWN'), value }).strict(), unknownFactSchema]);
}
const iata = z.string().regex(/^[A-Z]{3}$/);
const label = z.string().min(1).max(100);
const scheduleSchema = z.object({
  local: fact(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/)),
  instant: fact(instantSchema),
  // This adapter never receives evidence of an IANA zone.
  timeZone: unknownFactSchema,
}).strict();

export const flightObservationContextSchema = z.object({
  tripType: z.enum(['ONE_WAY', 'ROUND_TRIP']),
  origin: iata, destination: iata,
  departureDate: calendarDateSchema, returnDate: calendarDateSchema.optional(),
  adults: z.number().int().min(1).max(9), children: z.number().int().min(0).max(8), infants: z.number().int().min(0).max(9),
  childrenAges: z.array(z.number().int().min(2).max(11)).max(8),
  infantAges: z.array(z.number().int().min(0).max(1)).max(9),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']),
  currency: z.string().regex(/^[A-Z]{3}$/), country: z.string().regex(/^[A-Z]{2}$/),
}).strict();
export type FlightObservationContext = z.infer<typeof flightObservationContextSchema>;

export const flightObservationSchema = z.object({
  flightOfferId: opaqueIdSchema,
  observedAt: instantSchema,
  provenance: liveProvenanceSchema,
  searchContext: flightObservationContextSchema,
  segments: z.array(z.object({
    direction: z.enum(['OUTBOUND', 'INBOUND']), origin: iata, destination: iata,
    departure: scheduleSchema, arrival: scheduleSchema,
    durationMinutes: z.number().int().min(0).max(10_080),
    displayCarrier: fact(label), marketingCarrier: unknownFactSchema,
    flightNumber: fact(z.string().min(1).max(16)),
  }).strict()).min(1).max(8),
  legs: z.array(z.object({
    direction: z.enum(['OUTBOUND', 'INBOUND']), origin: iata, destination: iata,
    stops: z.number().int().min(0).max(7), durationMinutes: z.number().int().min(0).max(20_160),
  }).strict()).min(1).max(2),
  cabin: unknownFactSchema, validatingCarrier: unknownFactSchema,
  fareFamily: fact(z.string().min(1).max(80)),
  totalPrice: fact(moneySchema), expiresAt: fact(instantSchema),
  baggage: z.object({ carryOn: fact(z.boolean()), checked: fact(z.boolean()), allowances: unknownFactSchema }).strict(),
  terms: z.object({ changeable: fact(z.boolean()), refundable: fact(z.boolean()) }).strict(),
  verificationStatus: z.literal('UNVERIFIED'),
}).strict();
export type FlightObservation = z.infer<typeof flightObservationSchema>;

const prerequisiteReasonSchema = z.enum([
  'CONTEXT_MISMATCH', 'SELECTION_EXPIRED', 'PROVIDER_EXPIRED', 'INVALID_PROVIDER_EXPIRY',
  'PRICE_UNKNOWN', 'CURRENCY_MISMATCH', 'ABSOLUTE_TIME_UNKNOWN', 'SCHEDULE_CONFLICT', 'SCHEDULE_DATE_MISMATCH',
  'LOCAL_TIME_UNKNOWN', 'TIMEZONE_UNKNOWN',
]);
export type FlightPrerequisiteReason = z.infer<typeof prerequisiteReasonSchema>;
const prerequisiteSchema = z.discriminatedUnion('satisfied', [
  z.object({ satisfied: z.literal(true), reasons: z.array(prerequisiteReasonSchema).length(0) }).strict(),
  z.object({ satisfied: z.literal(false), reasons: z.array(prerequisiteReasonSchema).min(1).max(10) }).strict(),
]);
export const flightObservationResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('invalid'), error: domainErrorSchema }).strict(),
  z.object({
    status: z.literal('observed'), observation: flightObservationSchema,
    prerequisites: z.object({
      display: prerequisiteSchema, observedPrice: prerequisiteSchema,
      absoluteSchedule: prerequisiteSchema, localRules: prerequisiteSchema,
      requestVerification: prerequisiteSchema,
    }).strict(),
  }).strict(),
]);
export type FlightObservationResult = z.infer<typeof flightObservationResultSchema>;

/** Internal metadata supplied after caller-scoped lookup, never model/browser authority. */
export const legacyFlightObservationInputSchema = z.object({
  itinerary: z.unknown(), searchContext: z.unknown(), expectedContext: z.unknown(),
  authority: z.object({
    flightOfferId: opaqueIdSchema,
    legacySelectionId: z.string().regex(/^sel_[a-f0-9]{32}$/),
    observedAt: instantSchema, selectionExpiresAt: instantSchema, now: instantSchema,
  }).strict(),
}).strict();
