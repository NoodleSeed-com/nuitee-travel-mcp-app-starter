import '@fontsource-variable/host-grotesk';
import '@noodleseed/one/react/styles.css';
import { useEffect, useId, useRef, useState } from 'react';
import type { DemoHotel, DemoHotelSearchOutput } from '../demo-schemas.js';
import {
  Action,
  Feedback,
  Flow,
  Frame,
  Region,
  StatusBadge,
  useCallTool,
  useLayout,
  useRequestDisplayMode,
  useToolInfo,
  useViewState,
  useWidgetReady,
} from '../helpers.js';
import { Badge, MatchDetail, MatchScore, PhotoBand, Price, Rail, ScorePin } from './card-primitives.js';
import { CompareMatrix, CompareTray, MAX_COMPARE } from './hotel-compare.js';
import { MapBoard, mappableHotels } from './hotel-map-board.js';
import { BedIcon, CheckIcon, CompassIcon, ListIcon, PlusIcon, StarIcon, TagIcon } from './icons.js';
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
    (hotel.dataSource === 'illustrative' || hotel.dataSource === 'live_nuitee') &&
    boundedString(hotel.name, 2, 100) &&
    boundedString(hotel.city, 2, 80) &&
    typeof hotel.countryCode === 'string' &&
    /^[A-Z]{2}$/.test(hotel.countryCode) &&
    boundedString(hotel.neighborhood, 2, 80) &&
    ((hotel.lat === undefined && hotel.lng === undefined) || (
      typeof hotel.lat === 'number' &&
      Number.isFinite(hotel.lat) &&
      hotel.lat >= -90 &&
      hotel.lat <= 90 &&
      typeof hotel.lng === 'number' &&
      Number.isFinite(hotel.lng) &&
      hotel.lng >= -180 &&
      hotel.lng <= 180
    )) &&
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
    typeof hotel.taxesAndFeesIncluded === 'boolean' &&
    boundedString(hotel.policySummary, 2, 200) &&
    (hotel.imageUrl === undefined || (boundedString(hotel.imageUrl, 1, 2_048) && /^https:\/\/snaphotelapi\.com\//i.test(hotel.imageUrl))) &&
    (hotel.reviewScore === undefined || (typeof hotel.reviewScore === 'number' && hotel.reviewScore >= 0 && hotel.reviewScore <= 10)) &&
    (hotel.reviewCount === undefined || boundedInteger(hotel.reviewCount, 0, 10_000_000))
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
    !['success', 'partial', 'empty', 'error'].includes(String(result.status)) ||
    (result.dataSource !== 'illustrative' && result.dataSource !== 'live_nuitee') ||
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

  const hasResults = result.status === 'success' || result.status === 'partial';
  if (hasResults !== (result.hotels.length > 0)) return false;
  if (result.status === 'error') {
    const error = record(result.error);
    return Boolean(error && boundedString(error.code, 2, 80) && boundedString(error.message, 2, 320) && typeof error.retryable === 'boolean');
  }
  return result.error === undefined;
}

function HotelDisclosure({ text, live }: { readonly text: string; readonly live: boolean }) {
  return (
    <aside className="cc-demo-disclosure cc-hotel-disclosure" aria-label={live ? 'Current hotel data disclosure' : 'Illustrative hotel data disclosure'}>
      <StatusBadge tone="info">{live ? 'Current Nuitee rates' : 'Illustrative stays'}</StatusBadge>
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
          <span className="cc-hotel-skeleton-ring-wrap">
            <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-ring" />
            <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-ring-cap" />
          </span>
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

function HotelLoading() {
  return (
    <Frame
      className="cc-app cc-hotel-results"
      displayMode="auto"
      title="Hotel results"
      subtitle="Preparing hotel comparisons"
    >
      <section className="cc-hotel-skeleton" role="status" aria-live="polite" aria-busy="true">
        <span className="cc-visually-hidden">Preparing hotel comparisons…</span>
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

function HotelCard({
  hotel,
  allHotels,
  locale,
  selected,
  pending,
  comparing = false,
  onAdd,
  onToggleCompare,
}: {
  readonly hotel: DemoHotel;
  readonly allHotels: readonly DemoHotel[];
  readonly locale: string;
  readonly selected: boolean;
  readonly pending: boolean;
  readonly comparing?: boolean;
  readonly onAdd?: (selectionId: string) => void;
  readonly onToggleCompare?: () => void;
}) {
  const [matchOpen, setMatchOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const matchDetailsId = useId();
  const hotelDetailsId = useId();
  const match = computeStayMatch(hotel, allHotels, undefined, locale);
  const reviewScore = (hotel as { reviewScore?: number }).reviewScore;
  const imageUrl = (hotel as { imageUrl?: string }).imageUrl;
  const flexible = hotel.policySummary.toLowerCase().includes('flexible');

  return (
    <article className={`cc-card cc-hotel-card ${selected ? 'cc-hotel-card-selected' : ''}`}>
      <PhotoBand glyph={<BedIcon />} imageUrl={imageUrl} name={hotel.name}>
        {onToggleCompare ? (
          <button
            aria-label={comparing
              ? `Remove ${hotel.name} from comparison`
              : `Add ${hotel.name} to comparison`}
            aria-pressed={comparing}
            className="cc-hotel-compare-action"
            onClick={onToggleCompare}
            type="button"
          >
            {comparing ? <CheckIcon /> : <PlusIcon />}
            {comparing ? 'Selected' : 'Compare'}
          </button>
        ) : null}
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
            className="cc-match-score-button"
            onClick={() => setMatchOpen((value) => !value)}
            type="button"
          >
            <MatchScore score={match.score} />
          </button>
        </div>
        <p className="cc-hotel-hood">{hotel.neighborhood} · {hotel.city}, {hotel.countryCode}</p>
        <div className="cc-card-badges">
          <Badge tone="muted">
            {flexible ? 'Flexible terms' : 'Terms only'}
          </Badge>
          <Badge tone="muted">{hotel.dataSource === 'live_nuitee' ? 'Current rate' : 'Illustrative'}</Badge>
        </div>
        <p className="cc-hotel-amenity-line">{hotel.amenities.slice(0, 3).join(' · ')}</p>
        <Price
          currency={hotel.staySubtotal.currency}
          locale={locale}
          perNight={hotel.nightlyPrice.amount}
          total={hotel.staySubtotal.amount}
        />
        <small className="cc-price-note">
          {hotel.dataSource === 'live_nuitee'
            ? `Current total · ${hotel.taxesAndFeesIncluded ? 'shown taxes included' : 'verify taxes and fees'}`
            : 'Illustrative subtotal · taxes and fees not included'}
        </small>
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
              aria-label={`${selected ? 'Selected' : 'Select'} ${hotel.name} for this trip`}
              aria-pressed={selected}
              className={selected ? 'cc-selection-action-selected' : undefined}
              disabled={selected}
              onClick={() => onAdd(hotel.selectionId)}
              pending={pending}
              pendingLabel="Selecting…"
              variant={selected ? 'secondary' : 'primary'}
            >
              {selected ? 'Selected' : 'Select'}
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
          <div><span>Taxes and fees</span><strong>{hotel.taxesAndFeesIncluded
            ? 'Included in shown total'
            : hotel.dataSource === 'live_nuitee' ? 'Review before booking' : 'Not included in subtotal'}</strong></div>
        </div>
        <p>{hotel.description}</p>
        <ul className="cc-hotel-detail-amenities" aria-label="Hotel amenity highlights">
          {hotel.amenities.map((amenity) => <li key={amenity}><CheckIcon />{amenity}</li>)}
        </ul>
        <p className="cc-hotel-policy">{hotel.policySummary}</p>
      </div>
    </article>
  );
}

function statusView(state: HotelResultsState) {
  if (state === 'loading') return <HotelLoading />;
  const malformed = state === 'malformed';
  return (
    <Frame
      className="cc-app cc-hotel-results"
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
          : 'No live hotel search was attempted and nothing was selected.'}
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
  initialScreen = 'shortlist',
  initialBoardView = 'list',
  onAdd,
  onExpand,
  onScreenChange,
}: {
  readonly result?: DemoHotelSearchOutput;
  readonly state?: HotelResultsState;
  readonly displayMode: string;
  readonly theme?: 'light' | 'dark';
  readonly locale?: string;
  readonly selectedSelectionId?: string;
  readonly pendingSelectionId?: string;
  readonly selectionError?: string;
  readonly initialScreen?: 'shortlist' | 'compare';
  readonly initialBoardView?: 'list' | 'map';
  readonly onAdd?: (selectionId: string) => void;
  readonly onExpand?: () => void;
  readonly onScreenChange?: (screen: 'shortlist' | 'compare') => void;
}) {
  const [screen, setScreen] = useState<'shortlist' | 'compare'>(initialScreen);
  const [boardView, setBoardView] = useState<'list' | 'map'>(initialBoardView);
  const [compareIds, setCompareIds] = useState<readonly string[]>(() =>
    initialScreen === 'compare' ? result?.hotels.slice(0, 2).map((hotel) => hotel.selectionId) ?? [] : [],
  );
  const [mapSelectionId, setMapSelectionId] = useState<string | undefined>();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [screen]);

  if (state) return statusView(state);
  if (!result) return statusView('malformed');

  const frameClassName = 'cc-app cc-hotel-results';
  const live = result.dataSource === 'live_nuitee';
  if (result.status === 'error') {
    return (
      <Frame className={frameClassName} displayMode="auto" title="Hotel search needs attention" data-llm={result.fallback}>
        <Flow variant="stack" density="comfortable">
          <HotelDisclosure live={live} text={result.disclosure} />
          <Feedback status="error">{result.error?.message ?? result.message}</Feedback>
          <p className="cc-hotel-status-note">No room was held, reserved, or selected.</p>
        </Flow>
      </Frame>
    );
  }
  if (result.status === 'empty') {
    return (
      <Frame className={frameClassName} displayMode="auto" title="No hotels found" data-llm={result.fallback}>
        <Flow variant="stack" density="comfortable">
          <HotelDisclosure live={live} text={result.disclosure} />
          <Region
            title={live ? 'No current stays matched' : 'No illustrative stays matched'}
            description={live ? 'Try different dates or a nearby destination.' : 'Try Lisbon, Toronto, or Vancouver for this bounded preview.'}
          >
            <p className="cc-hotel-empty">{result.message}</p>
          </Region>
        </Flow>
      </Frame>
    );
  }

  const expanded = displayMode === 'fullscreen';
  const shown = result.hotels.slice(0, expanded ? 10 : 3);
  const mappable = mappableHotels(result.hotels);
  const compared = compareIds
    .map((selectionId) => result.hotels.find((hotel) => hotel.selectionId === selectionId))
    .filter((hotel): hotel is DemoHotel => hotel !== undefined);
  const toggleCompare = (selectionId: string) => {
    setCompareIds((current) => current.includes(selectionId)
      ? current.filter((id) => id !== selectionId)
      : current.length >= MAX_COMPARE ? current : [...current, selectionId]);
  };
  const changeScreen = (next: 'shortlist' | 'compare') => {
    setScreen(next);
    onScreenChange?.(next);
  };

  if (screen === 'compare' && compared.length >= 2) {
    return (
      <Frame
        className={frameClassName}
        displayMode="auto"
        title="Compare stays"
        subtitle={live ? 'Current options · verify before booking' : 'Illustrative options · no live availability'}
        data-llm={result.fallback}
      >
        <h2 className="cc-visually-hidden" ref={headingRef} tabIndex={-1}>Stay comparison</h2>
        <CompareMatrix
          comparisonPool={result.hotels}
          hotels={compared}
          locale={locale}
          onBack={() => changeScreen('shortlist')}
        />
      </Frame>
    );
  }

  return (
    <Frame
      className={frameClassName}
      displayMode="auto"
      title="Hotel results"
      subtitle={live
        ? `${result.hotels.length} current option${result.hotels.length === 1 ? '' : 's'} · verify before booking`
        : `${result.hotels.length} fictional option${result.hotels.length === 1 ? '' : 's'} · no live availability`}
      data-llm={result.fallback}
    >
      <Flow variant="stack" density={expanded ? 'comfortable' : 'compact'}>
        <HotelDisclosure live={live} text={result.disclosure} />
        <h2 className="cc-visually-hidden" ref={headingRef} tabIndex={-1}>Stay results</h2>
        <div className="cc-hotel-results-toolbar">
          <div>
            <strong>{result.searchContext.destination}</strong>
            <span>{result.searchContext.checkInDate} – {result.searchContext.checkOutDate} · {result.searchContext.rooms} room{result.searchContext.rooms === 1 ? '' : 's'}</span>
          </div>
          <div className="cc-hotel-toolbar-actions">
            <StatusBadge tone="info">{live ? 'Current prices' : 'Illustrative prices'}</StatusBadge>
            {mappable.length > 0 ? (
              <div aria-label="Hotel result view" className="cc-hotel-view-toggle" role="radiogroup">
                <button
                  aria-checked={boardView === 'list'}
                  onClick={() => setBoardView('list')}
                  role="radio"
                  type="button"
                >
                  <ListIcon />List
                </button>
                <button
                  aria-checked={boardView === 'map'}
                  onClick={() => setBoardView('map')}
                  role="radio"
                  type="button"
                >
                  <CompassIcon />Map
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {boardView === 'map' && mappable.length > 0 ? (
          <MapBoard
            hotels={result.hotels}
            locale={locale}
            onSelect={setMapSelectionId}
            selectedId={mapSelectionId}
            theme={theme}
          >
            {(hotel) => (
              <HotelCard
                allHotels={result.hotels}
                comparing={compareIds.includes(hotel.selectionId)}
                hotel={hotel}
                locale={locale}
                onAdd={onAdd}
                onToggleCompare={() => toggleCompare(hotel.selectionId)}
                pending={pendingSelectionId === hotel.selectionId}
                selected={selectedSelectionId === hotel.selectionId}
              />
            )}
          </MapBoard>
        ) : (
          <Rail ariaLabel="Stays">
            {shown.map((hotel) => (
              <HotelCard
                allHotels={result.hotels}
                comparing={compareIds.includes(hotel.selectionId)}
                hotel={hotel}
                key={hotel.selectionId}
                locale={locale}
                onAdd={onAdd}
                onToggleCompare={() => toggleCompare(hotel.selectionId)}
                pending={pendingSelectionId === hotel.selectionId}
                selected={selectedSelectionId === hotel.selectionId}
              />
            ))}
          </Rail>
        )}
        {boardView === 'list' && !expanded && result.hotels.length > 3 ? (
          onExpand
            ? <Action variant="quiet" onClick={onExpand}>Show all {Math.min(10, result.hotels.length)} hotels</Action>
            : <p className="cc-hotel-more-note">Open the App in expanded view to compare all {Math.min(10, result.hotels.length)} hotels.</p>
        ) : null}
        <CompareTray
          onOpen={() => changeScreen('compare')}
          onRemove={toggleCompare}
          selected={compared}
        />
        {selectionError ? <Feedback status="error">{selectionError}</Feedback> : null}
        {selectedSelectionId ? (
          <p className="cc-hotel-selection-status" role="status">
            {live ? 'The current hotel option' : 'The illustrative stay'} was selected for this trip. Nothing was booked, held, or paid.
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
      onScreenChange={ready && layout.supports?.fullscreen
        ? (screen) => { void requestDisplayMode(screen === 'compare' ? 'fullscreen' : 'inline'); }
        : undefined}
      onAdd={ready ? (selectionId) => {
        setSelectionError(undefined);
        setPendingSelectionId(selectionId);
        void selectHotel.callToolAsync({ selectionId }).then((response) => {
          if (selectedHotelOutput(response.structuredContent)) {
            setSelected(selectionId);
            return;
          }
          setSelectionError(result?.dataSource === 'live_nuitee'
            ? 'That hotel option is no longer available in this search. Choose another hotel.'
            : 'That illustrative stay is no longer available in this search. Choose another hotel.');
        }).catch(() => {
          setSelectionError(result?.dataSource === 'live_nuitee'
            ? 'The hotel option could not be selected. Try again.'
            : 'The illustrative stay could not be selected. Try again.');
        }).finally(() => setPendingSelectionId(undefined));
      } : undefined}
    />
  );
}
