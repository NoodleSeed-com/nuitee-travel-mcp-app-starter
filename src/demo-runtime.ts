export type DemoGatewayInput =
  | {
      readonly kind: 'search';
      readonly search: Readonly<Record<string, unknown>>;
      readonly catalog: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>;
      readonly aliases: Readonly<Record<string, string>>;
    }
  | {
      readonly kind: 'review';
      readonly flightState: unknown;
      readonly hotelState: unknown;
      readonly loyalty: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: 'reward_search';
      readonly rewardSearch: Readonly<Record<string, unknown>>;
      readonly rewardCatalog?: readonly Readonly<Record<string, unknown>>[];
    }
  | {
      readonly kind: 'insurance_compare';
      readonly insuranceComparison: Readonly<Record<string, unknown>>;
      readonly insuranceCatalog?: readonly Readonly<Record<string, unknown>>[];
    }
  | {
      readonly kind: 'select';
      readonly selectionId: string;
      readonly hotelState: unknown;
    };

export type DemoGatewayResult = Readonly<Record<string, unknown>>;

/**
 * Sandboxed Noodle compute entrypoint. Everything used at runtime stays inside
 * this function because Noodle serializes `run` without module imports or
 * closure state.
 */
export function runDemoGateway(input: DemoGatewayInput): DemoGatewayResult {
  const record = (value: unknown): Record<string, unknown> | undefined =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  const array = (value: unknown): readonly unknown[] => Array.isArray(value) ? value : [];
  const string = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;
  const number = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  const opaque = (
    prefix: 'hsearch' | 'hsel' | 'rsearch' | 'rwd' | 'inscmp' | 'inplan',
    value: string,
  ) => {
    let first = 2166136261;
    let second = 2246822519;
    let third = 3266489917;
    let fourth = 668265263;
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      first = Math.imul(first ^ code, 16777619) >>> 0;
      second = Math.imul(second ^ code, 3266489917) >>> 0;
      third = Math.imul(third ^ code, 668265263) >>> 0;
      fourth = Math.imul(fourth ^ code, 374761393) >>> 0;
    }
    const hex = [first, second, third, fourth]
      .map((part) => part.toString(16).padStart(8, '0'))
      .join('');
    return `${prefix}_${hex}`;
  };
  const dayNumber = (value: string) => {
    const parts = value.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const adjustedYear = year - (month <= 2 ? 1 : 0);
    const era = Math.floor(adjustedYear / 400);
    const yearOfEra = adjustedYear - era * 400;
    const shiftedMonth = month + (month > 2 ? -3 : 9);
    const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
    const dayOfEra = yearOfEra * 365
      + Math.floor(yearOfEra / 4)
      - Math.floor(yearOfEra / 100)
      + dayOfYear;
    return era * 146097 + dayOfEra;
  };

  if (input.kind === 'search') {
    const search = record(input.search) ?? {};
    const destination = string(search.destination) ?? '';
    const checkInDate = string(search.checkInDate) ?? '';
    const checkOutDate = string(search.checkOutDate) ?? '';
    const currency = string(search.currency) ?? 'CAD';
    const rooms = number(search.rooms) ?? 1;
    const canonical = input.aliases[destination.trim().toUpperCase()];
    const searchFingerprint = JSON.stringify({
      ...search,
      destination: canonical ?? destination.trim().toUpperCase(),
    });
    const searchId = opaque('hsearch', searchFingerprint);
    const fixtures = canonical ? input.catalog[canonical] ?? [] : [];
    const nights = dayNumber(checkOutDate) - dayNumber(checkInDate);
    const hotels = fixtures.slice(0, 10).map((fixtureValue) => {
      const fixture = record(fixtureValue) ?? {};
      const key = string(fixture.key) ?? 'demo_hotel_unknown';
      const nightly = record(fixture.nightly) ?? {};
      const nightlyAmount = number(nightly[currency]) ?? 0;
      const latitude = number(fixture.lat);
      const longitude = number(fixture.lng);
      return {
        selectionId: opaque('hsel', `${searchId}:${key}`),
        dataSource: 'illustrative',
        name: string(fixture.name) ?? 'Unavailable illustrative property',
        city: string(fixture.city) ?? destination,
        countryCode: string(fixture.countryCode) ?? 'ZZ',
        neighborhood: string(fixture.neighborhood) ?? 'Illustrative district',
        ...(latitude !== undefined && longitude !== undefined
          && latitude >= -90 && latitude <= 90
          && longitude >= -180 && longitude <= 180
          ? { lat: latitude, lng: longitude }
          : {}),
        description: string(fixture.description) ?? 'Illustrative property.',
        roomName: string(fixture.roomName) ?? 'Illustrative room',
        category: number(fixture.category) ?? 1,
        amenities: array(fixture.amenities).filter((item): item is string => typeof item === 'string').slice(0, 6),
        nights,
        rooms,
        nightlyPrice: { amount: nightlyAmount, currency },
        staySubtotal: { amount: nightlyAmount * nights * rooms, currency },
        taxesAndFeesIncluded: false,
        policySummary: string(fixture.illustrativePolicy) ?? 'Illustrative terms only; no reservation is available.',
      };
    });
    const destinationLabel = string(record(fixtures[0])?.city) ?? destination;
    const result = {
      status: hotels.length > 0 ? 'success' : 'empty',
      dataSource: 'illustrative',
      disclosure: 'Illustrative stays — these fictional properties do not represent live availability. Booking is unavailable.',
      message: hotels.length > 0
        ? `${hotels.length} synthetic stays are available to compare for ${destinationLabel}.`
        : `No synthetic stay fixtures are available for ${destinationLabel}.`,
      fallback: hotels.length > 0
        ? `${hotels.length} illustrative ${destinationLabel} stays for ${checkInDate} to ${checkOutDate}. Prices are illustrative; no live availability or reservation was checked.`
        : `No illustrative stay options are configured for ${destinationLabel}. No live hotel search was attempted.`,
      searchId,
      searchContext: search,
      hotels,
    };
    const records = hotels.map((hotel, index) => ({
      selectionId: hotel.selectionId,
      searchId,
      dataSource: 'illustrative',
      fixtureKey: string(record(fixtures[index])?.key) ?? 'demo_hotel_unknown',
      propertyName: hotel.name,
      city: hotel.city,
      checkInDate,
      checkOutDate,
      nights,
      rooms,
      staySubtotal: hotel.staySubtotal,
    }));
    return { kind: 'search', result, records };
  }

  if (input.kind === 'reward_search') {
    const search = record(input.rewardSearch) ?? {};
    const origin = string(search.origin) ?? 'Toronto';
    const destination = string(search.destination);
    const departureDate = string(search.departureDate);
    const adults = number(search.adults) ?? 1;
    const cabinClass = string(search.cabinClass) ?? 'ECONOMY';
    const pointsBudget = number(search.pointsBudget) ?? 42_500;
    const currency = string(search.currency) ?? 'CAD';
    const routedFixtures = destination ? [
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
    ] : array(input.rewardCatalog).map(record).filter((entry): entry is Record<string, unknown> => Boolean(entry));
    const searchId = opaque('rsearch', JSON.stringify(search));
    const premiumMultiplier = cabinClass === 'PREMIUM_ECONOMY' ? 1.4 : 1;
    const options = routedFixtures.map((fixture) => {
      const routeDestination = string(fixture.destination) ?? 'Illustrative destination';
      const partnerLabel = string(fixture.partnerLabel) ?? 'Concept partner';
      const basePoints = number(fixture.pointsPerAdult) ?? 1_000_000;
      const pointsPerAdult = Math.round(basePoints * premiumMultiplier / 500) * 500;
      const totalPoints = pointsPerAdult * adults;
      const taxes = record(fixture.estimatedTaxes) ?? {};
      return {
        optionId: opaque('rwd', `${searchId}:${partnerLabel}:${routeDestination}:${totalPoints}`),
        dataSource: 'illustrative',
        route: { origin, destination: routeDestination },
        ...(departureDate ? { departureDate } : {}),
        cabinClass,
        partnerLabel,
        stops: number(fixture.stops) ?? 0,
        durationMinutes: number(fixture.durationMinutes) ?? 60,
        pointsPerAdult,
        totalPoints,
        estimatedTaxes: {
          amount: (number(taxes[currency]) ?? 0) * adults,
          currency,
        },
        balanceAfter: pointsBudget - totalPoints,
        notes: [
          'Illustrative reward-seat comparison',
          'No live availability or redemption action',
        ],
      };
    }).filter((option) => option.totalPoints <= pointsBudget).slice(0, 6);
    const routeLabel = destination ? `${origin} to ${destination}` : `from ${origin}`;
    return {
      kind: 'reward_search',
      rewardResult: {
        status: options.length > 0 ? 'success' : 'empty',
        dataSource: 'illustrative',
        disclosure: 'Illustrative reward-flight comparisons only. No live reward inventory was checked, and points cannot be applied or redeemed.',
        message: options.length > 0
          ? `${options.length} illustrative reward-flight ${options.length === 1 ? 'idea fits' : 'ideas fit'} within ${pointsBudget} points.`
          : `No illustrative reward-flight option fits within ${pointsBudget} points.`,
        fallback: options.length > 0
          ? `${options.length} illustrative reward-flight ideas ${routeLabel} fit within ${pointsBudget} points. No live availability or redemption was checked.`
          : `No illustrative reward-flight option ${routeLabel} fits within ${pointsBudget} points. No live availability or redemption was checked.`,
        searchId,
        searchContext: search,
        pointsContext: { available: pointsBudget, source: 'illustrative_profile' },
        options,
      },
    };
  }

  if (input.kind === 'insurance_compare') {
    const search = record(input.insuranceComparison) ?? {};
    const destination = string(search.destination) ?? 'Illustrative destination';
    const departureDate = string(search.departureDate) ?? '';
    const returnDate = string(search.returnDate) ?? '';
    const adults = number(search.adults) ?? 1;
    const children = number(search.children) ?? 0;
    const residenceCountry = string(search.residenceCountry) ?? 'CA';
    const currency = string(search.currency) ?? 'CAD';
    const estimatedTripCost = number(search.estimatedTripCost);
    const comparisonId = opaque('inscmp', JSON.stringify(search));
    const tripDays = dayNumber(returnDate) - dayNumber(departureDate);
    const travelerUnits = adults + (children * 0.5);
    const currencyRates: Record<string, number> = {
      CAD: 1,
      USD: 0.74,
      EUR: 0.68,
      GBP: 0.58,
    };
    const currencyRate = currencyRates[currency] ?? 1;
    const moneyFromCad = (amount: number) => ({
      amount: Math.round(amount * currencyRate),
      currency,
    });
    const plans = array(input.insuranceCatalog)
      .map(record)
      .filter((entry): entry is Record<string, unknown> => Boolean(entry))
      .slice(0, 3)
      .map((fixture) => {
        const key = string(fixture.key) ?? 'demo_insurance_unknown';
        return {
          planId: opaque('inplan', `${comparisonId}:${key}`),
          dataSource: 'illustrative',
          name: string(fixture.name) ?? 'Illustrative protection concept',
          summary: string(fixture.summary) ?? 'Illustrative travel protection comparison only.',
          illustrativePrice: moneyFromCad(
            ((number(fixture.basePriceCad) ?? 0) + ((number(fixture.dailyPriceCad) ?? 0) * tripDays))
              * travelerUnits,
          ),
          deductible: moneyFromCad(number(fixture.deductibleCad) ?? 0),
          coverages: array(fixture.coverages).map((coverageValue) => {
            const coverage = record(coverageValue) ?? {};
            return {
              name: string(coverage.name) ?? 'Illustrative coverage category',
              limit: moneyFromCad(number(coverage.limitCad) ?? 0),
              basis: string(coverage.basis) ?? 'per_trip',
              summary: string(coverage.summary) ?? 'Illustrative maximum only; actual terms were not checked.',
            };
          }).slice(0, 6),
          highlights: array(fixture.highlights)
            .filter((item): item is string => typeof item === 'string')
            .slice(0, 5),
          exclusions: array(fixture.exclusions)
            .filter((item): item is string => typeof item === 'string')
            .slice(0, 5),
        };
      });
    const residenceLabel = residenceCountry === 'CA' ? 'Canada' : residenceCountry;
    return {
      kind: 'insurance_compare',
      insuranceResult: {
        status: 'success',
        dataSource: 'illustrative',
        disclosure: 'Illustrative travel protection only. This is not an insurance quote, policy, recommendation, or statement of coverage. No insurer, eligibility, availability, or policy wording was checked, and nothing can be purchased.',
        message: 'Three illustrative travel protection concepts are ready to compare.',
        fallback: `Three illustrative travel protection concepts for a ${tripDays}-day trip to ${destination} are ready to compare. No insurer, eligibility, availability, or policy wording was checked, and nothing can be purchased.`,
        comparisonId,
        searchContext: search,
        assumptions: [
          `Residence is treated as ${residenceLabel} for this illustrative comparison.`,
          `The comparison uses ${adults} adult${adults === 1 ? '' : 's'} and ${children} child traveler${children === 1 ? '' : 's'}.`,
          estimatedTripCost === undefined
            ? 'Trip cost was not supplied; cancellation figures are fixed illustrative limits.'
            : `Trip cost is treated as ${estimatedTripCost} ${currency} for context only.`,
          'No traveler health, eligibility, or policy information was collected.',
        ],
        plans,
      },
    };
  }

  if (input.kind === 'select') {
    const state = record(input.hotelState) ?? {};
    const records = array(state.records).map(record).filter((entry): entry is Record<string, unknown> => Boolean(entry));
    const selected = records.find((entry) => entry.selectionId === input.selectionId);
    if (!selected) {
      return {
        kind: 'select',
        selection: {
          status: 'unavailable',
          message: 'That stay is no longer in the current comparison. Search the stays again.',
        },
        ...(input.hotelState ? { nextHotelState: state } : {}),
      };
    }
    return {
      kind: 'select',
      selection: {
        status: 'selected',
        message: selected.dataSource === 'live_nuitee'
          ? 'The current hotel option is ready for the trip review. No room was held or reserved.'
          : 'The illustrative stay is ready for the trip review.',
        selectionId: input.selectionId,
      },
      nextHotelState: { ...state, activeSelectionId: input.selectionId },
    };
  }

  const flightState = record(input.flightState) ?? {};
  const hotelState = record(input.hotelState) ?? {};
  const activeFlightId = string(flightState.activeSelectionId);
  const activeHotelId = string(hotelState.activeSelectionId);
  const flight = array(flightState.records)
    .map(record)
    .find((entry) => entry?.selectionId === activeFlightId);
  const stay = array(hotelState.records)
    .map(record)
    .find((entry) => entry?.selectionId === activeHotelId);
  const missing = [
    ...(flight ? [] : ['flight']),
    ...(stay ? [] : ['stay']),
  ];
  const flightReview = flight ? {
    dataSource: 'live_nuitee_selection',
    selectionId: flight.selectionId,
    searchPrice: {
      total: flight.originalTotal,
      currency: flight.currency,
    },
    ...(typeof flight.expiresAt === 'string' ? { expiresAt: flight.expiresAt } : {}),
    disclosure: 'Live Nuitee search price selected in this session; it still requires fare verification.',
  } : undefined;
  const stayDataSource = stay?.dataSource === 'live_nuitee' ? 'live_nuitee' : 'illustrative';
  const stayReview = stay ? {
    dataSource: stayDataSource,
    selectionId: stay.selectionId,
    propertyName: stay.propertyName,
    city: stay.city,
    checkInDate: stay.checkInDate,
    checkOutDate: stay.checkOutDate,
    nights: stay.nights,
    rooms: stay.rooms,
    staySubtotal: stay.staySubtotal,
  } : undefined;
  return {
    kind: 'review',
    review: {
      status: missing.length === 0 ? 'ready' : 'incomplete',
      dataSource: 'illustrative',
      disclosure: stayDataSource === 'live_nuitee'
        ? 'Flight and stay selections came from current provider searches. Rewards remain illustrative; prices stay separate and nothing was booked or paid.'
        : 'The flight remains a current provider selection. Stay and rewards values are illustrative; this is not a bookable package and no payment or points action is available.',
      fallback: missing.length === 0
        ? stayDataSource === 'live_nuitee'
          ? 'Trip review ready: flight and stay are current Nuitee search selections, while rewards are illustrative. Prices remain separate and nothing was booked or paid.'
          : 'Trip review ready: the flight remains a live Nuitee search selection, while the stay and rewards information is synthetic. Prices remain separate and nothing was booked or paid.'
        : `Trip review needs a current ${missing.join(' and ')} selection. No booking, payment, or points action occurred.`,
      ...(flightReview ? { flight: flightReview } : {}),
      ...(stayReview ? { stay: stayReview } : {}),
      loyalty: input.loyalty,
      missing,
    },
  };
}
