import { createHash } from 'node:crypto';
import {
  demoHotelSearchInputSchema,
  demoHotelSearchOutputSchema,
  demoInsuranceComparisonInputSchema,
  demoInsuranceComparisonOutputSchema,
  demoLoyaltyOverviewSchema,
  demoRewardFlightSearchInputSchema,
  demoRewardFlightSearchOutputSchema,
  demoTripReviewSchema,
  type DemoHotelSearchInput,
  type DemoHotelSearchOutput,
  type DemoHotelSelectionRecord,
  type DemoInsuranceComparisonInput,
  type DemoInsuranceComparisonOutput,
  type DemoLoyaltyOverview,
  type DemoRewardFlightSearchInput,
  type DemoRewardFlightSearchOutput,
  type DemoTripReview,
} from './demo-schemas.js';

const HOTEL_DISCLOSURE =
  'Illustrative stays — these fictional properties do not represent live availability. Booking is unavailable.';
const LOYALTY_DISCLOSURE =
  'Illustrative rewards — this fixed profile is synthetic. No real account was accessed, and points cannot be earned, transferred, or applied.';
const REWARD_FLIGHT_DISCLOSURE =
  'Illustrative reward-flight comparisons only. No live reward inventory was checked, and points cannot be applied or redeemed.';
const TRIP_DISCLOSURE =
  'The flight remains a current provider selection. Stay and rewards values are illustrative; this is not a bookable package and no payment or points action is available.';
const INSURANCE_DISCLOSURE =
  'Illustrative travel protection only. This is not an insurance quote, policy, recommendation, or statement of coverage. No insurer, eligibility, availability, or policy wording was checked, and nothing can be purchased.';

type DemoCurrency = DemoHotelSearchInput['currency'];
type DemoInsuranceCurrency = DemoInsuranceComparisonInput['currency'];

interface HotelFixture {
  readonly key: `demo_hotel_${string}`;
  readonly name: string;
  readonly city: string;
  readonly countryCode: string;
  readonly neighborhood: string;
  readonly description: string;
  readonly roomName: string;
  readonly category: number;
  readonly amenities: readonly string[];
  readonly nightly: Readonly<Record<DemoCurrency, number>>;
  readonly illustrativePolicy: string;
}

interface RewardFlightFixture {
  readonly destination: string;
  readonly partnerLabel: string;
  readonly pointsPerAdult: number;
  readonly estimatedTaxes: Readonly<Record<DemoCurrency, number>>;
  readonly stops: number;
  readonly durationMinutes: number;
}

interface InsurancePlanFixture {
  readonly key: `demo_insurance_${string}`;
  readonly name: string;
  readonly summary: string;
  readonly basePriceCad: number;
  readonly dailyPriceCad: number;
  readonly deductibleCad: number;
  readonly coverages: readonly {
    readonly name: string;
    readonly limitCad: number;
    readonly basis: 'per_traveler' | 'per_trip';
    readonly summary: string;
  }[];
  readonly highlights: readonly string[];
  readonly exclusions: readonly string[];
}

export const DEMO_HOTEL_CATALOG: Readonly<Record<string, readonly HotelFixture[]>> = {
  LISBON: [
    {
      key: 'demo_hotel_tagus_lantern',
      name: 'Tagus Lantern Hotel',
      city: 'Lisbon',
      countryCode: 'PT',
      neighborhood: 'Baixa concept district',
      description: 'An illustrative central stay created for a bounded Wayfare comparison.',
      roomName: 'Lantern king room',
      category: 4,
      amenities: ['Breakfast preview', 'Rooftop concept', 'Wi-Fi', 'Workspace'],
      nightly: { CAD: 286, USD: 208, EUR: 192 },
      illustrativePolicy: 'Illustrative flexible terms; no reservation can be created.',
    },
    {
      key: 'demo_hotel_alfama_cloud_house',
      name: 'Alfama Cloud House',
      city: 'Lisbon',
      countryCode: 'PT',
      neighborhood: 'Alfama concept district',
      description: 'A fictional neighborhood property with illustrative rooms and amenities.',
      roomName: 'Cloud terrace room',
      category: 3,
      amenities: ['Wi-Fi', 'Courtyard concept', 'Breakfast preview'],
      nightly: { CAD: 238, USD: 173, EUR: 160 },
      illustrativePolicy: 'Illustrative terms only; no room is held or reserved.',
    },
    {
      key: 'demo_hotel_juniper_quay_lisbon',
      name: 'Juniper Quay Lisbon',
      city: 'Lisbon',
      countryCode: 'PT',
      neighborhood: 'Riverside concept district',
      description: 'An illustrative riverside stay included for bounded comparison.',
      roomName: 'Juniper river room',
      category: 5,
      amenities: ['Spa concept', 'Wi-Fi', 'Breakfast preview', 'Fitness room'],
      nightly: { CAD: 344, USD: 250, EUR: 231 },
      illustrativePolicy: 'Illustrative flexible terms; no transaction is available.',
    },
  ],
  TORONTO: [
    {
      key: 'demo_hotel_cedar_junction',
      name: 'Cedar Junction Toronto',
      city: 'Toronto',
      countryCode: 'CA',
      neighborhood: 'Harbour concept district',
      description: 'An illustrative downtown stay created for consistent comparison.',
      roomName: 'Cedar city room',
      category: 4,
      amenities: ['Wi-Fi', 'Breakfast preview', 'Gym'],
      nightly: { CAD: 262, USD: 191, EUR: 176 },
      illustrativePolicy: 'Illustrative flexible terms; no reservation can be created.',
    },
    {
      key: 'demo_hotel_harbourglass',
      name: 'Harbourglass Toronto',
      city: 'Toronto',
      countryCode: 'CA',
      neighborhood: 'King West concept district',
      description: 'A fictional urban property with synthetic rates and availability.',
      roomName: 'Harbourglass studio',
      category: 4,
      amenities: ['Wi-Fi', 'Lounge concept', 'Workspace'],
      nightly: { CAD: 301, USD: 219, EUR: 202 },
      illustrativePolicy: 'Illustrative terms only; no room is held or reserved.',
    },
  ],
  VANCOUVER: [
    {
      key: 'demo_hotel_pacific_fern',
      name: 'Pacific Fern Vancouver',
      city: 'Vancouver',
      countryCode: 'CA',
      neighborhood: 'Coal Harbour concept district',
      description: 'An illustrative west-coast stay used for this travel-planning preview.',
      roomName: 'Fern harbour room',
      category: 4,
      amenities: ['Wi-Fi', 'Breakfast preview', 'Bicycle storage concept'],
      nightly: { CAD: 289, USD: 210, EUR: 194 },
      illustrativePolicy: 'Illustrative flexible terms; no reservation can be created.',
    },
    {
      key: 'demo_hotel_rainlight',
      name: 'Rainlight Vancouver',
      city: 'Vancouver',
      countryCode: 'CA',
      neighborhood: 'Gastown concept district',
      description: 'A fictional boutique stay with illustrative amenities and pricing.',
      roomName: 'Rainlight queen room',
      category: 3,
      amenities: ['Wi-Fi', 'Café concept', 'Workspace'],
      nightly: { CAD: 241, USD: 175, EUR: 162 },
      illustrativePolicy: 'Illustrative terms only; no room is held or reserved.',
    },
  ],
};

export const DEMO_DESTINATION_ALIASES: Readonly<Record<string, keyof typeof DEMO_HOTEL_CATALOG>> = {
  LIS: 'LISBON',
  LISBON: 'LISBON',
  TORONTO: 'TORONTO',
  YTO: 'TORONTO',
  YYZ: 'TORONTO',
  VANCOUVER: 'VANCOUVER',
  YVR: 'VANCOUVER',
};

export const DEMO_REWARD_FLIGHT_CATALOG: readonly RewardFlightFixture[] = [
  {
    destination: 'Montreal',
    partnerLabel: 'Concept partner A',
    pointsPerAdult: 12_000,
    estimatedTaxes: { CAD: 48, USD: 35, EUR: 32 },
    stops: 0,
    durationMinutes: 85,
  },
  {
    destination: 'New York',
    partnerLabel: 'Concept partner B',
    pointsPerAdult: 18_000,
    estimatedTaxes: { CAD: 72, USD: 52, EUR: 48 },
    stops: 0,
    durationMinutes: 95,
  },
  {
    destination: 'Vancouver',
    partnerLabel: 'Concept partner C',
    pointsPerAdult: 31_000,
    estimatedTaxes: { CAD: 94, USD: 68, EUR: 63 },
    stops: 0,
    durationMinutes: 305,
  },
  {
    destination: 'Lisbon',
    partnerLabel: 'Concept partner D',
    pointsPerAdult: 42_000,
    estimatedTaxes: { CAD: 146, USD: 106, EUR: 98 },
    stops: 1,
    durationMinutes: 525,
  },
] as const;

export const DEMO_INSURANCE_PLAN_CATALOG: readonly InsurancePlanFixture[] = [
  {
    key: 'demo_insurance_essential',
    name: 'Essential concept',
    summary: 'A compact concept for core emergency and interruption examples.',
    basePriceCad: 24,
    dailyPriceCad: 1.25,
    deductibleCad: 250,
    coverages: [
      { name: 'Emergency medical', limitCad: 1_000_000, basis: 'per_traveler', summary: 'Illustrative maximum only; eligibility and actual terms were not checked.' },
      { name: 'Trip cancellation', limitCad: 1_500, basis: 'per_trip', summary: 'Illustrative maximum only; covered reasons would depend on actual policy wording.' },
      { name: 'Baggage', limitCad: 750, basis: 'per_traveler', summary: 'Illustrative maximum only; item and sub-limits are not represented.' },
      { name: 'Travel delay', limitCad: 250, basis: 'per_trip', summary: 'Illustrative maximum only; waiting periods and eligible costs are not represented.' },
    ],
    highlights: ['Core concept comparison', 'Higher illustrative deductible'],
    exclusions: [
      'Pre-existing-condition rules would require review of actual policy wording.',
      'Adventure activities and destination advisories may require separate review.',
    ],
  },
  {
    key: 'demo_insurance_balanced',
    name: 'Balanced concept',
    summary: 'A broader concept with higher illustrative limits across the trip.',
    basePriceCad: 39,
    dailyPriceCad: 2,
    deductibleCad: 100,
    coverages: [
      { name: 'Emergency medical', limitCad: 2_000_000, basis: 'per_traveler', summary: 'Illustrative maximum only; eligibility and actual terms were not checked.' },
      { name: 'Trip cancellation', limitCad: 3_000, basis: 'per_trip', summary: 'Illustrative maximum only; covered reasons would depend on actual policy wording.' },
      { name: 'Baggage', limitCad: 1_500, basis: 'per_traveler', summary: 'Illustrative maximum only; item and sub-limits are not represented.' },
      { name: 'Travel delay', limitCad: 500, basis: 'per_trip', summary: 'Illustrative maximum only; waiting periods and eligible costs are not represented.' },
    ],
    highlights: ['Broader concept comparison', 'Mid-range illustrative deductible'],
    exclusions: [
      'Pre-existing-condition rules would require review of actual policy wording.',
      'Adventure activities and destination advisories may require separate review.',
    ],
  },
  {
    key: 'demo_insurance_extended',
    name: 'Extended concept',
    summary: 'The widest illustrative limits in this fictional comparison.',
    basePriceCad: 57,
    dailyPriceCad: 2.8,
    deductibleCad: 0,
    coverages: [
      { name: 'Emergency medical', limitCad: 5_000_000, basis: 'per_traveler', summary: 'Illustrative maximum only; eligibility and actual terms were not checked.' },
      { name: 'Trip cancellation', limitCad: 5_000, basis: 'per_trip', summary: 'Illustrative maximum only; covered reasons would depend on actual policy wording.' },
      { name: 'Baggage', limitCad: 2_500, basis: 'per_traveler', summary: 'Illustrative maximum only; item and sub-limits are not represented.' },
      { name: 'Travel delay', limitCad: 1_000, basis: 'per_trip', summary: 'Illustrative maximum only; waiting periods and eligible costs are not represented.' },
    ],
    highlights: ['Expanded concept comparison', 'Zero illustrative deductible'],
    exclusions: [
      'Pre-existing-condition rules would require review of actual policy wording.',
      'Adventure activities and destination advisories may require separate review.',
    ],
  },
] as const;

const LOYALTY_FIXTURE = {
  status: 'success',
  dataSource: 'illustrative',
  disclosure: LOYALTY_DISCLOSURE,
  fallback:
    'Illustrative rewards profile for Preview traveler: Explorer concept tier with 42,500 synthetic points. No real account was accessed and no points action is available.',
  member: {
    displayName: 'Preview traveler',
    reference: 'WAYFARE-PREVIEW-0001',
    tier: 'Explorer concept tier',
    pointsBalance: 42_500,
  },
  progress: {
    label: 'Illustrative progress toward the next concept tier',
    current: 42_500,
    target: 60_000,
  },
  benefits: [
    {
      name: 'Flexible planning preview',
      description: 'Concept-only access to trip-planning comparisons; this is not a commercial benefit.',
    },
    {
      name: 'Travel support preview',
      description: 'Illustrative priority-help concept with no service entitlement.',
    },
    {
      name: 'Stay discovery preview',
      description: 'Illustrative hotel highlights, not member-only inventory.',
    },
  ],
  illustrativePointsValue: {
    points: 25_000,
    value: { amount: 250, currency: 'CAD' },
    explanation: 'Illustrative comparison only; points cannot be applied and this value is not an offer.',
  },
} as const;

function opaqueId(
  prefix: 'hsearch' | 'hsel' | 'rsearch' | 'rwd' | 'inscmp' | 'inplan',
  value: string,
) {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 32)}`;
}

const insuranceCurrencyRate: Readonly<Record<DemoInsuranceCurrency, number>> = {
  CAD: 1,
  USD: 0.74,
  EUR: 0.68,
  GBP: 0.58,
};

function insuranceMoneyFromCad(amount: number, currency: DemoInsuranceCurrency) {
  return {
    amount: Math.round(amount * insuranceCurrencyRate[currency]),
    currency,
  };
}

export function compareSyntheticTravelInsurance(
  input: DemoInsuranceComparisonInput,
): DemoInsuranceComparisonOutput {
  const searchContext = demoInsuranceComparisonInputSchema.parse(input);
  const tripDays = nightsBetween(searchContext.departureDate, searchContext.returnDate);
  const travelerUnits = searchContext.adults + (searchContext.children * 0.5);
  const comparisonId = opaqueId('inscmp', JSON.stringify(searchContext));
  const plans = DEMO_INSURANCE_PLAN_CATALOG.map((fixture) => ({
    planId: opaqueId('inplan', `${comparisonId}:${fixture.key}`),
    dataSource: 'illustrative' as const,
    name: fixture.name,
    summary: fixture.summary,
    illustrativePrice: insuranceMoneyFromCad(
      (fixture.basePriceCad + (fixture.dailyPriceCad * tripDays)) * travelerUnits,
      searchContext.currency,
    ),
    deductible: insuranceMoneyFromCad(fixture.deductibleCad, searchContext.currency),
    coverages: fixture.coverages.map((coverage) => ({
      name: coverage.name,
      limit: insuranceMoneyFromCad(coverage.limitCad, searchContext.currency),
      basis: coverage.basis,
      summary: coverage.summary,
    })),
    highlights: [...fixture.highlights],
    exclusions: [...fixture.exclusions],
  }));
  const residenceLabel = searchContext.residenceCountry === 'CA'
    ? 'Canada'
    : searchContext.residenceCountry;

  return demoInsuranceComparisonOutputSchema.parse({
    status: 'success',
    dataSource: 'illustrative',
    disclosure: INSURANCE_DISCLOSURE,
    message: 'Three illustrative travel protection concepts are ready to compare.',
    fallback:
      `Three illustrative travel protection concepts for a ${tripDays}-day trip to ${searchContext.destination} are ready to compare. No insurer, eligibility, availability, or policy wording was checked, and nothing can be purchased.`,
    comparisonId,
    searchContext,
    assumptions: [
      `Residence is treated as ${residenceLabel} for this illustrative comparison.`,
      `The comparison uses ${searchContext.adults} adult${searchContext.adults === 1 ? '' : 's'} and ${searchContext.children} child traveler${searchContext.children === 1 ? '' : 's'}.`,
      searchContext.estimatedTripCost === undefined
        ? 'Trip cost was not supplied; cancellation figures are fixed illustrative limits.'
        : `Trip cost is treated as ${searchContext.estimatedTripCost} ${searchContext.currency} for context only.`,
      'No traveler health, eligibility, or policy information was collected.',
    ],
    plans,
  });
}

function routedRewardFixtures(destination: string): readonly RewardFlightFixture[] {
  return [
    {
      destination,
      partnerLabel: 'Concept partner A',
      pointsPerAdult: 18_000,
      estimatedTaxes: { CAD: 68, USD: 49, EUR: 45 },
      stops: 0,
      durationMinutes: 420,
    },
    {
      destination,
      partnerLabel: 'Concept partner B',
      pointsPerAdult: 21_000,
      estimatedTaxes: { CAD: 82, USD: 60, EUR: 55 },
      stops: 1,
      durationMinutes: 475,
    },
    {
      destination,
      partnerLabel: 'Concept partner C',
      pointsPerAdult: 24_000,
      estimatedTaxes: { CAD: 96, USD: 70, EUR: 64 },
      stops: 1,
      durationMinutes: 510,
    },
  ];
}

export function searchSyntheticRewardFlights(
  input: DemoRewardFlightSearchInput,
): DemoRewardFlightSearchOutput {
  const searchContext = demoRewardFlightSearchInputSchema.parse(input);
  const searchId = opaqueId('rsearch', JSON.stringify(searchContext));
  const premiumMultiplier = searchContext.cabinClass === 'PREMIUM_ECONOMY' ? 1.4 : 1;
  const fixtures = searchContext.destination
    ? routedRewardFixtures(searchContext.destination)
    : DEMO_REWARD_FLIGHT_CATALOG;
  const options = fixtures
    .map((fixture) => {
      const pointsPerAdult = Math.round(fixture.pointsPerAdult * premiumMultiplier / 500) * 500;
      const totalPoints = pointsPerAdult * searchContext.adults;
      return {
        optionId: opaqueId('rwd', `${searchId}:${fixture.partnerLabel}:${fixture.destination}:${totalPoints}`),
        dataSource: 'illustrative' as const,
        route: {
          origin: searchContext.origin,
          destination: fixture.destination,
        },
        ...(searchContext.departureDate ? { departureDate: searchContext.departureDate } : {}),
        cabinClass: searchContext.cabinClass,
        partnerLabel: fixture.partnerLabel,
        stops: fixture.stops,
        durationMinutes: fixture.durationMinutes,
        pointsPerAdult,
        totalPoints,
        estimatedTaxes: {
          amount: fixture.estimatedTaxes[searchContext.currency] * searchContext.adults,
          currency: searchContext.currency,
        },
        balanceAfter: searchContext.pointsBudget - totalPoints,
        notes: [
          'Illustrative reward-seat comparison',
          'No live availability or redemption action',
        ],
      };
    })
    .filter((option) => option.totalPoints <= searchContext.pointsBudget)
    .slice(0, 6);

  const routeLabel = searchContext.destination
    ? `${searchContext.origin} to ${searchContext.destination}`
    : `from ${searchContext.origin}`;
  return demoRewardFlightSearchOutputSchema.parse({
    status: options.length > 0 ? 'success' : 'empty',
    dataSource: 'illustrative',
    disclosure: REWARD_FLIGHT_DISCLOSURE,
    message: options.length > 0
      ? `${options.length} illustrative reward-flight ${options.length === 1 ? 'idea fits' : 'ideas fit'} within ${searchContext.pointsBudget.toLocaleString('en-CA')} points.`
      : `No illustrative reward-flight option fits within ${searchContext.pointsBudget.toLocaleString('en-CA')} points.`,
    fallback: options.length > 0
      ? `${options.length} illustrative reward-flight ideas ${routeLabel} fit within ${searchContext.pointsBudget.toLocaleString('en-CA')} points. No live availability or redemption was checked.`
      : `No illustrative reward-flight option ${routeLabel} fits within ${searchContext.pointsBudget.toLocaleString('en-CA')} points. No live availability or redemption was checked.`,
    searchId,
    searchContext,
    pointsContext: {
      available: searchContext.pointsBudget,
      source: 'illustrative_profile',
    },
    options,
  });
}

function nightsBetween(checkInDate: string, checkOutDate: string) {
  const start = Date.parse(`${checkInDate}T00:00:00Z`);
  const end = Date.parse(`${checkOutDate}T00:00:00Z`);
  return (end - start) / 86_400_000;
}

function fixtureDestination(destination: string) {
  return DEMO_DESTINATION_ALIASES[destination.trim().toUpperCase()];
}

export function searchSyntheticHotels(input: DemoHotelSearchInput): DemoHotelSearchOutput {
  const searchContext = demoHotelSearchInputSchema.parse(input);
  const canonicalDestination = fixtureDestination(searchContext.destination);
  const searchFingerprint = JSON.stringify({
    ...searchContext,
    destination: canonicalDestination ?? searchContext.destination.trim().toUpperCase(),
  });
  const searchId = opaqueId('hsearch', searchFingerprint);
  const fixtures = canonicalDestination ? DEMO_HOTEL_CATALOG[canonicalDestination] : undefined;
  const nights = nightsBetween(searchContext.checkInDate, searchContext.checkOutDate);
  const hotels = (fixtures ?? []).map((fixture) => {
    const nightlyAmount = fixture.nightly[searchContext.currency];
    return {
      selectionId: opaqueId('hsel', `${searchId}:${fixture.key}`),
      dataSource: 'illustrative' as const,
      name: fixture.name,
      city: fixture.city,
      countryCode: fixture.countryCode,
      neighborhood: fixture.neighborhood,
      description: fixture.description,
      roomName: fixture.roomName,
      category: fixture.category,
      amenities: [...fixture.amenities],
      nights,
      rooms: searchContext.rooms,
      nightlyPrice: { amount: nightlyAmount, currency: searchContext.currency },
      staySubtotal: {
        amount: nightlyAmount * nights * searchContext.rooms,
        currency: searchContext.currency,
      },
      taxesAndFeesIncluded: false as const,
      policySummary: fixture.illustrativePolicy,
    };
  });

  const destinationLabel = fixtures?.[0]?.city ?? searchContext.destination;
  return demoHotelSearchOutputSchema.parse({
    status: hotels.length > 0 ? 'success' : 'empty',
    dataSource: 'illustrative',
    disclosure: HOTEL_DISCLOSURE,
    message: hotels.length > 0
      ? `${hotels.length} synthetic stays are available to compare for ${destinationLabel}.`
      : `No synthetic stay fixtures are available for ${destinationLabel}.`,
    fallback: hotels.length > 0
      ? `${hotels.length} illustrative ${destinationLabel} stays for ${searchContext.checkInDate} to ${searchContext.checkOutDate}. Prices are illustrative; no live availability or reservation was checked.`
      : `No illustrative stay options are configured for ${destinationLabel}. No live hotel search was attempted.`,
    searchId,
    searchContext,
    hotels,
  });
}

export function hotelSelectionRecords(
  search: DemoHotelSearchOutput,
): readonly DemoHotelSelectionRecord[] {
  const validated = demoHotelSearchOutputSchema.parse(search);
  const fixtureBySelectionId = new Map(
    (fixtureDestination(validated.searchContext.destination)
      ? DEMO_HOTEL_CATALOG[fixtureDestination(validated.searchContext.destination)!]
      : [])
      .map((fixture) => [opaqueId('hsel', `${validated.searchId}:${fixture.key}`), fixture] as const),
  );

  return validated.hotels.map((hotel) => ({
    selectionId: hotel.selectionId,
    searchId: validated.searchId,
    dataSource: 'illustrative',
    fixtureKey: fixtureBySelectionId.get(hotel.selectionId)!.key,
    propertyName: hotel.name,
    city: hotel.city,
    checkInDate: validated.searchContext.checkInDate,
    checkOutDate: validated.searchContext.checkOutDate,
    nights: hotel.nights,
    rooms: hotel.rooms,
    staySubtotal: hotel.staySubtotal,
  }));
}

export function getSyntheticLoyaltyOverview(): DemoLoyaltyOverview {
  return demoLoyaltyOverviewSchema.parse(LOYALTY_FIXTURE);
}

export function buildSyntheticTripReview(input: {
  readonly flight?: {
    readonly selectionId: string;
    readonly originalTotal: number;
    readonly currency: string;
    readonly expiresAt?: string;
  };
  readonly stay?: DemoHotelSelectionRecord;
}): DemoTripReview {
  const missing = [
    ...(input.flight ? [] : ['flight' as const]),
    ...(input.stay ? [] : ['stay' as const]),
  ];
  const flight = input.flight
    ? {
        dataSource: 'live_nuitee_selection' as const,
        selectionId: input.flight.selectionId,
        searchPrice: {
          total: input.flight.originalTotal,
          currency: input.flight.currency,
        },
        ...(input.flight.expiresAt ? { expiresAt: input.flight.expiresAt } : {}),
        disclosure: 'Live Nuitee search price selected in this session; it still requires fare verification.',
      }
    : undefined;
  const stay = input.stay
    ? {
        dataSource: 'illustrative' as const,
        selectionId: input.stay.selectionId,
        propertyName: input.stay.propertyName,
        city: input.stay.city,
        checkInDate: input.stay.checkInDate,
        checkOutDate: input.stay.checkOutDate,
        nights: input.stay.nights,
        rooms: input.stay.rooms,
        staySubtotal: input.stay.staySubtotal,
      }
    : undefined;

  return demoTripReviewSchema.parse({
    status: missing.length === 0 ? 'ready' : 'incomplete',
    dataSource: 'illustrative',
    disclosure: TRIP_DISCLOSURE,
    fallback: missing.length === 0
      ? 'Trip review ready: the flight remains a live Nuitee search selection, while the stay and rewards information is synthetic. Prices remain separate and nothing was booked or paid.'
      : `Trip review needs a current ${missing.join(' and ')} selection. No booking, payment, or points action occurred.`,
    ...(flight ? { flight } : {}),
    ...(stay ? { stay } : {}),
    loyalty: getSyntheticLoyaltyOverview(),
    missing,
  });
}
