import { describe, expect, it } from 'vitest';
import { parseTravelInputSchema } from '../src/lib/input-request';

describe('parseTravelInputSchema', () => {
  it('accepts a bounded travel object schema', () => {
    expect(parseTravelInputSchema({
      type: 'object',
      properties: {
        departureDate: { type: 'string', format: 'date', title: 'Departure date' },
        cabinClass: {
          type: 'string',
          title: 'Cabin',
          enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'],
        },
      },
      required: ['departureDate'],
    })).toEqual([
      { kind: 'date', name: 'departureDate', label: 'Departure date', required: true },
      {
        kind: 'select',
        name: 'cabinClass',
        label: 'Cabin',
        required: false,
        options: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'],
      },
    ]);
  });

  it('fails closed for unknown fields and unbounded schemas', () => {
    expect(parseTravelInputSchema({
      type: 'object',
      properties: { creditCard: { type: 'string' } },
    })).toBeNull();
  });

  it('fails closed for prototype field aliases', () => {
    expect(parseTravelInputSchema({
      type: 'object',
      properties: { toString: { type: 'string', title: 'Prototype name' } },
    })).toBeNull();
  });

  it('fails closed for arbitrary safe-character labels', () => {
    expect(parseTravelInputSchema({
      type: 'object',
      properties: {
        origin: { type: 'string', title: 'Enter passport details' },
      },
    })).toBeNull();
  });

  it('maps traveller integers to fixed safe bounds and safe fallback labels', () => {
    expect(parseTravelInputSchema({
      type: 'object',
      properties: {
        adults: { type: 'integer' },
        children: { type: 'integer' },
        origin: { type: 'string' },
      },
      required: ['adults', 'origin'],
    })).toEqual([
      { kind: 'integer', name: 'adults', label: 'Adults', required: true, minimum: 1, maximum: 9 },
      { kind: 'integer', name: 'children', label: 'Children', required: false, minimum: 0, maximum: 9 },
      { kind: 'text', name: 'origin', label: 'Origin', required: true },
    ]);
  });

  it.each([
    {
      type: 'object',
      properties: {
        origin: { type: 'string', pattern: '[A-Z]{3}' },
      },
    },
    {
      type: 'object',
      properties: {
        origin: { type: 'object', properties: { code: { type: 'string' } } },
      },
    },
    {
      type: 'object',
      properties: {
        origin: { type: 'array', items: { type: 'string' } },
      },
    },
    {
      type: 'object',
      properties: {
        origin: { type: 'string' },
        destination: { type: 'string' },
        departureDate: { type: 'string', format: 'date' },
        returnDate: { type: 'string', format: 'date' },
        adults: { type: 'integer' },
        children: { type: 'integer' },
        infants: { type: 'integer' },
      },
    },
    {
      type: 'object',
      properties: {
        origin: { type: 'string', title: '<strong>Origin</strong>' },
      },
    },
    {
      type: 'object',
      properties: {
        cabinClass: {
          type: 'string',
          enum: Array.from({ length: 13 }, (_, index) => `CABIN_${index}`),
        },
      },
    },
  ])('rejects unsafe or unbounded schema shape %#', (schema) => {
    expect(parseTravelInputSchema(schema)).toBeNull();
  });
});
