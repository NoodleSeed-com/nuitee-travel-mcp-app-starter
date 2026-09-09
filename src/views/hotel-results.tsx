import '@fontsource-variable/host-grotesk';
import '@noodleseed/one/react/styles.css';
import { useEffect, useRef, useState } from 'react';
import type { DemoHotel, DemoHotelSearchOutput, OpenHotelOutput } from '../demo-schemas.js';
import { Frame, useCallTool, useLayout, useRequestDisplayMode, useToolInfo, useUpdateModelContext, useViewState, useWidgetReady } from '../helpers.js';
import { HotelJourney, initialHotelJourney, type HotelJourneyState } from './hotel-journey.js';
import { InlineTripReview } from './trip-review.js';
import './travel.css';

export { HotelJourney as HotelResultsView } from './hotel-journey.js';

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


export function isOpenHotelOutput(value: unknown): value is OpenHotelOutput {
  const opened = record(value);
  if (!opened || !boundedString(opened.message, 2, 320)) return false;
  if (opened.status === 'not_found' || opened.status === 'unavailable') {
    return opened.result === undefined && opened.focusedSelectionId === undefined && opened.selectedSelectionId === undefined;
  }
  if (opened.status !== 'ready' || !isDemoHotelSearchOutput(opened.result) || !opened.result.hotels.length) return false;
  return (opened.focusedSelectionId === undefined || opened.result.hotels.length === 1 && opened.result.hotels[0]!.selectionId === opened.focusedSelectionId) &&
    (opened.selectedSelectionId === undefined || opened.result.hotels.some(hotel => hotel.selectionId === opened.selectedSelectionId));
}

export function restoreHotelJourney(value: unknown, result: DemoHotelSearchOutput, focusedSelectionId?: string): HotelJourneyState {
  const saved = record(value);
  const initial = initialHotelJourney(result.searchId);
  if (focusedSelectionId && result.hotels.length === 1 && result.hotels[0]!.selectionId === focusedSelectionId) {
    Object.assign(initial, { screen: 'detail', detailId: focusedSelectionId });
  }
  if (!saved || saved.searchId !== result.searchId || !['shortlist', 'detail', 'explore'].includes(String(saved.screen)) ||
      !Array.isArray(saved.compareIds) || !boundedInteger(saved.shown, 3, 10)) return initial;
  const ids = new Set(result.hotels.map(hotel => hotel.selectionId));
  return {
    searchId: result.searchId,
    screen: saved.screen === 'detail' && !ids.has(String(saved.detailId)) ? 'shortlist' : saved.screen as HotelJourneyState['screen'],
    detailId: typeof saved.detailId === 'string' && ids.has(saved.detailId) ? saved.detailId : undefined,
    mapId: typeof saved.mapId === 'string' && ids.has(saved.mapId) ? saved.mapId : undefined,
    compareIds: [...new Set(saved.compareIds.filter((id): id is string => typeof id === 'string' && ids.has(id)))].slice(0, 2),
    shown: saved.shown as number,
  };
}

export default function HotelResults() {
  return <HotelWidget toolName="search_hotels" />;
}

export function HotelWidget({ toolName }: { readonly toolName: 'search_hotels' | 'open_hotel' }) {
  const ready = useWidgetReady();
  const layout = useLayout();
  const toolInfo = useToolInfo(toolName);
  const selectHotel = useCallTool('select_hotel');
  const requestDisplayMode = useRequestDisplayMode();
  const updateModelContext = useUpdateModelContext();
  const [selected, setSelected] = useViewState<string | undefined>('selected_demo_hotel', undefined);
  const [savedJourney, setJourney] = useViewState<HotelJourneyState | undefined>('hotel_journey', undefined);
  const [pendingSelectionId, setPendingSelectionId] = useState<string>();
  const [selectionError, setSelectionError] = useState<string>();
  const [showTripReview, setShowTripReview] = useState(false);
  const inFlight = useRef(false);
  const pending = !ready || Object.keys(toolInfo).length === 0;
  const opened = toolName === 'open_hotel' && isOpenHotelOutput(toolInfo.structuredContent) ? toolInfo.structuredContent : undefined;
  const result = toolInfo.isError ? undefined : toolName === 'open_hotel' ? opened?.result
    : isDemoHotelSearchOutput(toolInfo.structuredContent) ? toolInfo.structuredContent : undefined;
  const latestSearchId = useRef(result?.searchId);
  latestSearchId.current = result?.searchId;
  const journey = result ? restoreHotelJourney(savedJourney, result, opened?.focusedSelectionId) : undefined;
  const chosen = result?.hotels.find(hotel => hotel.selectionId === (selected ?? opened?.selectedSelectionId));
  const inspected = result?.hotels.find(hotel => hotel.selectionId === journey?.detailId);
  const comparisonIds = journey?.compareIds.join(',') ?? '';

  useEffect(() => { setSelectionError(undefined); }, [result?.searchId]);
  useEffect(() => {
    if (showTripReview || !ready || !result || !layout.supports?.modelContext) return;
    void updateModelContext({
      content: [{ type: 'text', text: chosen ? `Selected stay: ${chosen.name}. Nothing booked, held, or paid.` : 'Hotel options remain unselected.' }],
      structuredContent: { hotelSearchId: result.searchId, selectedHotel: chosen ? { selectionId: chosen.selectionId, name: chosen.name } : null,
        inspectedHotel: inspected ? { selectionId: inspected.selectionId, name: inspected.name } : null,
        comparingHotelIds: journey?.compareIds ?? [] },
    }).catch(() => { /* Host context delivery is optional; server selections remain authoritative. */ });
  }, [showTripReview, ready, result?.searchId, chosen?.selectionId, inspected?.selectionId, comparisonIds, layout.supports?.modelContext, updateModelContext]);

  if (!pending && !toolInfo.isError && opened && opened.status !== 'ready') return <Frame
    className={`cc-app cc-hotel-results cc-hotel-journey${layout.host === 'chatgpt' ? ' cc-host-styled' : ''}`}
    data-theme={layout.host === 'chatgpt' ? layout.theme : 'light'} displayMode="auto" title="Requested stay">
    <p role="status">{opened.message}</p>
  </Frame>;

  return <>
    <div hidden={showTripReview} inert={showTripReview ? true : undefined}>
    <HotelJourney
    result={result}
    state={pending ? 'loading' : toolInfo.isError ? 'error' : result ? undefined : 'malformed'}
    displayMode={layout.displayMode}
    theme={layout.theme}
    appearance={layout.host === 'chatgpt' ? 'host' : 'wayfare'}
    locale={layout.locale ?? 'en-CA'}
    experience={journey}
    onExperienceChange={setJourney}
    selectedSelectionId={chosen?.selectionId}
    pendingSelectionId={pendingSelectionId}
    selectionError={selectionError}
    onReview={ready && chosen && !pendingSelectionId ? () => setShowTripReview(true) : undefined}
    onExpand={ready && layout.supports?.fullscreen ? () => { void requestDisplayMode('fullscreen').catch(() => {}); } : undefined}
    onReturn={ready && layout.displayMode === 'fullscreen' ? () => { void requestDisplayMode('inline').catch(() => {}); } : undefined}
    onAdd={ready && result ? async selectionId => {
      if (inFlight.current || !result.hotels.some(hotel => hotel.selectionId === selectionId)) return;
      inFlight.current = true;
      const searchId = result.searchId;
      setSelectionError(undefined);
      setPendingSelectionId(selectionId);
      try {
        const response = await selectHotel.callToolAsync({ selectionId });
        if (latestSearchId.current !== searchId) return;
        const output = record(response.structuredContent);
        if (!response.isError && output?.status === 'selected' && output.selectionId === selectionId) {
          setSelected(selectionId);
        } else {
          setSelectionError('That stay could not be selected. It may have expired; try another option or refresh the search.');
        }
      } catch {
        if (latestSearchId.current === searchId) setSelectionError('The stay could not be selected. Try again. Your previous selection is unchanged.');
      } finally {
        inFlight.current = false;
        setPendingSelectionId(undefined);
      }
    } : undefined}
  />
    </div>
    {showTripReview ? <InlineTripReview onBack={() => setShowTripReview(false)} backLabel="Back to stays" /> : null}
  </>;
}
