import { z } from '@noodleseed/one';

export const errorCodeSchema = z.enum([
  'invalid_request',
  'configuration_required',
  'authentication',
  'entitlement',
  'rate_limited',
  'timeout',
  'provider_error',
  'malformed_response',
  'oversized_response',
  'service_unavailable',
  'expired_offer',
  'unavailable_offer',
  'unknown_or_stale_selection',
]);

export const errorSchema = z.object({
  code: errorCodeSchema,
  message: z.string().max(320),
  retryable: z.boolean(),
});

export const moneySchema = z.object({
  total: z.number().nonnegative().max(100_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

const iataSchema = z.string().regex(/^[A-Z]{3}$/);
const durationMinutesSchema = z.number().int().nonnegative().max(10_080);
const carrierSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().regex(/^(?:[A-Z0-9]{2,3}|—)$/),
});

export const segmentSchema = z.object({
  origin: iataSchema,
  destination: iataSchema,
  departureTime: z.string().max(64),
  arrivalTime: z.string().max(64),
  direction: z.enum(['OUTBOUND', 'INBOUND']),
  durationMinutes: durationMinutesSchema,
  carrier: carrierSchema,
  flightNumber: z.string().max(16).optional(),
});

export const legSchema = z.object({
  direction: z.enum(['OUTBOUND', 'INBOUND']),
  route: z.object({ origin: iataSchema, destination: iataSchema }),
  departureTime: z.string().max(64),
  arrivalTime: z.string().max(64),
  durationMinutes: durationMinutesSchema,
  stops: z.number().int().nonnegative().max(7),
});

export const itinerarySchema = z.object({
  selectionId: z.string().regex(/^sel_[a-f0-9]{32}$/),
  route: z.object({ origin: iataSchema, destination: iataSchema }),
  carrier: carrierSchema,
  departureTime: z.string().max(64),
  arrivalTime: z.string().max(64),
  durationMinutes: z.number().int().nonnegative().max(20_160),
  stops: z.number().int().nonnegative().max(14),
  price: moneySchema,
  baggage: z.object({
    carryOn: z.boolean(),
    checked: z.boolean(),
    allowances: z.array(z.string().max(120)).max(4),
  }),
  expiresAt: z.string().max(64).optional(),
  retrievedAt: z.string().max(64),
  isCheapest: z.boolean(),
  legs: z.array(legSchema).min(1).max(2),
  segments: z.array(segmentSchema).max(8),
  messages: z.array(z.string().max(240)).max(6),
});

export const searchInputSchema = z.object({
  origin: z.string().regex(/^[A-Za-z]{3}$/).describe('Resolved origin IATA code derived from an unambiguous user-supplied city or airport name'),
  destination: z.string().regex(/^[A-Za-z]{3}$/).describe('Resolved destination IATA code derived from an unambiguous user-supplied city or airport name'),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Outbound date in YYYY-MM-DD format'),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Optional return date in YYYY-MM-DD format'),
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(8).default(0),
  infants: z.number().int().min(0).max(9).default(0),
  childrenAges: z.array(z.number().int().min(2).max(11)).max(8).default([]),
  infantAges: z.array(z.number().int().min(0).max(1)).max(9).default([]),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).default('ECONOMY'),
  currency: z.string().regex(/^[A-Za-z]{3}$/).describe('ISO 4217 display currency'),
  country: z.string().regex(/^[A-Za-z]{2}$/).describe('ISO 3166-1 alpha-2 point-of-sale country'),
});

export const searchOutputSchema = z.object({
  status: z.enum(['success', 'empty', 'partial', 'error']),
  message: z.string().max(400),
  fallback: z.string().max(500),
  retrievedAt: z.string().max(64).optional(),
  searchId: z.string().max(39).optional(),
  itineraries: z.array(itinerarySchema).max(10),
  error: errorSchema.optional(),
});

export const verificationSchema = z.object({
  status: z.literal('success'),
  selectionId: z.string().regex(/^sel_[a-f0-9]{32}$/),
  availability: z.literal('available'),
  priceChanged: z.boolean(),
  previousPrice: moneySchema,
  currentPrice: moneySchema,
  messages: z.array(z.string().max(240)).max(6),
  expiresAt: z.string().max(64).optional(),
  verifiedAt: z.string().max(64).optional(),
});

export const verifyOutputSchema = z.object({
  status: z.enum(['success', 'error']),
  message: z.string().max(400),
  fallback: z.string().max(500),
  verification: verificationSchema.optional(),
  error: errorSchema.optional(),
});

export const homeOutputSchema = z.object({
  status: z.literal('ready'),
  brand: z.literal('Cedar & Cloud Travel'),
  message: z.string().max(300),
  domains: z.array(z.object({
    name: z.enum(['Flights', 'Stays', 'Loyalty', 'Ground travel', 'Experiences']),
    availability: z.enum(['available', 'coming_soon']),
  })).max(5),
  fallback: z.string().max(500),
});

export const selectionRecordSchema = z.object({
  selectionId: z.string().regex(/^sel_[a-f0-9]{32}$/),
  offerId: z.string().min(1).max(16_384),
  searchId: z.string().max(39),
  originalTotal: z.number().nonnegative().max(100_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/),
  expiresAt: z.string().max(64).optional(),
});

export const selectionStateSchema = z.object({
  searchId: z.string().max(39).optional(),
  updatedAt: z.string().max(64),
  records: z.array(selectionRecordSchema).max(10),
});

export type HomeOutput = z.infer<typeof homeOutputSchema>;
export type SearchOutput = z.infer<typeof searchOutputSchema>;
export type VerifyOutput = z.infer<typeof verifyOutputSchema>;
export type Verification = z.infer<typeof verificationSchema>;
export type Itinerary = z.infer<typeof itinerarySchema>;
