import type { TripProjection } from '../lib/trip-projection';

const PHASE_LABELS: Readonly<Record<TripProjection['phase'], string>> = {
  idle: 'No trip started',
  planned: 'Ready to search',
  searching: 'Searching',
  comparing: 'Comparing fares',
  'no-results': 'No fares found',
  selected: 'Fare selected',
  verifying: 'Verifying fare',
  verified: 'Fare verified',
  error: 'Needs attention',
};

export function TripBrief({
  projection,
}: Readonly<{ projection: TripProjection }>) {
  if (projection.phase === 'idle') return null;

  return (
    <section aria-label="Current trip" className="trip-brief">
      <p className="trip-brief__eyebrow">Current trip</p>
      {projection.origin || projection.destination ? (
        <p className="trip-brief__route">
          <strong>{projection.origin ?? '—'}</strong>
          <span aria-hidden="true"> → </span>
          <strong>{projection.destination ?? '—'}</strong>
        </p>
      ) : null}
      {projection.departureDate
      || projection.returnDate
      || projection.travelers
      || projection.cabinClass
      || projection.currency
      || projection.country ? (
        <dl>
          {projection.departureDate ? (
            <div>
              <dt>Depart</dt>
              <dd>{projection.departureDate}</dd>
            </div>
          ) : null}
          {projection.returnDate ? (
            <div>
              <dt>Return</dt>
              <dd>{projection.returnDate}</dd>
            </div>
          ) : null}
          {projection.travelers ? (
            <div>
              <dt>Travelers</dt>
              <dd>{projection.travelers}</dd>
            </div>
          ) : null}
          {projection.cabinClass ? (
            <div>
              <dt>Cabin</dt>
              <dd>{projection.cabinClass}</dd>
            </div>
          ) : null}
          {projection.currency ? (
            <div>
              <dt>Currency</dt>
              <dd>{projection.currency}</dd>
            </div>
          ) : null}
          {projection.country ? (
            <div>
              <dt>Market</dt>
              <dd>{projection.country} market</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <p className="trip-brief__status">{PHASE_LABELS[projection.phase]}</p>
    </section>
  );
}
