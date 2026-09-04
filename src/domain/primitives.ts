import { z } from '@noodleseed/one';
import { DomainError } from './errors.js';

// Deliberately bounded ISO 4217 support, not the complete currency registry.
// Extending this list requires an explicit minor-unit exponent and tests.
export const currencySchema = z.enum([
  'USD', 'CAD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD', 'HKD', 'THB',
  'TRY', 'AUD', 'NZD', 'CHF', 'CNY', 'INR', 'KRW', 'BHD', 'KWD',
]);
export type Currency = z.infer<typeof currencySchema>;
export const CURRENCY_MINOR_UNITS: Readonly<Record<Currency, 0 | 2 | 3>> = Object.freeze({
  USD: 2, CAD: 2, EUR: 2, GBP: 2, JPY: 0, AED: 2, SGD: 2, HKD: 2,
  THB: 2, TRY: 2, AUD: 2, NZD: 2, CHF: 2, CNY: 2, INR: 2, KRW: 0,
  BHD: 3, KWD: 3,
});

export const moneySchema = z.object({
  amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: currencySchema,
}).strict();
export type Money = z.infer<typeof moneySchema>;

function checkedMinor(amount: bigint, currency: Currency): Money {
  if (amount < 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new DomainError('INVALID_TRIP_INPUT');
  }
  return { amountMinor: Number(amount), currency };
}

/** Parse an unsigned ordinary decimal; never round or infer a currency exponent. */
export function moneyFromDecimal(value: string, currency: Currency): Money {
  const parsedCurrency = currencySchema.safeParse(currency);
  if (!parsedCurrency.success || typeof value !== 'string' || value.length > 32
    || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new DomainError('INVALID_TRIP_INPUT');
  }
  const exponent = CURRENCY_MINOR_UNITS[parsedCurrency.data];
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > exponent) throw new DomainError('INVALID_TRIP_INPUT');
  return checkedMinor(BigInt(whole + fraction.padEnd(exponent, '0')), parsedCurrency.data);
}

function moneyOperands(left: Money, right: Money): readonly [Money, Money] {
  const a = moneySchema.safeParse(left);
  const b = moneySchema.safeParse(right);
  if (!a.success || !b.success || a.data.currency !== b.data.currency) {
    throw new DomainError('INVALID_TRIP_INPUT');
  }
  return [a.data, b.data];
}

export function addMoney(left: Money, right: Money): Money {
  const [a, b] = moneyOperands(left, right);
  return checkedMinor(BigInt(a.amountMinor) + BigInt(b.amountMinor), a.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
  const [a, b] = moneyOperands(left, right);
  return checkedMinor(BigInt(a.amountMinor) - BigInt(b.amountMinor), a.currency);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export const calendarDateSchema = z.iso.date().refine(isCalendarDate, 'Use a real YYYY-MM-DD date.');
export type CalendarDate = z.infer<typeof calendarDateSchema>;

// Millisecond-precision ISO timestamps, explicit known offsets, no leap seconds.
// The original local representation is retained; parsing does not normalize it.
const timestampPattern = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/;
function isInstant(value: string): boolean {
  const match = timestampPattern.exec(value);
  if (!match || !isCalendarDate(match[1]) || match[5] === '-00:00') return false;
  const offset = match[5];
  if (offset !== 'Z' && offset.slice(1, 3) === '14' && offset.slice(4) !== '00') return false;
  return Number.isFinite(Date.parse(value));
}
export const instantSchema = z.string().max(29).regex(timestampPattern)
  .refine(isInstant, 'Use a real timestamp with an explicit known offset.')
  .meta({ format: 'date-time' });
export type Instant = z.infer<typeof instantSchema>;

const timeZonePattern = /^[A-Za-z][A-Za-z0-9_+\-]*(?:\/[A-Za-z0-9_+\-]+)*$/;
function isTimeZone(value: string): boolean {
  if (!timeZonePattern.test(value)) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
export const timeZoneSchema = z.string().min(1).max(100).regex(timeZonePattern)
  .refine(isTimeZone, 'Use a supported IANA timezone or recognized IANA alias.');

function matchesZone(value: { dateTime: string; timeZone: string }): boolean {
  if (!isInstant(value.dateTime) || !isTimeZone(value.timeZone)) return false;
  const parts = new Intl.DateTimeFormat('en-US-u-ca-iso8601-nu-latn', {
    timeZone: value.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value.dateTime));
  const component = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const local = `${component('year').padStart(4, '0')}-${component('month')}-${component('day')}T${component('hour')}:${component('minute')}:${component('second')}`;
  return local === value.dateTime.slice(0, 19);
}
// JSON Schema preserves syntax, not Intl membership or cross-field offset checks.
// Domain/runtime boundaries must parse this schema before accepting zoned times.
export const zonedDateTimeSchema = z.object({
  dateTime: instantSchema,
  timeZone: timeZoneSchema,
}).strict().refine(matchesZone, 'The timestamp offset must agree with its IANA timezone at that instant.');
export type ZonedDateTime = z.infer<typeof zonedDateTimeSchema>;

// Ordering is semantic runtime validation and is not represented in JSON Schema.
export const dateRangeSchema = z.object({
  startDate: calendarDateSchema,
  endDate: calendarDateSchema,
}).strict().refine((value) => value.endDate > value.startDate, 'End date must be later than start date.');
export type DateRange = z.infer<typeof dateRangeSchema>;

// Syntactic 128-bit hex payload only. Issuance and session lookup must separately
// guarantee entropy, provider-ID concealment, ownership, and expiry.
export const opaqueIdSchema = z.string().max(57).regex(/^[a-z][a-z0-9_]{0,23}_[a-f0-9]{32}$/);
export type OpaqueId = z.infer<typeof opaqueIdSchema>;

const provenanceFields = {
  observedAt: instantSchema,
  disclosure: z.string().trim().min(1).max(320),
};
export const liveProvenanceSchema = z.object({
  ...provenanceFields, source: z.literal('NUITEE_LIVE'), isFictional: z.literal(false),
}).strict();
export const demoProvenanceSchema = z.object({
  ...provenanceFields, source: z.literal('WAYFARE_DEMO'), isFictional: z.literal(true),
}).strict();
export const dataProvenanceSchema = z.discriminatedUnion('source', [liveProvenanceSchema, demoProvenanceSchema]);
export type DataProvenance = z.infer<typeof dataProvenanceSchema>;

// Result pages are bounded; omit the cursor when the source cannot paginate.
export const pageInfoSchema = z.object({
  returned: z.number().int().min(0).max(100),
  nextCursor: opaqueIdSchema.optional(),
}).strict();
export type PageInfo = z.infer<typeof pageInfoSchema>;
