'use client';

import {
  Armchair,
  BadgeCheck,
  BedDouble,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  MapPin,
  Pencil,
  PlaneTakeoff,
  ShieldCheck,
  Luggage,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import type { TripProjection } from '../../lib/trip-projection';
import styles from './immersive-chat-page.module.css';

export type TripSurface =
  | 'search_flights'
  | 'search_hotels'
  | 'open_loyalty'
  | 'compare_travel_insurance';

interface ImmersiveTripRailProps {
  readonly busy: boolean;
  readonly onPrompt: (prompt: string) => void;
  readonly onReveal?: (surface: TripSurface) => boolean;
  readonly projection: TripProjection;
}

function shortDate(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function shortTime(value?: string) {
  if (!value) return undefined;
  const localClock = /T(\d{2}):(\d{2})/.exec(value);
  return localClock ? `${localClock[1]}:${localClock[2]}` : value;
}

function moneyLabel(total: number, currency: string) {
  const value = new Intl.NumberFormat('en-CA', {
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(total);
  if (currency === 'CAD') return `CA${value}`;
  if (currency === 'USD') return `US${value}`;
  return value;
}

export function ImmersiveTripContext({
  busy,
  onPrompt,
  projection,
}: Readonly<{
  busy: boolean;
  onPrompt: (prompt: string) => void;
  projection: TripProjection;
}>) {
  const route = projection.origin || projection.destination
    ? `${projection.origin ?? '—'} → ${projection.destination ?? '—'}`
    : projection.stayDestination
      ? `Stay in ${projection.stayDestination}`
      : projection.protectionDestination
        ? `Protection for ${projection.protectionDestination}`
      : 'Planning your trip';
  const facts = [
    projection.departureDate ? {
      icon: CalendarDays,
      label: shortDate(projection.departureDate) ?? projection.departureDate,
      prompt: 'Change my departure date.',
      editLabel: 'Change departure date',
    } : undefined,
    projection.travelers ? {
      icon: UsersRound,
      label: projection.travelers,
      prompt: 'Change the travelers for this trip.',
      editLabel: 'Change travelers',
    } : undefined,
    projection.cabinClass ? {
      icon: Armchair,
      label: projection.cabinClass,
      prompt: 'Change the cabin for this trip.',
      editLabel: 'Change cabin',
    } : undefined,
    projection.currency ? {
      icon: CircleDollarSign,
      label: projection.currency,
      prompt: 'Change the display currency for this trip.',
      editLabel: 'Change currency',
    } : undefined,
  ].filter((fact): fact is NonNullable<typeof fact> => Boolean(fact));

  if (projection.phase === 'idle') return null;

  return (
    <section aria-label="Trip route summary" className={styles.tripContext}>
      <div className={styles.tripContextRoute}>
        <span><MapPin aria-hidden="true" /></span>
        <div>
          <strong>{route}</strong>
          <small>
            {projection.departureDate ? shortDate(projection.departureDate) : 'Add dates'}
            {projection.returnDate ? ` – ${shortDate(projection.returnDate)}` : ''}
            {projection.travelers ? ` · ${projection.travelers}` : ''}
          </small>
        </div>
      </div>
      {facts.length > 0 ? (
        <div aria-label="Trip assumptions" className={styles.tripContextFacts} role="group">
          {facts.map(({ editLabel, icon: Icon, label, prompt }) => (
            <button
              aria-label={editLabel}
              disabled={busy}
              key={editLabel}
              onClick={() => onPrompt(prompt)}
              type="button"
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
              <Pencil aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ImmersiveTripRail({
  busy,
  onPrompt,
  onReveal,
  projection,
}: Readonly<ImmersiveTripRailProps>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const selectedFlight = projection.selectedFlight;
  const selectedStay = projection.selectedStay;
  const flightRoute = projection.origin && projection.destination
    ? `${projection.origin} → ${projection.destination}`
    : projection.origin ?? projection.destination;
  const flightState = selectedFlight
    ? `${selectedFlight.carrierName} · ${selectedFlight.origin} → ${selectedFlight.destination}`
    : projection.hasFlightSelection
      ? `${projection.phase === 'verified' ? 'Verified' : 'Selected'}${flightRoute ? ` · ${flightRoute}` : ''}`
    : flightRoute ? `Planning · ${flightRoute}` : 'Not added';
  const stayDates = projection.checkInDate && projection.checkOutDate
    ? `${projection.checkInDate} – ${projection.checkOutDate}`
    : undefined;
  const stayState = selectedStay
    ? selectedStay.propertyName
    : projection.hasStaySelection
      ? `Selected${projection.stayDestination ? ` · ${projection.stayDestination}` : ''}`
    : projection.stayDestination ? `Planning · ${projection.stayDestination}` : 'Not added';
  const selectionCount = Number(Boolean(projection.hasFlightSelection))
    + Number(Boolean(projection.hasStaySelection));
  const summary = selectionCount === 2
    ? 'Flight and stay ready to review'
    : selectionCount === 1
      ? '1 selection ready to review'
      : 'Start with a flight or stay';

  function revealOrPrompt(surface: TripSurface, prompt: string, available: boolean) {
    if (available && onReveal?.(surface)) {
      setMobileOpen(false);
      return;
    }
    onPrompt(prompt);
  }

  return (
    <aside
      aria-label="Your trip"
      className={styles.tripRail}
      data-mobile-open={mobileOpen ? 'true' : 'false'}
    >
      <button
        aria-controls="immersive-trip-panel"
        aria-expanded={mobileOpen}
        aria-label={`View trip · ${selectionCount} selected`}
        className={styles.mobileTripToggle}
        onClick={() => setMobileOpen((open) => !open)}
        type="button"
      >
        <span><Luggage aria-hidden="true" />View trip · {selectionCount} selected</span>
        <ChevronRight aria-hidden="true" />
      </button>
      <div className={styles.tripRailPanel} id="immersive-trip-panel">
        <h2>Your trip</h2>
        <button
          disabled={busy}
          onClick={() => revealOrPrompt(
            'search_flights',
            'Show my current flight selection.',
            Boolean(projection.hasFlightSelection),
          )}
          type="button"
        >
          <span className={styles.tripRailIcon}><PlaneTakeoff aria-hidden="true" /></span>
          <span>
            <strong>Flight</strong>
            <small>{flightState}</small>
            {selectedFlight ? (
              <small className={styles.tripRailDetail}>
                {shortDate(selectedFlight.departureDate)} · {selectedFlight.travelers}
              </small>
            ) : projection.departureDate ? (
              <small className={styles.tripRailDetail}>
                {shortDate(projection.departureDate)}{projection.travelers ? ` · ${projection.travelers}` : ''}
              </small>
            ) : null}
            {selectedFlight ? (
              <small className={styles.tripRailPrice}>
                {selectedFlight.sourceLabel} · {moneyLabel(
                  selectedFlight.currentPrice?.total ?? selectedFlight.searchPrice.total,
                  selectedFlight.currentPrice?.currency ?? selectedFlight.searchPrice.currency,
                )}
                {shortTime(selectedFlight.departureTime)
                  ? ` · ${shortTime(selectedFlight.departureTime)}`
                  : ''}
                {selectedFlight.status === 'selected' ? ' · Verify price' : ''}
              </small>
            ) : null}
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
        <button
          disabled={busy}
          onClick={() => revealOrPrompt(
            'search_hotels',
            'Help me add a stay to this trip.',
            Boolean(projection.hasStaySelection || projection.stayDestination),
          )}
          type="button"
        >
          <span className={styles.tripRailIcon}><BedDouble aria-hidden="true" /></span>
          <span>
            <strong>Stay</strong>
            <small>{stayState}</small>
            {selectedStay ? (
              <small className={styles.tripRailDetail}>
                {selectedStay.destination} · {selectedStay.nights} nights
              </small>
            ) : stayDates ? (
              <small className={styles.tripRailDetail}>{stayDates}</small>
            ) : null}
            {selectedStay ? (
              <small className={styles.tripRailPrice}>
                {selectedStay.sourceLabel} · {moneyLabel(
                  selectedStay.subtotal.total,
                  selectedStay.subtotal.currency,
                )}
              </small>
            ) : null}
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
        <button
          disabled={busy}
          onClick={() => revealOrPrompt(
            'open_loyalty',
            'Show my illustrative rewards and review this trip.',
            Boolean(projection.hasRewardsReview),
          )}
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
          onClick={() => revealOrPrompt(
            'compare_travel_insurance',
            'Compare illustrative travel protection for this trip.',
            Boolean(projection.hasInsuranceComparison),
          )}
          type="button"
        >
          <span className={styles.tripRailIcon}><ShieldCheck aria-hidden="true" /></span>
          <span>
            <strong>Protection</strong>
            <small>{projection.hasInsuranceComparison
              ? `Comparison available${projection.protectionDestination
                ? ` · ${projection.protectionDestination}`
                : ''}`
              : 'Not compared'}</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
        <div className={styles.tripRailSummary}>
          <span>Trip summary</span>
          <strong>{summary}</strong>
          <small>
            Flight and stay prices remain separate. Protection comparisons remain
            separate, illustrative, and are not policies.
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
