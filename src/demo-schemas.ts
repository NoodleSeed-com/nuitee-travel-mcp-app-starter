import { z } from '@noodleseed/one';
import { travelCompanionDemoConfig } from './demo-config.js';
import { activityDatesSchema, airlineLogoSchema, selectionIdSchema } from './flight-schemas.js';

export const syntheticDataSourceSchema = z.literal('illustrative');
export const hotelDataSourceSchema = z.enum(['live_nuitee', 'illustrative']);
export const demoHotelSelectionIdSchema = z.string().regex(/^hsel_[a-f0-9]{32}$/);
export const demoHotelSearchIdSchema = z.string().regex(/^hsearch_[a-f0-9]{32}$/);
export const demoRewardFlightSearchIdSchema = z.string().regex(/^rsearch_[a-f0-9]{32}$/);
export const demoRewardFlightOptionIdSchema = z.string().regex(/^rwd_[a-f0-9]{32}$/);
export const demoInsuranceComparisonIdSchema = z.string().regex(/^inscmp_[a-f0-9]{32}$/);
export const demoInsurancePlanIdSchema = z.string().regex(/^inplan_[a-f0-9]{32}$/);
export const demoExperienceSearchIdSchema = z.string().regex(/^exsearch_[a-f0-9]{32}$/);
export const demoExperienceIdSchema = z.string().regex(/^exp_[a-f0-9]{32}$/);
export const demoExperienceSlotIdSchema = z.string().regex(/^slot_[a-f0-9]{32}$/);
export const demoExperienceSelectionIdSchema = z.string().regex(/^esel_[a-f0-9]{32}$/);
export const demoCurrencySchema = z.enum(['CAD', 'USD', 'EUR']);
export const demoInsuranceCurrencySchema = z.enum(['CAD', 'USD', 'EUR', 'GBP']);
export const demoExperienceCurrencySchema = z.enum(['CAD', 'USD', 'EUR', 'GBP', 'JPY']);
export const demoExperienceCategorySchema = z.enum([
  'FOOD',
  'CULTURE',
  'WATER',
  'DESIGN',
  'FAMILY',
  'EVENING',
  'CRAFT',
  'TEA',
]);

export const demoHomeOutputSchema = z.object({
  status: z.literal('ready'),
  brand: z.literal(travelCompanionDemoConfig.brand.name),
  message: z.string().min(1).max(300),
  disclosure: z.string().min(20).max(320),
  domains: z.array(z.object({
    name: z.enum(['Flights', 'Stays', 'Loyalty', 'Ground travel', 'Experiences']),
    availability: z.enum(['available', 'illustrative', 'coming_soon']),
    label: z.string().min(2).max(80),
  })).length(5),
  fallback: z.string().min(20).max(700),
});

const calendarDateSchema = z.iso.date();
const boundedPrintableTextSchema = z.string().trim().min(1).max(240);
const destinationSchema = z.string()
  .trim()
  .min(2)
  .max(80);

function calendarDay(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

export const demoHotelSearchInputSchema = z.object({
  destination: destinationSchema.describe('City name or IATA airport code for the stay search'),
  countryCode: z.string()
    .regex(/^[A-Z]{2}$/)
    .optional()
    .describe('Two-letter destination country code when destination is a city name'),
  checkInDate: calendarDateSchema.describe('Check-in date in YYYY-MM-DD format'),
  checkOutDate: calendarDateSchema.describe('Check-out date in YYYY-MM-DD format'),
  adults: z.number().int().min(1).max(8).default(1),
  children: z.number().int().min(0).max(6).default(0),
  rooms: z.number().int().min(1).max(4).default(1),
  currency: demoCurrencySchema.default('CAD'),
}).refine(
  ({ checkInDate, checkOutDate }) => checkOutDate > checkInDate,
  { path: ['checkOutDate'], message: 'Check-out must be after check-in.' },
).refine(
  ({ checkInDate, checkOutDate }) =>
    (calendarDay(checkOutDate) - calendarDay(checkInDate)) / 86_400_000 <= 30,
  { path: ['checkOutDate'], message: 'Synthetic stay searches are limited to 30 nights.' },
).refine(
  ({ adults, children, rooms }) => rooms <= adults + children,
  { path: ['rooms'], message: 'Rooms cannot exceed the total traveler count.' },
);

export const demoMoneySchema = z.object({
  amount: z.number().nonnegative().max(1_000_000),
  currency: demoCurrencySchema,
});

export const demoHotelSchema = z.object({
  selectionId: demoHotelSelectionIdSchema,
  dataSource: hotelDataSourceSchema,
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(80),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  neighborhood: z.string().trim().min(2).max(80),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  description: boundedPrintableTextSchema,
  roomName: z.string().trim().min(2).max(80),
  category: z.number().int().min(1).max(5),
  amenities: z.array(z.string().trim().min(2).max(80)).max(6),
  nights: z.number().int().min(1).max(30),
  rooms: z.number().int().min(1).max(4),
  nightlyPrice: demoMoneySchema,
  staySubtotal: demoMoneySchema,
  taxesAndFeesIncluded: z.boolean(),
  policySummary: z.string().trim().min(2).max(200),
  imageUrl: z.url().max(2_048).optional(),
  reviewScore: z.number().min(0).max(10).optional(),
  reviewCount: z.number().int().nonnegative().max(10_000_000).optional(),
}).refine(
  ({ lat, lng }) => (lat === undefined) === (lng === undefined),
  {
    path: ['lng'],
    message: 'A hotel needs both coordinates or neither; a half-located hotel is not mappable.',
  },
);

export const hotelErrorSchema = z.object({
  code: z.enum([
    'configuration_required',
    'authentication',
    'entitlement',
    'invalid_request',
    'rate_limited',
    'timeout',
    'provider_error',
    'malformed_response',
    'service_unavailable',
  ]),
  message: z.string().trim().min(2).max(320),
  retryable: z.boolean(),
});

export const demoHotelSearchOutputSchema = z.object({
  status: z.enum(['success', 'partial', 'empty', 'error']),
  dataSource: hotelDataSourceSchema,
  disclosure: z.string().trim().min(20).max(320),
  message: z.string().trim().min(2).max(320),
  fallback: z.string().trim().min(20).max(500),
  searchId: demoHotelSearchIdSchema,
  searchContext: demoHotelSearchInputSchema,
  hotels: z.array(demoHotelSchema).max(10),
  error: hotelErrorSchema.optional(),
}).refine(
  ({ status, hotels }) => status === 'success' || status === 'partial' ? hotels.length > 0 : hotels.length === 0,
  { path: ['hotels'], message: 'Successful/partial searches need results; empty/error searches cannot contain results.' },
).refine(
  ({ status, error }) => status === 'error' ? error !== undefined : error === undefined,
  { path: ['error'], message: 'Only failed hotel searches include an error.' },
);

export const demoExperienceSearchInputSchema = z.object({
  destination: destinationSchema.describe('City name or known city/airport alias for the fictional experience catalog'),
  experienceName: z.string().trim().max(100).optional()
    .describe('Use an empty string "" for broad discovery or add another experience. Otherwise use only the experience title or identifying part explicitly requested by the traveler: one matching title opens its date/time detail screen; multiple matches show a carousel. Never use the destination, a wildcard, or an invented name as a placeholder.'),
  startDate: calendarDateSchema.describe('First local date to consider in YYYY-MM-DD format'),
  endDate: calendarDateSchema.describe('Exclusive end date in YYYY-MM-DD format'),
  adults: z.number().int().min(1).max(8).default(1),
  children: z.number().int().min(0).max(6).default(0),
  currency: demoExperienceCurrencySchema.default('CAD'),
  interests: z.array(demoExperienceCategorySchema).max(4)
    .describe('Optional categories explicitly requested by the traveler; omit for broad discovery')
    .optional(),
  accessibility: z.enum(['ANY', 'STEP_FREE'])
    .describe('Use ANY unless the traveler explicitly requests step-free or wheelchair-accessible options; use STEP_FREE only for that explicit request')
    .optional(),
}).refine(
  ({ startDate, endDate }) => endDate > startDate,
  { path: ['endDate'], message: 'Experience search end date must be after start date.' },
).refine(
  ({ startDate, endDate }) =>
    (calendarDay(endDate) - calendarDay(startDate)) / 86_400_000 <= 30,
  { path: ['endDate'], message: 'Fictional experience searches are limited to 30 days.' },
).refine(
  ({ adults, children }) => adults + children <= 8,
  { path: ['children'], message: 'Fictional experience searches are limited to eight participants.' },
);

export const demoExperienceMoneySchema = z.object({
  amountMinor: z.number().int().nonnegative().max(100_000_000),
  currency: demoExperienceCurrencySchema,
});

export const demoExperienceSlotSchema = z.object({
  slotId: demoExperienceSlotIdSchema,
  startLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/),
  timeZone: z.enum(['Europe/Lisbon', 'Asia/Tokyo']),
  remainingCapacity: z.number().int().min(1).max(20),
  isFictional: z.literal(true),
});

export const demoExperienceSchema = z.object({
  experienceId: demoExperienceIdSchema,
  dataSource: syntheticDataSourceSchema,
  source: z.literal('WAYFARE_DEMO'),
  isFictional: z.literal(true),
  city: z.enum(['Lisbon', 'Tokyo']),
  countryCode: z.enum(['PT', 'JP']),
  timeZone: z.enum(['Europe/Lisbon', 'Asia/Tokyo']),
  title: z.string().trim().min(2).max(100),
  operatorLabel: z.string().trim().min(2).max(80),
  shortDescription: z.string().trim().min(20).max(240),
  categories: z.array(demoExperienceCategorySchema).min(1).max(4),
  durationMinutes: z.number().int().min(30).max(720),
  meetingArea: z.string().trim().min(2).max(100),
  accessibility: z.object({
    stepFree: z.boolean(),
    summary: z.string().trim().min(2).max(160),
  }),
  inclusions: z.array(z.string().trim().min(2).max(100)).min(1).max(5),
  restrictions: z.array(z.string().trim().min(2).max(160)).max(3),
  cancellationPolicy: z.string().trim().min(2).max(180),
  price: demoExperienceMoneySchema,
  slots: z.array(demoExperienceSlotSchema).min(1).max(4),
});

export const demoExperienceSearchOutputSchema = z.object({
  status: z.enum(['success', 'empty']),
  dataSource: syntheticDataSourceSchema,
  source: z.literal('WAYFARE_DEMO'),
  isFictional: z.literal(true),
  disclosure: z.string().trim().min(20).max(320),
  message: z.string().trim().min(2).max(320),
  fallback: z.string().trim().min(20).max(700),
  searchId: demoExperienceSearchIdSchema,
  searchContext: demoExperienceSearchInputSchema,
  supportedDestination: z.boolean(),
  emptyReason: z.enum(['UNSUPPORTED_DESTINATION', 'NO_MATCHING_EXPERIENCES']).optional(),
  experiences: z.array(demoExperienceSchema).max(6),
}).refine(
  ({ status, experiences }) => status === 'success' ? experiences.length > 0 : experiences.length === 0,
  { path: ['experiences'], message: 'Successful experience searches need results; empty searches cannot contain results.' },
).refine(
  ({ status, emptyReason }) => status === 'empty' ? emptyReason !== undefined : emptyReason === undefined,
  { path: ['emptyReason'], message: 'Only empty experience searches include an empty reason.' },
).refine(
  ({ supportedDestination, emptyReason }) =>
    supportedDestination ? emptyReason !== 'UNSUPPORTED_DESTINATION' : emptyReason === 'UNSUPPORTED_DESTINATION',
  { path: ['supportedDestination'], message: 'Unsupported destinations must use the matching empty reason.' },
);

export const demoAddExperienceInputSchema = z.object({
  experienceId: demoExperienceIdSchema.describe('Experience reference returned by the current conversation search'),
  slotId: demoExperienceSlotIdSchema.describe('Returned date/time slot explicitly chosen by the traveler'),
}).strict();

export const demoExperienceSelectionSchema = z.object({
  selectionId: demoExperienceSelectionIdSchema,
  experience: demoExperienceSchema,
  slot: demoExperienceSlotSchema,
  searchContext: demoExperienceSearchInputSchema,
  totalPrice: demoExperienceMoneySchema,
  addedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const demoExperienceSelectionRecordSchema = z.object({
  experience: demoExperienceSchema,
  searchContext: demoExperienceSearchInputSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const demoExperienceSelectionStateSchema = z.object({
  updatedAt: z.string().datetime(),
  records: z.array(demoExperienceSelectionRecordSchema).max(6),
  selected: z.array(demoExperienceSelectionSchema).max(8),
});

const experienceSelectionDecisionFields = {
  status: z.enum(['selected', 'already_selected', 'expired', 'unavailable', 'limit_reached', 'conflict']),
  message: z.string().min(1).max(320),
  selection: demoExperienceSelectionSchema.optional(),
};
export const demoExperienceSelectionDecisionSchema = z.object(experienceSelectionDecisionFields).refine(
  ({ status, selection }) => ['selected', 'already_selected'].includes(status) === (selection !== undefined),
  { path: ['selection'], message: 'Only an acknowledged selection includes selection details.' },
);
export const demoAddExperienceOutputSchema = z.object({
  ...experienceSelectionDecisionFields,
  requestedExperienceId: demoExperienceIdSchema,
  requestedSlotId: demoExperienceSlotIdSchema,
}).refine(
  ({ status, selection }) => ['selected', 'already_selected'].includes(status) === (selection !== undefined),
  { path: ['selection'], message: 'Only an acknowledged selection includes selection details.' },
);

export const demoHotelSelectionRecordSchema = z.object({
  selectionId: demoHotelSelectionIdSchema,
  searchId: demoHotelSearchIdSchema,
  dataSource: hotelDataSourceSchema.default('illustrative'),
  fixtureKey: z.string().regex(/^demo_hotel_[a-z0-9_]{2,64}$/).optional(),
  providerOfferId: z.string().min(1).max(16_384).optional(),
  propertyName: z.string().trim().min(2).max(100),
  imageUrl: z.url().max(2_048).optional(),
  city: z.string().trim().min(2).max(80),
  checkInDate: calendarDateSchema,
  checkOutDate: calendarDateSchema,
  nights: z.number().int().min(1).max(30),
  rooms: z.number().int().min(1).max(4),
  staySubtotal: demoMoneySchema,
});

export const demoHotelSelectionStateSchema = z.object({
  searchId: demoHotelSearchIdSchema.optional(),
  updatedAt: z.string().max(64),
  records: z.array(demoHotelSelectionRecordSchema).max(10),
  activeSelectionId: demoHotelSelectionIdSchema.optional(),
  searchResult: demoHotelSearchOutputSchema.optional(),
});

export const openHotelInputSchema = z.object({
  hotelName: z.string().trim().min(1).max(100).describe('The hotel name or identifying part explicitly requested by the traveler. Search only previously returned hotels; never invent a placeholder.'),
}).strict();

export const openHotelOutputSchema = z.object({
  status: z.enum(['ready', 'not_found', 'unavailable']),
  message: z.string().min(2).max(320),
  result: demoHotelSearchOutputSchema.optional(),
  focusedSelectionId: demoHotelSelectionIdSchema.optional(),
  selectedSelectionId: demoHotelSelectionIdSchema.optional(),
}).refine(
  ({ status, result, focusedSelectionId, selectedSelectionId }) => status === 'ready'
    ? Boolean(result && result.hotels.length > 0 &&
      (focusedSelectionId === undefined || result.hotels.length === 1 && result.hotels[0]!.selectionId === focusedSelectionId) &&
      (selectedSelectionId === undefined || result.hotels.some(hotel => hotel.selectionId === selectedSelectionId)))
    : result === undefined && focusedSelectionId === undefined && selectedSelectionId === undefined,
  { message: 'Only ready hotel lookups include matching returned hotels and valid presentation references.' },
);
export type OpenHotelOutput = z.infer<typeof openHotelOutputSchema>;

export const demoSelectHotelOutputSchema = z.object({
  status: z.enum(['selected', 'unavailable']),
  message: z.string().min(1).max(240),
  selectionId: demoHotelSelectionIdSchema.optional(),
});

export const demoLoyaltyBenefitSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(180),
});

export const demoLoyaltyOverviewSchema = z.object({
  status: z.literal('success'),
  dataSource: syntheticDataSourceSchema,
  disclosure: z.string().trim().min(20).max(320),
  fallback: z.string().trim().min(20).max(500),
  member: z.object({
    displayName: z.literal('Preview traveler'),
    reference: z.literal('WAYFARE-PREVIEW-0001'),
    tier: z.literal('Explorer concept tier'),
    pointsBalance: z.number().int().nonnegative().max(1_000_000),
  }),
  progress: z.object({
    label: z.string().trim().min(2).max(100),
    current: z.number().int().nonnegative().max(1_000_000),
    target: z.number().int().positive().max(1_000_000),
  }),
  benefits: z.array(demoLoyaltyBenefitSchema).min(1).max(6),
  illustrativePointsValue: z.object({
    points: z.number().int().positive().max(1_000_000),
    value: demoMoneySchema,
    explanation: z.string().trim().min(20).max(240),
  }),
});

export const demoRewardFlightSearchInputSchema = z.object({
  origin: destinationSchema
    .default('Toronto')
    .describe('Optional city or airport starting point; the illustrative profile uses Toronto when omitted'),
  destination: destinationSchema
    .optional()
    .describe('Optional city or airport destination; omit it to browse illustrative reward-flight ideas'),
  departureDate: calendarDateSchema
    .optional()
    .describe('Optional departure date in YYYY-MM-DD format; omit it for flexible-date illustrative ideas'),
  adults: z.number().int().min(1).max(8).default(1),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY']).default('ECONOMY'),
  pointsBudget: z.number().int().min(5_000).max(1_000_000).default(42_500),
  currency: demoCurrencySchema.default('CAD'),
});

export const demoRewardFlightOptionSchema = z.object({
  optionId: demoRewardFlightOptionIdSchema,
  dataSource: syntheticDataSourceSchema,
  route: z.object({
    origin: destinationSchema,
    destination: destinationSchema,
  }),
  departureDate: calendarDateSchema.optional(),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY']),
  partnerLabel: z.string().trim().min(2).max(80),
  stops: z.number().int().min(0).max(2),
  durationMinutes: z.number().int().min(30).max(1_440),
  pointsPerAdult: z.number().int().positive().max(1_000_000),
  totalPoints: z.number().int().positive().max(1_000_000),
  estimatedTaxes: demoMoneySchema,
  balanceAfter: z.number().int().nonnegative().max(1_000_000),
  notes: z.array(z.string().trim().min(2).max(120)).max(4),
});

export const demoRewardFlightSearchOutputSchema = z.object({
  status: z.enum(['success', 'empty']),
  dataSource: syntheticDataSourceSchema,
  disclosure: z.string().trim().min(20).max(320),
  message: z.string().trim().min(2).max(320),
  fallback: z.string().trim().min(20).max(500),
  searchId: demoRewardFlightSearchIdSchema,
  searchContext: demoRewardFlightSearchInputSchema,
  pointsContext: z.object({
    available: z.number().int().min(5_000).max(1_000_000),
    source: z.literal('illustrative_profile'),
  }),
  options: z.array(demoRewardFlightOptionSchema).max(6),
}).refine(
  ({ status, options }) => status === 'success' ? options.length > 0 : options.length === 0,
  { path: ['options'], message: 'Successful searches need options; empty searches cannot contain options.' },
).refine(
  ({ options, pointsContext }) => options.every((option) =>
    option.totalPoints <= pointsContext.available &&
    option.balanceAfter === pointsContext.available - option.totalPoints),
  { path: ['options'], message: 'Reward-flight options must fit the illustrative points budget.' },
);

export const demoInsuranceComparisonInputSchema = z.object({
  destination: destinationSchema.describe('Destination country or region for the illustrative travel-protection comparison'),
  departureDate: calendarDateSchema.describe('Trip departure date in YYYY-MM-DD format'),
  returnDate: calendarDateSchema.describe('Trip return date in YYYY-MM-DD format'),
  adults: z.number().int().min(1).max(8).default(1),
  children: z.number().int().min(0).max(6).default(0),
  residenceCountry: z.string()
    .regex(/^[A-Z]{2}$/)
    .default('CA')
    .describe('Two-letter example residence country; defaults to CA and is always disclosed as an illustrative assumption'),
  currency: demoInsuranceCurrencySchema.default('CAD'),
  estimatedTripCost: z.number().nonnegative().max(1_000_000).optional(),
}).refine(
  ({ departureDate, returnDate }) => returnDate > departureDate,
  { path: ['returnDate'], message: 'Return must be after departure.' },
).refine(
  ({ departureDate, returnDate }) =>
    (calendarDay(returnDate) - calendarDay(departureDate)) / 86_400_000 <= 90,
  { path: ['returnDate'], message: 'Illustrative travel-protection comparisons are limited to 90 days.' },
).refine(
  ({ adults, children }) => adults + children <= 8,
  { path: ['children'], message: 'Illustrative comparisons are limited to eight travelers.' },
);

const demoInsuranceLimitMoneySchema = z.object({
  amount: z.number().nonnegative().max(10_000_000),
  currency: demoInsuranceCurrencySchema,
});

const demoInsuranceMoneySchema = z.object({
  amount: z.number().nonnegative().max(1_000_000),
  currency: demoInsuranceCurrencySchema,
});

export const demoInsuranceCoverageSchema = z.object({
  name: z.string().trim().min(2).max(80),
  limit: demoInsuranceLimitMoneySchema,
  basis: z.enum(['per_traveler', 'per_trip']),
  summary: z.string().trim().min(20).max(180),
});

export const demoInsurancePlanSchema = z.object({
  planId: demoInsurancePlanIdSchema,
  dataSource: syntheticDataSourceSchema,
  name: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(20).max(180),
  illustrativePrice: demoInsuranceMoneySchema,
  deductible: demoInsuranceMoneySchema,
  coverages: z.array(demoInsuranceCoverageSchema).min(4).max(6),
  highlights: z.array(z.string().trim().min(2).max(120)).min(1).max(5),
  exclusions: z.array(z.string().trim().min(20).max(180)).min(1).max(5),
});

export const demoInsuranceComparisonOutputSchema = z.object({
  status: z.literal('success'),
  dataSource: syntheticDataSourceSchema,
  disclosure: z.string().trim().min(40).max(420),
  message: z.string().trim().min(2).max(320),
  fallback: z.string().trim().min(40).max(700),
  comparisonId: demoInsuranceComparisonIdSchema,
  searchContext: demoInsuranceComparisonInputSchema,
  assumptions: z.array(z.string().trim().min(20).max(180)).min(1).max(6),
  plans: z.array(demoInsurancePlanSchema).length(3),
});

export const demoTripReviewFlightSchema = z.object({
  dataSource: z.literal('live_nuitee_selection'),
  selectionId: selectionIdSchema,
  airlineLogoUrl: airlineLogoSchema.optional(),
  origin: z.string().regex(/^[A-Z]{3}$/).optional(),
  destination: z.string().regex(/^[A-Z]{3}$/).optional(),
  searchPrice: z.object({
    total: z.number().nonnegative().max(100_000_000),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }).nullable().describe('Selected search price, or explicit null when unavailable. Never infer zero.'),
  expiresAt: z.string().max(64).optional(),
  disclosure: z.string().trim().min(20).max(240),
});

export const demoTripReviewStaySchema = z.object({
  dataSource: hotelDataSourceSchema,
  selectionId: demoHotelSelectionIdSchema,
  propertyName: z.string().trim().min(2).max(100),
  imageUrl: z.url().max(2_048).optional(),
  city: z.string().trim().min(2).max(80),
  checkInDate: calendarDateSchema,
  checkOutDate: calendarDateSchema,
  nights: z.number().int().min(1).max(30),
  rooms: z.number().int().min(1).max(4),
  staySubtotal: demoMoneySchema,
});

export const demoTripPlanningContextSchema = z.object({
  source: z.enum(['flight', 'stay', 'experience']),
  destination: z.string().min(2).max(100),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  origin: z.string().min(2).max(100).optional(),
  startDate: calendarDateSchema.optional(),
  endDate: calendarDateSchema.optional(),
  dateBasis: z.enum(['flight_departure', 'stay', 'experience_search']),
  activityDates: activityDatesSchema.optional(),
  adults: z.number().int().min(1).max(9).optional(),
  children: z.number().int().min(0).max(8).optional(),
  infants: z.number().int().min(0).max(9).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  meetingArea: z.string().min(2).max(100).optional(),
  propertyName: z.string().min(2).max(100).optional(),
});

export const tripPlanningEstimateSchema = z.object({
  status: z.enum(['complete', 'mixed_currencies', 'incomplete', 'empty']),
  items: z.array(z.object({
    component: z.enum(['flight', 'stay', 'experience']),
    label: z.string().max(100),
    source: z.enum(['provider_search', 'fictional']),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    fractionDigits: z.number().int().min(0).max(2).optional(),
    amountMinor: z.number().int().nonnegative().max(10_000_000_000).optional(),
    amount: z.number().nonnegative().max(100_000_000).optional(),
  })).max(10),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  fractionDigits: z.number().int().min(0).max(2).optional(),
  totalMinor: z.number().int().nonnegative().max(100_000_000_000).optional(),
  providerSubtotalMinor: z.number().int().nonnegative().max(100_000_000_000).optional(),
  fictionalSubtotalMinor: z.number().int().nonnegative().max(100_000_000_000).optional(),
});

export const demoTripReviewSchema = z.object({
  status: z.enum(['ready', 'incomplete']),
  dataSource: syntheticDataSourceSchema,
  disclosure: z.string().trim().min(20).max(400),
  fallback: z.string().trim().min(20).max(500),
  flight: demoTripReviewFlightSchema.optional(),
  stay: demoTripReviewStaySchema.optional(),
  experiences: z.array(demoExperienceSelectionSchema).max(8),
  loyalty: demoLoyaltyOverviewSchema,
  planningEstimate: tripPlanningEstimateSchema.optional(),
  missing: z.array(z.enum(['flight', 'stay', 'experiences'])).max(3),
  planningContext: demoTripPlanningContextSchema.optional(),
  notes: z.array(z.string().min(1).max(240)).max(3).optional(),
}).refine(
  ({ status, flight, stay, experiences }) =>
    (status === 'ready') === Boolean(flight || stay || experiences.length),
  { path: ['status'], message: 'A trip review is ready when any component is selected.' },
).refine(
  ({ flight, stay, experiences, missing }) => JSON.stringify(missing) === JSON.stringify([
    ...(flight ? [] : ['flight']), ...(stay ? [] : ['stay']), ...(experiences.length ? [] : ['experiences']),
  ]),
  { path: ['missing'], message: 'Missing components must match the selected trip components.' },
);

export type DemoHotelSearchInput = z.infer<typeof demoHotelSearchInputSchema>;
export type DemoHomeOutput = z.infer<typeof demoHomeOutputSchema>;
export type DemoHotel = z.infer<typeof demoHotelSchema>;
export type DemoHotelSearchOutput = z.infer<typeof demoHotelSearchOutputSchema>;
export type DemoExperienceSearchInput = z.infer<typeof demoExperienceSearchInputSchema>;
export type DemoExperience = z.infer<typeof demoExperienceSchema>;
export type DemoExperienceSlot = z.infer<typeof demoExperienceSlotSchema>;
export type DemoExperienceSelection = z.infer<typeof demoExperienceSelectionSchema>;
export type DemoExperienceSelectionState = z.infer<typeof demoExperienceSelectionStateSchema>;
export type DemoAddExperienceOutput = z.infer<typeof demoAddExperienceOutputSchema>;
export type DemoExperienceSearchOutput = z.infer<typeof demoExperienceSearchOutputSchema>;
export type DemoHotelSelectionRecord = z.infer<typeof demoHotelSelectionRecordSchema>;
export type DemoHotelSelectionState = z.infer<typeof demoHotelSelectionStateSchema>;
export type DemoLoyaltyOverview = z.infer<typeof demoLoyaltyOverviewSchema>;
export type DemoRewardFlightSearchInput = z.infer<typeof demoRewardFlightSearchInputSchema>;
export type DemoRewardFlightOption = z.infer<typeof demoRewardFlightOptionSchema>;
export type DemoRewardFlightSearchOutput = z.infer<typeof demoRewardFlightSearchOutputSchema>;
export type DemoInsuranceComparisonInput = z.infer<typeof demoInsuranceComparisonInputSchema>;
export type DemoInsuranceCoverage = z.infer<typeof demoInsuranceCoverageSchema>;
export type DemoInsurancePlan = z.infer<typeof demoInsurancePlanSchema>;
export type DemoInsuranceComparisonOutput = z.infer<typeof demoInsuranceComparisonOutputSchema>;
export type DemoTripReview = z.infer<typeof demoTripReviewSchema>;
