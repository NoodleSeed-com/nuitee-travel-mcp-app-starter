import { describe, expect, it } from 'vitest';
import { z } from '@noodleseed/one';
import {
  addMoney, calendarDateSchema, currencySchema, dataProvenanceSchema,
  dateRangeSchema, instantSchema, moneyFromDecimal, moneySchema,
  opaqueIdSchema, pageInfoSchema, subtractMoney, timeZoneSchema,
  zonedDateTimeSchema,
} from '../src/domain/primitives.js';
import {
  DomainError, domainErrorCodeSchema, domainErrorSchema, publicDomainError,
} from '../src/domain/errors.js';

describe('canonical money', () => {
  it('accepts only bounded supported currencies and nonnegative safe minor units', () => {
    expect(moneySchema.parse({ amountMinor: 0, currency: 'CAD' })).toEqual({ amountMinor: 0, currency: 'CAD' });
    for (const amountMinor of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(moneySchema.safeParse({ amountMinor, currency: 'USD' }).success).toBe(false);
    }
    for (const currency of ['usd', 'ZZZ', 'BTC', 'US', '', ' USD']) {
      expect(currencySchema.safeParse(currency).success).toBe(false);
    }
    expect(moneySchema.safeParse({ amountMinor: 5, currency: 'USD', total: 5 }).success).toBe(false);
  });

  it('converts decimal strings exactly, including zero- and three-decimal currencies', () => {
    expect(moneyFromDecimal('0.29', 'USD')).toEqual({ amountMinor: 29, currency: 'USD' });
    expect(moneyFromDecimal('12.3', 'CAD')).toEqual({ amountMinor: 1230, currency: 'CAD' });
    expect(moneyFromDecimal('1200', 'JPY')).toEqual({ amountMinor: 1200, currency: 'JPY' });
    expect(moneyFromDecimal('1200', 'KRW').amountMinor).toBe(1200);
    expect(moneyFromDecimal('1.234', 'BHD').amountMinor).toBe(1234);
    expect(moneyFromDecimal('0.001', 'KWD').amountMinor).toBe(1);
    expect(moneyFromDecimal('90071992547409.91', 'USD').amountMinor).toBe(Number.MAX_SAFE_INTEGER);
    for (const value of ['1.001', '1.000', '-1', '+1', '1e2', '.1', '1.', ' 1', '01.2', '90071992547409.92']) {
      expect(() => moneyFromDecimal(value, 'USD')).toThrow(DomainError);
    }
    expect(() => moneyFromDecimal('1.0', 'JPY')).toThrow(DomainError);
    expect(() => moneyFromDecimal('0.0001', 'KWD')).toThrow(DomainError);
  });

  it('adds and subtracts exact same-currency minor units with underflow/overflow checks', () => {
    const one = { amountMinor: 1, currency: 'USD' as const };
    const max = { amountMinor: Number.MAX_SAFE_INTEGER, currency: 'USD' as const };
    expect(addMoney(moneyFromDecimal('0.1', 'USD'), moneyFromDecimal('0.2', 'USD'))).toEqual({ amountMinor: 30, currency: 'USD' });
    expect(subtractMoney(one, one).amountMinor).toBe(0);
    expect(subtractMoney(max, one).amountMinor).toBe(Number.MAX_SAFE_INTEGER - 1);
    expect(() => addMoney(max, one)).toThrow(DomainError);
    expect(() => subtractMoney(one, max)).toThrow(DomainError);
    for (const operation of [addMoney, subtractMoney]) {
      expect(() => operation(one, { ...one, currency: 'CAD' })).toThrow(DomainError);
      expect(() => operation(one, { ...one, amountMinor: 0.5 })).toThrow(DomainError);
    }
  });
});

describe('canonical dates and times', () => {
  it('validates real Gregorian dates and ordered half-open ranges', () => {
    for (const value of ['2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31']) {
      expect(calendarDateSchema.safeParse(value).success).toBe(true);
    }
    for (const value of ['1900-02-29', '2025-02-29', '2024-04-31', '2024-00-01', '0000-01-01', '2024-1-01']) {
      expect(calendarDateSchema.safeParse(value).success).toBe(false);
    }
    expect(dateRangeSchema.safeParse({ startDate: '2024-02-29', endDate: '2024-03-01' }).success).toBe(true);
    for (const endDate of ['2024-02-29', '2024-02-28']) {
      expect(dateRangeSchema.safeParse({ startDate: '2024-02-29', endDate }).success).toBe(false);
    }
  });

  it('requires explicit known offsets and valid timestamp components', () => {
    for (const value of ['2024-02-29T10:20:30Z', '2024-02-29T10:20:30.123+05:30', '2024-01-01T00:00:00-04:00']) {
      expect(instantSchema.safeParse(value).success).toBe(true);
    }
    for (const value of ['2024-02-29T10:20:30', '2025-02-29T10:20:30Z', '2024-01-01T24:00:00Z', '2024-01-01T00:60:00Z', '2024-01-01T00:00:60Z', '2024-01-01T00:00:00-00:00', '2024-01-01T00:00:00+14:01']) {
      expect(instantSchema.safeParse(value).success).toBe(false);
    }
  });

  it('preserves local times while validating the IANA zone and its date-specific offset', () => {
    expect(timeZoneSchema.safeParse('UTC').success).toBe(true);
    expect(timeZoneSchema.safeParse('EST5EDT').success).toBe(true);
    expect(timeZoneSchema.safeParse('MST7MDT').success).toBe(true);
    expect(timeZoneSchema.safeParse('Invented/Nowhere').success).toBe(false);
    expect(timeZoneSchema.safeParse('+01:00').success).toBe(false);
    for (const value of [
      { dateTime: '2024-07-01T12:00:00-04:00', timeZone: 'America/Toronto' },
      { dateTime: '2024-01-01T12:00:00-05:00', timeZone: 'America/Toronto' },
      { dateTime: '2024-11-03T01:30:00-04:00', timeZone: 'America/Toronto' },
      { dateTime: '2024-11-03T01:30:00-05:00', timeZone: 'America/Toronto' },
      { dateTime: '2024-02-29T00:00:00+05:45', timeZone: 'Asia/Kathmandu' },
    ]) expect(zonedDateTimeSchema.parse(value)).toEqual(value);
    for (const value of [
      { dateTime: '2024-07-01T12:00:00-05:00', timeZone: 'America/Toronto' },
      { dateTime: '2024-03-10T02:30:00-05:00', timeZone: 'America/Toronto' },
      { dateTime: '2024-01-01T00:00:00Z', timeZone: 'Invented/Nowhere' },
    ]) expect(zonedDateTimeSchema.safeParse(value).success).toBe(false);
    expect(zonedDateTimeSchema.safeParse({ dateTime: '2024-01-01T00:00:00Z', timeZone: 'UTC', raw: 'hidden' }).success).toBe(false);
  });
});

describe('bounded references and provenance', () => {
  it('validates reference syntax without asserting ownership or randomness', () => {
    expect(opaqueIdSchema.safeParse(`offer_${'ab'.repeat(16)}`).success).toBe(true);
    for (const value of ['provider-123', `offer_${'a'.repeat(31)}`, `offer_${'a'.repeat(33)}`, 'person@example.com']) {
      expect(opaqueIdSchema.safeParse(value).success).toBe(false);
    }
    expect(pageInfoSchema.safeParse({ returned: 10, nextCursor: `cursor_${'ab'.repeat(16)}` }).success).toBe(true);
    expect(pageInfoSchema.safeParse({ returned: -1 }).success).toBe(false);
    expect(pageInfoSchema.safeParse({ returned: 101 }).success).toBe(false);
  });

  it('correlates source and fiction flags and bounds disclosure and observation times', () => {
    const live = { source: 'NUITEE_LIVE', isFictional: false, observedAt: '2024-01-01T00:00:00Z', disclosure: 'Current provider observation.' };
    const demo = { ...live, source: 'WAYFARE_DEMO', isFictional: true, disclosure: 'Fictional demonstration data.' };
    expect(dataProvenanceSchema.parse(live)).toEqual(live);
    expect(dataProvenanceSchema.parse(demo)).toEqual(demo);
    for (const value of [{ ...live, isFictional: true }, { ...demo, isFictional: false }, { ...live, disclosure: 'x'.repeat(321) }, { ...live, disclosure: ' ' }, { ...live, observedAt: 'yesterday' }, { ...live, providerBody: {} }]) {
      expect(dataProvenanceSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe('public domain errors', () => {
  it('uses the documented vocabulary and fixed safe bounded messages', () => {
    for (const code of domainErrorCodeSchema.options) {
      const error = new DomainError(code);
      expect(error.toPublic()).toEqual(publicDomainError(code));
      expect(domainErrorSchema.safeParse(error.toPublic()).success).toBe(true);
      expect(Object.keys(error.toPublic()).sort()).toEqual(['code', 'message', 'retryable']);
      expect(error.toPublic().message.length).toBeLessThanOrEqual(320);
    }
    const value = publicDomainError('PROVIDER_UNAVAILABLE');
    expect(value.retryable).toBe(true);
    expect(domainErrorSchema.safeParse({ ...value, message: 'Raw provider exception body' }).success).toBe(false);
    expect(domainErrorSchema.safeParse({ ...value, stack: 'internal' }).success).toBe(false);
    expect(domainErrorCodeSchema.safeParse('INVENTED_ERROR').success).toBe(false);
  });
});

describe('JSON Schema publication', () => {
  it('retains date, explicit-offset timestamp, and timezone syntax constraints', () => {
    const date = z.toJSONSchema(calendarDateSchema);
    expect(date.format).toBe('date');
    expect(date.pattern).toBeTypeOf('string');
    const instant = z.toJSONSchema(instantSchema);
    expect(instant.format).toBe('date-time');
    expect(new RegExp(instant.pattern!).test('2024-01-01T00:00:00')).toBe(false);
    expect(new RegExp(instant.pattern!).test('2024-01-01T24:00:00Z')).toBe(false);
    expect(new RegExp(instant.pattern!).test('2024-01-01T00:00:00+05:30')).toBe(true);
    const zone = z.toJSONSchema(timeZoneSchema);
    expect(new RegExp(zone.pattern!).test('+01:00')).toBe(false);
    expect(new RegExp(zone.pattern!).test('EST5EDT')).toBe(true);
    expect(new RegExp(zone.pattern!).test('America/Toronto')).toBe(true);
  });

  it('publishes only literal approved error messages and retry behavior for every code', () => {
    const published = z.toJSONSchema(domainErrorSchema);
    const variants = published.oneOf ?? published.anyOf;
    expect(variants).toHaveLength(domainErrorCodeSchema.options.length);
    for (const code of domainErrorCodeSchema.options) {
      const projection = publicDomainError(code);
      const variant = variants!.find((candidate) => typeof candidate !== 'boolean'
        && candidate.properties?.code && typeof candidate.properties.code !== 'boolean'
        && candidate.properties.code.const === code);
      expect(variant).toMatchObject({
        additionalProperties: false,
        properties: {
          code: { const: code },
          message: { const: projection.message },
          retryable: { const: projection.retryable },
        },
      });
    }
  });
});
