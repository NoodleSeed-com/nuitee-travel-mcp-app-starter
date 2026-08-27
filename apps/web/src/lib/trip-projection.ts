import type { AssistantUIMessage } from '@noodleseed/assistant/client';

export type TripPhase =
  | 'idle'
  | 'searching'
  | 'comparing'
  | 'selected'
  | 'verifying'
  | 'verified'
  | 'error';

export interface TripProjection {
  readonly phase: TripPhase;
  readonly origin?: string;
  readonly destination?: string;
  readonly departureDate?: string;
  readonly returnDate?: string;
  readonly travelers?: string;
}

export const EMPTY_TRIP: TripProjection = { phase: 'idle' };

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
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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

function searchProjection(result: UnknownRecord): TripProjection | undefined {
  if (result.status !== 'success' && result.status !== 'partial') {
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

  if (
    !origin
    || !destination
    || !departureDate
    || (context.returnDate !== undefined && !returnDate)
    || adults === undefined
    || children === undefined
    || infants === undefined
  ) {
    return undefined;
  }

  return {
    phase: 'comparing',
    origin,
    destination,
    departureDate,
    ...(returnDate ? { returnDate } : {}),
    travelers: travelerCopy(adults, children, infants),
  };
}

function projectResult(
  current: TripProjection,
  tool: string,
  result: unknown,
): TripProjection {
  if (!isRecord(result)) return current;

  switch (tool) {
    case 'search_flights': {
      if (result.status === 'error') return { ...current, phase: 'error' };
      return searchProjection(result) ?? current;
    }
    case 'select_flight_offer':
      if (result.status === 'selected') return { ...current, phase: 'selected' };
      if (result.status === 'unavailable') return { ...current, phase: 'error' };
      return current;
    case 'verify_flight_offer': {
      if (result.status === 'error') return { ...current, phase: 'error' };
      const verification = result.verification;
      if (
        result.status === 'success'
        && isRecord(verification)
        && verification.status === 'success'
        && verification.availability === 'available'
      ) {
        return { ...current, phase: 'verified' };
      }
      return current;
    }
    default:
      return current;
  }
}

export function projectTrip(
  messages: readonly AssistantUIMessage[],
  transientPhase?: TripPhase,
): TripProjection {
  let projection = EMPTY_TRIP;

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== 'data-tool-result') continue;
      projection = projectResult(
        projection,
        part.data.tool,
        part.data.result,
      );
    }
  }

  return transientPhase ? { ...projection, phase: transientPhase } : projection;
}
