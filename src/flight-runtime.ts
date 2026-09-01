export type ErrorCode =
  | 'invalid_request'
  | 'configuration_required'
  | 'authentication'
  | 'entitlement'
  | 'rate_limited'
  | 'timeout'
  | 'provider_error'
  | 'malformed_response'
  | 'oversized_response'
  | 'service_unavailable'
  | 'expired_offer'
  | 'unavailable_offer'
  | 'unknown_or_stale_selection';

export type GatewayError = {
  readonly code: ErrorCode;
  readonly message: string;
  readonly retryable: boolean;
};

export type SearchInput = {
  readonly origin?: unknown;
  readonly destination?: unknown;
  readonly departureDate?: unknown;
  readonly returnDate?: unknown;
  readonly adults?: unknown;
  readonly children?: unknown;
  readonly infants?: unknown;
  readonly childrenAges?: unknown;
  readonly infantAges?: unknown;
  readonly cabinClass?: unknown;
  readonly currency?: unknown;
  readonly country?: unknown;
};

export type SelectionRecord = {
  readonly selectionId: string;
  readonly offerId: string;
  readonly searchId: string;
  readonly originalTotal: number;
  readonly currency: string;
  readonly expiresAt?: string;
};

export type SelectionState = {
  readonly searchId?: string;
  readonly updatedAt?: string;
  readonly records?: readonly SelectionRecord[];
  readonly activeSelectionId?: string;
};

export type GatewayInput =
  | {
      readonly kind: 'search';
      readonly search?: SearchInput;
      readonly today?: string;
      readonly requestedAt?: string;
    }
  | {
      readonly kind: 'verify';
      readonly selectionId?: string;
      readonly selectionMode?: 'active' | 'explicit';
      readonly state?: SelectionState | unknown;
      readonly requestedAt?: string;
    };

export type GatewayContext = {
  readonly callOperation: (name: 'search' | 'verify', input: unknown) => unknown;
};

export type GatewayResult = {
  readonly kind: 'search' | 'verify';
  readonly status: 'success' | 'empty' | 'partial' | 'error';
  readonly message: string;
  readonly fallback: string;
  readonly retrievedAt?: string;
  readonly searchId?: string;
  readonly searchContext?: Readonly<Record<string, unknown>>;
  readonly itineraries?: readonly Record<string, unknown>[];
  readonly records?: readonly SelectionRecord[];
  readonly verification?: Record<string, unknown>;
  readonly error?: GatewayError;
};

/**
 * Sandboxed Noodle compute entrypoint. Keep every runtime helper inside this
 * function: the public SDK serializes `run` and does not permit imports,
 * process access, fetch, or closure capture in compute connectors.
 */
export function runNuiteeGateway(input: GatewayInput, context: GatewayContext): GatewayResult {
  const errorDetails: Record<ErrorCode, { message: string; retryable: boolean }> = {
    invalid_request: {
      message: 'The flight request is incomplete or invalid. Check the airports, dates, passengers, cabin, currency, and point of sale.',
      retryable: false,
    },
    configuration_required: {
      message: 'Live Nuitee access is not configured on this server. A deployment owner must configure NUITEE_API_KEY server-side.',
      retryable: false,
    },
    authentication: {
      message: 'Nuitee rejected the server credential. A deployment owner should check the managed API key.',
      retryable: false,
    },
    entitlement: {
      message: 'This Nuitee account does not currently have access to the requested Flights capability.',
      retryable: false,
    },
    rate_limited: {
      message: 'Nuitee is receiving too many requests. Wait briefly before trying again.',
      retryable: true,
    },
    timeout: {
      message: 'The flight provider did not respond before the request deadline. Try again.',
      retryable: true,
    },
    provider_error: {
      message: 'A flight provider could not complete the request. Try again or adjust the search.',
      retryable: true,
    },
    malformed_response: {
      message: 'Nuitee returned flight data this starter could not safely interpret.',
      retryable: true,
    },
    oversized_response: {
      message: 'Nuitee returned more flight data than this starter safely accepts. Narrow the search and try again.',
      retryable: true,
    },
    service_unavailable: {
      message: 'The Nuitee Flights service is temporarily unavailable. Try again later.',
      retryable: true,
    },
    expired_offer: {
      message: 'This fare is no longer available or has expired. Search again for current options.',
      retryable: false,
    },
    unavailable_offer: {
      message: 'This fare could not be verified as available. Search again for a current option.',
      retryable: false,
    },
    unknown_or_stale_selection: {
      message: 'This fare selection is unknown or belongs to an older search. Search again before verifying.',
      retryable: false,
    },
  };

  const fail = (kind: GatewayResult['kind'], code: ErrorCode): GatewayResult => {
    const detail = errorDetails[code];
    return {
      kind,
      status: 'error',
      message: detail.message,
      fallback: detail.message,
      itineraries: kind === 'search' ? [] : undefined,
      records: kind === 'search' ? [] : undefined,
      error: { code, message: detail.message, retryable: detail.retryable },
    };
  };

  const object = (value: unknown): Record<string, any> | undefined =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, any>
      : undefined;

  const text = (value: unknown, max = 160): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const cleaned = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.slice(0, max) : undefined;
  };

  const nuiteeAirlineLogo = (value: unknown): string | undefined => {
    const candidate = text(value, 2_048);
    return candidate && /^https:\/\/(?:sandbox|production)\.nuitee\.flights\/static\/images\/airlines\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:png|svg|webp)$/.test(candidate)
      ? candidate
      : undefined;
  };

  const finiteNumber = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;

  const utf8Bytes = (value: string): number => {
    let bytes = 0;
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
        const next = value.charCodeAt(index + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          bytes += 4;
          index += 1;
        } else bytes += 3;
      } else bytes += 3;
    }
    return bytes;
  };

  const responseBody = (operationResult: unknown, maxBytes: number): { body?: unknown; tooLarge: boolean } => {
    const wrapper = object(operationResult);
    const body = wrapper && Object.prototype.hasOwnProperty.call(wrapper, 'raw') ? wrapper.raw : operationResult;
    try {
      const serialized = JSON.stringify(body);
      return { body, tooLarge: typeof serialized !== 'string' || utf8Bytes(serialized) > maxBytes };
    } catch {
      return { tooLarge: false };
    }
  };

  const classify = (caught: unknown, kind: GatewayResult['kind']): ErrorCode => {
    const value = object(caught);
    const nested = object(value?.cause);
    const status = finiteNumber(value?.status) ?? finiteNumber(value?.statusCode) ?? finiteNumber(nested?.status);
    const code = `${text(value?.code, 80) ?? ''} ${text(nested?.code, 80) ?? ''}`.toLowerCase();
    const message = `${text(value?.message, 200) ?? ''} ${text(nested?.message, 200) ?? ''}`.toLowerCase();
    const signal = `${code} ${message}`;
    if (status === 400) return 'invalid_request';
    if (status === 401) return 'authentication';
    if (status === 403) return 'entitlement';
    if (status === 404 && kind === 'verify') return 'expired_offer';
    if (status === 429) return 'rate_limited';
    if (status === 503) return 'service_unavailable';
    if (status === 502 || (status !== undefined && status >= 500)) return 'provider_error';
    if (signal.includes('credential') || signal.includes('secret') || signal.includes('api key')) return 'configuration_required';
    if (signal.includes('timeout') || signal.includes('timed out') || signal.includes('abort')) return 'timeout';
    if (signal.includes('too large') || signal.includes('oversize') || signal.includes('body size') || signal.includes('response size')) return 'oversized_response';
    return 'provider_error';
  };

  const hash = (value: string, seed: number): string => {
    let current = seed >>> 0;
    for (let index = 0; index < value.length; index += 1) {
      current ^= value.charCodeAt(index);
      current = Math.imul(current, 16777619) >>> 0;
    }
    return current.toString(16).padStart(8, '0');
  };

  const opaqueId = (value: string, prefix: 'sel_' | 'search_'): string =>
    prefix + [2166136261, 2246822519, 3266489917, 668265263]
      .map((seed) => hash(value, seed))
      .join('');

  const calendar = (value: unknown): { year: number; month: number; day: number } | undefined => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) ||
        month < 1 || month > 12 || !Number.isInteger(day)) return undefined;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day < 1 || day > days[month - 1]) return undefined;
    return { year, month, day };
  };

  const validDate = (value: unknown): value is string => calendar(value) !== undefined;

  const instantMillis = (value: unknown): number | undefined => {
    if (typeof value !== 'string' || value.length > 64) return undefined;
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match) return undefined;
    const date = calendar(match[1]);
    const hour = Number(match[2]);
    const minute = Number(match[3]);
    const second = Number(match[4]);
    if (!date || !Number.isInteger(hour) || hour < 0 || hour > 23 ||
        !Number.isInteger(minute) || minute < 0 || minute > 59 ||
        !Number.isInteger(second) || second < 0 || second > 59) return undefined;
    const fraction = (match[5] ?? '').padEnd(3, '0').slice(0, 3);
    const milliseconds = fraction ? Number(fraction) : 0;
    const zone = match[6];
    let offsetMinutes = 0;
    if (zone !== 'Z') {
      const offsetHour = Number(zone.slice(1, 3));
      const offsetMinute = Number(zone.slice(4, 6));
      if (!Number.isInteger(offsetHour) || offsetHour > 23 ||
          !Number.isInteger(offsetMinute) || offsetMinute > 59) return undefined;
      offsetMinutes = (zone[0] === '+' ? 1 : -1) * (offsetHour * 60 + offsetMinute);
    }
    const adjustedYear = date.month <= 2 ? date.year - 1 : date.year;
    const era = Math.floor(adjustedYear / 400);
    const yearOfEra = adjustedYear - era * 400;
    const adjustedMonth = date.month + (date.month > 2 ? -3 : 9);
    const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + date.day - 1;
    const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
    const daysSinceEpoch = era * 146_097 + dayOfEra - 719_468;
    const result = daysSinceEpoch * 86_400_000 + hour * 3_600_000 + minute * 60_000 +
      second * 1_000 + milliseconds - offsetMinutes * 60_000;
    return Number.isFinite(result) ? result : undefined;
  };

  if (input.kind === 'verify') {
    const state = object(input.state);
    const requestedSelectionId = text(input.selectionId, 80);
    const activeSelectionId = text(state?.activeSelectionId, 80);
    const selectionMode = input.selectionMode === 'explicit' ? 'explicit' : 'active';
    const selectionId = selectionMode === 'active'
      ? activeSelectionId ?? requestedSelectionId
      : requestedSelectionId;
    const records = Array.isArray(state?.records) ? state.records.slice(0, 10) : [];
    const requestedAt = text(input.requestedAt, 64);
    const requestTime = instantMillis(requestedAt);
    const stateTime = instantMillis(state?.updatedAt);
    const activeSearchId = text(state?.searchId, 39);
    const stateFresh = requestTime !== undefined && stateTime !== undefined &&
      requestTime - stateTime >= -300_000 && requestTime - stateTime <= 1_800_000;
    if (!selectionId || !/^sel_[a-f0-9]{32}$/.test(selectionId) || !requestedAt || !stateFresh) {
      return fail('verify', 'unknown_or_stale_selection');
    }
    const record = records
      .map((entry) => object(entry))
      .find((entry) => entry?.selectionId === selectionId);
    const offerId = text(record?.offerId, 16_384);
    const originalTotal = finiteNumber(record?.originalTotal);
    const originalCurrency = text(record?.currency, 3)?.toUpperCase();
    const recordSearchId = text(record?.searchId, 39);
    if (!record || !offerId || originalTotal === undefined || originalTotal < 0 || originalTotal > 100_000_000 ||
        !originalCurrency || !/^[A-Z]{3}$/.test(originalCurrency) || !activeSearchId || recordSearchId !== activeSearchId) {
      return fail('verify', 'unknown_or_stale_selection');
    }
    const expiresAt = text(record.expiresAt, 64);
    const expiresAtTime = instantMillis(expiresAt);
    if (expiresAt && expiresAtTime === undefined) return fail('verify', 'unknown_or_stale_selection');
    if (expiresAtTime !== undefined && requestTime !== undefined && expiresAtTime <= requestTime) {
      return fail('verify', 'expired_offer');
    }
    let called: unknown;
    try {
      called = context.callOperation('verify', { offerId });
    } catch (caught) {
      return fail('verify', classify(caught, 'verify'));
    }
    const inspected = responseBody(called, 750_000);
    if (inspected.tooLarge) return fail('verify', 'oversized_response');
    const root = object(inspected.body);
    if (!root || !Array.isArray(root.data)) return fail('verify', 'malformed_response');
    if (root.data.length === 0) return fail('verify', 'unavailable_offer');
    const first = object(root.data[0]);
    const journey = object(first?.journey);
    if (!journey) return fail('verify', 'malformed_response');
    const pricing = object(object(journey.pricing)?.display);
    const currentTotal = finiteNumber(pricing?.total);
    const currentCurrency = text(pricing?.currency, 3)?.toUpperCase();
    if (currentTotal === undefined || currentTotal < 0 || currentTotal > 100_000_000 ||
        !currentCurrency || !/^[A-Z]{3}$/.test(currentCurrency)) {
      return fail('verify', 'malformed_response');
    }
    const changes = object(first?.changes);
    const messageValues = Array.isArray(changes?.messages) ? changes.messages.slice(0, 6) : [];
    const messages = messageValues.map((value) => text(value, 240)).filter((value): value is string => Boolean(value));
    const priceChanged = changes?.priceChanged === true || currentTotal !== originalTotal || currentCurrency !== originalCurrency;
    const verification = {
      status: 'success',
      selectionId,
      availability: 'available',
      priceChanged,
      previousPrice: { total: originalTotal, currency: originalCurrency },
      currentPrice: { total: currentTotal, currency: currentCurrency },
      messages,
      ...(text(journey.expiration, 64) ? { expiresAt: text(journey.expiration, 64)! } : {}),
      verifiedAt: text(journey.timestamp, 64) ?? requestedAt,
    };
    const message = priceChanged
      ? `The fare is available, but the price changed to ${currentTotal} ${currentCurrency}.`
      : `The fare is available at ${currentTotal} ${currentCurrency}.`;
    return { kind: 'verify', status: 'success', message, fallback: `${message} This starter stops before prebooking or booking.`, verification };
  }

  const search = object(input.search);
  const normalizeAirportCode = (value: string | undefined) => {
    // Nuitee's flight search currently rejects Toronto's metro-area code.
    // Keep this provider-specific compatibility rule at the gateway boundary
    // so every model/host sends the same actual airport code upstream.
    if (value === 'YTO') return 'YYZ';
    return value;
  };
  const origin = normalizeAirportCode(text(search?.origin, 3)?.toUpperCase());
  const destination = normalizeAirportCode(text(search?.destination, 3)?.toUpperCase());
  const departureDate = search?.departureDate;
  const returnDate = search?.returnDate === '' || search?.returnDate === null ? undefined : search?.returnDate;
  const adults = finiteNumber(search?.adults);
  const children = finiteNumber(search?.children);
  const infants = finiteNumber(search?.infants);
  const childrenAges = Array.isArray(search?.childrenAges) ? search.childrenAges : undefined;
  const infantAges = Array.isArray(search?.infantAges) ? search.infantAges : undefined;
  const cabinClass = text(search?.cabinClass, 32)?.toUpperCase();
  const currency = text(search?.currency, 16)?.toUpperCase();
  const country = text(search?.country, 8)?.toUpperCase();
  const today = input.today;
  const requestedAt = text(input.requestedAt, 64);
  const requestedAtTime = instantMillis(requestedAt);
  const integers = [adults, children, infants].every((value) => value !== undefined && Number.isInteger(value));
  const passengerTotal = (adults ?? 0) + (children ?? 0) + (infants ?? 0);
  const agesValid =
    childrenAges !== undefined && childrenAges.length === children && childrenAges.every((age) => Number.isInteger(age) && age >= 2 && age <= 11) &&
    infantAges !== undefined && infantAges.length === infants && infantAges.every((age) => Number.isInteger(age) && age >= 0 && age <= 1);
  const valid =
    Boolean(origin && destination && /^[A-Z]{3}$/.test(origin) && /^[A-Z]{3}$/.test(destination) && origin !== destination) &&
    validDate(departureDate) && validDate(today) && departureDate >= today &&
    (returnDate === undefined || (validDate(returnDate) && returnDate > departureDate)) &&
    integers && adults !== undefined && children !== undefined && infants !== undefined &&
    adults >= 1 && adults <= 9 && children >= 0 && infants >= 0 && passengerTotal <= 9 && infants <= adults && agesValid &&
    Boolean(cabinClass && ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'].includes(cabinClass)) &&
    Boolean(currency && /^[A-Z]{3}$/.test(currency)) && Boolean(country && /^[A-Z]{2}$/.test(country)) &&
    requestedAtTime !== undefined;
  if (!valid || !requestedAt) return fail('search', 'invalid_request');

  const legs = [
    { origin, destination, date: departureDate, direction: 'OUTBOUND' },
    ...(returnDate ? [{ origin: destination, destination: origin, date: returnDate, direction: 'INBOUND' }] : []),
  ];
  const request = {
    legs,
    adults,
    children,
    infants,
    childrenAges,
    infantAges,
    cabinClass,
    currency,
    country,
  };
  const searchContext = {
    origin,
    destination,
    departureDate,
    ...(returnDate ? { returnDate } : {}),
    adults,
    children,
    infants,
    childrenAges,
    infantAges,
    cabinClass,
    currency,
    country,
  };
  let called: unknown;
  try {
    called = context.callOperation('search', request);
  } catch (caught) {
    return fail('search', classify(caught, 'search'));
  }
  const inspected = responseBody(called, 6 * 1024 * 1024);
  if (inspected.tooLarge) return fail('search', 'oversized_response');
  const root = object(inspected.body);
  if (!root || !Array.isArray(root.data)) return fail('search', 'malformed_response');
  const candidates: unknown[] = [];
  let partial = root.data.length > 20;
  for (const batchValue of root.data.slice(0, 20)) {
    const batch = object(batchValue);
    if (!Array.isArray(batch?.journeys)) {
      partial = true;
      continue;
    }
    candidates.push(...batch.journeys.slice(0, 100));
    if (batch.journeys.length > 100) partial = true;
  }
  if (candidates.length === 0) {
    const message = 'No current flight offers matched this search. Try different dates or airports.';
    return {
      kind: 'search',
      status: 'empty',
      message,
      fallback: message,
      retrievedAt: requestedAt,
      itineraries: [],
      records: [],
      searchContext,
      searchId: opaqueId(`${origin}|${destination}|${departureDate}|${returnDate ?? ''}|${requestedAt}`, 'search_'),
    };
  }

  const itineraries: Array<Record<string, any>> = [];
  const records: SelectionRecord[] = [];
  const searchId = opaqueId(`${origin}|${destination}|${departureDate}|${returnDate ?? ''}|${requestedAt}`, 'search_');
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    if (itineraries.length >= 10) {
      partial = true;
      break;
    }
    const journey = object(candidates[candidateIndex]);
    const rawSegments = Array.isArray(journey?.segments) ? journey.segments : [];
    const usableOffer = (value: unknown): Record<string, any> | undefined => {
      const entry = object(value);
      if (!entry) return undefined;
      const display = object(object(entry.pricing)?.display);
      return text(entry.offerId, 16_384) && finiteNumber(display?.total) !== undefined && text(display?.currency, 3)
        ? entry
        : undefined;
    };
    const rawOffers = Array.isArray(journey?.offers) ? journey.offers : [];
    const maxOffersPerJourney = 100;
    if (rawOffers.length > maxOffersPerJourney) partial = true;
    let offer = usableOffer(journey?.cheapestOffer);
    for (let offerIndex = 0; !offer && offerIndex < Math.min(rawOffers.length, maxOffersPerJourney); offerIndex += 1) {
      offer = usableOffer(rawOffers[offerIndex]);
    }
    if (!journey || rawSegments.length === 0 || !offer) {
      partial = true;
      continue;
    }
    if (rawSegments.length > 8) {
      partial = true;
      continue;
    }
    const segments: Array<Record<string, any>> = [];
    let invalidSegment = false;
    for (const segmentValue of rawSegments) {
      const segment = object(segmentValue);
      const segmentOrigin = text(segment?.originCode, 3)?.toUpperCase();
      const segmentDestination = text(segment?.destinationCode, 3)?.toUpperCase();
      const segmentOriginName = text(segment?.originName, 120);
      const segmentDestinationName = text(segment?.destinationName, 120);
      const departureTime = text(segment?.departureTime, 64);
      const arrivalTime = text(segment?.arrivalTime, 64);
      const direction = text(segment?.direction, 16)?.toUpperCase();
      const segmentDuration = finiteNumber(object(segment?.duration)?.minutes);
      if (!segmentOrigin || !/^[A-Z]{3}$/.test(segmentOrigin) ||
          !segmentDestination || !/^[A-Z]{3}$/.test(segmentDestination) ||
          !departureTime || !arrivalTime || !direction || !['OUTBOUND', 'INBOUND'].includes(direction) ||
          segmentDuration === undefined || !Number.isInteger(segmentDuration) || segmentDuration < 0 || segmentDuration > 10_080) {
        invalidSegment = true;
        break;
      }
      const carrier = object(segment?.carrier);
      const flight = object(segment?.flight);
      const marketingName = text(carrier?.marketingName, 100) ?? text(carrier?.operatingName, 100) ?? 'Carrier not provided';
      const marketingCode = text(carrier?.marketingCode, 8)?.toUpperCase() ?? text(carrier?.operatingCode, 8)?.toUpperCase() ?? '—';
      const marketingLogo = nuiteeAirlineLogo(carrier?.marketingLogo);
      const operatingName = text(carrier?.operatingName, 100);
      const operatingCode = text(carrier?.operatingCode, 8)?.toUpperCase();
      segments.push({
        origin: segmentOrigin,
        ...(segmentOriginName ? { originName: segmentOriginName } : {}),
        destination: segmentDestination,
        ...(segmentDestinationName ? { destinationName: segmentDestinationName } : {}),
        departureTime,
        arrivalTime,
        direction,
        durationMinutes: segmentDuration,
        carrier: {
          name: marketingName,
          code: marketingCode,
          ...(marketingLogo ? { logoUrl: marketingLogo } : {}),
        },
        ...(operatingName && operatingCode && (operatingName !== marketingName || operatingCode !== marketingCode)
          ? { operatingCarrier: { name: operatingName, code: operatingCode } }
          : {}),
        ...(text(flight?.marketingNumber, 16) ? { flightNumber: text(flight?.marketingNumber, 16)! } : {}),
        ...(text(flight?.operatingNumber, 16) ? { operatingFlightNumber: text(flight?.operatingNumber, 16)! } : {}),
      });
    }
    if (invalidSegment || segments.length === 0) {
      partial = true;
      continue;
    }
    const pricing = object(object(offer.pricing)?.display);
    const total = finiteNumber(pricing?.total);
    const priceCurrency = text(pricing?.currency, 3)?.toUpperCase();
    const offerId = text(offer.offerId, 16_384);
    if (total === undefined || total < 0 || total > 100_000_000 ||
        !priceCurrency || !/^[A-Z]{3}$/.test(priceCurrency) || !offerId) {
      partial = true;
      continue;
    }
    const boundedPricePart = (value: unknown): number | undefined => {
      const number = finiteNumber(value);
      return number !== undefined && number >= 0 && number <= 100_000_000 ? number : undefined;
    };
    const base = boundedPricePart(pricing?.base);
    const taxes = boundedPricePart(pricing?.taxes);
    const fees = boundedPricePart(pricing?.fees);
    const baggage = object(offer.baggage);
    const rawAllowances = Array.isArray(baggage?.included) ? baggage.included : [];
    if (rawAllowances.length > 4) partial = true;
    const allowances = rawAllowances.slice(0, 4)
      .map((entry: unknown) => {
        const allowance = object(entry);
        return text(allowance?.description, 120) ??
          (finiteNumber(allowance?.pieces) !== undefined
            ? `${Math.max(0, Math.round(finiteNumber(allowance?.pieces)!))} ${text(allowance?.bagType, 24) ?? 'bag'} piece(s)`
            : undefined);
      })
      .filter((entry: string | undefined): entry is string => Boolean(entry));
    const terms = object(offer.terms);
    const rawMessages = Array.isArray(terms?.summary) ? terms.summary : [];
    if (rawMessages.length > 6) partial = true;
    const messages = rawMessages.slice(0, 6)
      .map((entry: unknown) => text(object(entry)?.message, 240))
      .filter((entry: string | undefined): entry is string => Boolean(entry));
    const fare = object(offer.fare);
    const fareFamily = text(fare?.family, 80);
    const seatsRemainingValue = finiteNumber(fare?.seatsRemaining);
    const seatsRemaining = seatsRemainingValue !== undefined && Number.isInteger(seatsRemainingValue) &&
      seatsRemainingValue >= 0 && seatsRemainingValue <= 999 ? seatsRemainingValue : undefined;
    const rawAmenityGroups = Array.isArray(offer.segmentAmenities) ? offer.segmentAmenities : [];
    const amenities: Array<Record<string, unknown>> = [];
    const allowedAmenityCategories = ['wifi', 'power', 'entertainment', 'food', 'seat_comfort'];
    for (const groupValue of rawAmenityGroups.slice(0, 8)) {
      const group = object(groupValue);
      const aircraftType = text(group?.aircraftType, 80);
      const groupAmenities = Array.isArray(group?.amenities) ? group.amenities : [];
      for (const amenityValue of groupAmenities.slice(0, 10)) {
        if (amenities.length >= 5) {
          partial = true;
          break;
        }
        const amenity = object(amenityValue);
        const category = text(amenity?.category, 32)?.toLowerCase();
        const name = text(amenity?.name, 80);
        if (!category || !allowedAmenityCategories.includes(category) || !name || typeof amenity?.available !== 'boolean') {
          partial = true;
          continue;
        }
        amenities.push({
          category,
          name,
          available: amenity.available,
          ...(typeof amenity.chargeable === 'boolean' ? { chargeable: amenity.chargeable } : {}),
          ...(text(amenity.details, 160) ? { details: text(amenity.details, 160)! } : {}),
          ...(aircraftType ? { aircraftType } : {}),
        });
      }
      if (amenities.length >= 5) break;
    }
    if (rawAmenityGroups.length > 8) partial = true;
    const expectedDirections = returnDate ? ['OUTBOUND', 'INBOUND'] : ['OUTBOUND'];
    const rawLegDurations = Array.isArray(journey.legDurations) ? journey.legDurations : [];
    const legMetaByDirection: Record<string, { minutes: number; dayChange?: number; overnight?: boolean }> = {};
    for (const legValue of rawLegDurations.slice(0, 2)) {
      const legDuration = object(legValue);
      const direction = text(legDuration?.direction, 16)?.toUpperCase();
      const minutes = finiteNumber(object(legDuration?.duration)?.minutes);
      if (direction && ['OUTBOUND', 'INBOUND'].includes(direction) && minutes !== undefined &&
          Number.isInteger(minutes) && minutes >= 0 && minutes <= 10_080) {
        const dayChangeValue = finiteNumber(legDuration?.dayChange);
        const dayChange = dayChangeValue !== undefined && Number.isInteger(dayChangeValue) && dayChangeValue >= 0 && dayChangeValue <= 7
          ? dayChangeValue
          : undefined;
        legMetaByDirection[direction] = {
          minutes,
          ...(dayChange !== undefined ? { dayChange } : {}),
          ...(typeof legDuration?.overnightFlight === 'boolean' ? { overnight: legDuration.overnightFlight } : {}),
        };
      }
    }
    const legs: Array<Record<string, any>> = [];
    for (const direction of expectedDirections) {
      const grouped = segments.filter((segment) => segment.direction === direction);
      const legMeta = legMetaByDirection[direction];
      if (grouped.length === 0 || !legMeta) {
        legs.length = 0;
        break;
      }
      const firstInLeg = grouped[0];
      const lastInLeg = grouped[grouped.length - 1];
      legs.push({
        direction,
        route: {
          origin: firstInLeg.origin,
          ...(firstInLeg.originName ? { originName: firstInLeg.originName } : {}),
          destination: lastInLeg.destination,
          ...(lastInLeg.destinationName ? { destinationName: lastInLeg.destinationName } : {}),
        },
        departureTime: firstInLeg.departureTime,
        arrivalTime: lastInLeg.arrivalTime,
        durationMinutes: legMeta.minutes,
        stops: Math.max(0, grouped.length - 1),
        ...(legMeta.dayChange !== undefined ? { dayChange: legMeta.dayChange } : {}),
        ...(legMeta.overnight !== undefined ? { overnight: legMeta.overnight } : {}),
      });
    }
    const totalDuration = object(journey.totalDuration);
    const providerTotalDuration = finiteNumber(totalDuration?.minutes);
    if (legs.length !== expectedDirections.length || providerTotalDuration === undefined || !Number.isInteger(providerTotalDuration) ||
        providerTotalDuration < 0 || providerTotalDuration > 1_051_200) {
      partial = true;
      continue;
    }
    const durationMinutes = legs.reduce((sum, leg) => sum + leg.durationMinutes, 0);
    const first = segments[0];
    const outbound = legs[0];
    const carrier = first.carrier;
    const expiration = text(offer.expiration, 64);
    const selectionId = opaqueId(`${offerId}|${text(journey.journeyKey, 256) ?? candidateIndex}|${requestedAt}|${candidateIndex}`, 'sel_');
    itineraries.push({
      selectionId,
      route: outbound.route,
      carrier,
      departureTime: outbound.departureTime,
      arrivalTime: outbound.arrivalTime,
      durationMinutes,
      stops: legs.reduce((sum, leg) => sum + leg.stops, 0),
      price: {
        total,
        currency: priceCurrency,
        ...(base !== undefined ? { base } : {}),
        ...(taxes !== undefined ? { taxes } : {}),
        ...(fees !== undefined ? { fees } : {}),
      },
      baggage: {
        carryOn: baggage?.hasCarryOnBag === true,
        checked: baggage?.hasCheckedBag === true,
        allowances,
      },
      ...(expiration ? { expiresAt: expiration } : {}),
      retrievedAt: text(journey.timestamp, 64) ?? requestedAt,
      isCheapest: journey.isCheapest === true,
      fare: {
        ...(fareFamily ? { family: fareFamily } : {}),
        ...(typeof fare?.mixedCabin === 'boolean' ? { mixedCabin: fare.mixedCabin } : {}),
        ...(seatsRemaining !== undefined ? { seatsRemaining } : {}),
      },
      terms: {
        ...(typeof terms?.changeable === 'boolean' ? { changeable: terms.changeable } : {}),
        ...(typeof terms?.refundable === 'boolean' ? { refundable: terms.refundable } : {}),
        ...(typeof terms?.hasChangeFee === 'boolean' ? { hasChangeFee: terms.hasChangeFee } : {}),
        ...(typeof terms?.hasRefundFee === 'boolean' ? { hasRefundFee: terms.hasRefundFee } : {}),
      },
      amenities,
      legs,
      segments,
      messages,
    });
    records.push({
      selectionId,
      offerId,
      searchId,
      originalTotal: total,
      currency: priceCurrency,
      ...(expiration ? { expiresAt: expiration } : {}),
    });
  }
  if (itineraries.length === 0) return fail('search', 'malformed_response');
  const status = partial ? 'partial' : 'success';
  const message = `Found ${itineraries.length} current flight option${itineraries.length === 1 ? '' : 's'}. Search prices can change; verify a fare before any next step.`;
  const comparison = itineraries.slice(0, 3).map((itinerary) =>
    `${itinerary.route.origin}→${itinerary.route.destination}, ${itinerary.carrier.name}, ${itinerary.price.total} ${itinerary.price.currency}, selection ${itinerary.selectionId}`,
  ).join('; ');
  return {
    kind: 'search',
    status,
    message,
    fallback: `${message} ${comparison}`.slice(0, 500),
    retrievedAt: requestedAt,
    searchId,
    searchContext,
    itineraries,
    records,
  };
}
