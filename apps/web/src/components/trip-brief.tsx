'use client';

import {
  Armchair,
  BedDouble,
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
  'comparing-stays': 'Comparing stays',
  'stay-selected': 'Stay selected',
  rewards: 'Reviewing rewards',
  'trip-review': 'Trip review',
  error: 'Needs attention',
};

const COMPLETED_SEGMENTS: Readonly<Record<TripProjection['phase'], number>> = {
  idle: 0,
  planned: 1,
  searching: 2,
  comparing: 3,
  'no-results': 3,
  selected: 4,
  verifying: 5,
  verified: 6,
  'comparing-stays': 3,
  'stay-selected': 4,
  rewards: 3,
  'trip-review': 5,
  error: 0,
};

export function TripBrief({
  projection,
}: Readonly<{ projection: TripProjection }>) {
  const [expanded, setExpanded] = useState(false);
  if (!projection.hasFlightSelection && !projection.hasStaySelection) return null;
  const completedSegments = COMPLETED_SEGMENTS[projection.phase];
  const hasSecondaryDetails = Boolean(
    projection.returnDate
      || projection.checkOutDate
      || projection.currency
      || projection.country,
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
        {projection.stayDestination ? (
          <p className="trip-brief__fact trip-brief__stay">
            <BedDouble aria-hidden="true" />
            <strong>Stay in {projection.stayDestination}</strong>
          </p>
        ) : null}
        {projection.departureDate ? (
          <p className="trip-brief__fact">
            <CalendarDays aria-hidden="true" />
            <span>{projection.departureDate}</span>
          </p>
        ) : null}
        {!projection.departureDate && projection.checkInDate ? (
          <p className="trip-brief__fact">
            <CalendarDays aria-hidden="true" />
            <span>{projection.checkInDate}</span>
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
        <div
          aria-label="Trip progress"
          className="trip-progress"
          data-phase={projection.phase}
          role="img"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <span
              aria-hidden="true"
              data-complete={index < completedSegments ? 'true' : 'false'}
              key={index}
            />
          ))}
        </div>
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
          {projection.checkOutDate ? (
            <div>
              <dt>Check-out</dt>
              <dd>{projection.checkOutDate}</dd>
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
