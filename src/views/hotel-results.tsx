import '@fontsource-variable/inter';
import '@noodleseed/one/react/styles.css';
import { useEffect, useId, useState, type CSSProperties } from 'react';
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
import { ArrowLeftIcon, BedIcon, CheckIcon, StarIcon, TagIcon } from './icons.js';
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

function money(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
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
      <div className="cc-hotel-visual cc-hotel-skeleton-visual">
        <span className="cc-skeleton-block cc-shimmer" />
      </div>
      <div className="cc-hotel-face cc-hotel-face-front">
        <header className="cc-hotel-card-header">
          <div>
            <span className="cc-skeleton-block cc-shimmer" />
            <span className="cc-skeleton-block cc-shimmer" />
          </div>
          <span className="cc-skeleton-block cc-shimmer" />
        </header>
        <div className="cc-hotel-room-summary">
          <span className="cc-skeleton-block cc-shimmer" />
          <span className="cc-skeleton-block cc-shimmer" />
        </div>
        <div className="cc-hotel-amenities">
          {[0, 1, 2].map((index) => <span className="cc-skeleton-block cc-shimmer" key={index} />)}
        </div>
        <span className="cc-skeleton-block cc-shimmer cc-hotel-skeleton-details" />
        <footer className="cc-hotel-card-footer">
          <div>
            <span className="cc-skeleton-block cc-shimmer" />
            <span className="cc-skeleton-block cc-shimmer" />
          </div>
          <span className="cc-skeleton-block cc-shimmer" />
        </footer>
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
        <div className="cc-hotel-carousel cc-hotel-carousel-inline" aria-hidden="true">
          <div className="cc-hotel-carousel-stage">
            <span className="cc-hotel-carousel-arrow cc-hotel-carousel-arrow-previous" />
            <div className="cc-hotel-carousel-window">
              <div className="cc-hotel-carousel-track">
                <div className="cc-hotel-carousel-slide"><HotelSkeletonCard /></div>
                <div className="cc-hotel-carousel-peek-shell">
                  <div className="cc-hotel-carousel-slide cc-hotel-carousel-peek-slide"><HotelSkeletonCard /></div>
                </div>
              </div>
            </div>
            <span className="cc-hotel-carousel-arrow cc-hotel-carousel-arrow-next" />
          </div>
        </div>
      </section>
    </Frame>
  );
}

function HotelDetails({ hotel }: { readonly hotel: DemoHotel }) {
  return (
    <div className="cc-hotel-detail-content">
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
  );
}

function HotelCard({ hotel, locale, selected, pending, onAdd }: {
  readonly hotel: DemoHotel;
  readonly locale: string;
  readonly selected: boolean;
  readonly pending: boolean;
  readonly onAdd?: (selectionId: string) => void;
}) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const detailsId = useId();

  return (
    <article className={`cc-hotel-card ${selected ? 'cc-hotel-card-selected' : ''}`}>
      <div className="cc-hotel-visual" aria-hidden="true">
        <BedIcon />
        <span>{hotel.city}</span>
      </div>
      <div className="cc-hotel-face-stack">
        <div
          aria-hidden={detailsVisible}
          className={`cc-hotel-face cc-hotel-face-front ${detailsVisible ? 'cc-hotel-face-is-hidden' : ''}`}
          inert={detailsVisible ? true : undefined}
        >
          <header className="cc-hotel-card-header">
            <div>
              <StatusBadge tone="info">Illustrative stay</StatusBadge>
              <h3>{hotel.name}</h3>
              <p>{hotel.neighborhood} · {hotel.city}, {hotel.countryCode}</p>
            </div>
            <span className="cc-hotel-category" aria-label={`${hotel.category} out of 5 concept category`}>
              <StarIcon />{hotel.category}/5
            </span>
          </header>
          <div className="cc-hotel-room-summary">
            <BedIcon />
            <div><span>Illustrative room</span><strong>{hotel.roomName}</strong></div>
          </div>
          <ul className="cc-hotel-amenities" aria-label="Amenity highlights">
            {hotel.amenities.slice(0, 3).map((amenity) => <li key={amenity}>{amenity}</li>)}
          </ul>
          <button
            aria-controls={detailsId}
            aria-expanded={false}
            className="cc-hotel-details-toggle"
            onClick={() => setDetailsVisible(true)}
            type="button"
          >
            <TagIcon />Hotel and rate details
          </button>
          <footer className="cc-hotel-card-footer">
            <div>
              <span>{money(hotel.nightlyPrice.amount, hotel.nightlyPrice.currency, locale)} per night</span>
              <strong>{money(hotel.staySubtotal.amount, hotel.staySubtotal.currency, locale)}</strong>
              <small>Illustrative subtotal · taxes and fees not included</small>
            </div>
            {onAdd ? (
              <Action
                aria-label={`Add ${hotel.name} to trip`}
                aria-pressed={selected}
                disabled={selected}
                pending={pending}
                pendingLabel="Adding…"
                onClick={() => onAdd(hotel.selectionId)}
                variant={selected ? 'secondary' : 'primary'}
              >
                {selected ? 'Added to trip' : 'Add to trip'}
              </Action>
            ) : null}
          </footer>
        </div>
        <div
          aria-hidden={!detailsVisible}
          className={`cc-hotel-face cc-hotel-face-back ${detailsVisible ? '' : 'cc-hotel-face-is-hidden'}`}
          id={detailsId}
          inert={detailsVisible ? undefined : true}
        >
          <header className="cc-hotel-detail-header">
            <div><span>Illustrative stay overview</span><h3>{hotel.name}</h3></div>
            <button className="cc-hotel-back-button" onClick={() => setDetailsVisible(false)} type="button">
              <ArrowLeftIcon />Back to hotel
            </button>
          </header>
          <HotelDetails hotel={hotel} />
        </div>
      </div>
    </article>
  );
}

function HotelCarousel({ hotels, expanded, locale, selectedSelectionId, pendingSelectionId, onAdd }: {
  readonly hotels: readonly DemoHotel[];
  readonly expanded: boolean;
  readonly locale: string;
  readonly selectedSelectionId?: string;
  readonly pendingSelectionId?: string;
  readonly onAdd?: (selectionId: string) => void;
}) {
  const selectedIndex = selectedSelectionId
    ? hotels.findIndex((hotel) => hotel.selectionId === selectedSelectionId)
    : -1;
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, selectedIndex));
  const lastIndex = Math.max(0, hotels.length - 1);

  useEffect(() => {
    setActiveIndex((current) => selectedIndex >= 0 ? selectedIndex : Math.min(current, lastIndex));
  }, [lastIndex, selectedIndex]);

  const moveTo = (index: number) => setActiveIndex(Math.max(0, Math.min(lastIndex, index)));
  const active = hotels[activeIndex] ?? hotels[0]!;
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < lastIndex;
  const previousIndex = hasPrevious ? activeIndex - 1 : activeIndex;
  const nextIndex = hasNext ? activeIndex + 1 : activeIndex;
  const peekIndex = hasNext ? nextIndex : previousIndex;
  const peek = hotels[peekIndex] ?? active;
  const previousPeek = !hasNext && hasPrevious;

  return (
    <section
      aria-label="Hotel options carousel"
      className={`cc-hotel-carousel ${expanded ? 'cc-hotel-carousel-expanded' : 'cc-hotel-carousel-inline'}`}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        moveTo(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
      }}
    >
      <div className="cc-hotel-carousel-controls">
        <span aria-live="polite" role="status">Hotel {activeIndex + 1} of {hotels.length}</span>
      </div>
      <div className="cc-hotel-carousel-stage">
        <Action
          aria-label="Previous hotel"
          className="cc-hotel-carousel-arrow cc-hotel-carousel-arrow-previous"
          disabled={!hasPrevious}
          onClick={() => moveTo(activeIndex - 1)}
          variant="quiet"
        >
          <ArrowLeftIcon />
        </Action>
        <div className="cc-hotel-carousel-window">
          <div className={`cc-hotel-carousel-track ${previousPeek ? 'cc-hotel-carousel-track-is-last' : ''}`}>
            {previousPeek ? (
              <div className="cc-hotel-carousel-peek-shell cc-hotel-carousel-previous-peek-shell">
                <div aria-hidden="true" className="cc-hotel-carousel-slide cc-hotel-carousel-peek-slide" inert>
                  <HotelCard hotel={peek} locale={locale} selected={false} pending={false} onAdd={onAdd} />
                </div>
                <button
                  aria-label={`Show hotel ${peekIndex + 1}`}
                  className="cc-hotel-carousel-peek-hit-target"
                  onClick={() => moveTo(peekIndex)}
                  type="button"
                />
              </div>
            ) : null}
            <div
              aria-label={`Hotel ${activeIndex + 1} of ${hotels.length}`}
              aria-roledescription="slide"
              className="cc-hotel-carousel-slide"
              key={active.selectionId}
              role="region"
              tabIndex={0}
            >
              <HotelCard
                hotel={active}
                locale={locale}
                onAdd={onAdd}
                pending={pendingSelectionId === active.selectionId}
                selected={selectedSelectionId === active.selectionId}
              />
            </div>
            {hasNext ? (
              <div className="cc-hotel-carousel-peek-shell">
                <div aria-hidden="true" className="cc-hotel-carousel-slide cc-hotel-carousel-peek-slide" inert>
                  <HotelCard hotel={peek} locale={locale} selected={false} pending={false} onAdd={onAdd} />
                </div>
                <button
                  aria-label={`Show hotel ${peekIndex + 1}`}
                  className="cc-hotel-carousel-peek-hit-target"
                  onClick={() => moveTo(peekIndex)}
                  type="button"
                />
              </div>
            ) : null}
          </div>
        </div>
        <Action
          aria-label="Next hotel"
          className="cc-hotel-carousel-arrow cc-hotel-carousel-arrow-next"
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
        <HotelCarousel
          expanded={expanded}
          hotels={shown}
          locale={locale}
          onAdd={onAdd}
          pendingSelectionId={pendingSelectionId}
          selectedSelectionId={selectedSelectionId}
        />
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
