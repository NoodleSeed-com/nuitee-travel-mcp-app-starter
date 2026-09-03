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
): StayMatch {
  const lines: MatchLine[] = [];
  const weights: number[] = [];

  // Price — position within the returned set, never an absolute budget claim.
  const totals = all.map((entry) => entry.staySubtotal.amount);
  const low = Math.min(...totals);
  const high = Math.max(...totals);
  const total = hotel.staySubtotal.amount;
  const priceWeight = high === low ? 1 : 1 - (total - low) / (high - low);
  lines.push({
    key: 'price',
    label: 'Price',
    detail: high === low
      ? `${formatAmount(total, hotel.staySubtotal.currency)} total`
      : `${formatAmount(total, hotel.staySubtotal.currency)} of ${formatAmount(low, hotel.staySubtotal.currency)}–${formatAmount(high, hotel.staySubtotal.currency)}`,
    status: priceWeight >= 0.5 ? 'ok' : 'partial',
  });
  weights.push(priceWeight);

  // Flexibility — read from the policy text the fixture or provider supplied.
  const policy = hotel.illustrativePolicy.toLowerCase();
  const flexible = policy.includes('flexible');
  lines.push({
    key: 'flexibility',
    label: 'Flexibility',
    detail: hotel.illustrativePolicy.replace(/;.*$/, ''),
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
        : `${reviewScore.toFixed(1)} from ${reviewCount.toLocaleString('en')} reviews`,
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

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}
