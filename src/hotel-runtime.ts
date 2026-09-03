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
    callOperation: (name: 'search', args: Readonly<Record<string, unknown>>) => unknown;
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
    return /^https:\/\/snaphotelapi\.com\//i.test(candidate) ? candidate : undefined;
  };

  const search = object(input.search) ?? {};
  const destination = string(search.destination, 80) ?? '';
  const destinationCode = string(search.countryCode, 2)?.toUpperCase();
  const checkInDate = string(search.checkInDate, 10) ?? '';
  const checkOutDate = string(search.checkOutDate, 10) ?? '';
  const adults = Math.max(1, Math.floor(number(search.adults) ?? 2));
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

  const occupancies = Array.from({ length: rooms }, (_, index) => ({
    rooms: 1,
    adults: 1 + (index === 0 ? adults - rooms : 0),
    children: index === 0 ? Array.from({ length: children }, () => 8) : [],
  }));

  let operationResult: unknown;
  try {
    operationResult = context.callOperation('search', {
      cityName: iataCode ? undefined : destination,
      countryCode: iataCode ? undefined : countryCode,
      iataCode,
      occupancies,
      currency,
      guestNationality: currency === 'CAD' ? 'CA' : currency === 'EUR' ? 'PT' : 'US',
      checkin: checkInDate,
      checkout: checkOutDate,
      timeout: 10,
      maxRatesPerHotel: 1,
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
    const selectionId = opaque('hsel', `${searchId}:${hotelId}:${offerId}`);
    const hotel = {
      selectionId,
      dataSource: 'live_nuitee',
      name,
      city,
      countryCode: /^[A-Z]{2}$/.test(safeCountry) ? safeCountry : 'ZZ',
      neighborhood: (address ?? `${city} area`).slice(0, 80),
      description: string(content.story, 240) ?? 'Current room availability returned by Nuitee Hotels.',
      roomName: string(rate.name, 80) ?? string(roomType.name, 80) ?? 'Available room',
      category: Math.max(1, Math.min(5, Math.round(number(content.stars) ?? 1))),
      amenities: [...tags, ...perks].filter((item, index, items) => items.indexOf(item) === index).slice(0, 6),
      nights,
      rooms,
      nightlyPrice: { amount: Math.round((total / nights) * 100) / 100, currency: totalCurrency },
      staySubtotal: { amount: total, currency: totalCurrency },
      taxesAndFeesIncluded,
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
      city,
      checkInDate,
      checkOutDate,
      nights,
      rooms,
      staySubtotal: hotel.staySubtotal,
    });
  }

  if (normalized.length === 0 && response.data.length > 0) return fail('malformed_response');
  if (normalized.length === 0) {
    return {
      result: {
        status: 'empty',
        message: `No current hotel rates were returned for ${destination}.`,
        fallback: `No current Nuitee hotel rates were returned for ${destination} from ${checkInDate} to ${checkOutDate}. Try different dates or a nearby destination.`,
        hotels: [],
        ...baseResult,
      },
      records: [],
    };
  }
  const partial = normalized.length < response.data.length;
  return {
    result: {
      status: partial ? 'partial' : 'success',
      message: `${normalized.length} current hotel option${normalized.length === 1 ? '' : 's'} found for ${destination}.`,
      fallback: `${normalized.length} current Nuitee hotel option${normalized.length === 1 ? '' : 's'} for ${destination}, ${checkInDate} to ${checkOutDate}. Prices and availability can change; no room was held or reserved.`,
      hotels: normalized,
      ...baseResult,
    },
    records,
  };
}
