export type HotelGatewayInput = Readonly<{
  search: Readonly<Record<string, unknown>>;
  requestedAt?: string;
}>;

export type HotelGatewayResult = Readonly<Record<string, unknown>>;

/**
 * Sandboxed normalizer for the Nuitee Hotels rates response. The provider's
 * opaque offer identifiers remain in caller-scoped state and never enter the
 * public hotel cards.
 */
export function runHotelGateway(
  input: HotelGatewayInput,
  context: {
    callOperation: (name: 'search' | 'places' | 'place_details', args: Readonly<Record<string, unknown>>) => unknown;
  },
): HotelGatewayResult {
  const object = (value: unknown): Record<string, unknown> | undefined =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  const array = (value: unknown): readonly unknown[] => Array.isArray(value) ? value : [];
  const string = (value: unknown, maximum = 240): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.length > 0 ? normalized.slice(0, maximum) : undefined;
  };
  const number = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  const statusFrom = (value: unknown, depth = 0): number | undefined => {
    if (depth > 4) return undefined;
    const candidate = object(value);
    if (!candidate) return undefined;
    for (const key of ['status', 'statusCode', 'httpStatus', 'code']) {
      const direct = number(candidate[key]);
      if (direct !== undefined && direct >= 100 && direct <= 599) return direct;
      if (typeof candidate[key] === 'string' && /^\d{3}$/.test(candidate[key])) return Number(candidate[key]);
    }
    for (const key of ['cause', 'error', 'details', 'response']) {
      const nested = statusFrom(candidate[key], depth + 1);
      if (nested !== undefined) return nested;
    }
    return undefined;
  };
  const errorSignal = (value: unknown, depth = 0): string => {
    if (depth > 4) return '';
    const candidate = object(value);
    if (!candidate) return typeof value === 'string' ? value.slice(0, 240) : '';
    return ['code', 'message', 'name', 'cause', 'error', 'details', 'response']
      .map((key) => errorSignal(candidate[key], depth + 1))
      .filter(Boolean)
      .join(' ')
      .slice(0, 1_000);
  };
  const classify = (caught: unknown) => {
    const status = statusFrom(caught);
    const signal = errorSignal(caught).toLowerCase();
    if (status === 400 || status === 422) return 'invalid_request';
    if (status === 401) return 'authentication';
    if (status === 403) return 'entitlement';
    if (status === 429) return 'rate_limited';
    if (status === 503) return 'service_unavailable';
    if (status !== undefined && status >= 500) return 'provider_error';
    if (signal.includes('credential') || signal.includes('secret') || signal.includes('api key')) return 'configuration_required';
    if (signal.includes('timeout') || signal.includes('timed out') || signal.includes('abort')) return 'timeout';
    return 'provider_error';
  };
  const publicError = (code: string) => {
    const errors: Record<string, { message: string; retryable: boolean }> = {
      configuration_required: {
        message: 'Live hotel access is not configured on this server.',
        retryable: false,
      },
      authentication: {
        message: 'The hotel provider credential was not accepted. The deployment owner must update hotel access.',
        retryable: false,
      },
      entitlement: {
        message: 'This provider account is not enabled for hotel rates.',
        retryable: false,
      },
      invalid_request: {
        message: 'The hotel request was incomplete or invalid. Check the destination, dates, travelers, rooms, and currency.',
        retryable: false,
      },
      rate_limited: {
        message: 'The hotel provider is temporarily busy. Try again shortly.',
        retryable: true,
      },
      timeout: {
        message: 'The hotel provider took too long to respond. Try again.',
        retryable: true,
      },
      service_unavailable: {
        message: 'The hotel provider is temporarily unavailable. Try again later.',
        retryable: true,
      },
      provider_error: {
        message: 'The hotel provider could not complete the request. Try again or adjust the search.',
        retryable: true,
      },
      malformed_response: {
        message: 'The hotel provider returned an incomplete result that could not be shown safely.',
        retryable: true,
      },
      location_unresolved: {
        message: 'I could not verify one landmark location in this destination. Please give its full name or street address; no city-wide search was substituted.',
        retryable: false,
      },
    };
    return { code, ...(errors[code] ?? errors.provider_error!) };
  };
  const hash = (value: string, seed: number): string => {
    let current = seed >>> 0;
    for (let index = 0; index < value.length; index += 1) {
      current ^= value.charCodeAt(index);
      current = Math.imul(current, 16777619) >>> 0;
    }
    return current.toString(16).padStart(8, '0');
  };
  const opaque = (prefix: 'hsearch' | 'hsel', value: string) =>
    `${prefix}_${[2166136261, 2246822519, 3266489917, 668265263].map((seed) => hash(value, seed)).join('')}`;
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
  const boundedHttpsImage = (value: unknown): string | undefined => {
    const candidate = string(value, 2_048);
    if (!candidate) return undefined;
    return /^https:\/\/(?:snaphotelapi\.com|static\.cupid\.travel)\//i.test(candidate) ? candidate : undefined;
  };

  const search = { ...(object(input.search) ?? {}) };
  if (search.near === null) delete search.near;
  const requestedNear = object(search.near);
  if (requestedNear?.maxWalkingMinutes === null) {
    const normalizedNear = { ...requestedNear };
    delete normalizedNear.maxWalkingMinutes;
    search.near = normalizedNear;
  }
  const destination = string(search.destination, 80) ?? '';
  const destinationCode = string(search.countryCode, 2)?.toUpperCase();
  const checkInDate = string(search.checkInDate, 10) ?? '';
  const checkOutDate = string(search.checkOutDate, 10) ?? '';
  const adults = Math.max(1, Math.floor(number(search.adults) ?? 1));
  const children = Math.max(0, Math.floor(number(search.children) ?? 0));
  const rooms = Math.max(1, Math.floor(number(search.rooms) ?? 1));
  const currency = (string(search.currency, 3) ?? 'CAD').toUpperCase();
  const cityCountries: Record<string, string> = {
    LISBON: 'PT', TORONTO: 'CA', VANCOUVER: 'CA', ROME: 'IT', LONDON: 'GB',
    ISTANBUL: 'TR', PARIS: 'FR', MADRID: 'ES', BARCELONA: 'ES', NEW_YORK: 'US',
  };
  const normalizedName = destination.toUpperCase().replace(/\s+/g, '_');
  const countryCode = destinationCode ?? cityCountries[normalizedName];
  const iataCode = /^[A-Za-z]{3}$/.test(destination) ? destination.toUpperCase() : undefined;
  const searchId = opaque('hsearch', JSON.stringify(search));
  const baseResult = {
    dataSource: 'live_nuitee',
    disclosure: 'Current Nuitee hotel rates and availability. Prices can change and require verification before booking; no room is held or reserved.',
    searchId,
    searchContext: search,
  };
  const fail = (code: string) => {
    const error = publicError(code);
    return {
      result: {
        status: 'error',
        message: error.message,
        fallback: `${error.message} No hotel was added to the trip.`,
        hotels: [],
        error,
        ...baseResult,
      },
      records: [],
    };
  };

  if (!iataCode && !countryCode) return fail('invalid_request');
  if (rooms > adults) return fail('invalid_request');

  const unwrap = (value: unknown) => {
    const wrapper = object(value);
    return object(wrapper && Object.prototype.hasOwnProperty.call(wrapper, 'raw') ? wrapper.raw : value);
  };
  const near = object(search.near);
  const landmark = string(near?.landmark, 160);
  let locationAssessment: Record<string, unknown> | undefined;
  let center: { latitude: number; longitude: number; radius: number } | undefined;
  if (near && !landmark) return fail('location_unresolved');
  // A landmark needs a city/country, rather than an airport whose place name
  // might be matched in another region. Ask for clarification instead.
  if (near && iataCode) return fail('location_unresolved');
  if (landmark) {
    // Resolve through the fixed provider. Never trust model-authored coordinates
    // or replace an ambiguous/failed landmark lookup with a broad city search.
    const words = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(word => word && word !== 'the');
    // Place autocomplete can return nothing for a formal name with an echoed
    // destination suffix ("Club of New York City, New York"). Keep the original
    // request, but search its identifying name with the city supplied once.
    const cityLabel = destination.toUpperCase() === 'NEW YORK CITY' ? 'New York' : destination;
    const cityWords = words(cityLabel);
    const originalWords = words(landmark);
    let requestedWords = originalWords.slice();
    const endsInCity = (parts: readonly string[]) => parts.length >= cityWords.length
      && cityWords.every((word, index) => parts[parts.length - cityWords.length + index] === word);
    if (requestedWords[requestedWords.length - 1] === 'city' && endsInCity(requestedWords.slice(0, -1))) requestedWords.pop();
    if (endsInCity(requestedWords)) {
      requestedWords = requestedWords.slice(0, -cityWords.length);
      while (['of', 'in', 'near'].includes(requestedWords[requestedWords.length - 1] ?? '')) requestedWords.pop();
    }
    if (!requestedWords.length) return fail('location_unresolved');
    const queryLandmark = requestedWords.length === originalWords.length ? landmark : requestedWords.join(' ');
    try {
      const places = unwrap(context.callOperation('places', {
        textQuery: `${queryLandmark}, ${cityLabel}${countryCode ? `, ${countryCode}` : ''}`,
        type: 'establishment,point_of_interest', language: 'en',
      }));
      const matches = array(places?.data).map(object).filter((place) => {
        const nameWords = words(string(place?.displayName, 160) ?? '');
        const addressWords = words(string(place?.formattedAddress, 240) ?? '');
        return requestedWords.length > 0 && requestedWords.every(word => nameWords.includes(word) || addressWords.includes(word))
          && cityWords.every(word => addressWords.includes(word));
      });
      if (matches.length !== 1) return fail('location_unresolved');
      const place = matches[0]!;
      const placeId = string(place?.placeId, 256);
      if (!placeId || !/^[A-Za-z0-9_-]{1,256}$/.test(placeId)) return fail('location_unresolved');
      const detailsResponse = unwrap(context.callOperation('place_details', { placeId, language: 'en' }));
      const details = object(detailsResponse?.data) ?? detailsResponse;
      const location = object(details?.location);
      const returnedCountry = array(details?.addressComponents).map(object)
        .find(component => array(component?.types).includes('country'));
      if (countryCode && string(returnedCountry?.shortText, 2)?.toUpperCase() !== countryCode) return fail('location_unresolved');
      const latitude = number(location?.latitude);
      const longitude = number(location?.longitude);
      const address = string(place?.formattedAddress, 240);
      if (latitude === undefined || longitude === undefined || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !address) return fail('location_unresolved');
      // 80 m/min is only a candidate-discovery radius. It is not a walking
      // duration or proof of eligibility: roads, barriers and pace are unknown.
      const minutes = number(near?.maxWalkingMinutes);
      const radius = Math.min(10_000, Math.max(1, Math.round(minutes === undefined ? 1500 : minutes * 80)));
      center = { latitude, longitude, radius };
      locationAssessment = {
        landmark: string(place?.displayName, 160) ?? landmark, address,
        latitude, longitude, searchRadiusMeters: radius, walkingStatus: 'unverified', excludedCount: 0,
        message: `Candidates within a ${radius}-meter straight-line search area around ${landmark}. ${minutes === undefined ? 'Proximity' : `Your ${minutes}-minute walking limit`} is not verified: walking routes and times are unavailable. These are candidates, not confirmed matches.`,
      };
    } catch (caught) {
      return fail(classify(caught));
    }
  }

  const occupancies = Array.from({ length: rooms }, (_, index) => ({
    rooms: 1,
    adults: 1 + (index === 0 ? adults - rooms : 0),
    children: index === 0 ? Array.from({ length: children }, () => 8) : [],
  }));

  let operationResult: unknown;
  try {
    operationResult = context.callOperation('search', {
      cityName: center || iataCode ? undefined : destination,
      countryCode: center || iataCode ? undefined : countryCode,
      iataCode: center ? undefined : iataCode,
      latitude: center?.latitude,
      longitude: center?.longitude,
      radius: center ? Math.max(1000, center.radius) : undefined,
      occupancies,
      currency,
      guestNationality: currency === 'CAD' ? 'CA' : currency === 'EUR' ? 'PT' : 'US',
      checkin: checkInDate,
      checkout: checkOutDate,
      timeout: 10,
      maxRatesPerHotel: 5,
      limit: 10,
      includeHotelData: true,
      stream: false,
    });
  } catch (caught) {
    return fail(classify(caught));
  }

  const wrapper = object(operationResult);
  const raw = wrapper && Object.prototype.hasOwnProperty.call(wrapper, 'raw') ? wrapper.raw : operationResult;
  const response = object(raw);
  if (!response || !Array.isArray(response.data) || !Array.isArray(response.hotels)) return fail('malformed_response');

  const hotelContent = response.hotels.map(object).filter((entry): entry is Record<string, unknown> => Boolean(entry));
  const nights = dayNumber(checkOutDate) - dayNumber(checkInDate);
  const normalized: Array<Record<string, unknown>> = [];
  const records: Array<Record<string, unknown>> = [];

  for (const value of response.data) {
    if (normalized.length >= 10) break;
    const availability = object(value);
    const hotelId = string(availability?.hotelId, 200);
    if (!availability || !hotelId) continue;
    const content = hotelContent.find((entry) => string(entry.id, 200) === hotelId) ?? {};
    const roomType = array(availability.roomTypes).map(object).find(Boolean);
    const rate = array(roomType?.rates).map(object).find(Boolean);
    const offerId = string(roomType?.offerId, 16_384);
    const offerTotal = array(roomType?.offerRetailRate).map(object).find((entry) => number(entry?.amount) !== undefined);
    const rateTotal = array(object(rate?.retailRate)?.total).map(object).find((entry) => number(entry?.amount) !== undefined);
    const total = number(offerTotal?.amount) ?? number(rateTotal?.amount);
    const totalCurrency = (string(offerTotal?.currency, 3) ?? string(rateTotal?.currency, 3) ?? currency).toUpperCase();
    const name = string(content.name, 100);
    if (!roomType || !rate || !offerId || total === undefined || total < 0 || !name || nights < 1) continue;
    if (totalCurrency !== 'CAD' && totalCurrency !== 'USD' && totalCurrency !== 'EUR') continue;
    const address = string(content.address, 160);
    const city = string(content.city_name, 80) ?? destination;
    const safeCountry = (string(content.country_code, 2) ?? countryCode ?? 'ZZ').toUpperCase();
    const latitude = number(content.latitude);
    const longitude = number(content.longitude);
    const tags = array(content.tags).map((item) => string(item, 80)).filter((item): item is string => Boolean(item));
    const perks = array(rate.perks).map(object).map((item) => string(item?.name, 80)).filter((item): item is string => Boolean(item));
    const policies = object(rate.cancellationPolicies);
    const refundableTag = string(policies?.refundableTag, 12);
    const cancelInfo = array(policies?.cancelPolicyInfos).map(object).find(Boolean);
    const cancelTime = string(cancelInfo?.cancelTime, 40);
    const policySummary = refundableTag === 'RFN'
      ? `Refundable rate${cancelTime ? `; cancellation terms change after ${cancelTime}` : '; provider terms apply'}.`
      : refundableTag === 'NRFN'
        ? 'Non-refundable rate; provider terms apply.'
        : 'Provider cancellation terms apply; verify before booking.';
    const taxes = array(object(rate.retailRate)?.taxesAndFees).map(object).filter(Boolean);
    const taxesAndFeesIncluded = taxes.length > 0 && taxes.every((tax) => tax?.included === true);
    const taxAndFeeStatus = taxesAndFeesIncluded ? 'included'
      : taxes.length > 0 && taxes.every(tax => typeof tax?.included === 'boolean') ? 'excluded' : 'unknown';
    const selectionId = opaque('hsel', `${searchId}:${hotelId}:${offerId}`);
    const hotel = {
      selectionId,
      dataSource: 'live_nuitee',
      name,
      city,
      countryCode: /^[A-Z]{2}$/.test(safeCountry) ? safeCountry : 'ZZ',
      neighborhood: (address ?? `${city} area`).slice(0, 80),
      ...(latitude !== undefined && longitude !== undefined
        && latitude >= -90 && latitude <= 90
        && longitude >= -180 && longitude <= 180
        ? { lat: latitude, lng: longitude }
        : {}),
      description: string(content.story, 240) ?? 'Current room availability returned by Nuitee Hotels.',
      roomName: string(rate.name, 80) ?? string(roomType.name, 80) ?? 'Available room',
      category: Math.max(1, Math.min(5, Math.round(number(content.stars) ?? 1))),
      amenities: [...tags, ...perks].filter((item, index, items) => items.indexOf(item) === index).slice(0, 6),
      nights,
      rooms,
      nightlyPrice: { amount: Math.round((total / nights) * 100) / 100, currency: totalCurrency },
      staySubtotal: { amount: total, currency: totalCurrency },
      taxesAndFeesIncluded,
      taxAndFeeStatus,
      policySummary,
      ...(boundedHttpsImage(content.thumbnail) ?? boundedHttpsImage(content.main_photo)
        ? { imageUrl: boundedHttpsImage(content.thumbnail) ?? boundedHttpsImage(content.main_photo) }
        : {}),
      ...(number(content.rating) !== undefined ? { reviewScore: Math.max(0, Math.min(10, number(content.rating)!)) } : {}),
      ...(number(content.review_count) !== undefined ? { reviewCount: Math.max(0, Math.floor(number(content.review_count)!)) } : {}),
    };
    normalized.push(hotel);
    records.push({
      selectionId,
      searchId,
      dataSource: 'live_nuitee',
      providerOfferId: offerId,
      propertyName: name,
      ...(hotel.imageUrl ? { imageUrl: hotel.imageUrl } : {}),
      city,
      checkInDate,
      checkOutDate,
      nights,
      rooms,
      staySubtotal: hotel.staySubtotal,
    });
  }

  if (normalized.length === 0 && response.data.length > 0) return fail('malformed_response');
  if (center && locationAssessment) {
    const radians = (degrees: number) => degrees * Math.PI / 180;
    const distance = (lat: number, lng: number) => {
      const deltaLat = radians(lat - center!.latitude);
      const deltaLng = radians(lng - center!.longitude);
      const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(center!.latitude)) * Math.cos(radians(lat)) * Math.sin(deltaLng / 2) ** 2;
      return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
    };
    for (let index = normalized.length - 1; index >= 0; index -= 1) {
      const hotel = normalized[index]!;
      const lat = number(hotel.lat);
      const lng = number(hotel.lng);
      const meters = lat === undefined || lng === undefined ? undefined : distance(lat, lng);
      if (meters === undefined || meters > center.radius) {
        normalized.splice(index, 1);
        records.splice(index, 1);
        locationAssessment.excludedCount = Number(locationAssessment.excludedCount) + 1;
      } else {
        hotel.locationEvidence = { straightLineMeters: Math.round(meters), walkingStatus: 'unverified' };
      }
    }
    normalized.sort((first, second) => Number(object(first.locationEvidence)?.straightLineMeters) - Number(object(second.locationEvidence)?.straightLineMeters));
    Object.assign(baseResult, { locationAssessment });
  }
  if (normalized.length === 0) {
    return {
      result: {
        status: 'empty',
        message: center ? 'No candidates with usable coordinates were returned inside the landmark search area. The walking limit remains unverified.' : `No current hotel rates were returned for ${destination}.`,
        fallback: center ? 'No candidates with usable coordinates were returned inside the landmark search area. The walking limit remains unverified; no city-wide results were substituted.' : `No current Nuitee hotel rates were returned for ${destination} from ${checkInDate} to ${checkOutDate}. Try different dates or a nearby destination.`,
        hotels: [],
        ...baseResult,
      },
      records: [],
    };
  }
  const partial = normalized.length + Number(locationAssessment?.excludedCount ?? 0) < response.data.length;
  const amounts = normalized.map(hotel => object(hotel.staySubtotal)!);
  const sameCurrency = amounts.every(amount => amount.currency === amounts[0]!.currency);
  const sameTaxBasis = normalized.every(hotel => hotel.taxAndFeeStatus !== 'unknown' && hotel.taxAndFeeStatus === normalized[0]!.taxAndFeeStatus);
  const lowest = Math.min(...amounts.map(amount => Number(amount.amount)));
  const priceComparison = {
    scope: 'returned_hotels', comparable: sameCurrency && sameTaxBasis,
    lowestDisplayedSelectionIds: sameCurrency ? normalized.filter(hotel => Number(object(hotel.staySubtotal)?.amount) === lowest).map(hotel => hotel.selectionId) : [],
    message: sameCurrency && sameTaxBasis
      ? `Lowest displayed rate among these returned ${center ? 'candidates' : 'hotels'} on the same reported tax basis.${center ? ' Walking eligibility is unverified.' : ''}`
      : 'Tax inclusion is unknown or differs, or currencies differ. Displayed amounts are not a comparable final-price ranking; do not claim a cheapest qualifying hotel.',
  };
  return {
    result: {
      status: partial ? 'partial' : 'success',
      message: locationAssessment ? `${normalized.length} nearby candidates found. Walking routes and the requested walking limit remain unverified.` : `${normalized.length} current hotel option${normalized.length === 1 ? '' : 's'} found for ${destination}.`,
      fallback: locationAssessment ? String(locationAssessment.message) : `${normalized.length} current Nuitee hotel option${normalized.length === 1 ? '' : 's'} for ${destination}, ${checkInDate} to ${checkOutDate}. Prices and availability can change; no room was held or reserved.`,
      hotels: normalized,
      priceComparison,
      ...baseResult,
    },
    records,
  };
}
