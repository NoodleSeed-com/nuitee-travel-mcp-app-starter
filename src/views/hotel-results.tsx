import '@fontsource-variable/inter';
import '@noodleseed/one/react/styles.css';
import { useId, useState, type CSSProperties } from 'react';
import type { DemoHotel, DemoHotelSearchOutput } from '../demo-schemas.js';
import {
  Action,
  Feedback,
  Flow,
  Frame,
  Region,
  StatusBadge,
  useBranding,
  useCallTool,
  useLayout,
  useRequestDisplayMode,
  useToolInfo,
  useViewState,
  useWidgetReady,
} from '../helpers.js';
import { Badge, MatchDetail, MatchRing, PhotoBand, Price, Rail, ScorePin } from './card-primitives.js';
import { CheckIcon, StarIcon, TagIcon } from './icons.js';
import { computeStayMatch } from './stay-match.js';
import './travel.css';

type HotelResultsState = 'loading' | 'error' | 'malformed';

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;

const boundedString = (value: unknown, minimum: number, maximum: number): value is string =>
  typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum;

const boundedInteger = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;

function isDemoMoney(value: unknown) {
  const money = record(value);
  return Boolean(
    money &&
    typeof money.amount === 'number' &&
    Number.isFinite(money.amount) &&
    money.amount >= 0 &&
    money.amount <= 1_000_000 &&
    (money.currency === 'CAD' || money.currency === 'USD' || money.currency === 'EUR'),
  );
}

function isDemoHotel(value: unknown): value is DemoHotel {
  const hotel = record(value);
  return Boolean(
    hotel &&
    typeof hotel.selectionId === 'string' &&
    /^hsel_[a-f0-9]{32}$/.test(hotel.selectionId) &&
    hotel.dataSource === 'illustrative' &&
    boundedString(hotel.name, 2, 100) &&
    boundedString(hotel.city, 2, 80) &&
    typeof hotel.countryCode === 'string' &&
    /^[A-Z]{2}$/.test(hotel.countryCode) &&
    boundedString(hotel.neighborhood, 2, 80) &&
    boundedString(hotel.description, 1, 240) &&
    boundedString(hotel.roomName, 2, 80) &&
    boundedInteger(hotel.category, 1, 5) &&
    Array.isArray(hotel.amenities) &&
    hotel.amenities.length <= 6 &&
    hotel.amenities.every((amenity) => boundedString(amenity, 2, 80)) &&
    boundedInteger(hotel.nights, 1, 30) &&
    boundedInteger(hotel.rooms, 1, 4) &&
    isDemoMoney(hotel.nightlyPrice) &&
    isDemoMoney(hotel.staySubtotal) &&
    hotel.taxesAndFeesIncluded === false &&
    boundedString(hotel.illustrativePolicy, 2, 160)
  );
}

function isSearchContext(value: unknown) {
  const context = record(value);
  return Boolean(
    context &&
    boundedString(context.destination, 2, 80) &&
    typeof context.checkInDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(context.checkInDate) &&
    typeof context.checkOutDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(context.checkOutDate) &&
    context.checkOutDate > context.checkInDate &&
    boundedInteger(context.adults, 1, 8) &&
    boundedInteger(context.children, 0, 6) &&
    boundedInteger(context.rooms, 1, 4) &&
    (context.currency === 'CAD' || context.currency === 'USD' || context.currency === 'EUR')
  );
}

export function isDemoHotelSearchOutput(value: unknown): value is DemoHotelSearchOutput {
  const result = record(value);
  if (
    !result ||
    (result.status !== 'success' && result.status !== 'empty') ||
    result.dataSource !== 'illustrative' ||
    !boundedString(result.disclosure, 20, 320) ||
    !boundedString(result.message, 2, 320) ||
    !boundedString(result.fallback, 20, 500) ||
    typeof result.searchId !== 'string' ||
    !/^hsearch_[a-f0-9]{32}$/.test(result.searchId) ||
    !isSearchContext(result.searchContext) ||
    !Array.isArray(result.hotels) ||
    result.hotels.length > 10 ||
    !result.hotels.every(isDemoHotel)
  ) return false;

  return result.status === 'success' ? result.hotels.length > 0 : result.hotels.length === 0;
}

function DemoDisclosure({ text }: { readonly text: string }) {
  return (
    <aside className="cc-demo-disclosure cc-hotel-disclosure" aria-label="Illustrative hotel data disclosure">
      <StatusBadge tone="info">Illustrative stays</StatusBadge>
      <p>{text}</p>
    </aside>
  );
}

function HotelSkeletonCard() {
  return (
    <article className="cc-hotel-card cc-hotel-skeleton-card" aria-hidden="true">
      <div className="cc-photo-band cc-hotel-skeleton-band">
        <span className="cc-skeleton-block cc-shimmer" />
      </div>
      <div className="cc-hotel-body">
        <div className="cc-hotel-title-row">
          <div>
            <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-name" />
            <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-category" />
          </div>
          <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-ring" />
        </div>
        <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-hood" />
        <div className="cc-card-badges">
          <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-badge" />
          <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-badge" />
        </div>
        <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-amenity" />
        <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-price" />
        <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-details" />
        <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-action" />
      </div>
    </article>
  );
}

function HotelLoading({ theme, brandStyle }: {
  readonly theme: 'light' | 'dark';
  readonly brandStyle?: CSSProperties;
}) {
  return (
    <Frame
      className={`cc-app cc-hotel-results ${theme === 'dark' ? 'cc-theme-dark' : ''}`}
      style={brandStyle}
      displayMode="auto"
      title="Hotel results"
      subtitle="Preparing illustrative stay comparisons"
    >
      <section className="cc-hotel-skeleton" role="status" aria-live="polite" aria-busy="true">
        <span className="cc-visually-hidden">Preparing synthetic hotel comparisons…</span>
        <div className="cc-demo-disclosure cc-hotel-skeleton-disclosure" aria-hidden="true">
          <span className="cc-skeleton-block cc-shimmer" />
          <span className="cc-skeleton-block cc-shimmer" />
        </div>
        <div className="cc-hotel-results-toolbar" aria-hidden="true">
          <span className="cc-skeleton-block cc-shimmer" />
          <span className="cc-skeleton-block cc-shimmer" />
        </div>
        <div className="cc-rail-outer" aria-hidden="true">
          <div className="cc-rail">
            <HotelSkeletonCard />
            <HotelSkeletonCard />
          </div>
          <span className="cc-rail-arrow cc-rail-arrow-prev" />
          <span className="cc-rail-arrow cc-rail-arrow-next" />
        </div>
      </section>
    </Frame>
  );
}

function HotelCard({ hotel, allHotels, locale, selected, pending, onAdd }: {
  readonly hotel: DemoHotel;
  readonly allHotels: readonly DemoHotel[];
  readonly locale: string;
  readonly selected: boolean;
  readonly pending: boolean;
  readonly onAdd?: (selectionId: string) => void;
}) {
  const [matchOpen, setMatchOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const matchDetailsId = useId();
  const hotelDetailsId = useId();
  const match = computeStayMatch(hotel, allHotels);
  const reviewScore = (hotel as { reviewScore?: number }).reviewScore;
  const imageUrl = (hotel as { imageUrl?: string }).imageUrl;
  const flexible = hotel.illustrativePolicy.toLowerCase().includes('flexible');

  return (
    <article className={`cc-card cc-hotel-card ${selected ? 'cc-hotel-card-selected' : ''}`}>
      <PhotoBand imageUrl={imageUrl} name={hotel.name}>
        <ScorePin score={reviewScore} />
      </PhotoBand>
      <div className="cc-hotel-body">
        <div className="cc-hotel-title-row">
          <div>
            <h3>{hotel.name}</h3>
            <span className="cc-hotel-category" aria-label={`${hotel.category} out of 5 concept category`}>
              <StarIcon />{hotel.category}/5
            </span>
          </div>
          <button
            aria-controls={matchDetailsId}
            aria-expanded={matchOpen}
            className="cc-ring-btn"
            onClick={() => setMatchOpen((value) => !value)}
            type="button"
          >
            <MatchRing score={match.score} />
          </button>
        </div>
        <p className="cc-hotel-hood">{hotel.neighborhood} · {hotel.city}, {hotel.countryCode}</p>
        <div className="cc-card-badges">
          <Badge tone={flexible ? 'good' : 'muted'}>
            {flexible ? 'Flexible terms' : 'Terms only'}
          </Badge>
          <Badge tone="muted">Illustrative</Badge>
        </div>
        <p className="cc-hotel-amenity-line">{hotel.amenities.slice(0, 3).join(' · ')}</p>
        <Price
          currency={hotel.staySubtotal.currency}
          locale={locale}
          perNight={hotel.nightlyPrice.amount}
          total={hotel.staySubtotal.amount}
        />
        <button
          aria-controls={hotelDetailsId}
          aria-expanded={detailsOpen}
          className="cc-hotel-details-toggle"
          onClick={() => setDetailsOpen((value) => !value)}
          type="button"
        >
          <TagIcon />Hotel and rate details
        </button>
        <div className="cc-hotel-actions">
          {onAdd ? (
            <Action
              aria-label={`Add ${hotel.name} to trip`}
              aria-pressed={selected}
              disabled={selected}
              onClick={() => onAdd(hotel.selectionId)}
              pending={pending}
              pendingLabel="Adding…"
              variant={selected ? 'secondary' : 'primary'}
            >
              {selected ? 'Added' : 'Select'}
            </Action>
          ) : null}
        </div>
      </div>
      <div className="cc-match-detail-panel" hidden={!matchOpen} id={matchDetailsId}>
        <MatchDetail
          footnote={reviewScore === undefined
            ? 'Computed from returned search fields. Guest rating omitted — not returned.'
            : 'Computed from returned search fields.'}
          match={match}
        />
      </div>
      <div className="cc-hotel-detail-content" hidden={!detailsOpen} id={hotelDetailsId}>
        <div className="cc-hotel-detail-grid">
          <div><span>Room</span><strong>{hotel.roomName}</strong></div>
          <div><span>Stay</span><strong>{hotel.nights} night{hotel.nights === 1 ? '' : 's'} · {hotel.rooms} room{hotel.rooms === 1 ? '' : 's'}</strong></div>
          <div><span>Location</span><strong>{hotel.neighborhood}</strong></div>
          <div><span>Taxes and fees</span><strong>Not included in subtotal</strong></div>
        </div>
        <p>{hotel.description}</p>
        <ul className="cc-hotel-detail-amenities" aria-label="Synthetic hotel amenities">
          {hotel.amenities.map((amenity) => <li key={amenity}><CheckIcon />{amenity}</li>)}
        </ul>
        <p className="cc-hotel-policy">{hotel.illustrativePolicy}</p>
      </div>
    </article>
  );
}

function statusView(state: HotelResultsState, theme: 'light' | 'dark', brandStyle?: CSSProperties) {
  if (state === 'loading') return <HotelLoading theme={theme} brandStyle={brandStyle} />;
  const malformed = state === 'malformed';
  return (
    <Frame
      className={`cc-app cc-hotel-results ${theme === 'dark' ? 'cc-theme-dark' : ''}`}
      style={brandStyle}
      displayMode="auto"
      title="Hotel results"
    >
      <Feedback status="error">
        {malformed
          ? 'The hotel result was incomplete and could not be shown safely.'
          : 'The hotel comparison could not load.'}
      </Feedback>
      <p className="cc-hotel-status-note">
        {malformed
          ? 'No hotel, rate, or availability was inferred from the incomplete result.'
          : 'No live hotel search was attempted and nothing was added to the trip.'}
      </p>
    </Frame>
  );
}

export function HotelResultsView({
  result,
  state,
  displayMode,
  theme = 'light',
  locale = 'en-CA',
  selectedSelectionId,
  pendingSelectionId,
  selectionError,
  onAdd,
  onExpand,
  brandStyle,
}: {
  readonly result?: DemoHotelSearchOutput;
  readonly state?: HotelResultsState;
  readonly displayMode: string;
  readonly theme?: 'light' | 'dark';
  readonly locale?: string;
  readonly selectedSelectionId?: string;
  readonly pendingSelectionId?: string;
  readonly selectionError?: string;
  readonly onAdd?: (selectionId: string) => void;
  readonly onExpand?: () => void;
  readonly brandStyle?: CSSProperties;
}) {
  if (state) return statusView(state, theme, brandStyle);
  if (!result) return statusView('malformed', theme, brandStyle);

  const frameClassName = `cc-app cc-hotel-results ${theme === 'dark' ? 'cc-theme-dark' : ''}`;
  if (result.status === 'empty') {
    return (
      <Frame className={frameClassName} style={brandStyle} displayMode="auto" title="No hotels found" data-llm={result.fallback}>
        <Flow variant="stack" density="comfortable">
          <DemoDisclosure text={result.disclosure} />
          <Region title="No illustrative stays matched" description="Try Lisbon, Toronto, or Vancouver for this bounded preview.">
            <p className="cc-hotel-empty">{result.message}</p>
          </Region>
        </Flow>
      </Frame>
    );
  }

  const expanded = displayMode === 'fullscreen';
  const shown = result.hotels.slice(0, expanded ? 10 : 3);
  return (
    <Frame
      className={frameClassName}
      style={brandStyle}
      displayMode="auto"
      title="Hotel results"
      subtitle={`${result.hotels.length} fictional option${result.hotels.length === 1 ? '' : 's'} · no live availability`}
      data-llm={result.fallback}
    >
      <Flow variant="stack" density={expanded ? 'comfortable' : 'compact'}>
        <DemoDisclosure text={result.disclosure} />
        <div className="cc-hotel-results-toolbar">
          <div>
            <strong>{result.searchContext.destination}</strong>
            <span>{result.searchContext.checkInDate} – {result.searchContext.checkOutDate} · {result.searchContext.rooms} room{result.searchContext.rooms === 1 ? '' : 's'}</span>
          </div>
          <StatusBadge tone="info">Illustrative prices</StatusBadge>
        </div>
        <Rail ariaLabel="Stays">
          {shown.map((hotel) => (
            <HotelCard
              allHotels={result.hotels}
              hotel={hotel}
              key={hotel.selectionId}
              locale={locale}
              onAdd={onAdd}
              pending={pendingSelectionId === hotel.selectionId}
              selected={selectedSelectionId === hotel.selectionId}
            />
          ))}
        </Rail>
        {!expanded && result.hotels.length > 3 ? (
          onExpand
            ? <Action variant="quiet" onClick={onExpand}>Show all {Math.min(10, result.hotels.length)} hotels</Action>
            : <p className="cc-hotel-more-note">Open the App in expanded view to compare all {Math.min(10, result.hotels.length)} hotels.</p>
        ) : null}
        {selectionError ? <Feedback status="error">{selectionError}</Feedback> : null}
        {selectedSelectionId ? (
          <p className="cc-hotel-selection-status" role="status">
            The illustrative stay was added to this trip. Nothing was booked, held, or paid.
          </p>
        ) : null}
      </Flow>
    </Frame>
  );
}

function selectedHotelOutput(value: unknown) {
  const output = record(value);
  return output?.status === 'selected' &&
    typeof output.selectionId === 'string' &&
    /^hsel_[a-f0-9]{32}$/.test(output.selectionId);
}

export default function HotelResults() {
  const ready = useWidgetReady();
  const layout = useLayout();
  const branding = useBranding();
  const toolInfo = useToolInfo('search_hotels');
  const selectHotel = useCallTool('select_hotel');
  const requestDisplayMode = useRequestDisplayMode();
  const [selected, setSelected] = useViewState<string | undefined>('selected_demo_hotel', undefined);
  const [pendingSelectionId, setPendingSelectionId] = useState<string>();
  const [selectionError, setSelectionError] = useState<string>();
  const pending = !ready || Object.keys(toolInfo).length === 0;
  const result = isDemoHotelSearchOutput(toolInfo.structuredContent)
    ? toolInfo.structuredContent
    : undefined;

  return (
    <HotelResultsView
      result={result}
      state={pending ? 'loading' : toolInfo.isError ? 'error' : result ? undefined : 'malformed'}
      displayMode={layout.displayMode}
      theme={layout.theme === 'dark' ? 'dark' : 'light'}
      locale={layout.locale ?? 'en-CA'}
      selectedSelectionId={selected}
      pendingSelectionId={pendingSelectionId}
      selectionError={selectionError}
      onExpand={ready && layout.supports?.fullscreen ? () => { void requestDisplayMode('fullscreen'); } : undefined}
      onAdd={ready ? (selectionId) => {
        setSelectionError(undefined);
        setPendingSelectionId(selectionId);
        void selectHotel.callToolAsync({ selectionId }).then((response) => {
          if (selectedHotelOutput(response.structuredContent)) {
            setSelected(selectionId);
            return;
          }
          setSelectionError('That illustrative stay is no longer available in this search. Choose another hotel.');
        }).catch(() => {
          setSelectionError('The illustrative stay could not be added to this trip. Try again.');
        }).finally(() => setPendingSelectionId(undefined));
      } : undefined}
      brandStyle={{
        '--cc-accent': branding.theme?.[layout.theme]?.accent ?? branding.accent ?? '#006D84',
        '--cc-focus': branding.theme?.[layout.theme]?.focus ?? '#007D95',
      } as CSSProperties}
    />
  );
}
