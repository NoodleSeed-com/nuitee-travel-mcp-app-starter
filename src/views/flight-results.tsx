import '@fontsource-variable/inter';
import '@noodleseed/one/react/styles.css';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import {
  Action,
  ActionBar,
  Feedback,
  Frame,
  Region,
  StatusBadge,
  useAppFlow,
  useBranding,
  useCallTool,
  useLayout,
  useRequestDisplayMode,
  useSendFollowUpMessage,
  useToolInfo,
  useUpdateModelContext,
  useViewState,
  useWidgetReady,
} from '../helpers.js';
import type { Itinerary, SearchContext, SearchOutput, Verification } from '../flight-schemas.js';
import type { GatewayError } from '../flight-runtime.js';
import {
  ArrowLeftIcon,
  CheckIcon,
  PlaneIcon,
  TagIcon,
} from './icons.js';
import { SearchEditor, searchPrompt, type SearchDraft } from './search-editor.js';
import './travel.css';

type ResultsState = 'loading' | 'malformed';
type TravelView = 'search' | 'results' | 'review';

const errorCodes = new Set([
  'invalid_search', 'invalid_request', 'configuration_required', 'authentication', 'entitlement', 'rate_limited',
  'timeout', 'provider_error', 'malformed_response', 'oversized_response', 'service_unavailable',
  'expired_offer', 'unavailable_offer', 'unknown_or_stale_selection',
]);
const amenityCategories = new Set(['wifi', 'power', 'entertainment', 'food', 'seat_comfort']);

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

export function selectionOutcome(value: unknown, expectedSelectionId: string) {
  const response = record(value);
  const content = record(response?.structuredContent);
  const confirmed = content?.status === 'selected'
    && content.selectionId === expectedSelectionId;
  return {
    confirmed,
    message: boundedText(content?.message, 240)
      ? content.message
      : 'The fare could not be added to this trip. Your previous selection is unchanged.',
  };
}

export function selectionTransition(
  value: unknown,
  requestedSelectionId: string,
  currentSelectionId?: string,
) {
  const outcome = selectionOutcome(value, requestedSelectionId);
  return {
    ...outcome,
    nextSelectionId: outcome.confirmed ? requestedSelectionId : currentSelectionId,
    resetVerification: outcome.confirmed && requestedSelectionId !== currentSelectionId,
  };
}

function isOptionalText(value: unknown, max: number) {
  return value === undefined || boundedText(value, max);
}

function isMoney(value: unknown): value is { total: number; currency: string; base?: number; taxes?: number; fees?: number } {
  const candidate = record(value);
  const validPart = (part: unknown) => part === undefined ||
    (typeof part === 'number' && Number.isFinite(part) && part >= 0 && part <= 100_000_000);
  return Boolean(candidate && typeof candidate.total === 'number' && Number.isFinite(candidate.total) &&
    candidate.total >= 0 && candidate.total <= 100_000_000 &&
    typeof candidate.currency === 'string' && /^[A-Z]{3}$/.test(candidate.currency) &&
    validPart(candidate.base) && validPart(candidate.taxes) && validPart(candidate.fees));
}

function isRoute(value: unknown): value is Itinerary['route'] {
  const candidate = record(value);
  return Boolean(candidate && typeof candidate.origin === 'string' && /^[A-Z]{3}$/.test(candidate.origin) &&
    typeof candidate.destination === 'string' && /^[A-Z]{3}$/.test(candidate.destination) &&
    isOptionalText(candidate.originName, 120) && isOptionalText(candidate.destinationName, 120));
}

function isCarrier(value: unknown): value is Itinerary['carrier'] {
  const candidate = record(value);
  return Boolean(candidate && boundedText(candidate.name, 100) && typeof candidate.code === 'string' && /^(?:[A-Z0-9]{2,3}|—)$/.test(candidate.code) &&
    (candidate.logoUrl === undefined || (typeof candidate.logoUrl === 'string' &&
      /^https:\/\/(?:sandbox|production)\.nuitee\.flights\/static\/images\/airlines\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:png|svg|webp)$/.test(candidate.logoUrl))));
}

function isSearchContext(value: unknown): value is SearchContext {
  if (value === undefined) return true;
  const candidate = record(value);
  if (!candidate) return false;
  const returnDate = candidate.returnDate;
  const tripType = candidate.tripType;
  return typeof candidate.origin === 'string' && /^[A-Z]{3}$/.test(candidate.origin) &&
    typeof candidate.destination === 'string' && /^[A-Z]{3}$/.test(candidate.destination) &&
    (tripType === undefined || tripType === 'ONE_WAY' || tripType === 'ROUND_TRIP') &&
    typeof candidate.departureDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(candidate.departureDate) &&
    (returnDate === undefined || (typeof returnDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(returnDate))) &&
    Number.isInteger(candidate.adults) && (candidate.adults as number) >= 1 && (candidate.adults as number) <= 9 &&
    Number.isInteger(candidate.children) && (candidate.children as number) >= 0 && (candidate.children as number) <= 8 &&
    Number.isInteger(candidate.infants) && (candidate.infants as number) >= 0 && (candidate.infants as number) <= 9 &&
    Array.isArray(candidate.childrenAges) && candidate.childrenAges.length === candidate.children &&
    candidate.childrenAges.every((age) => Number.isInteger(age) && (age as number) >= 2 && (age as number) <= 11) &&
    Array.isArray(candidate.infantAges) && candidate.infantAges.length === candidate.infants &&
    candidate.infantAges.every((age) => Number.isInteger(age) && (age as number) >= 0 && (age as number) <= 1) &&
    ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'].includes(String(candidate.cabinClass)) &&
    typeof candidate.currency === 'string' && /^[A-Z]{3}$/.test(candidate.currency) &&
    typeof candidate.country === 'string' && /^[A-Z]{2}$/.test(candidate.country);
}

function isItinerary(value: unknown): value is Itinerary {
  const candidate = record(value);
  if (!candidate || typeof candidate.selectionId !== 'string' || !/^sel_[a-f0-9]{32}$/.test(candidate.selectionId) ||
      !isRoute(candidate.route) || !boundedText(candidate.departureTime, 64) || !boundedText(candidate.arrivalTime, 64) ||
      !Number.isInteger(candidate.durationMinutes) || (candidate.durationMinutes as number) < 0 || (candidate.durationMinutes as number) > 20_160 ||
      !Number.isInteger(candidate.stops) || (candidate.stops as number) < 0 || (candidate.stops as number) > 14 ||
      !isMoney(candidate.price) || typeof candidate.isCheapest !== 'boolean' || !boundedText(candidate.retrievedAt, 64) ||
      !isCarrier(candidate.carrier)) return false;
  const baggage = record(candidate.baggage);
  const fare = record(candidate.fare);
  const terms = record(candidate.terms);
  if (!baggage || typeof baggage.carryOn !== 'boolean' || typeof baggage.checked !== 'boolean' ||
      !Array.isArray(baggage.allowances) || baggage.allowances.length > 4 || !baggage.allowances.every((item) => boundedText(item, 120)) ||
      !fare || !isOptionalText(fare.family, 80) ||
      (fare.mixedCabin !== undefined && typeof fare.mixedCabin !== 'boolean') ||
      (fare.seatsRemaining !== undefined && (!Number.isInteger(fare.seatsRemaining) || (fare.seatsRemaining as number) < 0 || (fare.seatsRemaining as number) > 999)) ||
      !terms || ['changeable', 'refundable', 'hasChangeFee', 'hasRefundFee'].some((key) => terms[key] !== undefined && typeof terms[key] !== 'boolean')) return false;
  if (!Array.isArray(candidate.amenities) || candidate.amenities.length > 5 || !candidate.amenities.every((value) => {
    const amenity = record(value);
    return Boolean(amenity && typeof amenity.category === 'string' && amenityCategories.has(amenity.category) &&
      boundedText(amenity.name, 80) && typeof amenity.available === 'boolean' &&
      (amenity.chargeable === undefined || typeof amenity.chargeable === 'boolean') &&
      isOptionalText(amenity.details, 160) && isOptionalText(amenity.aircraftType, 80));
  })) return false;
  if (!Array.isArray(candidate.legs) || candidate.legs.length < 1 || candidate.legs.length > 2 || !candidate.legs.every((value) => {
    const leg = record(value);
    return Boolean(leg && (leg.direction === 'OUTBOUND' || leg.direction === 'INBOUND') && isRoute(leg.route) &&
      boundedText(leg.departureTime, 64) && boundedText(leg.arrivalTime, 64) && Number.isInteger(leg.durationMinutes) &&
      (leg.durationMinutes as number) >= 0 && (leg.durationMinutes as number) <= 10_080 && Number.isInteger(leg.stops) &&
      (leg.stops as number) >= 0 && (leg.stops as number) <= 7 &&
      (leg.dayChange === undefined || (Number.isInteger(leg.dayChange) && (leg.dayChange as number) >= 0 && (leg.dayChange as number) <= 7)) &&
      (leg.overnight === undefined || typeof leg.overnight === 'boolean'));
  })) return false;
  if (!Array.isArray(candidate.segments) || candidate.segments.length > 8 || !candidate.segments.every((value) => {
    const segment = record(value);
    return Boolean(segment && isRoute({
      origin: segment.origin, originName: segment.originName,
      destination: segment.destination, destinationName: segment.destinationName,
    }) && boundedText(segment.departureTime, 64) && boundedText(segment.arrivalTime, 64) &&
      (segment.direction === 'OUTBOUND' || segment.direction === 'INBOUND') && Number.isInteger(segment.durationMinutes) &&
      (segment.durationMinutes as number) >= 0 && (segment.durationMinutes as number) <= 10_080 && isCarrier(segment.carrier) &&
      (segment.operatingCarrier === undefined || isCarrier(segment.operatingCarrier)) &&
      isOptionalText(segment.flightNumber, 16) && isOptionalText(segment.operatingFlightNumber, 16));
  })) return false;
  return Array.isArray(candidate.messages) && candidate.messages.length <= 6 && candidate.messages.every((item) => boundedText(item, 240)) &&
    (candidate.expiresAt === undefined || boundedText(candidate.expiresAt, 64));
}

export function isSearchOutput(value: unknown): value is SearchOutput {
  const candidate = record(value);
  if (!candidate || typeof candidate.status !== 'string' || !['success', 'empty', 'partial', 'error'].includes(candidate.status) ||
      !boundedText(candidate.fallback, 500) || !boundedText(candidate.message, 400) ||
      !isOptionalText(candidate.retrievedAt, 64) ||
      (candidate.searchId !== undefined && (typeof candidate.searchId !== 'string' || !/^search_[a-f0-9]{32}$/.test(candidate.searchId))) ||
      !isSearchContext(candidate.searchContext) || !Array.isArray(candidate.itineraries) || candidate.itineraries.length > 10 ||
      !candidate.itineraries.every(isItinerary)) return false;
  const hasError = isGatewayError(candidate.error);
  const count = candidate.itineraries.length;
  return ((candidate.status === 'success' || candidate.status === 'partial') && count > 0 && candidate.error === undefined) ||
    (candidate.status === 'empty' && count === 0 && candidate.error === undefined) ||
    (candidate.status === 'error' && count === 0 && hasError);
}

export function isVerification(value: unknown): value is Verification {
  const candidate = record(value);
  return Boolean(candidate && candidate.status === 'success' && candidate.availability === 'available' &&
    typeof candidate.selectionId === 'string' && /^sel_[a-f0-9]{32}$/.test(candidate.selectionId) &&
    typeof candidate.priceChanged === 'boolean' && isMoney(candidate.previousPrice) && isMoney(candidate.currentPrice) &&
    Array.isArray(candidate.messages) && candidate.messages.length <= 6 && candidate.messages.every((item) => boundedText(item, 240)) &&
    (candidate.expiresAt === undefined || boundedText(candidate.expiresAt, 64)) &&
    (candidate.verifiedAt === undefined || boundedText(candidate.verifiedAt, 64)));
}

export function isGatewayError(value: unknown): value is GatewayError {
  const candidate = record(value);
  return Boolean(candidate && typeof candidate.code === 'string' && errorCodes.has(candidate.code) &&
    boundedText(candidate.message, 320) && typeof candidate.retryable === 'boolean');
}

function money(total: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(total);
  } catch {
    return `${total.toFixed(2)} ${currency}`;
  }
}

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours > 0 ? `${hours}h ${remaining}m` : `${remaining}m`;
}

function flightMoment(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return { date: value, time: value };
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return {
    date: new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
      weekday: 'short',
    }).format(date),
    time: `${hour}:${minute}`,
  };
}

function instantTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  }).format(parsed);
}

function travellerLabel(context: SearchContext) {
  const travellers = context.adults + context.children + context.infants;
  return `${travellers} traveller${travellers === 1 ? '' : 's'}`;
}

export function selectedFareModelContext(itinerary: Itinerary, verification?: Verification) {
  const verified = verification?.selectionId === itinerary.selectionId ? verification : undefined;
  const currentPrice = verified?.currentPrice ?? itinerary.price;
  const verificationSummary = verified
    ? ` It was last verified at ${currentPrice.total} ${currentPrice.currency}${verified.priceChanged ? ' after a price change' : ''}.`
    : '';
  return {
    content: [{
      type: 'text' as const,
      text: `The active fare selection is ${itinerary.selectionId}: ${itinerary.carrier.name} (${itinerary.carrier.code}), ${itinerary.route.origin} to ${itinerary.route.destination}, ${currentPrice.total} ${currentPrice.currency}.${verificationSummary} When the user asks to verify this fare or verify again, use active selection mode. This is not a booking.`,
    }],
    structuredContent: {
      activeFareSelection: {
        selectionId: itinerary.selectionId,
        carrier: { name: itinerary.carrier.name, code: itinerary.carrier.code },
        route: { origin: itinerary.route.origin, destination: itinerary.route.destination },
        price: { total: currentPrice.total, currency: currentPrice.currency },
        verification: verified ? {
          priceChanged: verified.priceChanged,
          verifiedAt: verified.verifiedAt,
        } : undefined,
      },
    },
  };
}

function stopLabel(stops: number) {
  if (stops === 0) return 'Nonstop';
  return `${stops} stop${stops === 1 ? '' : 's'}`;
}

function layoverDuration(arrivalTime: string, departureTime: string) {
  const arrival = Date.parse(arrivalTime);
  const departure = Date.parse(departureTime);
  const minutes = Math.round((departure - arrival) / 60_000);
  return Number.isFinite(minutes) && minutes >= 0 && minutes <= 10_080 ? duration(minutes) : undefined;
}

function layoversForDirection(itinerary: Itinerary, direction: Itinerary['legs'][number]['direction']) {
  const segments = itinerary.segments.filter((segment) => segment.direction === direction);
  return segments.slice(1).flatMap((segment, index) => {
    const previous = segments[index];
    if (!previous || previous.destination !== segment.origin) return [];
    const airport = segment.originName ? `${segment.originName} (${segment.origin})` : segment.origin;
    const wait = layoverDuration(previous.arrivalTime, segment.departureTime);
    return [{ airport, wait }];
  });
}

function carrierInitials(carrier: Itinerary['carrier']) {
  if (carrier.code !== '—') return carrier.code.slice(0, 3);
  return carrier.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

// Keep these accents local and deliberately curated. They tint the details face
// without loading third-party visual assets. Any carrier not listed here uses
// the host/Wayfare accent through the CSS fallback instead of a guessed color.
const carrierAccents: Readonly<Record<string, string>> = {
  ND: '#171717',
  PD: '#2b2d31',
  TP: '#087a55',
  TS: '#17649a',
  WS: '#0b756b',
};

function carrierAccent(code: string) {
  return carrierAccents[code.toUpperCase()];
}

function CarrierIdentity({ carrier, compact = false }: { readonly carrier: Itinerary['carrier']; readonly compact?: boolean }) {
  return (
    <span className={`cc-carrier-identity ${compact ? 'cc-carrier-identity-compact' : ''}`}>
      <span className="cc-carrier-mark" aria-hidden="true">
        <span className="cc-carrier-initials">{carrierInitials(carrier)}</span>
        {carrier.logoUrl ? (
          <img
            alt=""
            decoding="async"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={carrier.logoUrl}
            onError={(event) => { event.currentTarget.hidden = true; }}
          />
        ) : null}
      </span>
      <span className="cc-carrier-copy">
        <strong>{carrier.name}</strong>
        <small>{carrier.code}</small>
      </span>
    </span>
  );
}

function FareCardSkeleton() {
  return (
    <div className="cc-carousel-slide">
      <article className="cc-fare-card cc-skeleton-fare">
        <div className="cc-compact-fare-main">
          <div className="cc-skeleton-carrier-stack">
            <span className="cc-skeleton-carrier-group">
              <span className="cc-skeleton-block cc-shimmer cc-skeleton-logo" />
              <span className="cc-skeleton-block cc-shimmer cc-skeleton-carrier" />
            </span>
            <span className="cc-skeleton-block cc-shimmer cc-skeleton-badge" />
          </div>
          <section className="cc-leg cc-skeleton-leg">
            <div className="cc-skeleton-times">
              <span className="cc-skeleton-block cc-shimmer" />
              <span className="cc-skeleton-block cc-shimmer" />
              <span className="cc-skeleton-block cc-shimmer" />
            </div>
          </section>
          <div className="cc-skeleton-price-stack">
            <span className="cc-skeleton-block cc-shimmer cc-skeleton-price" />
            <span className="cc-skeleton-block cc-shimmer cc-skeleton-action" />
          </div>
        </div>
        <div className="cc-skeleton-row cc-compact-fare-footer">
          <span className="cc-skeleton-block cc-shimmer cc-skeleton-details" />
          <span className="cc-skeleton-block cc-shimmer cc-skeleton-badge" />
        </div>
      </article>
    </div>
  );
}

function FlightSearchSkeleton() {
  return (
    <section className="cc-search-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="cc-visually-hidden">Searching current fares…</span>

      <section className="cc-carousel cc-skeleton-carousel" aria-hidden="true">
        <div className="cc-carousel-controls">
          <span className="cc-skeleton-block cc-shimmer cc-skeleton-position" />
        </div>
        <div className="cc-carousel-stage">
          <span className="cc-skeleton-block cc-shimmer cc-skeleton-arrow cc-skeleton-arrow-previous" />
          <div className="cc-carousel-window">
            <div className="cc-carousel-track">
              <FareCardSkeleton />
              <FareCardSkeleton />
            </div>
          </div>
          <span className="cc-skeleton-block cc-shimmer cc-skeleton-arrow cc-skeleton-arrow-next" />
        </div>
      </section>
      <div className="cc-skeleton-notes" aria-hidden="true">
        <span className="cc-skeleton-block cc-shimmer cc-skeleton-hint" />
        <span className="cc-skeleton-freshness">
          <span className="cc-skeleton-block cc-shimmer" />
          <span className="cc-skeleton-block cc-shimmer" />
          <span className="cc-skeleton-block cc-shimmer" />
        </span>
      </div>
    </section>
  );
}

function resultStatus(state: ResultsState, theme: 'light' | 'dark', brandStyle?: CSSProperties) {
  if (state === 'loading') {
    return (
      <Frame className={`cc-app cc-flight-results ${theme === 'dark' ? 'cc-theme-dark' : ''}`} style={brandStyle} displayMode="auto" title="Flight options" subtitle="Searching current fares">
        <FlightSearchSkeleton />
      </Frame>
    );
  }
  return (
    <Frame className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`} style={brandStyle} displayMode="auto" title="Flight results">
      <Feedback status="error">The flight result was incomplete and could not be shown safely.</Feedback>
    </Frame>
  );
}

function RouteTimeline({ itinerary }: { readonly itinerary: Itinerary }) {
  return (
    <div className="cc-leg-list">
      {itinerary.legs.map((leg) => {
        const direction = leg.direction === 'OUTBOUND' ? 'Outbound' : 'Return';
        const layovers = layoversForDirection(itinerary, leg.direction);
        const departure = flightMoment(leg.departureTime);
        const arrival = flightMoment(leg.arrivalTime);
        return (
          <section className="cc-leg" aria-label={`${direction} ${leg.route.origin} to ${leg.route.destination}`} key={leg.direction}>
            <div className="cc-leg-heading">
              <h4><PlaneIcon />{direction}</h4>
            </div>
            <div className="cc-flight-segment-row">
              <div className="cc-flight-endpoint">
                <strong>{departure.time}</strong>
                <span className="cc-leg-route-origin">{leg.route.origin}</span>
                <small>{departure.date}</small>
              </div>
              <div className="cc-flight-path">
                <span>{duration(leg.durationMinutes)}{leg.overnight ? ' · Overnight' : ''}</span>
                <span aria-hidden="true" className="cc-flight-path-line"><PlaneIcon /></span>
                <strong className={leg.stops === 0 ? 'cc-flight-path-direct' : ''}>{stopLabel(leg.stops)}</strong>
              </div>
              <div className="cc-flight-endpoint cc-flight-endpoint-arrival">
                <strong>{arrival.time}{leg.dayChange ? <sup>+{leg.dayChange}</sup> : null}</strong>
                <span className="cc-leg-route-destination">{leg.route.destination}</span>
                <small>{arrival.date}</small>
              </div>
            </div>
            {leg.stops > 0 ? (
              <div className="cc-layover-summary" aria-label={`${direction} layover details`}>
                {layovers.length > 0 ? layovers.map((layover, index) => (
                  <p key={`${leg.direction}-${index}-${layover.airport}`}>
                    <span>Layover at <strong>{layover.airport}</strong></span>
                    {layover.wait ? <span className="cc-layover-duration">{layover.wait}</span> : null}
                  </p>
                )) : <p><span>Layover details were not provided.</span></p>}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function FareDetailContent({ itinerary, compact = false }: { readonly itinerary: Itinerary; readonly compact?: boolean }) {
  return (
    <div className={`cc-fare-detail-content ${compact ? 'cc-fare-detail-content-compact' : ''}`}>
      <div className="cc-details-grid">
        {itinerary.fare.family ? <div><span>Fare family</span><strong>{itinerary.fare.family}</strong></div> : null}
        {itinerary.fare.mixedCabin !== undefined ? <div><span>Cabin</span><strong>{itinerary.fare.mixedCabin ? 'Mixed cabin' : 'Same cabin throughout'}</strong></div> : null}
        {itinerary.fare.seatsRemaining !== undefined ? <div><span>Provider availability</span><strong>{itinerary.fare.seatsRemaining} seat{itinerary.fare.seatsRemaining === 1 ? '' : 's'} shown</strong></div> : null}
        {itinerary.terms.changeable !== undefined ? <div><span>Changes</span><strong>{itinerary.terms.changeable ? (itinerary.terms.hasChangeFee ? 'Allowed; fee may apply' : 'Allowed') : 'Not allowed'}</strong></div> : null}
        {itinerary.terms.refundable !== undefined ? <div><span>Refunds</span><strong>{itinerary.terms.refundable ? (itinerary.terms.hasRefundFee ? 'Allowed; fee may apply' : 'Allowed') : 'Non-refundable'}</strong></div> : null}
        <div><span>Carry-on</span><strong>{itinerary.baggage.carryOn ? 'Included' : 'Not confirmed'}</strong></div>
        <div><span>Checked bag</span><strong>{itinerary.baggage.checked ? 'Included' : 'Not confirmed'}</strong></div>
      </div>
      {itinerary.amenities.length > 0 ? (
        <ul className="cc-amenities" aria-label="Documented amenities">
          {itinerary.amenities.map((amenity, index) => (
            <li key={`${amenity.category}-${index}`}>
              <span aria-hidden="true">{amenity.available ? <CheckIcon /> : '—'}</span>
              <span><strong>{amenity.name}</strong>{amenity.chargeable ? ' · Fee applies' : ''}{amenity.details ? ` · ${amenity.details}` : ''}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {itinerary.segments.length > 0 ? (
        <ol className="cc-segments" aria-label="Flight segments">
          {itinerary.segments.map((segment, index) => (
            <li key={`${segment.direction}-${index}-${segment.origin}-${segment.destination}`}>
              <strong>{segment.origin} → {segment.destination}</strong>
              <span>{segment.carrier.code}{segment.flightNumber ? ` ${segment.flightNumber}` : ''} · {duration(segment.durationMinutes)}</span>
              {segment.originName || segment.destinationName ? (
                <small>{segment.originName ?? segment.origin} → {segment.destinationName ?? segment.destination}</small>
              ) : null}
              {segment.operatingCarrier ? <small>Operated by {segment.operatingCarrier.name} ({segment.operatingCarrier.code})</small> : null}
            </li>
          ))}
        </ol>
      ) : null}
      {itinerary.messages.length > 0 ? <ul className="cc-messages">{itinerary.messages.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul> : null}
    </div>
  );
}

function itineraryFlightLabel(itinerary: Itinerary) {
  const flights = itinerary.segments
    .map((segment) => `${segment.carrier.code}${segment.flightNumber ? ` ${segment.flightNumber}` : ''}`)
    .filter((flight, index, all) => all.indexOf(flight) === index);
  return flights.length > 0 ? flights.join(' · ') : itinerary.carrier.code;
}

function FareCard({ itinerary, pending = false, searchContext, selected, onSelect }: {
  readonly itinerary: Itinerary;
  readonly pending?: boolean;
  readonly searchContext?: SearchContext;
  readonly selected: boolean;
  readonly onSelect?: (selectionId: string) => void;
}) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const backFaceId = useId();
  const detailsButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const accent = carrierAccent(itinerary.carrier.code);

  function showDetails() {
    setDetailsVisible(true);
    window.setTimeout(() => backButtonRef.current?.focus({ preventScroll: true }), 50);
  }

  function showFlight() {
    setDetailsVisible(false);
    window.setTimeout(() => detailsButtonRef.current?.focus({ preventScroll: true }), 50);
  }

  return (
    <article
      className={`cc-fare-card ${itinerary.legs.length > 1 ? 'cc-fare-card-round-trip' : ''} ${detailsVisible ? 'cc-fare-card-details' : ''} ${selected ? 'cc-fare-selected' : ''}`}
      aria-label={`${itinerary.route.origin} to ${itinerary.route.destination} with ${itinerary.carrier.name}`}
      style={accent ? { '--cc-carrier-accent': accent } as CSSProperties : undefined}
    >
      <div className="cc-fare-face-stack">
        <div
          aria-hidden={detailsVisible}
          className={`cc-fare-face cc-fare-face-front ${detailsVisible ? 'cc-fare-face-is-hidden' : ''}`}
          inert={detailsVisible ? true : undefined}
        >
          <div className="cc-fare-front-scroll cc-compact-fare-front">
            <div className="cc-compact-fare-main">
              <header className="cc-fare-header cc-compact-fare-carrier">
                <CarrierIdentity carrier={itinerary.carrier} />
                {selected ? <StatusBadge className="cc-fare-selected-badge" tone="success"><CheckIcon />Selected</StatusBadge> : null}
              </header>
              <RouteTimeline itinerary={itinerary} />
              <div className="cc-compact-fare-price">
                <strong>{money(itinerary.price.total, itinerary.price.currency)}</strong>
                <span>Total for {searchContext ? travellerLabel(searchContext) : 'this trip'}</span>
                {!selected ? (
                  <Action
                    variant="primary"
                    aria-label={`Select fare from ${itinerary.route.origin} to ${itinerary.route.destination} with ${itinerary.carrier.name}`}
                    disabled={pending}
                    onClick={() => onSelect?.(itinerary.selectionId)}
                    pending={pending}
                    pendingLabel="Adding…"
                  >
                    Select fare
                  </Action>
                ) : null}
              </div>
            </div>
            <footer className="cc-fare-footer cc-compact-fare-footer">
              <span>{itinerary.carrier.name} · {itineraryFlightLabel(itinerary)}</span>
              <div className="cc-compact-fare-actions">
                {itinerary.isCheapest ? <StatusBadge className="cc-fare-highlight-badge" tone="success">Best value</StatusBadge> : null}
                <button
                  aria-controls={backFaceId}
                  aria-expanded={detailsVisible}
                  aria-label="Flight and fare details"
                  className="cc-details-toggle"
                  onClick={showDetails}
                  ref={detailsButtonRef}
                  type="button"
                >
                  <span aria-hidden="true">Details</span><span aria-hidden="true" className="cc-details-chevron" />
                </button>
              </div>
            </footer>
          </div>
        </div>
        <div
          aria-hidden={!detailsVisible}
          className={`cc-fare-face cc-fare-face-back ${detailsVisible ? '' : 'cc-fare-face-is-hidden'}`}
          id={backFaceId}
          inert={detailsVisible ? undefined : true}
        >
          <header className="cc-fare-back-header">
            <div>
              <span>Fare overview</span>
              <h3>Flight and fare details</h3>
              <CarrierIdentity carrier={itinerary.carrier} compact />
            </div>
            <button className="cc-fare-back-button" onClick={showFlight} ref={backButtonRef} type="button">
              <ArrowLeftIcon />Back to flight
            </button>
          </header>
          <p className="cc-fare-back-route">{itinerary.route.origin} → {itinerary.route.destination} · {money(itinerary.price.total, itinerary.price.currency)}</p>
          <FareDetailContent itinerary={itinerary} compact />
        </div>
      </div>
    </article>
  );
}

function FareCarousel({ itineraries, pendingSelectionId, searchContext, selectedSelectionId, onSelect }: {
  readonly itineraries: readonly Itinerary[];
  readonly pendingSelectionId?: string;
  readonly searchContext?: SearchContext;
  readonly selectedSelectionId?: string;
  readonly onSelect?: (selectionId: string) => void;
}) {
  const selectedIndex = selectedSelectionId
    ? itineraries.findIndex((itinerary) => itinerary.selectionId === selectedSelectionId)
    : -1;
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, selectedIndex));
  const lastIndex = Math.max(0, itineraries.length - 1);

  useEffect(() => {
    setActiveIndex((current) => selectedIndex >= 0
      ? selectedIndex
      : Math.min(current, lastIndex));
  }, [lastIndex, selectedIndex]);

  function moveTo(index: number) {
    setActiveIndex(Math.max(0, Math.min(lastIndex, index)));
  }

  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < lastIndex;

  return (
    <section
      className="cc-carousel"
      aria-label="Flight options carousel"
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        moveTo(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
      }}
    >
      <div className="cc-carousel-controls">
        <span aria-live="polite" role="status">Option {activeIndex + 1} of {itineraries.length}</span>
        <div aria-label="Choose a flight option" className="cc-carousel-dots" role="group">
          {itineraries.map((itinerary, index) => (
            <button
              aria-current={index === activeIndex ? 'true' : undefined}
              aria-label={`Show flight option ${index + 1}`}
              key={itinerary.selectionId}
              onClick={() => moveTo(index)}
              type="button"
            />
          ))}
        </div>
      </div>
      <div
        className="cc-carousel-stage"
      >
        <Action
          aria-label="Previous flight option"
          className="cc-carousel-arrow cc-carousel-arrow-previous"
          disabled={!hasPrevious}
          onClick={() => moveTo(activeIndex - 1)}
          variant="quiet"
        >
          <ArrowLeftIcon />
        </Action>
        <div className="cc-carousel-window">
          <div
            className="cc-carousel-track"
            data-active-index={activeIndex}
            data-last-index={lastIndex}
          >
            {itineraries.map((itinerary, index) => {
              const active = index === activeIndex;
              return (
                <div
                  aria-hidden={!active}
                  aria-label={active ? `Flight option ${index + 1} of ${itineraries.length}` : undefined}
                  aria-roledescription={active ? 'slide' : undefined}
                  className="cc-carousel-slide"
                  data-active={active ? 'true' : 'false'}
                  data-slide-index={index}
                  inert={active ? undefined : true}
                  key={itinerary.selectionId}
                  role={active ? 'region' : undefined}
                  tabIndex={active ? 0 : undefined}
                >
                  <FareCard
                    itinerary={itinerary}
                    onSelect={onSelect}
                    pending={pendingSelectionId === itinerary.selectionId}
                    searchContext={searchContext}
                    selected={selectedSelectionId === itinerary.selectionId}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <Action
          aria-label="Next flight option"
          className="cc-carousel-arrow cc-carousel-arrow-next"
          disabled={!hasNext}
          onClick={() => moveTo(activeIndex + 1)}
          variant="quiet"
        >
          <ArrowLeftIcon />
        </Action>
      </div>
    </section>
  );
}

function FareReview({ itinerary, verification, onBack }: {
  readonly itinerary: Itinerary;
  readonly verification: Verification;
  readonly onBack?: () => void;
}) {
  const [secondaryVisible, setSecondaryVisible] = useState(false);
  const secondaryId = useId();

  return (
    <section className="cc-review" aria-labelledby="cc-review-title">
      <header className="cc-review-header">
        <Action type="button" variant="quiet" onClick={onBack}><ArrowLeftIcon />Back to results</Action>
        <StatusBadge tone={verification.priceChanged ? 'warning' : 'success'}>{verification.priceChanged ? 'Price changed' : 'Verified, not booked'}</StatusBadge>
      </header>
      <div className="cc-review-ticket">
        <div className="cc-review-title">
          <h2 id="cc-review-title">Verified fare review</h2>
          <CarrierIdentity carrier={itinerary.carrier} compact />
        </div>
        <p className="cc-review-disclaimer">Verified, not booked</p>
        <div className="cc-review-route">
          <div><strong>{itinerary.route.origin}</strong><span>{itinerary.route.originName ?? 'Origin airport'}</span></div>
          <span className="cc-review-line" aria-hidden="true"><PlaneIcon /></span>
          <div><strong>{itinerary.route.destination}</strong><span>{itinerary.route.destinationName ?? 'Destination airport'}</span></div>
        </div>
        <RouteTimeline itinerary={itinerary} />
        <div className="cc-review-facts">
          <div><span>Carrier</span><strong>{itinerary.carrier.name} ({itinerary.carrier.code})</strong></div>
          <div><span>Fare</span><strong>{itinerary.fare.family ?? 'Not provided'}</strong></div>
          <div><span>Stops</span><strong>{itinerary.stops === 0 ? 'Nonstop' : itinerary.stops}</strong></div>
          <div><span>Duration</span><strong>{duration(itinerary.durationMinutes)}</strong></div>
        </div>
        <div className={`cc-review-price ${verification.priceChanged ? 'cc-review-price-changed' : ''}`} role="status" aria-live="polite">
          <div>
            <span>Current verified price</span>
            <strong>{money(verification.currentPrice.total, verification.currentPrice.currency)}</strong>
          </div>
          <p>Previous search price was {money(verification.previousPrice.total, verification.previousPrice.currency)}.</p>
        </div>
        <button
          aria-controls={secondaryId}
          aria-expanded={secondaryVisible}
          className="cc-review-disclosure"
          onClick={() => setSecondaryVisible((visible) => !visible)}
          type="button"
        >
          <TagIcon />
          Fare conditions and price breakdown
          <span aria-hidden="true" className="cc-details-chevron" />
        </button>
        <section
          className="cc-review-secondary"
          hidden={!secondaryVisible}
          id={secondaryId}
        >
          {itinerary.price.base !== undefined || itinerary.price.taxes !== undefined || itinerary.price.fees !== undefined ? (
            <dl className="cc-price-breakdown">
              {itinerary.price.base !== undefined ? <><dt>Base fare</dt><dd>{money(itinerary.price.base, itinerary.price.currency)}</dd></> : null}
              {itinerary.price.taxes !== undefined ? <><dt>Taxes</dt><dd>{money(itinerary.price.taxes, itinerary.price.currency)}</dd></> : null}
              {itinerary.price.fees !== undefined ? <><dt>Fees</dt><dd>{money(itinerary.price.fees, itinerary.price.currency)}</dd></> : null}
            </dl>
          ) : null}
          <FareDetailContent itinerary={itinerary} />
        </section>
        {verification.messages.length > 0 ? <ul className="cc-messages">{verification.messages.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul> : null}
        <footer className="cc-review-footer">
          {verification.verifiedAt ? <span>Verified {instantTime(verification.verifiedAt)}</span> : null}
          {verification.expiresAt ? <span>Offer expires {instantTime(verification.expiresAt)}</span> : null}
          <p>This starter stops here.</p>
        </footer>
      </div>
    </section>
  );
}

export function FlightResultsView({
  result,
  state,
  displayMode,
  theme = 'light',
  view = 'results',
  onSelect,
  onVerify,
  onEdit,
  onBack,
  onSearchPrompt,
  onExpand,
  pendingFareSelectionId,
  pendingSelectionId,
  selectedSelectionId,
  selectionError,
  verification,
  verificationError,
  brandStyle,
}: {
  readonly result?: SearchOutput;
  readonly state?: ResultsState;
  readonly displayMode: string;
  readonly theme?: 'light' | 'dark';
  readonly view?: TravelView;
  readonly onSelect?: (selectionId: string) => void;
  readonly onVerify: (selectionId: string) => void;
  readonly onEdit?: () => void;
  readonly onBack?: () => void;
  readonly onSearchPrompt?: (draft: SearchDraft) => void;
  readonly onExpand?: () => void;
  readonly pendingFareSelectionId?: string;
  readonly pendingSelectionId?: string;
  readonly selectedSelectionId?: string;
  readonly selectionError?: string;
  readonly verification?: Verification;
  readonly verificationError?: GatewayError;
  readonly brandStyle?: CSSProperties;
}) {
  if (state) return resultStatus(state, theme, brandStyle);
  if (!result) return resultStatus('malformed', theme, brandStyle);

  if (view === 'search') {
    return (
      <Frame className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`} style={brandStyle} displayMode="auto" title="Edit flight search" data-llm={result.fallback}>
        <SearchEditor
          context={result.searchContext}
          placeLabels={{
            origin: result.itineraries[0]?.route.originName ?? result.searchContext?.origin,
            destination: result.itineraries[0]?.route.destinationName ?? result.searchContext?.destination,
          }}
          title="Edit your search"
          onSubmit={onSearchPrompt}
          onBack={onBack}
        />
      </Frame>
    );
  }

  const selected = result.itineraries.find((itinerary) => itinerary.selectionId === selectedSelectionId);
  if (view === 'review') {
    if (!selected || !verification || verification.selectionId !== selected.selectionId) return resultStatus('malformed', theme, brandStyle);
    return (
      <Frame className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`} style={brandStyle} displayMode="auto" title="Verified fare" data-llm={result.fallback}>
        <FareReview itinerary={selected} verification={verification} onBack={onBack} />
      </Frame>
    );
  }

  if (result.status === 'error') {
    return (
      <Frame className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`} style={brandStyle} displayMode="auto" title="Search needs attention" data-llm={result.fallback}>
        <Feedback status="error">{result.error?.message ?? result.message}</Feedback>
        <p className="cc-freshness">
          {result.error?.retryable
            ? 'Try this search again from the conversation.'
            : 'Adjust an airport or travel date before searching again.'}
        </p>
      </Frame>
    );
  }
  if (result.status === 'empty') {
    return (
      <Frame className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`} style={brandStyle} displayMode="auto" title="No flights found" data-llm={result.fallback}>
        <Region title="No flights matched" description="Try different travel dates or nearby airports.">
          <p className="cc-empty">{result.message}</p>
          {onEdit ? <Action onClick={onEdit}>Edit search</Action> : null}
        </Region>
      </Frame>
    );
  }

  const limit = displayMode === 'fullscreen' ? 10 : 3;
  const shown = result.itineraries.slice(0, limit);
  return (
    <Frame
      className={`cc-app cc-flight-results ${theme === 'dark' ? 'cc-theme-dark' : ''}`}
      style={brandStyle}
      displayMode="auto"
      data-llm={result.fallback}
    >
      <section className={`cc-flight-results-content ${displayMode === 'fullscreen' ? 'cc-flight-results-content-expanded' : ''}`}>
        <div className="cc-results-toolbar">
          <div className="cc-results-summary">
            <h2>Flight options</h2>
            {result.searchContext ? (
              <span>
                {result.searchContext.origin} → {result.searchContext.destination} · {result.searchContext.departureDate}
                {result.searchContext.returnDate ? ` – ${result.searchContext.returnDate}` : ' · One way'}
                {' · '}{travellerLabel(result.searchContext)} · {result.searchContext.cabinClass.replaceAll('_', ' ').toLowerCase()} · {result.searchContext.currency}
              </span>
            ) : <span>{result.itineraries.length} options · prices require verification</span>}
            <small role={result.status === 'partial' ? 'status' : undefined}>
              {result.status === 'partial'
                ? 'Some provider results were incomplete; only safely interpreted options are shown.'
                : `${result.itineraries.length} option${result.itineraries.length === 1 ? '' : 's'} · prices require verification`}
            </small>
          </div>
          {onEdit ? <Action variant="quiet" onClick={onEdit}>Edit search</Action> : null}
        </div>
        {displayMode === 'fullscreen' ? (
          <div className="cc-result-list">
            {shown.map((itinerary) => <FareCard
              key={itinerary.selectionId}
              itinerary={itinerary}
              pending={pendingFareSelectionId === itinerary.selectionId}
              searchContext={result.searchContext}
              selected={selectedSelectionId === itinerary.selectionId}
              onSelect={onSelect}
            />)}
          </div>
        ) : (
          <FareCarousel
            itineraries={shown}
            searchContext={result.searchContext}
            onSelect={onSelect}
            pendingSelectionId={pendingFareSelectionId}
            selectedSelectionId={selectedSelectionId}
          />
        )}
        {displayMode !== 'fullscreen' && result.itineraries.length > 3 ? (
          onExpand ? <Action variant="quiet" onClick={onExpand}>Show all {Math.min(10, result.itineraries.length)} results</Action>
            : null
        ) : null}
        {selected ? (
          <div className="cc-action-dock" aria-label="Selected fare action">
            <div><span>Selected</span><strong>{selected.carrier.name} · {money(selected.price.total, selected.price.currency)}</strong></div>
            <ActionBar>
              <Action
                variant="primary"
                pending={pendingSelectionId === selected.selectionId}
                pendingLabel="Verifying…"
                onClick={() => onVerify(selected.selectionId)}
                aria-label={`Verify current fare from ${selected.route.origin} to ${selected.route.destination} with ${selected.carrier.name}`}
              >
                Verify current fare
              </Action>
            </ActionBar>
          </div>
        ) : null}
        {selectionError ? (
          <div className="cc-verification cc-verification-error" role="alert">
            <strong>Fare was not added</strong>
            <span>{selectionError}</span>
          </div>
        ) : null}
        {verificationError ? (
          <div className="cc-verification cc-verification-error" role="alert">
            <strong>{verificationError.code === 'expired_offer' ? 'Fare expired' : verificationError.code === 'unavailable_offer' ? 'Fare unavailable' : 'Could not verify fare'}</strong>
            <span>{verificationError.message}</span>
            {verificationError.retryable && selected ? <Action onClick={() => onVerify(selected.selectionId)}>Try again</Action> : null}
            {!verificationError.retryable && ['expired_offer', 'unavailable_offer', 'unknown_or_stale_selection'].includes(verificationError.code) ? <span>Return to the search form for current options.</span> : null}
          </div>
        ) : null}
      </section>
    </Frame>
  );
}

export default function FlightResults() {
  const ready = useWidgetReady();
  const layout = useLayout();
  const branding = useBranding();
  const toolInfo = useToolInfo('search_flights');
  const verify = useCallTool('verify_flight_offer');
  const selectFare = useCallTool('select_flight_offer');
  const flow = useAppFlow<TravelView>({ key: 'nuitee_travel_flight_journey', initialView: 'results', views: ['search', 'results', 'review'] });
  const requestDisplayMode = useRequestDisplayMode();
  const sendFollowUp = useSendFollowUpMessage();
  const updateModelContext = useUpdateModelContext();
  const selectionRequest = useRef<{ selectionId: string; request: Promise<unknown> } | undefined>(undefined);
  const [selected, setSelected] = useViewState<string | undefined>('selected_fare', undefined);
  const [savedVerification, setSavedVerification] = useViewState<Verification | undefined>('verified_fare', undefined);
  const [pendingFareSelectionId, setPendingFareSelectionId] = useState<string>();
  const [selectionError, setSelectionError] = useState<string>();
  const pending = !ready || Object.keys(toolInfo).length === 0;
  const result = isSearchOutput(toolInfo.structuredContent) ? toolInfo.structuredContent : undefined;
  const verifyContent = verify.data?.structuredContent as Record<string, unknown> | undefined;
  const verification = isVerification(verifyContent?.verification) ? verifyContent.verification : savedVerification;
  const structuredError = isGatewayError(verifyContent?.error) ? verifyContent.error : undefined;
  const transportError: GatewayError | undefined = verify.status === 'error'
    ? { code: 'provider_error', message: 'Fare verification could not be completed. Try again.', retryable: true }
    : undefined;
  const theme = layout.theme === 'dark' ? 'dark' : 'light';
  const brandStyle = {
    '--cc-accent': branding.theme?.[layout.theme]?.accent ?? branding.accent ?? '#14213d',
    '--cc-focus': branding.theme?.[layout.theme]?.focus ?? '#245aa8',
  } as CSSProperties;
  const selectedItinerary = result?.itineraries.find((itinerary) => itinerary.selectionId === selected);
  const selectedVerification = verification?.selectionId === selected ? verification : undefined;

  useEffect(() => {
    if (!ready || !layout.supports?.modelContext || !selectedItinerary) return;
    void updateModelContext(selectedFareModelContext(selectedItinerary, selectedVerification)).catch(() => undefined);
  }, [layout.supports?.modelContext, ready, selectedItinerary, selectedVerification, updateModelContext]);

  useEffect(() => {
    selectionRequest.current = undefined;
    setPendingFareSelectionId(undefined);
    setSelectionError(undefined);
  }, [result]);

  const rememberSelection = (selectionId: string) => {
    if (selectionRequest.current?.selectionId === selectionId) return selectionRequest.current.request;
    const request = selectFare.callToolAsync({ selectionId });
    const trackedRequest = request.finally(() => {
      if (selectionRequest.current?.request === trackedRequest) {
        selectionRequest.current = undefined;
      }
    });
    selectionRequest.current = { selectionId, request: trackedRequest };
    return trackedRequest;
  };

  return (
    <FlightResultsView
      result={result}
      state={pending ? 'loading' : toolInfo.isError || !result ? 'malformed' : undefined}
      displayMode={layout.displayMode}
      theme={theme}
      view={flow.activeView}
      brandStyle={brandStyle}
      pendingFareSelectionId={pendingFareSelectionId}
      pendingSelectionId={verify.isPending ? selected : undefined}
      selectedSelectionId={selected}
      selectionError={selectionError}
      verification={verification}
      verificationError={structuredError ?? transportError}
      onSelect={(selectionId) => {
        if (!ready || pendingFareSelectionId) return;
        setPendingFareSelectionId(selectionId);
        setSelectionError(undefined);
        void rememberSelection(selectionId).then((response) => {
          const transition = selectionTransition(response, selectionId, selected);
          if (!transition.confirmed) {
            setSelectionError(transition.message);
            return;
          }
          if (transition.resetVerification) {
            setSavedVerification(undefined);
            verify.reset();
          }
          setSelected(transition.nextSelectionId);
        }).catch(() => {
          setSelectionError('The fare could not be added to this trip. Your previous selection is unchanged.');
        }).finally(() => {
          setPendingFareSelectionId((current) => current === selectionId ? undefined : current);
        });
      }}
      onEdit={() => flow.navigate('search')}
      onBack={() => flow.back()}
      onExpand={ready && layout.supports?.fullscreen ? () => { void requestDisplayMode('fullscreen'); } : undefined}
      onSearchPrompt={ready && layout.supports?.followUpMessage ? (draft) => {
        void sendFollowUp({ prompt: searchPrompt(draft) });
      } : undefined}
      onVerify={(selectionId) => {
        if (!ready) return;
        setSelectionError(undefined);
        void rememberSelection(selectionId).then((selectionResponse) => {
          const outcome = selectionOutcome(selectionResponse, selectionId);
          if (!outcome.confirmed) {
            setSelectionError(outcome.message);
            return undefined;
          }
          return verify.callToolAsync({
            selectionId,
            selectionMode: 'explicit',
          });
        }).then((response) => {
          if (!response) return;
          const content = record(response.structuredContent);
          const verified = isVerification(content?.verification) ? content.verification : undefined;
          if (!verified) return;
          setSavedVerification(verified);
          flow.navigate('review');
        }).catch(() => undefined);
      }}
    />
  );
}
