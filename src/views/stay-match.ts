import type { DemoHotel } from '../demo-schemas.js';

export type MatchStatus = 'ok' | 'partial';

export interface MatchLine {
  readonly key: string;
  readonly label: string;
  readonly detail: string;
  readonly status: MatchStatus;
}

export interface StayMatch {
  readonly score: number;
  readonly lines: readonly MatchLine[];
}

/**
 * Stay match is deliberately NOT the reference's "Tribe Fit".
 *
 * That score reasons about group composition, room splits, and per-traveler
 * mobility from facility evidence this project does not fetch and traveler
 * profiles it does not collect. Reproducing it here would put a confident
 * number on nothing.
 *
 * Every line below cites a field the search actually returned. A line whose
 * source field is absent is omitted, and the score is renormalised across the
 * lines that remain — so a hotel with no review data scores on four
 * dimensions rather than being silently penalised for a fifth it never had.
 */
export function computeStayMatch(
  hotel: DemoHotel,
  all: readonly DemoHotel[],
  requestedAmenities: readonly string[] = [],
  locale = 'en-CA',
): StayMatch {
  const lines: MatchLine[] = [];
  const weights: number[] = [];

  // Price — position within the returned set, never an absolute budget claim.
  // A set that does not bracket this hotel (empty, single, or all-equal)
  // has no meaningful position to report, so fall back to the bare total
  // rather than dividing by a zero or infinite span.
  const totals = all.map((entry) => entry.staySubtotal.amount);
  const total = hotel.staySubtotal.amount;
  const low = totals.length > 0 ? Math.min(...totals, total) : total;
  const high = totals.length > 0 ? Math.max(...totals, total) : total;
  const hasRange = high > low;
  const priceWeight = hasRange ? 1 - (total - low) / (high - low) : 1;
  lines.push({
    key: 'price',
    label: 'Price',
    detail: hasRange
      ? `${formatAmount(total, hotel.staySubtotal.currency, locale)} of ${formatAmount(low, hotel.staySubtotal.currency, locale)}–${formatAmount(high, hotel.staySubtotal.currency, locale)}`
      : `${formatAmount(total, hotel.staySubtotal.currency, locale)} total`,
    status: priceWeight >= 0.5 ? 'ok' : 'partial',
  });
  weights.push(priceWeight);

  // Flexibility — read from the policy text the fixture or provider supplied.
  const policy = hotel.policySummary.toLowerCase();
  const flexible = policy.includes('flexible');
  lines.push({
    key: 'flexibility',
    label: 'Flexibility',
    detail: hotel.policySummary.replace(/;.*$/, ''),
    status: flexible ? 'ok' : 'partial',
  });
  weights.push(flexible ? 1 : 0.45);

  // Category — 1-5 star, straight from the field.
  const categoryWeight = (hotel.category - 1) / 4;
  lines.push({
    key: 'category',
    label: 'Category',
    detail: `${hotel.category}-star`,
    status: hotel.category >= 4 ? 'ok' : 'partial',
  });
  weights.push(categoryWeight);

  // Guest rating — omitted entirely when the provider returned nothing.
  const reviewScore = (hotel as { reviewScore?: number }).reviewScore;
  const reviewCount = (hotel as { reviewCount?: number }).reviewCount;
  if (reviewScore !== undefined) {
    lines.push({
      key: 'rating',
      label: 'Rating',
      detail: reviewCount === undefined
        ? `${reviewScore.toFixed(1)} guest rating`
        : `${reviewScore.toFixed(1)} from ${reviewCount.toLocaleString(locale)} reviews`,
      status: reviewScore >= 8 ? 'ok' : 'partial',
    });
    weights.push(Math.min(1, Math.max(0, reviewScore / 10)));
  }

  // Amenities — overlap only. No inference about what an amenity implies.
  if (requestedAmenities.length > 0) {
    const owned = new Set(hotel.amenities.map((item) => item.toLowerCase()));
    const matched = requestedAmenities.filter((item) => owned.has(item.toLowerCase()));
    const ratio = matched.length / requestedAmenities.length;
    lines.push({
      key: 'amenities',
      label: 'Amenities',
      detail: `${matched.length} of ${requestedAmenities.length} requested`,
      status: ratio === 1 ? 'ok' : 'partial',
    });
    weights.push(ratio);
  } else {
    const ratio = Math.min(1, hotel.amenities.length / 4);
    lines.push({
      key: 'amenities',
      label: 'Amenities',
      detail: `${hotel.amenities.length} listed`,
      status: hotel.amenities.length >= 3 ? 'ok' : 'partial',
    });
    weights.push(ratio);
  }

  const mean = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
  return { score: Math.round(Math.min(100, Math.max(0, mean * 100))), lines };
}

function formatAmount(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}
