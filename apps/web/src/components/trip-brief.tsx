'use client';

import {
  Armchair,
  CalendarDays,
  ChevronDown,
  MapPin,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';
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
  const [expanded, setExpanded] = useState(false);
  if (projection.phase === 'idle') return null;
  const hasSecondaryDetails = Boolean(
    projection.returnDate || projection.currency || projection.country,
  );

  return (
    <section aria-label="Current trip" className="trip-brief">
      <div className="trip-brief__facts">
        {projection.origin || projection.destination ? (
          <p className="trip-brief__fact trip-brief__route">
            <MapPin aria-hidden="true" />
            <strong>{projection.origin ?? '—'}</strong>
            <span aria-hidden="true"> → </span>
            <strong>{projection.destination ?? '—'}</strong>
          </p>
        ) : null}
        {projection.departureDate ? (
          <p className="trip-brief__fact">
            <CalendarDays aria-hidden="true" />
            <span>{projection.departureDate}</span>
          </p>
        ) : null}
        {projection.travelers ? (
          <p className="trip-brief__fact">
            <UsersRound aria-hidden="true" />
            <span>{projection.travelers}</span>
          </p>
        ) : null}
        {projection.cabinClass ? (
          <p className="trip-brief__fact">
            <Armchair aria-hidden="true" />
            <span>{projection.cabinClass}</span>
          </p>
        ) : null}
      </div>
      <div className="trip-brief__actions">
        <p className="trip-brief__status">{PHASE_LABELS[projection.phase]}</p>
        {hasSecondaryDetails ? (
          <button
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide trip details' : 'Show trip details'}
            className="trip-brief__toggle"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            <ChevronDown aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {hasSecondaryDetails && expanded ? (
        <dl className="trip-brief__details">
          {projection.returnDate ? (
            <div>
              <dt>Return</dt>
              <dd>{projection.returnDate}</dd>
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
    </section>
  );
}
