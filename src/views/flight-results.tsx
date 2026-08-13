import '@noodleseed/one/react/styles.css';
import type { CSSProperties } from 'react';
import {
  Action,
  ActionBar,
  Feedback,
  Flow,
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
  CarryOnIcon,
  CheckIcon,
  CheckedBagIcon,
  ClockIcon,
  PlaneIcon,
  RouteIcon,
  TagIcon,
} from './icons.js';
import { SearchEditor, searchPrompt, type SearchDraft } from './search-editor.js';
import './travel.css';

type ResultsState = 'loading' | 'malformed';
type TravelView = 'search' | 'results' | 'review';

const errorCodes = new Set([
  'invalid_request', 'configuration_required', 'authentication', 'entitlement', 'rate_limited',
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
  return typeof candidate.origin === 'string' && /^[A-Z]{3}$/.test(candidate.origin) &&
    typeof candidate.destination === 'string' && /^[A-Z]{3}$/.test(candidate.destination) &&
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

function flightTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const label = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
  return `${label} · ${hour}:${minute}`;
}

function instantTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  }).format(parsed);
}

function airportLabel(route: Itinerary['route'], side: 'origin' | 'destination') {
  const code = route[side];
  const name = route[`${side}Name`];
  return name ? `${name} (${code})` : code;
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

function FlightSearchSkeleton() {
  return (
    <section className="cc-search-skeleton" role="status" aria-live="polite" aria-busy="true">
      <header className="cc-scan-header">
        <div>
          <strong>Searching current flights</strong>
          <span>Comparing routes, schedules, and fares…</span>
        </div>
      </header>

      <div className="cc-skeleton-list" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <article className="cc-skeleton-fare" key={index}>
            <div className="cc-skeleton-row">
              <span className="cc-skeleton-carrier-group">
                <span className="cc-skeleton-block cc-shimmer cc-skeleton-logo" />
                <span className="cc-skeleton-block cc-shimmer cc-skeleton-carrier" />
              </span>
              <span className="cc-skeleton-block cc-shimmer cc-skeleton-badge" />
            </div>
            <div className="cc-skeleton-route">
              <span className="cc-skeleton-block cc-shimmer cc-skeleton-code" />
              <span className="cc-skeleton-line" />
              <span className="cc-skeleton-block cc-shimmer cc-skeleton-code" />
            </div>
            <div className="cc-skeleton-times">
              <span className="cc-skeleton-block cc-shimmer" />
              <span className="cc-skeleton-block cc-shimmer" />
              <span className="cc-skeleton-block cc-shimmer" />
            </div>
            <div className="cc-skeleton-row cc-skeleton-footer">
              <span className="cc-skeleton-block cc-shimmer cc-skeleton-price" />
              <span className="cc-skeleton-block cc-shimmer cc-skeleton-action" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function resultStatus(state: ResultsState, theme: 'light' | 'dark', brandStyle?: CSSProperties) {
  if (state === 'loading') {
    return (
      <Frame className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`} style={brandStyle} displayMode="auto" title="Flight results">
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
        return (
          <section className="cc-leg" aria-label={`${direction} ${leg.route.origin} to ${leg.route.destination}`} key={leg.direction}>
            <div className="cc-leg-heading">
              <div>
                <h4><PlaneIcon />{direction}</h4>
                <p>{airportLabel(leg.route, 'origin')} → {airportLabel(leg.route, 'destination')}</p>
              </div>
              <strong className={`cc-stop-badge ${leg.stops === 0 ? 'cc-stop-badge-direct' : ''}`}>{stopLabel(leg.stops)}</strong>
            </div>
            <div className="cc-schedule">
              <div><span><ClockIcon />Departs</span><strong>{flightTime(leg.departureTime)}</strong></div>
              <div><span><ClockIcon />Arrives</span><strong>{flightTime(leg.arrivalTime)}{leg.dayChange ? ` · +${leg.dayChange} day` : ''}</strong></div>
              <div><span><RouteIcon />Travel time</span><strong>{duration(leg.durationMinutes)}{leg.overnight ? ' · Overnight' : ''}</strong></div>
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

function FareDetails({ itinerary }: { readonly itinerary: Itinerary }) {
  return (
    <details className="cc-details">
      <summary><TagIcon />Flight and fare details</summary>
      <div className="cc-details-grid">
        {itinerary.fare.family ? <div><span>Fare family</span><strong>{itinerary.fare.family}</strong></div> : null}
        {itinerary.fare.mixedCabin !== undefined ? <div><span>Cabin</span><strong>{itinerary.fare.mixedCabin ? 'Mixed cabin' : 'Same cabin throughout'}</strong></div> : null}
        {itinerary.fare.seatsRemaining !== undefined ? <div><span>Provider availability</span><strong>{itinerary.fare.seatsRemaining} seat{itinerary.fare.seatsRemaining === 1 ? '' : 's'} shown</strong></div> : null}
        {itinerary.terms.changeable !== undefined ? <div><span>Changes</span><strong>{itinerary.terms.changeable ? (itinerary.terms.hasChangeFee ? 'Allowed; fee may apply' : 'Allowed') : 'Not allowed'}</strong></div> : null}
        {itinerary.terms.refundable !== undefined ? <div><span>Refunds</span><strong>{itinerary.terms.refundable ? (itinerary.terms.hasRefundFee ? 'Allowed; fee may apply' : 'Allowed') : 'Non-refundable'}</strong></div> : null}
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
        <ol className="cc-segments">
          {itinerary.segments.map((segment, index) => (
            <li key={`${segment.direction}-${index}-${segment.origin}-${segment.destination}`}>
              <strong>{segment.origin} → {segment.destination}</strong>
              <span>{segment.carrier.code}{segment.flightNumber ? ` ${segment.flightNumber}` : ''} · {duration(segment.durationMinutes)}</span>
              {segment.operatingCarrier ? <small>Operated by {segment.operatingCarrier.name} ({segment.operatingCarrier.code})</small> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </details>
  );
}

function FareCard({ itinerary, selected, onSelect }: {
  readonly itinerary: Itinerary;
  readonly selected: boolean;
  readonly onSelect?: (selectionId: string) => void;
}) {
  return (
    <article className={`cc-fare-card ${selected ? 'cc-fare-selected' : ''}`} aria-label={`${itinerary.route.origin} to ${itinerary.route.destination} with ${itinerary.carrier.name}`}>
      <header className="cc-fare-header">
        <div className="cc-fare-heading">
          <CarrierIdentity carrier={itinerary.carrier} />
          <h3><span>{itinerary.route.origin}</span><PlaneIcon /><span>{itinerary.route.destination}</span></h3>
          <p className="cc-airport-names">{airportLabel(itinerary.route, 'origin')} to {airportLabel(itinerary.route, 'destination')}</p>
        </div>
        {itinerary.isCheapest ? <StatusBadge tone="info">Lowest shown</StatusBadge> : null}
      </header>
      <RouteTimeline itinerary={itinerary} />
      <div className="cc-fare-meta">
        <span><CarryOnIcon />{itinerary.baggage.carryOn ? 'Carry-on included' : 'Carry-on not confirmed'}</span>
        <span><CheckedBagIcon />{itinerary.baggage.checked ? 'Checked bag included' : 'Checked bag not confirmed'}</span>
        {itinerary.fare.family ? <span><TagIcon />{itinerary.fare.family}</span> : null}
      </div>
      {itinerary.messages.length > 0 ? <ul className="cc-messages">{itinerary.messages.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul> : null}
      <FareDetails itinerary={itinerary} />
      <footer className="cc-fare-footer">
        <div>
          <span>Trip total</span>
          <strong>{money(itinerary.price.total, itinerary.price.currency)}</strong>
          <small>Search price · must be verified</small>
        </div>
        <Action
          variant="secondary"
          aria-pressed={selected}
          aria-label={`${selected ? 'Selected fare' : 'Select fare'} from ${itinerary.route.origin} to ${itinerary.route.destination} with ${itinerary.carrier.name}`}
          onClick={() => onSelect?.(itinerary.selectionId)}
        >
          {selected ? 'Selected' : 'Select fare'}
        </Action>
      </footer>
    </article>
  );
}

function FareReview({ itinerary, verification, onBack }: {
  readonly itinerary: Itinerary;
  readonly verification: Verification;
  readonly onBack?: () => void;
}) {
  return (
    <section className="cc-review" aria-labelledby="cc-review-title">
      <header className="cc-review-header">
        <Action type="button" variant="quiet" onClick={onBack}><ArrowLeftIcon />Back to results</Action>
        <StatusBadge tone={verification.priceChanged ? 'warning' : 'success'}>{verification.priceChanged ? 'Price changed' : 'Fare verified'}</StatusBadge>
      </header>
      <div className="cc-review-ticket">
        <div className="cc-review-title">
          <h2 id="cc-review-title">Verified fare review</h2>
          <CarrierIdentity carrier={itinerary.carrier} compact />
        </div>
        <p className="cc-review-disclaimer">Not a ticket or reservation</p>
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
            <span>{verification.priceChanged ? 'Current verified total' : 'Verified trip total'}</span>
            <strong>{money(verification.currentPrice.total, verification.currentPrice.currency)}</strong>
          </div>
          {verification.priceChanged ? <p>Search price was {money(verification.previousPrice.total, verification.previousPrice.currency)}.</p> : <p>Price and availability were confirmed when this fare was verified.</p>}
        </div>
        {itinerary.price.base !== undefined || itinerary.price.taxes !== undefined || itinerary.price.fees !== undefined ? (
          <dl className="cc-price-breakdown">
            {itinerary.price.base !== undefined ? <><dt>Base fare</dt><dd>{money(itinerary.price.base, itinerary.price.currency)}</dd></> : null}
            {itinerary.price.taxes !== undefined ? <><dt>Taxes</dt><dd>{money(itinerary.price.taxes, itinerary.price.currency)}</dd></> : null}
            {itinerary.price.fees !== undefined ? <><dt>Fees</dt><dd>{money(itinerary.price.fees, itinerary.price.currency)}</dd></> : null}
          </dl>
        ) : null}
        <FareDetails itinerary={itinerary} />
        {verification.messages.length > 0 ? <ul className="cc-messages">{verification.messages.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul> : null}
        <footer className="cc-review-footer">
          {verification.verifiedAt ? <span>Verified {instantTime(verification.verifiedAt)}</span> : null}
          {verification.expiresAt ? <span>Offer expires {instantTime(verification.expiresAt)}</span> : null}
          <p>This starter stops here. A production owner can add an exact, allowlisted handoff to its own checkout or booking experience.</p>
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
  pendingSelectionId,
  selectedSelectionId,
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
  readonly pendingSelectionId?: string;
  readonly selectedSelectionId?: string;
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
      <Frame className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`} style={brandStyle} displayMode="auto" title="Flight results" data-llm={result.fallback}>
        <Feedback status="error">{result.error?.message ?? result.message}</Feedback>
        {result.error?.retryable ? <p className="cc-freshness">Try this search again from the conversation.</p> : null}
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
      className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`}
      style={brandStyle}
      displayMode="auto"
      title="Choose your flight"
      subtitle={`${result.itineraries.length} option${result.itineraries.length === 1 ? '' : 's'} · prices require verification`}
      data-llm={result.fallback}
    >
      <Flow variant="stack" density={displayMode === 'inline' ? 'compact' : 'comfortable'}>
        <div className="cc-results-toolbar">
          {result.searchContext ? (
            <p><strong>{result.searchContext.origin} → {result.searchContext.destination}</strong><span>{result.searchContext.departureDate}{result.searchContext.returnDate ? ` – ${result.searchContext.returnDate}` : ' · One way'} · {result.searchContext.adults} adult{result.searchContext.adults === 1 ? '' : 's'} · {result.searchContext.cabinClass.replaceAll('_', ' ').toLowerCase()}</span></p>
          ) : <p><strong>Current flight options</strong><span>Compare, select, then verify one fare.</span></p>}
          {onEdit ? <Action variant="quiet" onClick={onEdit}>Edit search</Action> : null}
        </div>
        {result.status === 'partial' ? <div className="cc-partial" role="status">Some provider results were incomplete. Showing only the options that could be interpreted safely.</div> : null}
        <div className="cc-result-list">
          {shown.map((itinerary) => <FareCard key={itinerary.selectionId} itinerary={itinerary} selected={selectedSelectionId === itinerary.selectionId} onSelect={onSelect} />)}
        </div>
        {displayMode !== 'fullscreen' && result.itineraries.length > 3 ? (
          onExpand ? <Action variant="quiet" onClick={onExpand}>Show all {Math.min(10, result.itineraries.length)} results</Action>
            : <p className="cc-more-note">Open the App in expanded view to browse all {Math.min(10, result.itineraries.length)} options.</p>
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
                aria-label={`Verify selected fare from ${selected.route.origin} to ${selected.route.destination} with ${selected.carrier.name}`}
              >
                Verify selected fare
              </Action>
            </ActionBar>
          </div>
        ) : <p className="cc-selection-hint">Select one fare to verify its current price and availability.</p>}
        {verificationError ? (
          <div className="cc-verification cc-verification-error" role="alert">
            <strong>{verificationError.code === 'expired_offer' ? 'Fare expired' : verificationError.code === 'unavailable_offer' ? 'Fare unavailable' : 'Could not verify fare'}</strong>
            <span>{verificationError.message}</span>
            {verificationError.retryable && selected ? <Action onClick={() => onVerify(selected.selectionId)}>Try again</Action> : null}
            {!verificationError.retryable && ['expired_offer', 'unavailable_offer', 'unknown_or_stale_selection'].includes(verificationError.code) ? <span>Return to the search form for current options.</span> : null}
          </div>
        ) : null}
        <p className="cc-freshness">
          {result.retrievedAt ? `Results retrieved ${instantTime(result.retrievedAt)}. ` : ''}
          Search prices are indicative and can change. Verification checks current availability and price; it does not hold, reserve, prebook, or book.
        </p>
      </Flow>
    </Frame>
  );
}

export default function FlightResults() {
  const ready = useWidgetReady();
  const layout = useLayout();
  const branding = useBranding();
  const toolInfo = useToolInfo('search_flights');
  const verify = useCallTool('verify_flight_offer');
  const flow = useAppFlow<TravelView>({ key: 'cedar_cloud_flight_journey', initialView: 'results', views: ['search', 'results', 'review'] });
  const requestDisplayMode = useRequestDisplayMode();
  const sendFollowUp = useSendFollowUpMessage();
  const updateModelContext = useUpdateModelContext();
  const [selected, setSelected] = useViewState<string | undefined>('selected_fare', undefined);
  const [savedVerification, setSavedVerification] = useViewState<Verification | undefined>('verified_fare', undefined);
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
    '--cc-accent': branding.theme?.[layout.theme]?.accent ?? branding.accent ?? '#1E6049',
    '--cc-focus': branding.theme?.[layout.theme]?.focus ?? '#0B6B52',
  } as CSSProperties;

  return (
    <FlightResultsView
      result={result}
      state={pending ? 'loading' : toolInfo.isError || !result ? 'malformed' : undefined}
      displayMode={layout.displayMode}
      theme={theme}
      view={flow.activeView}
      brandStyle={brandStyle}
      pendingSelectionId={verify.isPending ? selected : undefined}
      selectedSelectionId={selected}
      verification={verification}
      verificationError={structuredError ?? transportError}
      onSelect={(selectionId) => {
        setSelected(selectionId);
        setSavedVerification(undefined);
        verify.reset();
      }}
      onEdit={() => flow.navigate('search')}
      onBack={() => flow.back()}
      onExpand={ready && layout.supports?.fullscreen ? () => { void requestDisplayMode('fullscreen'); } : undefined}
      onSearchPrompt={ready && layout.supports?.followUpMessage ? (draft) => {
        void sendFollowUp({ prompt: searchPrompt(draft) });
      } : undefined}
      onVerify={(selectionId) => {
        if (!ready) return;
        setSelected(selectionId);
        void verify.callToolAsync({ selectionId }).then((response) => {
          const content = record(response.structuredContent);
          const verified = isVerification(content?.verification) ? content.verification : undefined;
          if (!verified) return;
          setSavedVerification(verified);
          flow.navigate('review');
          if (layout.supports?.modelContext) {
            void updateModelContext({
              content: [{ type: 'text', text: `Verified fare ${verified.selectionId}: ${verified.currentPrice.total} ${verified.currentPrice.currency}${verified.priceChanged ? ' after a price change' : ''}. This is not a booking.` }],
              structuredContent: {
                selectionId: verified.selectionId,
                availability: verified.availability,
                priceChanged: verified.priceChanged,
                currentPrice: verified.currentPrice,
                verifiedAt: verified.verifiedAt,
              },
            });
          }
        }).catch(() => undefined);
      }}
    />
  );
}
