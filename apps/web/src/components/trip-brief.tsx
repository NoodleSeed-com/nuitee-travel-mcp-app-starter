import type { TripProjection } from '../lib/trip-projection';

const PHASE_LABELS: Readonly<Record<TripProjection['phase'], string>> = {
  idle: 'No trip started',
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
  return (
    <aside aria-label="Live trip brief" className="trip-brief">
      <p className="trip-brief__eyebrow">Live trip brief</p>
      <h2>What we understand</h2>
      {projection.origin || projection.destination ? (
        <p className="trip-brief__route">
          <strong>{projection.origin ?? '—'}</strong>
          <span aria-hidden="true"> → </span>
          <strong>{projection.destination ?? '—'}</strong>
        </p>
      ) : null}
      {projection.departureDate || projection.returnDate || projection.travelers ? (
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
        </dl>
      ) : null}
      <p className="trip-brief__status">{PHASE_LABELS[projection.phase]}</p>
    </aside>
  );
}
