import type { AssistantUIMessage } from '@noodleseed/assistant/client';
import { AIRPORTS } from '../data/airports.generated';

export type TripPhase =
  | 'idle'
  | 'planned'
  | 'searching'
  | 'comparing'
  | 'no-results'
  | 'selected'
  | 'verifying'
  | 'verified'
  | 'comparing-stays'
  | 'stay-selected'
  | 'rewards'
  | 'insurance'
  | 'trip-review'
  | 'error';

export interface TripProjection {
  readonly phase: TripPhase;
  readonly origin?: string;
  readonly destination?: string;
  readonly departureDate?: string;
  readonly returnDate?: string;
  readonly travelers?: string;
  readonly cabinClass?: string;
  readonly currency?: string;
  readonly country?: string;
  readonly focus?: 'stays' | 'rewards' | 'insurance' | 'trip';
  readonly stayDestination?: string;
  readonly checkInDate?: string;
  readonly checkOutDate?: string;
  readonly hasFlightSelection?: boolean;
  readonly hasStaySelection?: boolean;
  readonly hasRewardsReview?: boolean;
  readonly hasInsuranceComparison?: boolean;
  readonly protectionDestination?: string;
  readonly selectedFlight?: SelectedFlightSummary;
  readonly selectedStay?: SelectedStaySummary;
}

export interface TripMoneySummary {
  readonly total: number;
  readonly currency: string;
}

export interface SelectedFlightSummary {
  readonly dataSource: 'live_nuitee_selection';
  readonly sourceLabel: 'Nuitee search fare' | 'Verified Nuitee fare';
  readonly carrierName: string;
  readonly carrierCode: string;
  readonly origin: string;
  readonly destination: string;
  readonly departureDate: string;
  readonly returnDate?: string;
  readonly departureTime: string;
  readonly returnDepartureTime?: string;
  readonly travelers: string;
  readonly searchPrice: TripMoneySummary;
  readonly currentPrice?: TripMoneySummary;
  readonly status: 'selected' | 'verified';
}

export interface SelectedStaySummary {
  readonly dataSource: 'live_nuitee' | 'illustrative';
  readonly sourceLabel: 'Current Nuitee hotel rate' | 'Illustrative stay';
  readonly propertyName: string;
  readonly destination: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly nights: number;
  readonly subtotal: TripMoneySummary;
  readonly status: 'selected';
}

export const EMPTY_TRIP: TripProjection = { phase: 'idle' };

export interface SupplementalToolResult {
  readonly afterTranscriptResultCount?: number;
  readonly tool: string;
  readonly result: unknown;
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringField(
  value: UnknownRecord,
  key: string,
  pattern: RegExp,
): string | undefined {
  const candidate = value[key];
  return typeof candidate === 'string' && pattern.test(candidate)
    ? candidate
    : undefined;
}

function integerField(
  value: UnknownRecord,
  key: string,
  minimum: number,
  maximum: number,
): number | undefined {
  const candidate = value[key];
  return typeof candidate === 'number'
    && Number.isInteger(candidate)
    && candidate >= minimum
    && candidate <= maximum
    ? candidate
    : undefined;
}

const IATA_PATTERN = /^[A-Z]{3}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const CARRIER_CODE_PATTERN = /^(?:[A-Z0-9]{2,3}|—)$/;
const FLIGHT_SELECTION_PATTERN = /^sel_[a-f0-9]{32}$/;
const AIRPORT_BY_IATA = new Map<string, (typeof AIRPORTS)[number]>(
  AIRPORTS.map((airport) => [airport.iata, airport]),
);
const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });
const STAY_SELECTION_PATTERN = /^hsel_[a-f0-9]{32}$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CABIN_LABELS = {
  ECONOMY: 'Economy',
  PREMIUM_ECONOMY: 'Premium Economy',
  BUSINESS: 'Business',
  FIRST: 'First',
} as const;

function isoDate(value: UnknownRecord, key: string): string | undefined {
  const candidate = value[key];
  if (typeof candidate !== 'string') return undefined;
  const match = ISO_DATE_PATTERN.exec(candidate);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return undefined;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day >= 1 && day <= daysInMonth[month - 1] ? candidate : undefined;
}

function travelerCopy(adults: number, children: number, infants: number) {
  const groups = [`${adults} ${adults === 1 ? 'adult' : 'adults'}`];
  if (children > 0) {
    groups.push(`${children} ${children === 1 ? 'child' : 'children'}`);
  }
  if (infants > 0) {
    groups.push(`${infants} ${infants === 1 ? 'infant' : 'infants'}`);
  }
  return groups.join(', ');
}

function cabinLabel(value: unknown) {
  return typeof value === 'string' && value in CABIN_LABELS
    ? CABIN_LABELS[value as keyof typeof CABIN_LABELS]
    : undefined;
}

function boundedText(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length >= minimum && trimmed.length <= maximum
    ? trimmed
    : undefined;
}

function moneySummary(value: unknown): TripMoneySummary | undefined {
  if (!isRecord(value)) return undefined;
  const total = value.total;
  const currency = stringField(value, 'currency', CURRENCY_PATTERN);
  return typeof total === 'number'
    && Number.isFinite(total)
    && total >= 0
    && total <= 100_000_000
    && currency
    ? { total, currency }
    : undefined;
}

function illustrativeMoneySummary(value: unknown): TripMoneySummary | undefined {
  if (!isRecord(value)) return undefined;
  const amount = value.amount;
  const currency = stringField(value, 'currency', CURRENCY_PATTERN);
  return typeof amount === 'number'
    && Number.isFinite(amount)
    && amount >= 0
    && amount <= 1_000_000
    && currency
    ? { total: amount, currency }
    : undefined;
}

function withoutFlightSelection(current: TripProjection): TripProjection {
  const {
    hasFlightSelection,
    selectedFlight,
    ...rest
  } = current;
  void hasFlightSelection;
  void selectedFlight;
  return current.selectedFlight
    ? { ...rest, phase: 'comparing' }
    : rest;
}

function withoutStaySelection(current: TripProjection): TripProjection {
  const {
    hasStaySelection,
    selectedStay,
    ...rest
  } = current;
  void hasStaySelection;
  void selectedStay;
  return current.selectedStay
    ? { ...rest, phase: 'comparing-stays', focus: 'stays' }
    : rest;
}

function applyFlightSearchProjection(
  current: TripProjection,
  next: TripProjection,
): TripProjection {
  const {
    phase,
    origin,
    destination,
    departureDate,
    returnDate,
    travelers,
    cabinClass,
    currency,
    country,
    focus,
    hasFlightSelection,
    selectedFlight,
    ...crossDomain
  } = current;
  void phase;
  void origin;
  void destination;
  void departureDate;
  void returnDate;
  void travelers;
  void cabinClass;
  void currency;
  void country;
  void focus;
  void hasFlightSelection;
  void selectedFlight;
  return {
    ...(flightSearchBreaksTrip(current, next) ? {} : crossDomain),
    ...next,
  };
}

function nightsBetween(checkInDate: string, checkOutDate: string) {
  const [inYear, inMonth, inDay] = checkInDate.split('-').map(Number);
  const [outYear, outMonth, outDay] = checkOutDate.split('-').map(Number);
  return Math.round(
    (Date.UTC(outYear!, outMonth! - 1, outDay!)
      - Date.UTC(inYear!, inMonth! - 1, inDay!)) / 86_400_000,
  );
}

function dateOrdinal(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

function dateRangesDoNotOverlap(
  leftStart?: string,
  leftEnd?: string,
  rightStart?: string,
  rightEnd?: string,
) {
  if (!leftStart || !rightStart) return false;
  const resolvedLeftEnd = leftEnd ?? leftStart;
  const resolvedRightEnd = rightEnd ?? rightStart;
  const materialGap = 2 * 86_400_000;
  return dateOrdinal(resolvedLeftEnd) + materialGap < dateOrdinal(rightStart)
    || dateOrdinal(resolvedRightEnd) + materialGap < dateOrdinal(leftStart);
}

function valuesConflict(left?: string, right?: string) {
  return left !== undefined && right !== undefined && left !== right;
}

function normalizeDestination(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function destinationAliases(value: string) {
  const normalizedValue = normalizeDestination(value);
  const aliases = new Set([normalizedValue]);
  const code = value.toUpperCase();
  if (IATA_PATTERN.test(code)) {
    const airport = AIRPORT_BY_IATA.get(code);
    if (airport) {
      aliases.add(normalizeDestination(airport.city));
      aliases.add(normalizeDestination(airport.country));
      const countryName = REGION_NAMES.of(airport.country);
      if (countryName) aliases.add(normalizeDestination(countryName));
    }
  }
  return aliases;
}

function destinationsMatch(left?: string, right?: string) {
  if (!left || !right) return false;
  const rightAliases = destinationAliases(right);
  return [...destinationAliases(left)].some((alias) => rightAliases.has(alias));
}

function comparableDestinationConflict(left?: string, right?: string) {
  return Boolean(left && right && !destinationsMatch(left, right));
}

function flightAndStayDatesConflict(
  departureDate?: string,
  returnDate?: string,
  checkInDate?: string,
  checkOutDate?: string,
) {
  if (!departureDate || !checkInDate) return false;
  if (returnDate) {
    if (!checkOutDate) return false;
    return dateOrdinal(checkInDate) < dateOrdinal(departureDate)
      || dateOrdinal(checkOutDate) > dateOrdinal(returnDate);
  }

  const checkInOffset = dateOrdinal(checkInDate) - dateOrdinal(departureDate);
  const latestReasonableCheckIn = 30 * 86_400_000;
  return checkInOffset < 0
    || checkInOffset > latestReasonableCheckIn;
}

function flightSearchBreaksTrip(
  current: TripProjection,
  next: TripProjection,
) {
  const hasPriorFlightScope = Boolean(
    current.origin
    && current.destination
    && current.departureDate,
  );
  const priorFlightScopeChanged = hasPriorFlightScope && (
    current.origin !== next.origin
    || current.destination !== next.destination
    || current.departureDate !== next.departureDate
    || current.returnDate !== next.returnDate
    || current.travelers !== next.travelers
    || valuesConflict(current.currency, next.currency)
  );
  const uncorrelatedStayScope = !hasPriorFlightScope && Boolean(
    current.stayDestination
    || current.checkInDate
    || current.checkOutDate
    || current.selectedStay,
  ) && !destinationsMatch(current.stayDestination, next.destination);

  return priorFlightScopeChanged
    || uncorrelatedStayScope
    || flightAndStayDatesConflict(
      next.departureDate,
      next.returnDate,
      current.checkInDate,
      current.checkOutDate,
    )
    || (
      current.hasInsuranceComparison === true
      && (
        dateRangesDoNotOverlap(
          current.departureDate,
          current.returnDate,
          next.departureDate,
          next.returnDate,
        )
        || valuesConflict(current.travelers, next.travelers)
        || valuesConflict(current.currency, next.currency)
        || comparableDestinationConflict(
          current.protectionDestination,
          next.destination,
        )
      )
    );
}

function hotelSearchBreaksTrip(
  current: TripProjection,
  destination: string,
  checkInDate: string,
  checkOutDate: string,
  currency?: string,
) {
  return comparableDestinationConflict(current.stayDestination, destination)
    || comparableDestinationConflict(current.destination, destination)
    || valuesConflict(current.currency, currency)
    || (
      current.origin && current.destination
        ? flightAndStayDatesConflict(
          current.departureDate,
          current.returnDate,
          checkInDate,
          checkOutDate,
        )
        : dateRangesDoNotOverlap(
          current.departureDate,
          current.returnDate,
          checkInDate,
          checkOutDate,
        )
    )
    || dateRangesDoNotOverlap(
      current.checkInDate,
      current.checkOutDate,
      checkInDate,
      checkOutDate,
    );
}

function insuranceComparisonBreaksTrip(
  current: TripProjection,
  next: TripProjection,
) {
  return comparableDestinationConflict(
    current.protectionDestination,
    next.protectionDestination,
  )
    || comparableDestinationConflict(current.destination, next.protectionDestination)
    || dateRangesDoNotOverlap(
      current.departureDate,
      current.returnDate,
      next.departureDate,
      next.returnDate,
    )
    || dateRangesDoNotOverlap(
      current.checkInDate,
      current.checkOutDate,
      next.departureDate,
      next.returnDate,
    )
    || valuesConflict(current.travelers, next.travelers)
    || valuesConflict(current.currency, next.currency);
}

function flightOptionSummary(
  value: unknown,
  context: TripProjection,
): SelectedFlightSummary | undefined {
  if (!isRecord(value)) return undefined;
  const selectionId = stringField(value, 'selectionId', FLIGHT_SELECTION_PATTERN);
  const route = value.route;
  const carrier = value.carrier;
  const departureTime = boundedText(value.departureTime, 1, 64);
  const searchPrice = moneySummary(value.price);
  if (
    !selectionId
    || !isRecord(route)
    || !isRecord(carrier)
    || !departureTime
    || !searchPrice
    || !context.departureDate
    || !context.travelers
  ) return undefined;

  const origin = stringField(route, 'origin', IATA_PATTERN);
  const destination = stringField(route, 'destination', IATA_PATTERN);
  const carrierName = boundedText(carrier.name, 1, 100);
  const carrierCode = typeof carrier.code === 'string'
    && CARRIER_CODE_PATTERN.test(carrier.code)
    ? carrier.code
    : undefined;
  if (
    !origin
    || !destination
    || !carrierName
    || !carrierCode
    || origin !== context.origin
    || destination !== context.destination
  ) return undefined;

  let returnDepartureTime: string | undefined;
  if (Array.isArray(value.legs) && value.legs.length <= 2) {
    const inbound = value.legs.find((leg) => isRecord(leg) && leg.direction === 'INBOUND');
    if (isRecord(inbound)) {
      returnDepartureTime = boundedText(inbound.departureTime, 1, 64);
      if (!returnDepartureTime) return undefined;
    }
  } else if (value.legs !== undefined) {
    return undefined;
  }

  return {
    dataSource: 'live_nuitee_selection',
    sourceLabel: 'Nuitee search fare',
    carrierName,
    carrierCode,
    origin,
    destination,
    departureDate: context.departureDate,
    ...(context.returnDate ? { returnDate: context.returnDate } : {}),
    departureTime,
    ...(returnDepartureTime ? { returnDepartureTime } : {}),
    travelers: context.travelers,
    searchPrice,
    status: 'selected',
  };
}

function flightOptions(
  result: UnknownRecord,
  context: TripProjection,
): ReadonlyMap<string, SelectedFlightSummary> {
  if (
    (result.status !== 'success' && result.status !== 'partial')
    || !Array.isArray(result.itineraries)
    || result.itineraries.length > 10
  ) return new Map();

  const options = new Map<string, SelectedFlightSummary>();
  const duplicates = new Set<string>();
  for (const itinerary of result.itineraries) {
    const summary = flightOptionSummary(itinerary, context);
    if (!summary || !isRecord(itinerary)) continue;
    const selectionId = stringField(itinerary, 'selectionId', FLIGHT_SELECTION_PATTERN);
    if (!selectionId) continue;
    if (options.has(selectionId)) {
      duplicates.add(selectionId);
      options.delete(selectionId);
      continue;
    }
    if (!duplicates.has(selectionId)) options.set(selectionId, summary);
  }
  return options;
}

function stayOptionSummary(
  value: unknown,
  context: TripProjection,
): SelectedStaySummary | undefined {
  if (!isRecord(value) || (value.dataSource !== 'illustrative' && value.dataSource !== 'live_nuitee')) return undefined;
  const selectionId = stringField(value, 'selectionId', STAY_SELECTION_PATTERN);
  const propertyName = boundedText(value.name, 2, 100);
  const destination = boundedText(value.city, 2, 80);
  const nights = integerField(value, 'nights', 1, 30);
  const subtotal = illustrativeMoneySummary(value.staySubtotal);
  if (
    !selectionId
    || !propertyName
    || !destination
    || nights === undefined
    || !subtotal
    || !context.checkInDate
    || !context.checkOutDate
    || nights !== nightsBetween(context.checkInDate, context.checkOutDate)
    || !destinationsMatch(context.stayDestination, destination)
    || Boolean(context.currency && context.currency !== subtotal.currency)
  ) return undefined;

  return {
    dataSource: value.dataSource,
    sourceLabel: value.dataSource === 'live_nuitee' ? 'Current Nuitee hotel rate' : 'Illustrative stay',
    propertyName,
    destination,
    checkInDate: context.checkInDate,
    checkOutDate: context.checkOutDate,
    nights,
    subtotal,
    status: 'selected',
  };
}

function stayOptions(
  result: UnknownRecord,
  context: TripProjection,
): ReadonlyMap<string, SelectedStaySummary> {
  if (
    (result.status !== 'success' && result.status !== 'partial')
    || (result.dataSource !== 'illustrative' && result.dataSource !== 'live_nuitee')
    || !Array.isArray(result.hotels)
    || result.hotels.length > 10
  ) return new Map();

  const options = new Map<string, SelectedStaySummary>();
  const duplicates = new Set<string>();
  for (const hotel of result.hotels) {
    const summary = stayOptionSummary(hotel, context);
    if (!summary || !isRecord(hotel)) continue;
    const selectionId = stringField(hotel, 'selectionId', STAY_SELECTION_PATTERN);
    if (!selectionId) continue;
    if (options.has(selectionId)) {
      duplicates.add(selectionId);
      options.delete(selectionId);
      continue;
    }
    if (!duplicates.has(selectionId)) options.set(selectionId, summary);
  }
  return options;
}

function planProjection(result: UnknownRecord): TripProjection | undefined {
  if (result.status !== 'planned') return undefined;
  const origin = stringField(result, 'origin', IATA_PATTERN);
  const destination = stringField(result, 'destination', IATA_PATTERN);
  const departureDate = isoDate(result, 'departureDate');
  const returnDate = result.returnDate === undefined
    ? undefined
    : isoDate(result, 'returnDate');
  const adults = integerField(result, 'adults', 1, 9);
  const cabinClass = cabinLabel(result.cabinClass);
  const currency = stringField(result, 'currency', CURRENCY_PATTERN);
  const country = stringField(result, 'country', COUNTRY_PATTERN);
  if (
    !origin
    || !destination
    || !departureDate
    || (result.returnDate !== undefined && !returnDate)
    || adults === undefined
    || !cabinClass
    || !currency
    || !country
  ) {
    return undefined;
  }
  return {
    phase: 'planned',
    origin,
    destination,
    departureDate,
    ...(returnDate ? { returnDate } : {}),
    travelers: travelerCopy(adults, 0, 0),
    cabinClass,
    currency,
    country,
  };
}

function searchProjection(result: UnknownRecord): TripProjection | undefined {
  if (
    result.status !== 'success'
    && result.status !== 'partial'
    && result.status !== 'empty'
  ) {
    return undefined;
  }
  const context = result.searchContext;
  if (!isRecord(context)) return undefined;

  const origin = stringField(context, 'origin', IATA_PATTERN);
  const destination = stringField(context, 'destination', IATA_PATTERN);
  const departureDate = isoDate(context, 'departureDate');
  const returnDate = context.returnDate === undefined
    ? undefined
    : isoDate(context, 'returnDate');
  const adults = integerField(context, 'adults', 1, 9);
  const children = integerField(context, 'children', 0, 8);
  const infants = integerField(context, 'infants', 0, 9);
  const cabinClass = context.cabinClass === undefined
    ? undefined
    : cabinLabel(context.cabinClass);
  const currency = context.currency === undefined
    ? undefined
    : stringField(context, 'currency', CURRENCY_PATTERN);
  const country = context.country === undefined
    ? undefined
    : stringField(context, 'country', COUNTRY_PATTERN);

  if (
    !origin
    || !destination
    || !departureDate
    || (context.returnDate !== undefined && !returnDate)
    || adults === undefined
    || children === undefined
    || infants === undefined
    || (context.cabinClass !== undefined && !cabinClass)
    || (context.currency !== undefined && !currency)
    || (context.country !== undefined && !country)
  ) {
    return undefined;
  }

  return {
    phase: result.status === 'empty' ? 'no-results' : 'comparing',
    origin,
    destination,
    departureDate,
    ...(returnDate ? { returnDate } : {}),
    travelers: travelerCopy(adults, children, infants),
    ...(cabinClass ? { cabinClass } : {}),
    ...(currency ? { currency } : {}),
    ...(country ? { country } : {}),
  };
}

interface ProjectionState {
  readonly projection: TripProjection;
  readonly flightOptions: ReadonlyMap<string, SelectedFlightSummary>;
  readonly stayOptions: ReadonlyMap<string, SelectedStaySummary>;
  readonly activeFlightSelectionId?: string;
  readonly activeStaySelectionId?: string;
}

interface CorrelatedFlightSelection {
  readonly selectionId: string;
  readonly summary: SelectedFlightSummary;
}

interface CorrelatedStaySelection {
  readonly selectionId: string;
  readonly summary: SelectedStaySummary;
}

function sameMoney(left: TripMoneySummary, right: TripMoneySummary) {
  return left.total === right.total && left.currency === right.currency;
}

function correlatedReviewedFlight(
  state: ProjectionState,
  value: unknown,
): CorrelatedFlightSelection | undefined {
  if (!isRecord(value) || value.dataSource !== 'live_nuitee_selection') {
    return undefined;
  }
  const selectionId = stringField(value, 'selectionId', FLIGHT_SELECTION_PATTERN);
  const searchPrice = moneySummary(value.searchPrice);
  const option = selectionId ? state.flightOptions.get(selectionId) : undefined;
  if (!selectionId || !searchPrice || !option || !sameMoney(searchPrice, option.searchPrice)) {
    return undefined;
  }

  const current = state.projection.selectedFlight;
  return {
    selectionId,
    summary: state.activeFlightSelectionId === selectionId
      && current
      && sameMoney(current.searchPrice, searchPrice)
      ? current
      : option,
  };
}

function correlatedReviewedStay(
  state: ProjectionState,
  value: unknown,
): CorrelatedStaySelection | undefined {
  if (
    !isRecord(value)
    || (value.dataSource !== 'illustrative' && value.dataSource !== 'live_nuitee')
  ) return undefined;
  const selectionId = stringField(value, 'selectionId', STAY_SELECTION_PATTERN);
  const option = selectionId ? state.stayOptions.get(selectionId) : undefined;
  const propertyName = boundedText(value.propertyName, 2, 100);
  const destination = boundedText(value.city, 2, 80);
  const checkInDate = isoDate(value, 'checkInDate');
  const checkOutDate = isoDate(value, 'checkOutDate');
  const nights = integerField(value, 'nights', 1, 30);
  const subtotal = illustrativeMoneySummary(value.staySubtotal);
  if (
    !selectionId
    || !option
    || !propertyName
    || !destination
    || !checkInDate
    || !checkOutDate
    || nights === undefined
    || !subtotal
    || option.dataSource !== value.dataSource
    || option.propertyName !== propertyName
    || !destinationsMatch(option.destination, destination)
    || option.checkInDate !== checkInDate
    || option.checkOutDate !== checkOutDate
    || option.nights !== nights
    || !sameMoney(option.subtotal, subtotal)
  ) return undefined;

  const current = state.projection.selectedStay;
  return {
    selectionId,
    summary: state.activeStaySelectionId === selectionId && current
      ? current
      : option,
  };
}

function projectResult(
  state: ProjectionState,
  tool: string,
  rawResult: unknown,
): ProjectionState {
  const current = state.projection;

  switch (tool) {
    case 'plan_flight_search': {
      if (!isRecord(rawResult)) return state;
      const planned = planProjection(rawResult);
      const incompatible = planned
        ? flightSearchBreaksTrip(current, planned)
        : false;
      return planned
        ? {
          ...state,
          projection: applyFlightSearchProjection(current, planned),
          flightOptions: new Map(),
          activeFlightSelectionId: undefined,
          ...(incompatible
            ? {
              stayOptions: new Map<string, SelectedStaySummary>(),
              activeStaySelectionId: undefined,
            }
            : {}),
        }
        : state;
    }
    case 'search_flights': {
      const cleared = withoutFlightSelection(current);
      if (!isRecord(rawResult)) {
        return {
          ...state,
          projection: cleared,
          flightOptions: new Map(),
          activeFlightSelectionId: undefined,
        };
      }
      if (rawResult.status === 'error') {
        return {
          ...state,
          projection: { ...cleared, phase: 'error' },
          flightOptions: new Map(),
          activeFlightSelectionId: undefined,
        };
      }
      const searched = searchProjection(rawResult);
      const incompatible = searched
        ? flightSearchBreaksTrip(cleared, searched)
        : false;
      const projection = searched
        ? applyFlightSearchProjection(cleared, searched)
        : cleared;
      return {
        ...state,
        projection,
        flightOptions: searched ? flightOptions(rawResult, searched) : new Map(),
        activeFlightSelectionId: undefined,
        ...(incompatible
          ? {
            stayOptions: new Map<string, SelectedStaySummary>(),
            activeStaySelectionId: undefined,
          }
          : {}),
      };
    }
    case 'select_flight_offer': {
      if (!isRecord(rawResult) || rawResult.status !== 'selected') return state;
      const selectionId = stringField(rawResult, 'selectionId', FLIGHT_SELECTION_PATTERN);
      const selectedFlight = selectionId
        ? state.flightOptions.get(selectionId)
        : undefined;
      if (!selectionId || !selectedFlight) return state;
      return {
        ...state,
        projection: {
          ...current,
          phase: 'selected',
          hasFlightSelection: true,
          selectedFlight,
        },
        activeFlightSelectionId: selectionId,
      };
    }
    case 'verify_flight_offer': {
      if (!isRecord(rawResult)) return state;
      if (rawResult.status === 'error') {
        if (!current.selectedFlight) {
          return { ...state, projection: { ...current, phase: 'error' } };
        }
        const {
          currentPrice: _discardedCurrentPrice,
          ...selectedFlight
        } = current.selectedFlight;
        return {
          ...state,
          projection: {
            ...current,
            phase: 'error',
            hasFlightSelection: true,
            selectedFlight: {
              ...selectedFlight,
              sourceLabel: 'Nuitee search fare',
              status: 'selected',
            },
          },
        };
      }
      const verification = rawResult.verification;
      if (
        rawResult.status !== 'success'
        || !isRecord(verification)
        || verification.status !== 'success'
        || verification.availability !== 'available'
        || !current.selectedFlight
        || !state.activeFlightSelectionId
      ) return state;
      const selectionId = stringField(verification, 'selectionId', FLIGHT_SELECTION_PATTERN);
      const currentPrice = moneySummary(verification.currentPrice);
      if (selectionId !== state.activeFlightSelectionId || !currentPrice) return state;
      return {
        ...state,
        projection: {
          ...current,
          phase: 'verified',
          hasFlightSelection: true,
          selectedFlight: {
            ...current.selectedFlight,
            currentPrice,
            sourceLabel: 'Verified Nuitee fare',
            status: 'verified',
          },
        },
      };
    }
    case 'search_hotels': {
      const cleared = withoutStaySelection(current);
      if (!isRecord(rawResult)) {
        return {
          ...state,
          projection: cleared,
          stayOptions: new Map(),
          activeStaySelectionId: undefined,
        };
      }
      if (
        (rawResult.status !== 'success' && rawResult.status !== 'partial' && rawResult.status !== 'empty')
        || (rawResult.dataSource !== 'illustrative' && rawResult.dataSource !== 'live_nuitee')
        || !isRecord(rawResult.searchContext)
      ) {
        return {
          ...state,
          projection: cleared,
          stayOptions: new Map(),
          activeStaySelectionId: undefined,
        };
      }
      const destination = boundedText(rawResult.searchContext.destination, 2, 80);
      const checkInDate = isoDate(rawResult.searchContext, 'checkInDate');
      const checkOutDate = isoDate(rawResult.searchContext, 'checkOutDate');
      const currency = stringField(rawResult.searchContext, 'currency', CURRENCY_PATTERN);
      if (
        !destination
        || !checkInDate
        || !checkOutDate
        || nightsBetween(checkInDate, checkOutDate) < 1
        || nightsBetween(checkInDate, checkOutDate) > 30
      ) {
        return {
          ...state,
          projection: cleared,
          stayOptions: new Map(),
          activeStaySelectionId: undefined,
        };
      }
      const incompatible = hotelSearchBreaksTrip(
        cleared,
        destination,
        checkInDate,
        checkOutDate,
        currency,
      );
      const compatibleProjection = incompatible ? EMPTY_TRIP : cleared;
      const projection: TripProjection = {
        ...compatibleProjection,
        phase: 'comparing-stays',
        focus: 'stays',
        stayDestination: destination,
        checkInDate,
        checkOutDate,
        ...(currency ? { currency } : {}),
      };
      return {
        ...state,
        projection,
        stayOptions: stayOptions(rawResult, projection),
        activeStaySelectionId: undefined,
        ...(incompatible
          ? {
            flightOptions: new Map<string, SelectedFlightSummary>(),
            activeFlightSelectionId: undefined,
          }
          : {}),
      };
    }
    case 'select_hotel': {
      if (!isRecord(rawResult) || rawResult.status !== 'selected') return state;
      const selectionId = stringField(rawResult, 'selectionId', STAY_SELECTION_PATTERN);
      const selectedStay = selectionId
        ? state.stayOptions.get(selectionId)
        : undefined;
      if (!selectionId || !selectedStay) return state;
      return {
        ...state,
        projection: {
          ...current,
          phase: 'stay-selected',
          focus: 'stays',
          hasStaySelection: true,
          selectedStay,
        },
        activeStaySelectionId: selectionId,
      };
    }
    case 'open_loyalty':
      return isRecord(rawResult)
        && rawResult.status === 'success'
        && rawResult.dataSource === 'illustrative'
        ? {
          ...state,
          projection: {
            ...current,
            phase: 'rewards',
            focus: 'rewards',
            hasRewardsReview: true,
          },
        }
        : state;
    case 'compare_reward_flights':
      return isRecord(rawResult)
        && (rawResult.status === 'success' || rawResult.status === 'empty')
        && rawResult.dataSource === 'illustrative'
        ? {
          ...state,
          projection: {
            ...current,
            phase: 'rewards',
            focus: 'rewards',
            hasRewardsReview: true,
          },
        }
        : state;
    case 'compare_travel_insurance':
      if (
        !isRecord(rawResult)
        || rawResult.status !== 'success'
        || rawResult.dataSource !== 'illustrative'
      ) return state;
      {
        const searchContext = isRecord(rawResult.searchContext)
          ? rawResult.searchContext
          : undefined;
        const adults = searchContext
          ? integerField(searchContext, 'adults', 1, 9)
          : undefined;
        const children = searchContext
          ? integerField(searchContext, 'children', 0, 8)
          : undefined;
        const departureDate = searchContext
          ? isoDate(searchContext, 'departureDate')
          : undefined;
        const returnDate = searchContext
          ? isoDate(searchContext, 'returnDate')
          : undefined;
        const currency = searchContext
          ? stringField(searchContext, 'currency', CURRENCY_PATTERN)
          : undefined;
        const country = searchContext
          ? stringField(searchContext, 'residenceCountry', COUNTRY_PATTERN)
          : undefined;
        const protectionDestination = searchContext
          ? boundedText(searchContext.destination, 2, 80)
          : undefined;
        const comparison: TripProjection = {
          phase: 'insurance',
          focus: 'insurance',
          hasInsuranceComparison: true,
          ...(departureDate ? { departureDate } : {}),
          ...(returnDate ? { returnDate } : {}),
          ...(adults === undefined || children === undefined
            ? {}
            : { travelers: travelerCopy(adults, children, 0) }),
          ...(currency ? { currency } : {}),
          ...(country ? { country } : {}),
          ...(protectionDestination ? { protectionDestination } : {}),
        };
        const incompatible = insuranceComparisonBreaksTrip(current, comparison);
        const compatibleProjection = incompatible ? EMPTY_TRIP : current;
        return {
          ...state,
          projection: {
            ...compatibleProjection,
            phase: 'insurance',
            focus: 'insurance',
            hasInsuranceComparison: true,
            ...(compatibleProjection.departureDate || !departureDate
              ? {}
              : { departureDate }),
            ...(compatibleProjection.returnDate || !returnDate ? {} : { returnDate }),
            ...(compatibleProjection.travelers || adults === undefined || children === undefined
              ? {}
              : { travelers: travelerCopy(adults, children, 0) }),
            ...(compatibleProjection.currency || !currency ? {} : { currency }),
            ...(compatibleProjection.country || !country ? {} : { country }),
            ...(protectionDestination ? { protectionDestination } : {}),
          },
          ...(incompatible
            ? {
              flightOptions: new Map<string, SelectedFlightSummary>(),
              stayOptions: new Map<string, SelectedStaySummary>(),
              activeFlightSelectionId: undefined,
              activeStaySelectionId: undefined,
            }
            : {}),
        };
      }
    case 'review_trip':
      if (
        !isRecord(rawResult)
        || (rawResult.status !== 'ready' && rawResult.status !== 'incomplete')
        || rawResult.dataSource !== 'illustrative'
      ) return state;
      {
        const reviewedFlight = correlatedReviewedFlight(state, rawResult.flight);
        const reviewedStay = correlatedReviewedStay(state, rawResult.stay);
        return {
          ...state,
          projection: {
            ...current,
            phase: 'trip-review',
            focus: 'trip',
            hasRewardsReview: true,
            ...(reviewedFlight
              ? {
                hasFlightSelection: true,
                selectedFlight: reviewedFlight.summary,
              }
              : {}),
            ...(reviewedStay
              ? {
                hasStaySelection: true,
                selectedStay: reviewedStay.summary,
              }
              : {}),
          },
          ...(reviewedFlight
            ? { activeFlightSelectionId: reviewedFlight.selectionId }
            : {}),
          ...(reviewedStay
            ? { activeStaySelectionId: reviewedStay.selectionId }
            : {}),
        };
      }
    default:
      return state;
  }
}

export function projectTrip(
  messages: readonly AssistantUIMessage[],
  transientPhase?: TripPhase,
  supplementalResults: readonly SupplementalToolResult[] = [],
): TripProjection {
  let state: ProjectionState = {
    projection: EMPTY_TRIP,
    flightOptions: new Map(),
    stayOptions: new Map(),
  };

  const anchoredResults = new Map<number, SupplementalToolResult[]>();
  const trailingResults: SupplementalToolResult[] = [];
  let transcriptResultCount = 0;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'data-tool-result') transcriptResultCount += 1;
    }
  }
  for (const supplemental of supplementalResults) {
    const anchor = supplemental.afterTranscriptResultCount;
    if (anchor === undefined) {
      trailingResults.push(supplemental);
      continue;
    }
    if (!Number.isInteger(anchor) || anchor < 0 || anchor > transcriptResultCount) {
      continue;
    }
    const atAnchor = anchoredResults.get(anchor) ?? [];
    atAnchor.push(supplemental);
    anchoredResults.set(anchor, atAnchor);
  }

  const applySupplementalAt = (anchor: number) => {
    for (const supplemental of anchoredResults.get(anchor) ?? []) {
      state = projectResult(state, supplemental.tool, supplemental.result);
    }
  };

  let completedTranscriptResults = 0;
  applySupplementalAt(completedTranscriptResults);
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== 'data-tool-result') continue;
      state = projectResult(
        state,
        part.data.tool,
        part.data.result,
      );
      completedTranscriptResults += 1;
      applySupplementalAt(completedTranscriptResults);
    }
  }

  for (const supplemental of trailingResults) {
    state = projectResult(state, supplemental.tool, supplemental.result);
  }

  return transientPhase
    ? { ...state.projection, phase: transientPhase }
    : state.projection;
}
