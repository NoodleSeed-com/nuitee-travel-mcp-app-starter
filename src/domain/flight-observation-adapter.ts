import type { Currency, Money } from './primitives.js';
import type {
  FlightObservation, FlightObservationContext, FlightObservationResult,
  FlightPrerequisiteReason, MissingFlightFactReason,
} from './flight-observation.js';

/**
 * Pure serialized-compute entrypoint; every runtime helper is inside this function.
 * Inputs must come from trusted caller-scoped lookup. Prerequisites are not permissions.
 */
export function runLegacyFlightObservation(input: unknown): FlightObservationResult {
  const record = (value: unknown): Record<string, unknown> | undefined =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  const text = (value: unknown, max: number): string | undefined =>
    typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() === value ? value : undefined;
  const integer = (value: unknown, min: number, max: number): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
  const known = <T>(value: T) => ({ status: 'KNOWN' as const, value });
  const unknown = (reason: MissingFlightFactReason = 'NOT_AVAILABLE_IN_LEGACY_PROJECTION') => ({ status: 'UNKNOWN' as const, reason });
  const labelFact = (value: unknown, max: number) => text(value, max) ? known(value as string) : unknown(value === undefined ? undefined : 'INVALID_VALUE');
  const invalid = (): FlightObservationResult => ({ status: 'invalid', error: {
    code: 'INVALID_TRIP_INPUT',
    message: 'The trip information is invalid. Check the requested dates, party, and selections.',
    retryable: false,
  } });
  const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every((key) => keys.includes(key));
  const date = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return year >= 1 && month >= 1 && month <= 12 && day >= 1
      && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  };
  // Proleptic Gregorian day number; only differences/order matter, not Unix epoch.
  const dayNumber = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    const adjusted = year - (month <= 2 ? 1 : 0);
    const era = Math.floor(adjusted / 400);
    const yearOfEra = adjusted - era * 400;
    const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
    return era * 146097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  };
  const timestamp = (value: unknown): { local: string; instant?: string; millis?: number } | undefined => {
    if (typeof value !== 'string' || value.length > 29) return undefined;
    const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d{1,3})?(Z|[+-](?:0\d|1[0-4]):[0-5]\d)?$/.exec(value);
    if (!match || !date(match[1])) return undefined;
    const local = `${match[1]}T${match[2]}:${match[3]}:${match[4]}${match[5] ?? ''}`;
    const offset = match[6];
    if (!offset || offset === '-00:00' || (offset !== 'Z' && offset.slice(1, 3) === '14' && offset.slice(4) !== '00')) return { local };
    const offsetMinutes = offset === 'Z' ? 0 : (offset[0] === '-' ? -1 : 1) * (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4)));
    const millis = dayNumber(match[1]) * 86400000
      + (Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4]) - offsetMinutes * 60) * 1000
      + Number((match[5]?.slice(1) ?? '').padEnd(3, '0'));
    return { local, instant: value, millis };
  };
  const instantMillis = (value: unknown) => timestamp(value)?.millis;
  const context = (value: unknown): FlightObservationContext | undefined => {
    const c = record(value);
    if (!c || typeof c.origin !== 'string' || !/^[A-Z]{3}$/.test(c.origin)
      || typeof c.destination !== 'string' || !/^[A-Z]{3}$/.test(c.destination) || c.origin === c.destination
      || !date(c.departureDate) || (c.returnDate !== undefined && (!date(c.returnDate) || c.returnDate <= c.departureDate))
      || !integer(c.adults, 1, 9) || !integer(c.children, 0, 8) || !integer(c.infants, 0, 9)
      || c.adults + c.children + c.infants > 9 || c.infants > c.adults
      || !Array.isArray(c.childrenAges) || c.childrenAges.length !== c.children || !c.childrenAges.every((age) => integer(age, 2, 11))
      || !Array.isArray(c.infantAges) || c.infantAges.length !== c.infants || !c.infantAges.every((age) => integer(age, 0, 1))
      || typeof c.cabinClass !== 'string' || !['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'].includes(c.cabinClass)
      || typeof c.currency !== 'string' || !/^[A-Z]{3}$/.test(c.currency)
      || typeof c.country !== 'string' || !/^[A-Z]{2}$/.test(c.country)) return undefined;
    const tripType = c.returnDate ? 'ROUND_TRIP' : 'ONE_WAY';
    if (c.tripType !== undefined && c.tripType !== tripType) return undefined;
    return {
      tripType, origin: c.origin as string, destination: c.destination as string, departureDate: c.departureDate,
      ...(c.returnDate ? { returnDate: c.returnDate as string } : {}),
      adults: c.adults, children: c.children, infants: c.infants,
      childrenAges: [...c.childrenAges], infantAges: [...c.infantAges],
      cabinClass: c.cabinClass as FlightObservationContext['cabinClass'], currency: c.currency as string, country: c.country as string,
    };
  };
  const money = (value: unknown): FlightObservation['totalPrice'] => {
    const price = record(value);
    if (!price || typeof price.total !== 'number' || !Number.isFinite(price.total) || price.total < 0) return unknown('INVALID_VALUE');
    const exponents: Record<string, number> = { USD: 2, CAD: 2, EUR: 2, GBP: 2, JPY: 0, AED: 2, SGD: 2, HKD: 2, THB: 2, TRY: 2, AUD: 2, NZD: 2, CHF: 2, CNY: 2, INR: 2, KRW: 0, BHD: 3, KWD: 3 };
    if (typeof price.currency !== 'string' || !Object.prototype.hasOwnProperty.call(exponents, price.currency)) return unknown('UNSUPPORTED_CURRENCY');
    // Legacy JSON numbers have already lost their original lexical representation.
    // Pad decimal digits, bound as text, then convert a proven-safe integer once.
    const decimal = String(price.total);
    if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(decimal) || decimal.length > 32) return unknown('INVALID_VALUE');
    const [whole, fraction = ''] = decimal.split('.');
    const exponent = exponents[price.currency];
    if (fraction.length > exponent) return unknown('INVALID_VALUE');
    const digits = (whole + fraction.padEnd(exponent, '0')).replace(/^0+(?=\d)/, '');
    if (digits.length > 16 || (digits.length === 16 && digits > '9007199254740991')) return unknown('INVALID_VALUE');
    return known({ amountMinor: Number(digits), currency: price.currency as Currency } satisfies Money);
  };
  const root = record(input);
  const authority = record(root?.authority);
  const itinerary = record(root?.itinerary);
  const original = context(root?.searchContext);
  const expected = context(root?.expectedContext);
  if (!root || !onlyKeys(root, ['itinerary', 'searchContext', 'expectedContext', 'authority']) || !authority
    || !onlyKeys(authority, ['flightOfferId', 'legacySelectionId', 'observedAt', 'selectionExpiresAt', 'now'])
    || !itinerary || !original || !expected
    || typeof authority.flightOfferId !== 'string' || !/^[a-z][a-z0-9_]{0,23}_[a-f0-9]{32}$/.test(authority.flightOfferId)
    || typeof authority.legacySelectionId !== 'string' || !/^sel_[a-f0-9]{32}$/.test(authority.legacySelectionId)
    || authority.legacySelectionId !== itinerary.selectionId) return invalid();
  const observedTime = instantMillis(authority.observedAt);
  const retention = instantMillis(authority.selectionExpiresAt);
  const now = instantMillis(authority.now);
  if (observedTime === undefined || retention === undefined || now === undefined || observedTime > now || retention <= observedTime) return invalid();
  const rawSegments = itinerary.segments;
  const rawLegs = itinerary.legs;
  if (!Array.isArray(rawSegments) || rawSegments.length < 1 || rawSegments.length > 8 || !Array.isArray(rawLegs)) return invalid();
  const segments: FlightObservation['segments'] = [];
  const absoluteTimes: Array<{ direction: string; departure?: number; arrival?: number }> = [];
  for (const item of rawSegments) {
    const segment = record(item);
    if (!segment || typeof segment.direction !== 'string' || !['OUTBOUND', 'INBOUND'].includes(segment.direction)
      || typeof segment.origin !== 'string' || !/^[A-Z]{3}$/.test(segment.origin)
      || typeof segment.destination !== 'string' || !/^[A-Z]{3}$/.test(segment.destination)
      || !integer(segment.durationMinutes, 0, 10_080)) return invalid();
    const departure = timestamp(segment.departureTime);
    const arrival = timestamp(segment.arrivalTime);
    const schedule = (parsed: ReturnType<typeof timestamp>) => ({
      local: parsed ? known(parsed.local) : unknown('INVALID_VALUE'),
      instant: parsed?.instant ? known(parsed.instant) : unknown(parsed ? undefined : 'INVALID_VALUE'),
      timeZone: unknown(),
    });
    const carrier = record(segment.carrier);
    segments.push({
      direction: segment.direction as 'OUTBOUND' | 'INBOUND', origin: segment.origin as string, destination: segment.destination as string,
      departure: schedule(departure), arrival: schedule(arrival), durationMinutes: segment.durationMinutes,
      displayCarrier: carrier?.name === 'Carrier not provided' ? unknown('AMBIGUOUS_LEGACY_DEFAULT') : labelFact(carrier?.name, 100),
      marketingCarrier: unknown(), flightNumber: labelFact(segment.flightNumber, 16),
    });
    absoluteTimes.push({ direction: String(segment.direction), departure: departure?.millis, arrival: arrival?.millis });
  }
  const directions = original.tripType === 'ROUND_TRIP' ? ['OUTBOUND', 'INBOUND'] as const : ['OUTBOUND'] as const;
  if (rawLegs.length !== directions.length || segments.some((s) => original.tripType === 'ONE_WAY' && s.direction === 'INBOUND')) return invalid();
  const legs: FlightObservation['legs'] = [];
  for (let index = 0; index < directions.length; index += 1) {
    const direction = directions[index];
    const leg = record(rawLegs[index]);
    const grouped = segments.filter((s) => s.direction === direction);
    const origin = direction === 'OUTBOUND' ? original.origin : original.destination;
    const destination = direction === 'OUTBOUND' ? original.destination : original.origin;
    if (!leg || leg.direction !== direction || grouped.length === 0 || grouped[0].origin !== origin || grouped[grouped.length - 1].destination !== destination
      || grouped.some((s, i) => i > 0 && grouped[i - 1].destination !== s.origin)
      || !integer(leg.durationMinutes, 0, 20_160) || leg.stops !== grouped.length - 1) return invalid();
    legs.push({ direction, origin, destination, durationMinutes: leg.durationMinutes, stops: grouped.length - 1 });
  }
  const providerExpiry = instantMillis(itinerary.expiresAt);
  const totalPrice = money(itinerary.price);
  const baggage = record(itinerary.baggage);
  const terms = record(itinerary.terms);
  const booleanFact = (value: unknown) => typeof value === 'boolean' ? known(value) : unknown();
  const observation: FlightObservation = {
    flightOfferId: authority.flightOfferId, observedAt: authority.observedAt as string,
    provenance: { source: 'NUITEE_LIVE', isFictional: false, observedAt: authority.observedAt as string,
      disclosure: 'Observed Nuitee flight result; unavailable facts remain unknown. Search prices can change and require verification.' },
    searchContext: original, segments, legs, cabin: unknown(), validatingCarrier: unknown(),
    fareFamily: labelFact(record(itinerary.fare)?.family, 80), totalPrice,
    expiresAt: providerExpiry !== undefined ? known(itinerary.expiresAt as string) : unknown(itinerary.expiresAt === undefined ? undefined : 'INVALID_VALUE'),
    baggage: {
      carryOn: baggage?.carryOn === true ? known(true) : unknown('AMBIGUOUS_LEGACY_DEFAULT'),
      checked: baggage?.checked === true ? known(true) : unknown('AMBIGUOUS_LEGACY_DEFAULT'),
      // Legacy descriptions can be synthesized from rounded/clamped piece counts.
      allowances: unknown('AMBIGUOUS_LEGACY_DEFAULT'),
    },
    terms: { changeable: booleanFact(terms?.changeable), refundable: booleanFact(terms?.refundable) },
    verificationStatus: 'UNVERIFIED',
  };
  const currentReasons: FlightPrerequisiteReason[] = [];
  if (JSON.stringify(original) !== JSON.stringify(expected)) currentReasons.push('CONTEXT_MISMATCH');
  if (now >= retention) currentReasons.push('SELECTION_EXPIRED');
  if (providerExpiry !== undefined && now >= providerExpiry) currentReasons.push('PROVIDER_EXPIRED');
  if (itinerary.expiresAt !== undefined && providerExpiry === undefined) currentReasons.push('INVALID_PROVIDER_EXPIRY');
  const priceReasons = [...currentReasons];
  if (totalPrice.status === 'UNKNOWN') priceReasons.push('PRICE_UNKNOWN');
  else if (totalPrice.value.currency !== original.currency || totalPrice.value.currency !== expected.currency) priceReasons.push('CURRENCY_MISMATCH');
  const scheduleReasons: FlightPrerequisiteReason[] = [...currentReasons];
  if (absoluteTimes.some((t) => t.departure === undefined || t.arrival === undefined)) scheduleReasons.push('ABSOLUTE_TIME_UNKNOWN');
  for (const direction of directions) {
    const times = absoluteTimes.filter((t) => t.direction === direction);
    const firstDeparture = segments.find((s) => s.direction === direction)!.departure.local;
    const expectedDate = direction === 'OUTBOUND' ? original.departureDate : original.returnDate;
    if (firstDeparture.status === 'KNOWN' && firstDeparture.value.slice(0, 10) !== expectedDate
      && !scheduleReasons.includes('SCHEDULE_DATE_MISMATCH')) scheduleReasons.push('SCHEDULE_DATE_MISMATCH');
    if (times.some((t, i) => (t.departure !== undefined && t.arrival !== undefined && t.arrival <= t.departure)
      || (i > 0 && t.departure !== undefined && times[i - 1].arrival !== undefined && t.departure < times[i - 1].arrival!))) {
      if (!scheduleReasons.includes('SCHEDULE_CONFLICT')) scheduleReasons.push('SCHEDULE_CONFLICT');
    }
  }
  if (directions.length === 2) {
    const outboundTimes = absoluteTimes.filter((t) => t.direction === 'OUTBOUND');
    const outboundArrival = outboundTimes[outboundTimes.length - 1].arrival;
    const inboundDeparture = absoluteTimes.find((t) => t.direction === 'INBOUND')!.departure;
    if (outboundArrival !== undefined && inboundDeparture !== undefined && inboundDeparture < outboundArrival
      && !scheduleReasons.includes('SCHEDULE_CONFLICT')) scheduleReasons.push('SCHEDULE_CONFLICT');
  }
  const localReasons: FlightPrerequisiteReason[] = [...currentReasons];
  if (segments.some((s) => s.departure.local.status === 'UNKNOWN' || s.arrival.local.status === 'UNKNOWN')) localReasons.push('LOCAL_TIME_UNKNOWN');
  localReasons.push('TIMEZONE_UNKNOWN');
  const prerequisite = (reasons: FlightPrerequisiteReason[]) => reasons.length === 0
    ? { satisfied: true as const, reasons } : { satisfied: false as const, reasons };
  return { status: 'observed', observation, prerequisites: {
    display: prerequisite([]), observedPrice: prerequisite(priceReasons),
    absoluteSchedule: prerequisite(scheduleReasons), localRules: prerequisite(localReasons),
    requestVerification: prerequisite([...currentReasons]),
  } };
}
