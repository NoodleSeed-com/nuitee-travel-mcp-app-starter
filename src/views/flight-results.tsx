import '@noodleseed/one/react/styles.css';
import {
  Action,
  ActionBar,
  Feedback,
  Flow,
  Frame,
  Region,
  useCallTool,
  useLayout,
  useToolInfo,
  useViewState,
} from '../helpers.js';
import type {
  Itinerary,
  SearchOutput,
  Verification,
} from '../flight-schemas.js';
import type { GatewayError } from '../flight-runtime.js';
import './travel.css';

type ResultsState = 'loading' | 'malformed';

const errorCodes = new Set([
  'invalid_request', 'configuration_required', 'authentication', 'entitlement', 'rate_limited',
  'timeout', 'provider_error', 'malformed_response', 'oversized_response', 'service_unavailable',
  'expired_offer', 'unavailable_offer', 'unknown_or_stale_selection',
]);

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}

function isMoney(value: unknown): value is { total: number; currency: string } {
  const candidate = record(value);
  return Boolean(candidate && typeof candidate.total === 'number' && Number.isFinite(candidate.total) &&
    candidate.total >= 0 && candidate.total <= 100_000_000 &&
    typeof candidate.currency === 'string' && /^[A-Z]{3}$/.test(candidate.currency));
}

function isRoute(value: unknown): value is { origin: string; destination: string } {
  const candidate = record(value);
  return Boolean(candidate && typeof candidate.origin === 'string' && /^[A-Z]{3}$/.test(candidate.origin) &&
    typeof candidate.destination === 'string' && /^[A-Z]{3}$/.test(candidate.destination));
}

function isItinerary(value: unknown): value is Itinerary {
  const candidate = record(value);
  if (!candidate || typeof candidate.selectionId !== 'string' || !/^sel_[a-f0-9]{32}$/.test(candidate.selectionId) ||
      !isRoute(candidate.route) || !boundedText(candidate.departureTime, 64) || !boundedText(candidate.arrivalTime, 64) ||
      !Number.isInteger(candidate.durationMinutes) || (candidate.durationMinutes as number) < 0 || (candidate.durationMinutes as number) > 20_160 ||
      !Number.isInteger(candidate.stops) || (candidate.stops as number) < 0 || (candidate.stops as number) > 14 ||
      !isMoney(candidate.price) || typeof candidate.isCheapest !== 'boolean' || !boundedText(candidate.retrievedAt, 64)) return false;
  const carrier = record(candidate.carrier);
  const baggage = record(candidate.baggage);
  if (!carrier || !boundedText(carrier.name, 100) || !boundedText(carrier.code, 8) || !baggage ||
      typeof baggage.carryOn !== 'boolean' || typeof baggage.checked !== 'boolean' ||
      !Array.isArray(baggage.allowances) || baggage.allowances.length > 4 || !baggage.allowances.every((item) => boundedText(item, 120))) return false;
  if (!Array.isArray(candidate.legs) || candidate.legs.length < 1 || candidate.legs.length > 2 || !candidate.legs.every((value) => {
    const leg = record(value);
    return Boolean(leg && (leg.direction === 'OUTBOUND' || leg.direction === 'INBOUND') && isRoute(leg.route) &&
      boundedText(leg.departureTime, 64) && boundedText(leg.arrivalTime, 64) && Number.isInteger(leg.durationMinutes) &&
      (leg.durationMinutes as number) >= 0 && (leg.durationMinutes as number) <= 10_080 && Number.isInteger(leg.stops) &&
      (leg.stops as number) >= 0 && (leg.stops as number) <= 7);
  })) return false;
  if (!Array.isArray(candidate.segments) || candidate.segments.length > 8 || !candidate.segments.every((value) => {
    const segment = record(value);
    const segmentCarrier = record(segment?.carrier);
    return Boolean(segment && isRoute({ origin: segment.origin, destination: segment.destination }) &&
      boundedText(segment.departureTime, 64) && boundedText(segment.arrivalTime, 64) &&
      (segment.direction === 'OUTBOUND' || segment.direction === 'INBOUND') && Number.isInteger(segment.durationMinutes) &&
      (segment.durationMinutes as number) >= 0 && (segment.durationMinutes as number) <= 10_080 && segmentCarrier &&
      boundedText(segmentCarrier.name, 100) && boundedText(segmentCarrier.code, 8));
  })) return false;
  return Array.isArray(candidate.messages) && candidate.messages.length <= 6 && candidate.messages.every((item) => boundedText(item, 240)) &&
    (candidate.expiresAt === undefined || boundedText(candidate.expiresAt, 64));
}

export function isSearchOutput(value: unknown): value is SearchOutput {
  const candidate = record(value);
  if (!candidate || typeof candidate.status !== 'string' || !['success', 'empty', 'partial', 'error'].includes(candidate.status) ||
      !boundedText(candidate.message, 400) || !boundedText(candidate.fallback, 500) ||
      !Array.isArray(candidate.itineraries) || candidate.itineraries.length > 10 || !candidate.itineraries.every(isItinerary)) return false;
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

function resultStatus(state: 'loading' | 'malformed', theme: 'light' | 'dark') {
  return (
    <Frame className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`} displayMode="auto" title="Flight results">
      <Feedback status={state === 'loading' ? 'loading' : 'error'}>
        {state === 'loading' ? 'Searching current flights…' : 'The flight result was incomplete and could not be shown safely.'}
      </Feedback>
    </Frame>
  );
}

function FareCard({
  itinerary,
  onVerify,
  pending,
  verification,
  verificationError,
}: {
  readonly itinerary: Itinerary;
  readonly onVerify: (selectionId: string) => void;
  readonly pending: boolean;
  readonly verification?: Verification;
  readonly verificationError?: GatewayError;
}) {
  const selectedVerification = verification?.selectionId === itinerary.selectionId ? verification : undefined;
  return (
    <article className="cc-fare-card" aria-label={`${itinerary.route.origin} to ${itinerary.route.destination} with ${itinerary.carrier.name}`}>
      <header className="cc-fare-header">
        <div>
          <p className="cc-eyebrow">{itinerary.carrier.code} · {itinerary.carrier.name}</p>
          <h3><span>{itinerary.route.origin}</span><span aria-hidden="true">→</span><span>{itinerary.route.destination}</span></h3>
        </div>
        {itinerary.isCheapest ? <span className="cc-badge">Lowest shown</span> : null}
      </header>

      <div className="cc-leg-list">
        {itinerary.legs.map((leg) => (
          <section className="cc-leg" aria-label={`${leg.direction === 'OUTBOUND' ? 'Outbound' : 'Return'} ${leg.route.origin} to ${leg.route.destination}`} key={leg.direction}>
            <div className="cc-leg-heading">
              <strong>{leg.direction === 'OUTBOUND' ? 'Outbound' : 'Return'}</strong>
              <span>{leg.route.origin} → {leg.route.destination}</span>
            </div>
            <div className="cc-schedule">
              <div><span>Departs</span><strong>{flightTime(leg.departureTime)}</strong></div>
              <div><span>Arrives</span><strong>{flightTime(leg.arrivalTime)}</strong></div>
              <div><span>Journey</span><strong>{duration(leg.durationMinutes)} · {leg.stops === 0 ? 'Nonstop' : `${leg.stops} stop${leg.stops === 1 ? '' : 's'}`}</strong></div>
            </div>
          </section>
        ))}
      </div>

      <div className="cc-fare-meta">
        <span>{itinerary.baggage.carryOn ? 'Carry-on included' : 'Carry-on not confirmed'}</span>
        <span>{itinerary.baggage.checked ? 'Checked bag included' : 'Checked bag not confirmed'}</span>
      </div>

      {itinerary.messages.length > 0 ? (
        <ul className="cc-messages">{itinerary.messages.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul>
      ) : null}

      {selectedVerification ? (
        <div className={`cc-verification ${selectedVerification.priceChanged ? 'cc-verification-changed' : ''}`} role="status">
          <strong>{selectedVerification.priceChanged ? 'Price changed' : 'Fare verified'}</strong>
          <span>
            {selectedVerification.priceChanged
              ? `${money(selectedVerification.previousPrice.total, selectedVerification.previousPrice.currency)} → ${money(selectedVerification.currentPrice.total, selectedVerification.currentPrice.currency)}`
              : `${money(selectedVerification.currentPrice.total, selectedVerification.currentPrice.currency)} is currently available.`}
          </span>
          {selectedVerification.messages.length > 0 ? (
            <ul className="cc-messages">{selectedVerification.messages.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul>
          ) : null}
          {selectedVerification.verifiedAt ? <small>Verified {instantTime(selectedVerification.verifiedAt)}.</small> : null}
          {selectedVerification.expiresAt ? <small>Verified offer expires {instantTime(selectedVerification.expiresAt)}.</small> : null}
        </div>
      ) : null}

      {verificationError ? (
        <div className="cc-verification cc-verification-error" role="alert">
          <strong>{verificationError.code === 'expired_offer' ? 'Fare expired' : verificationError.code === 'unavailable_offer' ? 'Fare unavailable' : 'Could not verify fare'}</strong>
          <span>{verificationError.message}</span>
          {verificationError.retryable ? (
            <Action onClick={() => onVerify(itinerary.selectionId)}>Try again</Action>
          ) : ['expired_offer', 'unavailable_offer', 'unknown_or_stale_selection'].includes(verificationError.code) ? (
            <span>Search again for current options.</span>
          ) : null}
        </div>
      ) : null}

      <footer className="cc-fare-footer">
        <div>
          <span>Search price</span>
          <strong>{money(itinerary.price.total, itinerary.price.currency)}</strong>
          <small>Must be verified</small>
          <small>Retrieved {instantTime(itinerary.retrievedAt)}</small>
          {itinerary.expiresAt ? <small>Search offer expires {instantTime(itinerary.expiresAt)}</small> : null}
        </div>
        <ActionBar>
          <Action
            variant="primary"
            pending={pending}
            pendingLabel="Verifying…"
            onClick={() => onVerify(itinerary.selectionId)}
            aria-label={`Verify fare for ${itinerary.route.origin} to ${itinerary.route.destination} with ${itinerary.carrier.name}`}
          >
            Verify fare
          </Action>
        </ActionBar>
      </footer>
    </article>
  );
}

export function FlightResultsView({
  result,
  state,
  displayMode,
  theme = 'light',
  onVerify,
  pendingSelectionId,
  selectedSelectionId,
  verification,
  verificationError,
}: {
  readonly result?: SearchOutput;
  readonly state?: ResultsState;
  readonly displayMode: string;
  readonly theme?: 'light' | 'dark';
  readonly onVerify: (selectionId: string) => void;
  readonly pendingSelectionId?: string;
  readonly selectedSelectionId?: string;
  readonly verification?: Verification;
  readonly verificationError?: GatewayError;
}) {
  if (state) return resultStatus(state, theme);
  if (!result) return resultStatus('malformed', theme);

  if (result.status === 'error') {
    return (
      <Frame className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`} displayMode="auto" title="Flight results" data-llm={result.fallback}>
        <Feedback status="error">{result.error?.message ?? result.message}</Feedback>
        {result.error?.retryable ? <p className="cc-freshness">Try this search again from the conversation.</p> : null}
      </Frame>
    );
  }
  if (result.status === 'empty') {
    return (
      <Frame className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`} displayMode="auto" title="No flights found" data-llm={result.fallback}>
        <Region title="No flights matched" description="Try different travel dates or nearby airports.">
          <p className="cc-empty">{result.message}</p>
        </Region>
      </Frame>
    );
  }

  const limit = displayMode === 'fullscreen' ? 10 : 3;
  const shown = result.itineraries.slice(0, limit);
  const errorSelectionId = selectedSelectionId ?? pendingSelectionId ?? shown[0]?.selectionId;
  return (
    <Frame
      className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`}
      displayMode="auto"
      title="Flight options"
      subtitle={`${result.itineraries.length} option${result.itineraries.length === 1 ? '' : 's'} · prices require verification`}
      data-llm={result.fallback}
    >
      <Flow variant="stack" density={displayMode === 'inline' ? 'compact' : 'comfortable'}>
        {result.status === 'partial' ? (
          <div className="cc-partial" role="status">Some provider results were incomplete. Showing the options that could be interpreted safely.</div>
        ) : null}
        <div className="cc-result-list">
          {shown.map((itinerary) => (
            <FareCard
              key={itinerary.selectionId}
              itinerary={itinerary}
              onVerify={onVerify}
              pending={pendingSelectionId === itinerary.selectionId}
              verification={verification}
              verificationError={errorSelectionId === itinerary.selectionId ? verificationError : undefined}
            />
          ))}
        </div>
        {displayMode !== 'fullscreen' && result.itineraries.length > 3 ? (
          <p className="cc-more-note">Open the App in expanded view to browse all {Math.min(10, result.itineraries.length)} options.</p>
        ) : null}
        <p className="cc-freshness">
          {result.retrievedAt ? `Results retrieved ${instantTime(result.retrievedAt)}. ` : ''}
          Search prices are indicative and can change. “Verify fare” checks current availability and price; it does not hold, reserve, prebook, or book.
        </p>
      </Flow>
    </Frame>
  );
}

export default function FlightResults() {
  const layout = useLayout();
  const toolInfo = useToolInfo('search_flights');
  const verify = useCallTool('verify_flight_offer');
  const [selected, setSelected] = useViewState<string | undefined>('selected_fare', undefined);
  const pending = Object.keys(toolInfo).length === 0;
  const result = isSearchOutput(toolInfo.structuredContent) ? toolInfo.structuredContent : undefined;
  const verifyContent = verify.data?.structuredContent as Record<string, unknown> | undefined;
  const verification = isVerification(verifyContent?.verification) ? verifyContent.verification : undefined;
  const structuredError = isGatewayError(verifyContent?.error) ? verifyContent.error : undefined;
  const transportError: GatewayError | undefined = verify.status === 'error'
    ? { code: 'provider_error', message: 'Fare verification could not be completed. Try again.', retryable: true }
    : undefined;

  return (
    <FlightResultsView
      result={result}
      state={pending ? 'loading' : toolInfo.isError || !result ? 'malformed' : undefined}
      displayMode={layout.displayMode}
      theme={layout.theme === 'dark' ? 'dark' : 'light'}
      pendingSelectionId={verify.isPending ? selected : undefined}
      selectedSelectionId={selected}
      verification={verification}
      verificationError={structuredError ?? transportError}
      onVerify={(selectionId) => {
        setSelected(selectionId);
        verify.callTool({ selectionId });
      }}
    />
  );
}
