import { describe, expect, it } from 'vitest';
import { computeStayMatch } from '../src/views/stay-match.js';
import type { DemoHotel } from '../src/demo-schemas.js';

function hotel(overrides: Partial<DemoHotel> = {}): DemoHotel {
  return {
    selectionId: 'hsel_test',
    dataSource: 'illustrative',
    name: 'Test Stay',
    city: 'Lisbon',
    countryCode: 'PT',
    neighborhood: 'Baixa concept district',
    description: 'An illustrative stay.',
    roomName: 'Test room',
    category: 4,
    amenities: ['Wi-Fi', 'Breakfast preview'],
    nights: 6,
    rooms: 1,
    nightlyPrice: { amount: 286, currency: 'CAD' },
    staySubtotal: { amount: 1716, currency: 'CAD' },
    taxesAndFeesIncluded: false,
    illustrativePolicy: 'Illustrative flexible terms; no reservation can be created.',
    ...overrides,
  } as DemoHotel;
}

describe('computeStayMatch', () => {
  it('omits the guest-rating line when no review score is present', () => {
    const match = computeStayMatch(hotel(), [hotel()]);
    expect(match.lines.map((line) => line.key)).not.toContain('rating');
  });

  it('includes the guest-rating line when a review score is present', () => {
    const rated = hotel({ reviewScore: 8.9, reviewCount: 1204 } as Partial<DemoHotel>);
    const match = computeStayMatch(rated, [rated]);
    const rating = match.lines.find((line) => line.key === 'rating');
    expect(rating?.detail).toContain('8.9');
  });

  it('scores the cheapest stay in the set highest on price', () => {
    const cheap = hotel({ name: 'Cheap', staySubtotal: { amount: 1428, currency: 'CAD' } });
    const dear = hotel({ name: 'Dear', staySubtotal: { amount: 2064, currency: 'CAD' } });
    const set = [cheap, dear];
    const cheapPrice = computeStayMatch(cheap, set).lines.find((l) => l.key === 'price');
    const dearPrice = computeStayMatch(dear, set).lines.find((l) => l.key === 'price');
    expect(cheapPrice?.status).toBe('ok');
    expect(dearPrice?.status).toBe('partial');
  });

  it('never returns a score outside 0-100', () => {
    const match = computeStayMatch(hotel(), [hotel()]);
    expect(match.score).toBeGreaterThanOrEqual(0);
    expect(match.score).toBeLessThanOrEqual(100);
  });

  it('renormalises rather than scoring a missing field as zero', () => {
    const unrated = hotel();
    const zeroRated = hotel({ reviewScore: 0, reviewCount: 4 } as Partial<DemoHotel>);
    // The guarantee is NOT that an unrated hotel ties a rated one — an extra
    // strong line legitimately raises the mean. It is that a hotel which
    // returned no rating is scored across the lines it does have, rather than
    // being dragged down by a zero it never earned.
    expect(computeStayMatch(unrated, [unrated]).score)
      .toBeGreaterThan(computeStayMatch(zeroRated, [zeroRated]).score);
  });

  it('marks amenity overlap partial when a requested amenity is missing', () => {
    const stay = hotel({ amenities: ['Wi-Fi'] });
    const match = computeStayMatch(stay, [stay], ['Wi-Fi', 'Gym']);
    expect(match.lines.find((line) => line.key === 'amenities')?.status).toBe('partial');
  });

  it('reports flexibility from the illustrative policy text', () => {
    const rigid = hotel({ illustrativePolicy: 'Illustrative terms only; no room is held or reserved.' });
    expect(computeStayMatch(rigid, [rigid]).lines.find((l) => l.key === 'flexibility')?.status)
      .toBe('partial');
  });

  it('returns a real score when the comparison set is empty', () => {
    const match = computeStayMatch(hotel(), []);
    expect(Number.isNaN(match.score)).toBe(false);
    expect(match.score).toBeGreaterThanOrEqual(0);
    expect(match.score).toBeLessThanOrEqual(100);
    expect(match.lines.find((line) => line.key === 'price')?.detail).not.toContain('∞');
  });

  it('reports a bare total when the set has no price span', () => {
    const only = hotel();
    const detail = computeStayMatch(only, [only]).lines.find((l) => l.key === 'price')?.detail;
    expect(detail).toContain('total');
    expect(detail).not.toContain('–');
  });

  it('keeps price weight in range for a hotel outside the comparison set', () => {
    const cheap = hotel({ staySubtotal: { amount: 1000, currency: 'CAD' } });
    const others = [
      hotel({ staySubtotal: { amount: 1500, currency: 'CAD' } }),
      hotel({ staySubtotal: { amount: 2000, currency: 'CAD' } }),
    ];
    const match = computeStayMatch(cheap, others);
    expect(match.score).toBeGreaterThanOrEqual(0);
    expect(match.score).toBeLessThanOrEqual(100);
  });

  it('formats the price line in the passed locale rather than a hardcoded en-CA', () => {
    const stay = hotel({ staySubtotal: { amount: 1716, currency: 'CAD' } });
    const defaultLocale = computeStayMatch(stay, [stay]);
    const frCA = computeStayMatch(stay, [stay], undefined, 'fr-CA');
    const defaultPrice = defaultLocale.lines.find((line) => line.key === 'price')?.detail;
    const frPrice = frCA.lines.find((line) => line.key === 'price')?.detail;
    expect(defaultPrice).toBeDefined();
    expect(frPrice).toBeDefined();
    expect(frPrice).not.toBe(defaultPrice);
  });

  it('defaults to en-CA when no locale is passed, keeping existing callers unaffected', () => {
    const stay = hotel({ staySubtotal: { amount: 1716, currency: 'CAD' } });
    const noLocaleArg = computeStayMatch(stay, [stay]);
    const explicitEnCA = computeStayMatch(stay, [stay], undefined, 'en-CA');
    expect(noLocaleArg.lines.find((line) => line.key === 'price')?.detail)
      .toBe(explicitEnCA.lines.find((line) => line.key === 'price')?.detail);
  });

  it('formats the review count in the passed locale rather than a hardcoded "en"', () => {
    const rated = hotel({ reviewScore: 8.9, reviewCount: 1204 } as Partial<DemoHotel>);
    const frCA = computeStayMatch(rated, [rated], undefined, 'fr-CA');
    const rating = frCA.lines.find((line) => line.key === 'rating')?.detail;
    expect(rating).toContain('8.9');
    // fr-CA groups thousands with a space, not a comma.
    expect(rating).toContain('204');
    expect(rating).not.toContain('1,204');
  });
});
