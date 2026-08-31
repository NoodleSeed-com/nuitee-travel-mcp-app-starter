import { z } from '@noodleseed/one';
import { starterConfig } from './starter-config.js';

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
  base: z.number().nonnegative().max(100_000_000).optional(),
  taxes: z.number().nonnegative().max(100_000_000).optional(),
  fees: z.number().nonnegative().max(100_000_000).optional(),
});

export const selectionIdSchema = z.string().regex(/^sel_[a-f0-9]{32}$/);
const iataSchema = z.string().regex(/^[A-Z]{3}$/);
const durationMinutesSchema = z.number().int().nonnegative().max(10_080);
const airlineLogoSchema = z.string().max(2048).regex(
  /^https:\/\/(?:sandbox|production)\.nuitee\.flights\/static\/images\/airlines\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:png|svg|webp)$/,
);
const carrierSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().regex(/^(?:[A-Z0-9]{2,3}|—)$/),
  logoUrl: airlineLogoSchema.optional(),
});
const operatingCarrierSchema = carrierSchema.omit({ logoUrl: true });

export const segmentSchema = z.object({
  origin: iataSchema,
  originName: z.string().min(1).max(120).optional(),
  destination: iataSchema,
  destinationName: z.string().min(1).max(120).optional(),
  departureTime: z.string().max(64),
  arrivalTime: z.string().max(64),
  direction: z.enum(['OUTBOUND', 'INBOUND']),
  durationMinutes: durationMinutesSchema,
  carrier: carrierSchema,
  operatingCarrier: operatingCarrierSchema.optional(),
  flightNumber: z.string().max(16).optional(),
  operatingFlightNumber: z.string().max(16).optional(),
});

export const legSchema = z.object({
  direction: z.enum(['OUTBOUND', 'INBOUND']),
  route: z.object({
    origin: iataSchema,
    originName: z.string().min(1).max(120).optional(),
    destination: iataSchema,
    destinationName: z.string().min(1).max(120).optional(),
  }),
  departureTime: z.string().max(64),
  arrivalTime: z.string().max(64),
  durationMinutes: durationMinutesSchema,
  stops: z.number().int().nonnegative().max(7),
  dayChange: z.number().int().min(0).max(7).optional(),
  overnight: z.boolean().optional(),
});

const amenitySchema = z.object({
  category: z.enum(['wifi', 'power', 'entertainment', 'food', 'seat_comfort']),
  name: z.string().min(1).max(80),
  available: z.boolean(),
  chargeable: z.boolean().optional(),
  details: z.string().min(1).max(160).optional(),
  aircraftType: z.string().min(1).max(80).optional(),
});

export const itinerarySchema = z.object({
  selectionId: selectionIdSchema,
  route: z.object({
    origin: iataSchema,
    originName: z.string().min(1).max(120).optional(),
    destination: iataSchema,
    destinationName: z.string().min(1).max(120).optional(),
  }),
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
  fare: z.object({
    family: z.string().min(1).max(80).optional(),
    mixedCabin: z.boolean().optional(),
    seatsRemaining: z.number().int().nonnegative().max(999).optional(),
  }),
  terms: z.object({
    changeable: z.boolean().optional(),
    refundable: z.boolean().optional(),
    hasChangeFee: z.boolean().optional(),
    hasRefundFee: z.boolean().optional(),
  }),
  amenities: z.array(amenitySchema).max(5),
  legs: z.array(legSchema).min(1).max(2),
  segments: z.array(segmentSchema).max(8),
  messages: z.array(z.string().max(240)).max(6),
});

export const searchInputSchema = z.object({
  origin: z.string().regex(/^[A-Za-z]{3}$/).describe('Resolved origin IATA code derived from an unambiguous user-supplied city or airport name'),
  destination: z.string().regex(/^[A-Za-z]{3}$/).describe('Resolved destination IATA code derived from an unambiguous user-supplied city or airport name'),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Outbound date in YYYY-MM-DD format; resolve relative language from the server-provided local date before calling'),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Optional return date in YYYY-MM-DD format'),
  adults: z.number().int().min(1).max(9).default(1).describe('Adult traveler count; treat a generic passenger count as adults unless the user explicitly identifies children or infants'),
  children: z.number().int().min(0).max(8).default(0).describe('Children explicitly identified by the user; otherwise zero'),
  infants: z.number().int().min(0).max(9).default(0).describe('Infants explicitly identified by the user; otherwise zero'),
  childrenAges: z.array(z.number().int().min(2).max(11)).max(8).default([]),
  infantAges: z.array(z.number().int().min(0).max(1)).max(9).default([]),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).default('ECONOMY'),
  currency: z.string().regex(/^[A-Za-z]{3}$/).default('USD').describe('ISO 4217 display currency; explicit user choice wins, otherwise use an available page travel default, then USD'),
  country: z.string().regex(/^[A-Za-z]{2}$/).default('US').describe('ISO 3166-1 alpha-2 pricing market; explicit user choice wins, otherwise use an available page travel default, then US'),
});

export const flightPlanInputSchema = z.object({
  origin: z.string().regex(/^[A-Z]{3}$/).describe('Resolved uppercase origin IATA code derived from an unambiguous user-supplied city or airport name'),
  destination: z.string().regex(/^[A-Z]{3}$/).describe('Resolved uppercase destination or metro IATA code derived from an unambiguous user-supplied place'),
  currency: z.string().regex(/^[A-Z]{3}$/).default('USD').describe('Uppercase ISO 4217 display currency; an explicit traveler choice wins, otherwise a browser page default may be used'),
  country: z.string().regex(/^[A-Z]{2}$/).default('US').describe('Uppercase ISO 3166-1 alpha-2 pricing market; an explicit traveler choice wins, otherwise a browser page default may be used'),
});

const isoCalendarDate = z.iso.date();

export const flightPlanDateSchema = z.string()
  .refine(
    (value) => isoCalendarDate.safeParse(value).success,
    'Expected a valid calendar date in YYYY-MM-DD format',
  )
  .describe('Travel date in YYYY-MM-DD format')
  .meta({ format: 'date' });

export const flightPlanDatesSchema = z.object({
  departureDate: flightPlanDateSchema,
  returnDate: flightPlanDateSchema.optional(),
});

export const flightPlanOutputSchema = z.object({
  status: z.literal('planned'),
  message: z.string().max(240),
  origin: z.string().regex(/^[A-Z]{3}$/),
  destination: z.string().regex(/^[A-Z]{3}$/),
  departureDate: flightPlanDateSchema,
  returnDate: flightPlanDateSchema.optional(),
  adults: z.number().int().min(1).max(9),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']),
  currency: z.string().regex(/^[A-Z]{3}$/),
  country: z.string().regex(/^[A-Z]{2}$/),
});

export const searchOutputSchema = z.object({
  status: z.enum(['success', 'empty', 'partial', 'error']),
  message: z.string().max(400),
  fallback: z.string().max(500),
  retrievedAt: z.string().max(64).optional(),
  searchId: z.string().max(39).optional(),
  searchContext: searchInputSchema.optional(),
  itineraries: z.array(itinerarySchema).max(10),
  error: errorSchema.optional(),
});

export const verificationSchema = z.object({
  status: z.literal('success'),
  selectionId: selectionIdSchema,
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

export const verifyInputSchema = z.object({
  selectionId: selectionIdSchema.optional().describe(
    'Application-issued fare selection. Omit it when re-verifying the active fare.',
  ),
  selectionMode: z.enum(['active', 'explicit']).default('active').describe(
    'Use active for “verify again”, “verify this”, or the currently selected fare. Use explicit only when the user clearly chooses a different option.',
  ),
});

export const selectFlightOutputSchema = z.object({
  status: z.enum(['selected', 'unavailable']),
  message: z.string().max(240),
  selectionId: selectionIdSchema.optional(),
});

export const homeOutputSchema = z.object({
  status: z.literal('ready'),
  brand: z.literal(starterConfig.brand.name),
  message: z.string().max(300),
  domains: z.array(z.object({
    name: z.enum(['Flights', 'Stays', 'Loyalty', 'Ground travel', 'Experiences']),
    availability: z.enum(['available', 'coming_soon']),
  })).max(5),
  fallback: z.string().max(500),
});

export const selectionRecordSchema = z.object({
  selectionId: selectionIdSchema,
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
  activeSelectionId: selectionIdSchema.optional(),
});

export type HomeOutput = z.infer<typeof homeOutputSchema>;
export type SearchOutput = z.infer<typeof searchOutputSchema>;
export type VerifyOutput = z.infer<typeof verifyOutputSchema>;
export type Verification = z.infer<typeof verificationSchema>;
export type Itinerary = z.infer<typeof itinerarySchema>;
export type SearchContext = z.infer<typeof searchInputSchema>;
export type FlightPlan = z.infer<typeof flightPlanOutputSchema>;
