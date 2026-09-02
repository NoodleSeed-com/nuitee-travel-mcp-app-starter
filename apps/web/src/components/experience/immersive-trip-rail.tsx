'use client';

import {
  BadgeCheck,
  BedDouble,
  ChevronRight,
  PlaneTakeoff,
  ShieldCheck,
} from 'lucide-react';
import type { TripProjection } from '../../lib/trip-projection';
import styles from './immersive-chat-page.module.css';

interface ImmersiveTripRailProps {
  readonly busy: boolean;
  readonly onPrompt: (prompt: string) => void;
  readonly projection: TripProjection;
}

export function ImmersiveTripRail({
  busy,
  onPrompt,
  projection,
}: Readonly<ImmersiveTripRailProps>) {
  const flightRoute = projection.origin && projection.destination
    ? `${projection.origin} → ${projection.destination}`
    : projection.origin ?? projection.destination;
  const flightState = projection.hasFlightSelection
    ? `${projection.phase === 'verified' ? 'Verified' : 'Selected'}${flightRoute ? ` · ${flightRoute}` : ''}`
    : flightRoute ? `Planning · ${flightRoute}` : 'Not added';
  const stayDates = projection.checkInDate && projection.checkOutDate
    ? `${projection.checkInDate} – ${projection.checkOutDate}`
    : undefined;
  const stayState = projection.hasStaySelection
    ? `Selected${projection.stayDestination ? ` · ${projection.stayDestination}` : ''}`
    : projection.stayDestination ? `Planning · ${projection.stayDestination}` : 'Not added';
  const selectionCount = Number(Boolean(projection.hasFlightSelection))
    + Number(Boolean(projection.hasStaySelection));
  const summary = selectionCount === 2
    ? 'Flight and stay ready to review'
    : selectionCount === 1
      ? '1 selection ready to review'
      : 'Start with a flight or stay';

  return (
    <aside aria-label="Your trip" className={styles.tripRail}>
      <h2>Your trip</h2>
      <button
        disabled={busy}
        onClick={() => onPrompt('Show my current flight selection.')}
        type="button"
      >
        <span className={styles.tripRailIcon}><PlaneTakeoff aria-hidden="true" /></span>
        <span>
          <strong>Flight</strong>
          <small>{flightState}</small>
          {projection.departureDate ? (
            <small className={styles.tripRailDetail}>
              {projection.departureDate}{projection.travelers ? ` · ${projection.travelers}` : ''}
            </small>
          ) : null}
        </span>
        <ChevronRight aria-hidden="true" />
      </button>
      <button
        disabled={busy}
        onClick={() => onPrompt('Help me add a stay to this trip.')}
        type="button"
      >
        <span className={styles.tripRailIcon}><BedDouble aria-hidden="true" /></span>
        <span>
          <strong>Stay</strong>
          <small>{stayState}</small>
          {stayDates ? <small className={styles.tripRailDetail}>{stayDates}</small> : null}
        </span>
        <ChevronRight aria-hidden="true" />
      </button>
      <button
        disabled={busy}
        onClick={() => onPrompt('Show my illustrative rewards and review this trip.')}
        type="button"
      >
        <span className={`${styles.tripRailIcon} ${styles.tripRailIconAccent}`}>
          <BadgeCheck aria-hidden="true" />
        </span>
        <span>
          <strong>Rewards</strong>
          <small>{projection.hasRewardsReview ? 'Reviewed' : 'Review available'}</small>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>
      <button
        disabled={busy}
        onClick={() => onPrompt('Compare illustrative travel protection for this trip.')}
        type="button"
      >
        <span className={styles.tripRailIcon}><ShieldCheck aria-hidden="true" /></span>
        <span>
          <strong>Protection</strong>
          <small>{projection.hasInsuranceComparison
            ? 'Comparison available'
            : 'Not compared'}</small>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>
      <div className={styles.tripRailSummary}>
        <span>Trip summary</span>
        <strong>{summary}</strong>
        <small>
          Prices remain separate until returned by the connected tools. Protection
          comparisons remain separate and are not policies.
        </small>
        {selectionCount > 0 ? (
          <button
            className={styles.tripRailReview}
            disabled={busy}
            onClick={() => onPrompt('Review my current flight, stay, and illustrative rewards together.')}
            type="button"
          >
            Review current trip
          </button>
        ) : null}
      </div>
    </aside>
  );
}

export function ImmersiveConversationSkeleton() {
  return (
    <div
      aria-label="Loading travel options"
      aria-live="polite"
      className={styles.conversationSkeleton}
      role="status"
    >
      <span className={styles.skeletonLine} />
      <span className={styles.skeletonLineShort} />
      <div aria-hidden="true" className={styles.skeletonCards}>
        <span />
        <span />
      </div>
      <span className={styles.srOnly}>Loading travel options</span>
    </div>
  );
}
