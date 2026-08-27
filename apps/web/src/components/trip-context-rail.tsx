import { BookOpen, Plus, Settings } from 'lucide-react';
import { starterConfig } from '../../../../starter.config';
import type { TripProjection } from '../lib/trip-projection';

interface TripContextRailProps {
  readonly projection: TripProjection;
  readonly onNewTrip: () => void;
  readonly onOpenSettings: () => void;
}

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

export function TripContextRail({
  projection,
  onNewTrip,
  onOpenSettings,
}: Readonly<TripContextRailProps>) {
  const hasTrip = projection.phase !== 'idle';

  return (
    <aside className="trip-context-rail" aria-label="Trip context">
      <div className="trip-context-rail__primary">
        <a className="travel-wordmark" href="/">
          <span className="travel-wordmark__mark" aria-hidden="true">
            {starterConfig.brand.mark}
          </span>
          <span>{starterConfig.brand.name}</span>
        </a>

        <nav aria-label="Travel workspace">
          <ul className="trip-navigation">
            <li>
              <button
                className="trip-navigation__item trip-navigation__item--active"
                type="button"
                onClick={onNewTrip}
              >
                <Plus aria-hidden="true" />
                New trip
              </button>
            </li>
            <li>
              <a
                className="trip-navigation__item"
                href={starterConfig.website.developerPath}
              >
                <BookOpen aria-hidden="true" />
                Developer guide
              </a>
            </li>
          </ul>
        </nav>

        <section
          className="current-trip"
          aria-labelledby="current-trip-heading"
        >
          <h2 id="current-trip-heading">Current trip</h2>
          {!hasTrip ? (
            <p>No trip started</p>
          ) : (
            <dl>
              {(projection.origin || projection.destination) ? (
                <div>
                  <dt>Route</dt>
                  <dd className="route-metadata">
                    {projection.origin ?? '—'} → {projection.destination ?? '—'}
                  </dd>
                </div>
              ) : null}
              {projection.departureDate ? (
                <div>
                  <dt>Depart</dt>
                  <dd className="route-metadata">{projection.departureDate}</dd>
                </div>
              ) : null}
              {projection.returnDate ? (
                <div>
                  <dt>Return</dt>
                  <dd className="route-metadata">{projection.returnDate}</dd>
                </div>
              ) : null}
              {projection.travelers ? (
                <div>
                  <dt>Travelers</dt>
                  <dd>{projection.travelers}</dd>
                </div>
              ) : null}
              <div>
                <dt>Status</dt>
                <dd>{PHASE_LABELS[projection.phase]}</dd>
              </div>
            </dl>
          )}
        </section>
      </div>

      <div className="trip-context-rail__footer">
        <p className="guest-session">Guest session</p>
        <button
          className="trip-navigation__item"
          type="button"
          onClick={onOpenSettings}
        >
          <Settings aria-hidden="true" />
          Settings
        </button>
      </div>
    </aside>
  );
}
