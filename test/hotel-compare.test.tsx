import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DemoHotel } from '../src/demo-schemas.js';
import {
  CompareMatrix,
  CompareTray,
  MAX_COMPARE,
  buildCompareRows,
} from '../src/views/hotel-compare.js';
import { computeStayMatch } from '../src/views/stay-match.js';

function stay(index: number, name: string, total: number, category: number, flexible = true): DemoHotel {
  return {
    selectionId: `hsel_${index.toString(16).padStart(32, '0')}`,
    dataSource: 'illustrative',
    name,
    city: 'Lisbon',
    countryCode: 'PT',
    neighborhood: 'Baixa concept district',
    description: 'An illustrative stay for a bounded comparison.',
    roomName: 'Wayfare preview room',
    category,
    amenities: ['Wi-Fi', 'Breakfast preview'],
    nights: 6,
    rooms: 1,
    nightlyPrice: { amount: Math.round(total / 6), currency: 'CAD' },
    staySubtotal: { amount: total, currency: 'CAD' },
    taxesAndFeesIncluded: false,
    policySummary: flexible
      ? 'Illustrative flexible terms; no reservation can be created.'
      : 'Illustrative terms only; no room is held or reserved.',
  };
}

const HOTELS = [
  stay(1, 'Tagus', 1_716, 4),
  stay(2, 'Alfama', 1_428, 3, false),
  stay(3, 'Juniper', 2_064, 5),
];

describe('hotel comparison rows', () => {
  it('marks the lowest total and highest category without inventing a single overall winner', () => {
    const rows = buildCompareRows(HOTELS, 'en-CA');
    expect(rows.find((row) => row.key === 'total')?.bestIndexes).toEqual([1]);
    expect(rows.find((row) => row.key === 'category')?.bestIndexes).toEqual([2]);
  });

  it('marks ties and drops guest rating when every score is absent', () => {
    const rows = buildCompareRows(HOTELS, 'en-CA');
    expect(rows.find((row) => row.key === 'cancellation')?.bestIndexes).toEqual([0, 2]);
    expect(rows.map((row) => row.key)).not.toContain('rating');
  });

  it('keeps guest rating when at least one source score exists', () => {
    const rated = [{ ...HOTELS[0]!, reviewScore: 8.9 }, HOTELS[1]!, HOTELS[2]!];
    expect(buildCompareRows(rated, 'en-CA').map((row) => row.key)).toContain('rating');
  });

  it('keeps card match scores stable when only a subset is compared', () => {
    const selected = HOTELS.slice(0, 2);
    const rows = buildCompareRows(selected, 'en-CA', HOTELS);
    const expected = selected.map((hotel) => (
      `${computeStayMatch(hotel, HOTELS, undefined, 'en-CA').score} of 100`
    ));

    expect(rows.find((row) => row.key === 'match')?.cells).toEqual(expected);
  });
});

describe('hotel compare tray', () => {
  it('renders nothing with no marked stays and asks for one more with one stay', () => {
    expect(renderToStaticMarkup(
      <CompareTray onOpen={() => {}} onRemove={() => {}} selected={[]} />,
    )).toBe('');
    const one = renderToStaticMarkup(
      <CompareTray onOpen={() => {}} onRemove={() => {}} selected={[HOTELS[0]!]} />,
    );
    expect(one).toContain('Choose 1 more');
    expect(one).toContain('disabled');
  });

  it('enables comparison at two and caps the supported selection at three', () => {
    const html = renderToStaticMarkup(
      <CompareTray onOpen={() => {}} onRemove={() => {}} selected={HOTELS.slice(0, 2)} />,
    );
    expect(html).toContain('2 stays selected');
    expect(html).not.toContain('disabled');
    expect(MAX_COMPARE).toBe(3);
  });
});

describe('hotel comparison matrix', () => {
  it('labels mobile cells and describes tradeoffs without claiming a booking recommendation', () => {
    const html = renderToStaticMarkup(
      <CompareMatrix hotels={HOTELS} locale="en-CA" onBack={() => {}} />,
    );
    expect(html).toContain('data-hotel="Tagus"');
    expect(html).toContain('Lowest shown total');
    expect(html).not.toContain('We’d pick');
    expect(html).not.toContain('Book');
  });
});
