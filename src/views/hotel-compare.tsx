import type { DemoHotel } from '../demo-schemas.js';
import { gradientForName } from './card-primitives.js';
import { ArrowLeftIcon, XMarkIcon } from './icons.js';
import { computeStayMatch } from './stay-match.js';

export const MAX_COMPARE = 3;

export interface CompareRow {
  readonly key: string;
  readonly label: string;
  readonly cells: readonly string[];
  readonly bestIndexes: readonly number[];
}

function money(amount: number, currency: string, locale: string): string {
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

function bestBy(values: readonly number[], direction: 'min' | 'max'): number[] {
  const target = direction === 'min' ? Math.min(...values) : Math.max(...values);
  return values.flatMap((value, index) => value === target ? [index] : []);
}

export function buildCompareRows(
  hotels: readonly DemoHotel[],
  locale: string,
  comparisonPool: readonly DemoHotel[] = hotels,
): CompareRow[] {
  const totals = hotels.map((hotel) => hotel.staySubtotal.amount);
  const nightly = hotels.map((hotel) => hotel.nightlyPrice.amount);
  const categories = hotels.map((hotel) => hotel.category);
  const flexible = hotels.map((hotel) => hotel.policySummary.toLowerCase().includes('flexible'));
  const amenityCounts = hotels.map((hotel) => hotel.amenities.length);
  const matches = hotels.map((hotel) => (
    computeStayMatch(hotel, comparisonPool, undefined, locale).score
  ));
  const rows: CompareRow[] = [
    {
      key: 'total',
      label: 'Shown total',
      cells: hotels.map((hotel) => money(
        hotel.staySubtotal.amount,
        hotel.staySubtotal.currency,
        locale,
      )),
      bestIndexes: bestBy(totals, 'min'),
    },
    {
      key: 'nightly',
      label: 'Per night',
      cells: hotels.map((hotel) => money(
        hotel.nightlyPrice.amount,
        hotel.nightlyPrice.currency,
        locale,
      )),
      bestIndexes: bestBy(nightly, 'min'),
    },
    {
      key: 'category',
      label: 'Category',
      cells: hotels.map((hotel) => `${hotel.category} of 5`),
      bestIndexes: bestBy(categories, 'max'),
    },
    {
      key: 'cancellation',
      label: 'Terms',
      cells: flexible.map((value) => value ? 'Flexible terms' : 'Review terms'),
      bestIndexes: bestBy(flexible.map((value) => value ? 1 : 0), 'max'),
    },
    {
      key: 'neighborhood',
      label: 'Location',
      cells: hotels.map((hotel) => hotel.neighborhood),
      bestIndexes: [],
    },
  ];

  const ratings = hotels.map((hotel) => hotel.reviewScore);
  if (ratings.some((rating) => rating !== undefined)) {
    rows.push({
      key: 'rating',
      label: 'Guest rating',
      cells: ratings.map((rating) => rating === undefined ? 'Not returned' : rating.toFixed(1)),
      bestIndexes: bestBy(ratings.map((rating) => rating ?? -1), 'max'),
    });
  }

  rows.push(
    {
      key: 'amenities',
      label: 'Amenities',
      cells: hotels.map((hotel) => `${hotel.amenities.length} returned`),
      bestIndexes: bestBy(amenityCounts, 'max'),
    },
    {
      key: 'match',
      label: 'Stay match',
      cells: matches.map((score) => `${score} of 100`),
      bestIndexes: bestBy(matches, 'max'),
    },
  );

  return rows;
}

export function CompareTray({
  selected,
  onOpen,
  onRemove,
}: {
  readonly selected: readonly DemoHotel[];
  readonly onOpen: () => void;
  readonly onRemove: (selectionId: string) => void;
}) {
  if (selected.length === 0) return null;
  const ready = selected.length >= 2;

  return (
    <aside className="cc-compare-tray" aria-label="Stay comparison">
      <div className="cc-compare-tray-thumbs">
        {selected.map((hotel) => (
          <button
            aria-label={`Remove ${hotel.name} from comparison`}
            className="cc-compare-tray-remove"
            key={hotel.selectionId}
            onClick={() => onRemove(hotel.selectionId)}
            style={{ background: gradientForName(hotel.name) }}
            type="button"
          >
            <XMarkIcon />
          </button>
        ))}
      </div>
      <p>{ready ? `${selected.length} stays selected` : 'Choose 1 more stay to compare'}</p>
      <button
        className="cc-compare-tray-action"
        disabled={!ready}
        onClick={onOpen}
        type="button"
      >
        Compare
      </button>
    </aside>
  );
}

export function CompareMatrix({
  hotels,
  comparisonPool = hotels,
  locale,
  onBack,
}: {
  readonly hotels: readonly DemoHotel[];
  readonly comparisonPool?: readonly DemoHotel[];
  readonly locale: string;
  readonly onBack: () => void;
}) {
  const rows = buildCompareRows(hotels, locale, comparisonPool);
  const cheapestIndex = hotels
    .map((hotel) => hotel.staySubtotal.amount)
    .reduce((best, amount, index, all) => amount < all[best]! ? index : best, 0);
  const matchScores = hotels.map((hotel) => (
    computeStayMatch(hotel, comparisonPool, undefined, locale).score
  ));
  const matchIndex = matchScores.indexOf(Math.max(...matchScores));
  const cheapest = hotels[cheapestIndex]!;
  const strongestMatch = hotels[matchIndex]!;

  return (
    <section className="cc-compare-screen" aria-labelledby="cc-compare-heading">
      <button className="cc-compare-back" onClick={onBack} type="button">
        <ArrowLeftIcon />Back to stays
      </button>
      <div className="cc-compare-scroll">
        <table className="cc-compare-matrix">
          <caption id="cc-compare-heading">{hotels.length} stays compared</caption>
          <thead>
            <tr>
              <th scope="col">Trip detail</th>
              {hotels.map((hotel) => <th key={hotel.selectionId} scope="col">{hotel.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell, index) => {
                  const best = row.bestIndexes.includes(index);
                  return (
                    <td
                      className={best ? 'cc-compare-best' : undefined}
                      data-hotel={hotels[index]!.name}
                      key={hotels[index]!.selectionId}
                    >
                      {cell}
                      {best ? <span className="cc-compare-best-label">Best in row</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cc-compare-summary">
        <p><strong>Lowest shown total:</strong> {cheapest.name} at {money(
          cheapest.staySubtotal.amount,
          cheapest.staySubtotal.currency,
          locale,
        )}.</p>
        <p><strong>Strongest returned stay match:</strong> {strongestMatch.name} at {matchScores[matchIndex]} of 100.</p>
        <small>
          Compare the tradeoffs before selecting. Shown totals remain{' '}
          {hotels.every((hotel) => hotel.dataSource === 'illustrative') ? 'illustrative' : 'subject to verification'};
          nothing is held, reserved, or paid.
        </small>
      </div>
    </section>
  );
}
