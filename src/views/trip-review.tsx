import '@fontsource-variable/host-grotesk';
import '@noodleseed/one/react/styles.css';
import { useEffect, useRef, useState } from 'react';
import { ArrowRightIcon, ShieldCheckIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DemoTripReview } from '../demo-schemas.js';
import { Action, Feedback, useCallTool, useLayout, useSendFollowUpMessage, useToolInfo, useUpdateModelContext, useWidgetReady } from '../helpers.js';
import { ArrowLeftIcon, BedIcon, CheckIcon, PlaneIcon } from './icons.js';
import { experiencePhoto, formatExperienceMoney, isExperienceTripSelection } from './experience-selection-data.js';
import './travel.css';
import './trip-review.css';
import { TripExperienceDiscovery } from './trip-experience-discovery.js';
import { planTripExperienceSearch, tripPlanningSnapshot, type TripExperienceSearchPlan } from './trip-experience-search.js';
import { TripHotelDiscovery } from './trip-hotel-discovery.js';
import { planTripHotelSearch, type TripHotelSearchPlan } from './trip-hotel-search.js';
import { TripEstimate } from './trip-estimate.js';
import { TripOptionalFlow, type TripOptionalKind } from './trip-optional-flow.js';
import { isTripProtectionSelection } from './trip-protection-data.js';
import { planTripPoints } from './trip-optional-search.js';

export type MissingTripComponent = 'flight' | 'stay' | 'experiences';
type ReviewState = 'loading' | 'error' | 'malformed';
const record = (value: unknown): Record<string, unknown> | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const text = (value: unknown, max = 500): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const dateValid = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const moneyValid = (value: unknown, amountKey: string): boolean => {
  const m = record(value); return !!m && typeof m[amountKey] === 'number' && Number.isFinite(m[amountKey]) && (m[amountKey] as number) >= 0 && (m[amountKey] as number) <= 100_000_000 && typeof m.currency === 'string' && /^[A-Z]{3}$/.test(m.currency);
};
export function isTripPlanningReview(value: unknown): value is DemoTripReview {
  const data = record(value);
  if (!data || !['ready', 'incomplete'].includes(String(data.status)) || !text(data.fallback, 700) || !text(data.disclosure, 700) || !Array.isArray(data.experiences) || data.experiences.length > 8 || !data.experiences.every(isExperienceTripSelection) || !Array.isArray(data.missing)) return false;
  const flight = record(data.flight), stay = record(data.stay);
  if (data.flight !== undefined && (!flight || !text(flight.selectionId, 80) || (flight.searchPrice !== null && !moneyValid(flight.searchPrice, 'total')) || !text(flight.disclosure))) return false;
  if (data.stay !== undefined && (!stay || !text(stay.selectionId, 80) || !text(stay.propertyName, 100) || !text(stay.city, 100) || !dateValid(stay.checkInDate) || !dateValid(stay.checkOutDate) || stay.checkOutDate <= stay.checkInDate || !Number.isInteger(stay.nights) || Number(stay.nights) < 1 || Number(stay.nights) > 30 || !Number.isInteger(stay.rooms) || Number(stay.rooms) < 1 || Number(stay.rooms) > 4 || !moneyValid(stay.staySubtotal, 'amount') || !['live_nuitee', 'illustrative'].includes(String(stay.dataSource)))) return false;
  const missing = [...(!flight ? ['flight'] : []), ...(!stay ? ['stay'] : []), ...(data.experiences.length ? [] : ['experiences'])];
  if (data.missing.length !== missing.length || !data.missing.every(v => missing.includes(String(v))) || new Set(data.missing).size !== missing.length || (data.status === 'ready') !== Boolean(flight || stay || data.experiences.length)) return false;
  const context = record(data.planningContext);
  if (data.planningContext !== undefined && !context) return false;
  if (context) {
    if (!text(context.destination, 100) || !['flight', 'stay', 'experience'].includes(String(context.source)) || !['flight_departure', 'stay', 'experience_search'].includes(String(context.dateBasis))) return false;
    for (const key of ['meetingArea', 'propertyName', 'origin']) if (context[key] !== undefined && !text(context[key], 100)) return false;
    for (const key of ['startDate', 'endDate']) if (context[key] !== undefined && !dateValid(context[key])) return false;
    const activityDates = record(context.activityDates);
    if (context.activityDates !== undefined && (!activityDates || !dateValid(activityDates.startDate) || !dateValid(activityDates.endDate) || activityDates.endDate <= activityDates.startDate)) return false;
    if (context.currency !== undefined && !/^[A-Z]{3}$/.test(String(context.currency)) || context.countryCode !== undefined && !/^[A-Z]{2}$/.test(String(context.countryCode))) return false;
    for (const key of ['adults', 'children', 'infants']) if (context[key] !== undefined && (!Number.isInteger(context[key]) || Number(context[key]) < (key === 'adults' ? 1 : 0) || Number(context[key]) > (key === 'children' ? 8 : 9))) return false;
  }
  if (data.notes !== undefined && (!Array.isArray(data.notes) || data.notes.length > 3 || !data.notes.every(note => text(note, 240)))) return false;
  if (data.protection !== undefined && !isTripProtectionSelection(data.protection)) return false;
  if (data.protectionNote !== undefined && !text(data.protectionNote, 240)) return false;
  return true;
}

function dateLabel(date: string, locale: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return Number.isFinite(parsed.valueOf()) ? new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(parsed) : date.slice(0, 10);
}
const money = (amount: number, currency: string, locale: string) => new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: currency === 'JPY' ? 0 : 2 }).format(amount);

function FlightThumbnail({ imageUrl }: { readonly imageUrl?: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const safe = typeof imageUrl === 'string' && imageUrl.length <= 2_048
    && /^https:\/\/(?:sandbox|production)\.nuitee\.flights\/static\/images\/airlines\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:png|svg|webp)$/.test(imageUrl);
  return <div className="wf-review-thumbnail wf-review-flight-thumbnail" aria-hidden="true">
    {safe && failedUrl !== imageUrl
      ? <img src={imageUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedUrl(imageUrl)} />
      : <PlaneIcon />}
  </div>;
}

function StayThumbnail({ imageUrl }: { readonly imageUrl?: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const safe = typeof imageUrl === 'string' && imageUrl.length <= 2_048
    && /^https:\/\/(?:snaphotelapi\.com|static\.cupid\.travel)\/[^\s\\]*$/i.test(imageUrl);
  return <div className="wf-review-thumbnail wf-review-stay-thumbnail" aria-hidden="true">
    {safe && failedUrl !== imageUrl
      ? <img src={imageUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedUrl(imageUrl)} />
      : <BedIcon />}
  </div>;
}

export function tripSuggestion(data: DemoTripReview, component: MissingTripComponent): string {
  const c = data.planningContext;
  const destination = c?.destination;
  const near = c?.propertyName ?? c?.meetingArea;
  const dates = c?.dateBasis === 'flight_departure'
    ? ` based on my flight departing ${c.startDate ?? 'on the date already selected'}${c.endDate ? ` and returning ${c.endDate}` : ''}`
    : c?.startDate && c?.endDate ? ` from ${c.startDate} to ${c.endDate}` : c?.startDate ? ` starting ${c.startDate}` : '';
  const party = c?.adults ? ` for ${c.adults} adult${c.adults === 1 ? '' : 's'}${c.children ? ` and ${c.children} child${c.children === 1 ? '' : 'ren'}` : ''}${c.infants ? ` and ${c.infants} infant${c.infants === 1 ? '' : 's'}` : ''}` : '';
  const currency = c?.currency ? `, with prices in ${c.currency}` : '';
  const continuation = ' Do not repeat the trip review, display another plan card, or recheck my flight fare for this search. Continue from the selected context and our conversation.';
  if (component === 'flight') return `Find flights${c?.origin ? ` from ${c.origin}` : ''}${destination ? ` to ${destination}` : ' for my trip'}${dates}${party}${currency}. Use the trip details already in our conversation and ask only for missing flight details.${continuation}`;
  const dateGuidance = ` Reuse the stay or activity dates already established in our conversation. Search immediately when the required details are known. If dates are still missing, ask one short question for only the missing ${component === 'stay' ? 'check-in or check-out' : 'activity'} dates, without a trip recap. Do not require a return flight or an exact arrival time for this search.`;
  const arrival = c?.dateBasis === 'flight_departure' ? ' Do not treat flight departure or return dates as confirmed local arrival, stay, or activity dates.' : '';
  if (component === 'stay') return `Find a stay${destination ? ` in ${destination}` : ' for my trip'}${near ? ` near ${near}` : ''}${dates}${party}${currency}. Use my selected trip details; check what is known about the location before describing a stay as nearby.${continuation}${dateGuidance}${arrival}`;
  return `Find experiences${destination ? ` in ${destination}` : ' for my trip'}${near ? ` around ${near}` : ''}${dates}${party}${currency}. Use my selected trip details; explain when distance or proximity is unknown.${continuation}${dateGuidance}${arrival}`;
}

export function continuePlanningPrompt(data: DemoTripReview): string {
  const labels: Record<MissingTripComponent, string> = { flight: 'flights', stay: 'stays', experiences: 'experiences' };
  const selected = [data.flight ? 'a flight' : '', data.stay ? 'a stay' : '', data.experiences.length ? 'experiences' : ''].filter(Boolean).join(', ');
  const c = data.planningContext;
  const destination = c?.destination ? ` for ${c.destination}` : '';
  const location = c?.propertyName ?? c?.meetingArea;
  return `Let’s continue planning${destination}. ${selected ? `I already have ${selected} selected.` : 'Nothing is selected yet.'} ${data.missing.length ? `Suggest the next useful step from these optional missing items: ${data.missing.map(item => labels[item]).join(', ')}.` : 'Ask what I would like to refine next.'}${location ? ` Keep suggestions relevant to ${location}.` : ''} Use the dates and travelers already established. Do not repeat the trip review or display another plan card unless I ask to review it; continue from the current selections shown in the widget. Do not recheck my flight fare just to continue planning. Ask at most one short question, only for what the next search still needs. Nothing is booked.`;
}

export function TripReviewView({ data, state, locale = 'en-CA', onSuggest, disabledSuggestions, onContinue, actionError, actionNotice, actionsPending, onBack, backLabel = 'Back to selection', onRetry, onPoints, onProtection, onRemoveProtection }: {
  readonly data?: DemoTripReview;
  readonly state?: ReviewState;
  readonly locale?: string;
  readonly onSuggest?: (component: MissingTripComponent) => void;
  readonly disabledSuggestions?: readonly MissingTripComponent[];
  readonly onContinue?: () => void;
  readonly actionError?: string;
  readonly actionNotice?: string;
  readonly actionsPending?: boolean;
  readonly onBack?: () => void;
  readonly backLabel?: string;
  readonly onRetry?: () => void;
  readonly onPoints?: () => void;
  readonly onProtection?: () => void;
  readonly onRemoveProtection?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (onBack && data && !state) heading.current?.focus({ preventScroll: true }); }, [Boolean(onBack), Boolean(data), state]);
  const back = onBack ? <div className="wf-review-back"><Action type="button" onClick={onBack}><ArrowLeftIcon />{backLabel}</Action></div> : null;
  if (state === 'loading') return <section className="cc-app wf-review">{back}<div className="wf-review-feedback" role="status" aria-busy="true">Preparing your selected trip…</div></section>;
  if (state === 'error' || state === 'malformed' || !data) return <section className="cc-app wf-review">{back}<div className="wf-review-feedback"><Feedback status="error">{state === 'error' ? 'Your trip review could not load. Try again; your selections have not been changed.' : 'The trip result was incomplete, so no selections were inferred.'}</Feedback>{onRetry ? <Action className="wf-review-suggestion" type="button" onClick={onRetry}>Try again</Action> : null}</div></section>;
  const selected = Number(Boolean(data.flight)) + Number(Boolean(data.stay)) + data.experiences.length;
  const context = data.planningContext;
  const destination = context?.destination ?? data.stay?.city ?? data.experiences[0]?.experience.city;
  const dates = context?.startDate ? `${context.dateBasis === 'flight_departure' ? 'Flight dates: ' : ''}${dateLabel(context.startDate, locale)}${context.endDate ? `–${dateLabel(context.endDate, locale, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}` : undefined;
  const party = context?.adults ? `${context.adults} adult${context.adults === 1 ? '' : 's'}${context.children ? ` · ${context.children} child${context.children === 1 ? '' : 'ren'}` : ''}${context.infants ? ` · ${context.infants} infant${context.infants === 1 ? '' : 's'}` : ''}` : undefined;
  const labels: Record<MissingTripComponent, string> = { flight: 'Find flights', stay: 'Find a stay', experiences: 'Explore experiences' };
  return <section className="cc-app wf-review" data-llm={data.fallback}>
    {back}
    <header className="wf-review-header"><div><h2 ref={heading} tabIndex={onBack ? -1 : undefined}>{destination ? `Your ${destination} plan` : 'Your trip plan'}</h2><p>{[dates, party].filter(Boolean).join(' · ') || 'Selected in this conversation'}</p></div><span className="wf-review-badge">{selected} selected</span></header>
    <div className="wf-review-content">
      {data.flight ? <section className="wf-review-section wf-review-flight" aria-label="Selected flight"><div className="wf-review-section-heading"><strong>Flight</strong><span>Selected</span></div><div className="wf-review-row"><div className="wf-review-facts"><FlightThumbnail imageUrl={data.flight.airlineLogoUrl} /><div><h3>Your selected flight</h3><p>Search selection · Fare verification needed</p></div></div><div className="wf-review-price"><strong>{data.flight.searchPrice ? money(data.flight.searchPrice.total, data.flight.searchPrice.currency, locale) : 'Price unavailable'}</strong><span>{data.flight.searchPrice ? `${data.flight.searchPrice.currency} · Search price` : 'Search price unknown'}</span></div></div></section> : null}
      {data.stay ? <section className="wf-review-section wf-review-stay" aria-label="Selected stay"><div className="wf-review-section-heading"><strong>Stay</strong><span>Selected</span></div><div className="wf-review-row"><div className="wf-review-facts"><StayThumbnail imageUrl={data.stay.imageUrl} /><div><h3>{data.stay.propertyName}</h3><p>{dateLabel(data.stay.checkInDate, locale)}–{dateLabel(data.stay.checkOutDate, locale)} · {data.stay.nights} {data.stay.nights === 1 ? 'night' : 'nights'} · {data.stay.rooms} {data.stay.rooms === 1 ? 'room' : 'rooms'}</p><p>{data.stay.dataSource === 'illustrative' ? 'Fictional stay · No reservation' : 'Provider search selection · No room reserved'}</p></div></div><div className="wf-review-price"><strong>{money(data.stay.staySubtotal.amount, data.stay.staySubtotal.currency, locale)}</strong><span>{data.stay.staySubtotal.currency} · Stay subtotal</span></div></div></section> : null}
      {data.experiences.length ? <section className="wf-review-section" aria-label="Selected experiences"><div className="wf-review-section-heading"><strong>Experiences</strong><span>{data.experiences.length} selected · Wayfare demo</span></div><div className="wf-review-experiences">{data.experiences.map(selection => <div className="wf-review-experience" key={selection.selectionId}><div className="wf-review-thumbnail"><img src={experiencePhoto(selection.experience).url} alt="" onError={event => { event.currentTarget.hidden = true; }} /></div><div><h3>{selection.experience.title}</h3><p>{dateLabel(selection.slot.startLocal, locale, { weekday: 'long', day: 'numeric', month: 'short' })} · {selection.slot.startLocal.slice(11, 16)}</p><p>{selection.experience.city} time · {selection.searchContext.adults} {selection.searchContext.adults === 1 ? 'adult' : 'adults'}</p><span className="wf-review-status"><CheckIcon />Selected · Not reserved</span></div><div className="wf-review-price"><strong>{formatExperienceMoney(selection.totalPrice.amountMinor, selection.totalPrice.currency, locale, true)}</strong><span>{selection.totalPrice.currency} · Fictional price</span></div></div>)}</div></section> : null}
      <TripEstimate data={data} locale={locale} party={party} />
      {selected > 0 ? <>
        <section className="wf-review-optional" aria-label="Points possibilities">
          <div className="wf-review-optional-icon"><SparklesIcon aria-hidden="true" /></div>
          <div className="wf-review-optional-copy"><h3>Explore this trip with points</h3><p><strong>{new Intl.NumberFormat(locale).format(planTripPoints(data).input?.pointsBudget ?? 42500)} points</strong> in the sample rewards profile.</p><p>See how a reward-flight idea compares with your cash selection.</p><small>Example rewards only. Eligibility is not verified and no points can be redeemed.</small></div>
          <Action data-trip-optional="points" type="button" className="wf-review-suggestion" aria-label="View points options" onClick={onPoints} disabled={actionsPending || !onPoints}>Explore points<ArrowRightIcon aria-hidden="true" /></Action>
        </section>
        <section className="wf-review-optional" aria-label="Travel protection">
          <div className="wf-review-optional-icon"><ShieldCheckIcon aria-hidden="true" /></div>
          <div className="wf-review-optional-copy"><h3>Travel protection</h3><p>{data.protection ? <><strong>{data.protection.plan.name}</strong> · {money(data.protection.plan.illustrativePrice.amount, data.protection.plan.illustrativePrice.currency, locale)} fictional price</> : 'Optional · Nothing selected'}</p><p>{data.protection ? 'Added to this demo plan only. You are not insured.' : 'Compare examples of medical, cancellation and baggage protection.'}</p><small>{data.protection ? 'No policy purchased, issued or checked.' : 'Illustrative concepts only. Not a quote or statement of coverage.'}</small>{data.protectionNote ? <p role="status">{data.protectionNote}</p> : null}</div>
          <div className="wf-review-optional-actions"><Action data-trip-optional="protection" type="button" className="wf-review-suggestion" aria-label={data.protection ? 'Review protection' : 'Compare protection'} onClick={onProtection} disabled={actionsPending || !onProtection}>{data.protection ? 'Review concept' : 'Explore protection'}<ArrowRightIcon aria-hidden="true" /></Action>{data.protection ? <Action type="button" className="wf-review-remove" aria-label="Remove protection" onClick={onRemoveProtection} disabled={actionsPending || !onRemoveProtection}><XMarkIcon aria-hidden="true" />Remove</Action> : null}</div>
        </section>
      </> : null}
      {!selected ? <section className="wf-review-empty"><h3>Your plan is open</h3><p>Start with the part of the trip you need. Flights, stays, and experiences are optional choices.</p></section> : null}
      {!data.flight && !data.stay && data.experiences.length ? <div className="wf-review-note"><strong>Your experience is part of the plan.</strong> You can plan activities here even if you’ve arranged your flight and hotel elsewhere.</div> : null}
      {data.missing.length ? <div className="wf-review-suggestions"><p>{selected ? `Need help with the rest${destination ? ` in ${destination}` : ''}?` : 'What would you like to explore?'}</p><div>{data.missing.map(component => <Action key={component} type="button" className="wf-review-suggestion" disabled={actionsPending || !onSuggest || disabledSuggestions?.includes(component)} onClick={() => onSuggest?.(component)}>{labels[component]}</Action>)}</div>{!onSuggest || disabledSuggestions?.length ? <p>Ask in the conversation to continue planning.</p> : null}</div> : null}
      {actionsPending ? <p role="status">Checking your current selections…</p> : null}
      {actionNotice ? <p role="status">{actionNotice}</p> : null}
      {data.notes?.length ? <div className="wf-review-note" role="status">{data.notes.map(note => <p key={note}>{note}</p>)}</div> : null}
      <footer className="wf-review-footer"><p>A plan, not a booking. Demo items are fictional. A planning estimate is not an amount to pay; provider prices still need their own checks.</p>{actionError ? <Feedback status="error">{actionError}</Feedback> : null}{onContinue ? <Action type="button" className="wf-review-primary" variant="primary" disabled={actionsPending} onClick={onContinue}>Continue planning</Action> : null}</footer>
    </div>
  </section>;
}

function TripReviewPanel({ data: initialData, state: initialState, onBack, backLabel, onRetry }: Pick<Parameters<typeof TripReviewView>[0], 'data' | 'state' | 'onBack' | 'backLabel' | 'onRetry'>) {
  const panelHost = useRef<HTMLDivElement>(null);
  const ready = useWidgetReady();
  const layout = useLayout();
  const send = useSendFollowUpMessage();
  const updateContext = useUpdateModelContext();
  const [actionError, setActionError] = useState<string>();
  const [actionNotice, setActionNotice] = useState<string>();
  const [discovery, setDiscovery] = useState<{ kind: 'experiences'; plan: TripExperienceSearchPlan } | { kind: 'stay'; plan: TripHotelSearchPlan }>();
  const [optional, setOptional] = useState<TripOptionalKind>();
  const restoreTarget = useRef<TripOptionalKind | undefined>(undefined);
  const [actionsPending, setActionsPending] = useState(false);
  const actionInFlight = useRef(false);
  const [fresh, setFresh] = useState<{ data?: DemoTripReview; state?: ReviewState }>();
  const review = useCallTool('review_trip');
  const protectionSelection = useCallTool('select_trip_protection');
  const reviewCall = useRef(review.callToolAsync);
  reviewCall.current = review.callToolAsync;
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; }, []);
  const data = fresh ? fresh.data : initialData;
  const state = fresh ? fresh.state : initialState;
  useEffect(() => {
    if (!data?.protection) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      if (!active) return;
      if (actionInFlight.current) { timer = setTimeout(() => { void refresh(); }, 1000); return; }
      const request = generation.current;
      try {
        // The browser clock only triggers a read. The server decides whether
        // the choice expired or still belongs to the current trip.
        const response = await reviewCall.current({});
        if (!active || request !== generation.current) return;
        if (response.isError || !isTripPlanningReview(response.structuredContent)) throw new Error('Review unavailable');
        setFresh({ data: response.structuredContent });
        const retained = response.structuredContent.protection;
        if (retained?.comparisonId === data.protection?.comparisonId && retained?.plan.planId === data.protection?.plan.planId && retained?.expiresAt === data.protection?.expiresAt) {
          // An ahead-of-server browser clock must not create a busy loop or
          // abandon expiry checks. Recheck at a bounded one-minute interval.
          timer = setTimeout(() => { void refresh(); }, 60_000);
        }
      } catch {
        if (active && request === generation.current) setFresh({ data: { ...data, protection: undefined, protectionNote: 'Protection needs rechecking and is not included in this estimate. Reload your trip review to check the current choice.' } });
      }
    };
    timer = setTimeout(() => { void refresh(); }, Math.max(0, Math.min(Date.parse(data.protection.expiresAt) - Date.now() + 250, 2_147_483_647)));
    return () => { active = false; clearTimeout(timer); };
  }, [data?.protection?.comparisonId, data?.protection?.plan.planId, data?.protection?.expiresAt]);
  const refreshReview = () => {
    const request = ++generation.current;
    setDiscovery(undefined); setOptional(undefined); setActionError(undefined); setActionNotice(undefined); setFresh({ state: 'loading' });
    void review.callToolAsync({}).then(response => {
      if (request === generation.current) setFresh(response.isError ? { state: 'error' } : isTripPlanningReview(response.structuredContent) ? { data: response.structuredContent } : { state: 'malformed' });
    }).catch(() => { if (request === generation.current) setFresh({ state: 'error' }); });
  };
  const contextKey = data ? JSON.stringify(tripPlanningSnapshot(data)) : '';
  useEffect(() => {
    if (optional || state || !data || !restoreTarget.current) return;
    const target = restoreTarget.current;
    const frame = requestAnimationFrame(() => {
      const button = panelHost.current?.querySelector<HTMLButtonElement>(`button[data-trip-optional="${target}"]`);
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      restoreTarget.current = undefined;
    });
    return () => cancelAnimationFrame(frame);
  }, [optional, state, data]);
  useEffect(() => {
    if (discovery || !ready || !data || !layout.supports?.modelContext) return;
    void updateContext({ content: [{ type: 'text', text: data.fallback }], structuredContent: { tripPlanning: tripPlanningSnapshot(data) } }).catch(() => undefined);
  }, [ready, contextKey, Boolean(discovery), optional, layout.supports?.modelContext, updateContext]);
  const supportsFollowUp = ready && layout.supports?.followUpMessage;
  const openOptional = async (kind: TripOptionalKind) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true; setActionsPending(true); setActionError(undefined); setActionNotice(undefined);
    const request = ++generation.current;
    try {
      const response = await review.callToolAsync({});
      if (request !== generation.current) return;
      if (response.isError || !isTripPlanningReview(response.structuredContent)) { setActionError('Your current trip could not be checked. Try again; your selections are unchanged.'); return; }
      setFresh({ data: response.structuredContent }); setOptional(kind);
    } catch { if (request === generation.current) setActionError('Your current trip could not be checked. Try again.'); }
    finally { actionInFlight.current = false; if (request === generation.current) setActionsPending(false); }
  };
  const removeProtection = async () => {
    if (actionInFlight.current || !data?.protection) return;
    actionInFlight.current = true; setActionsPending(true); setActionError(undefined); setActionNotice(undefined);
    const request = ++generation.current;
    const { comparisonId, plan } = data.protection;
    try {
      const response = await protectionSelection.callToolAsync({ action: 'remove', comparisonId, planId: plan.planId });
      if (request !== generation.current) return;
      const value = response.structuredContent as Record<string, unknown> | undefined;
      if (response.isError || value?.status !== 'removed') { setActionError('Removal was not confirmed. Review the current protection choice before trying again.'); return; }
      const refreshed = await review.callToolAsync({});
      if (request !== generation.current) return;
      if (refreshed.isError || !isTripPlanningReview(refreshed.structuredContent)) { setActionError('Removal was acknowledged, but your current trip could not load. Refresh the trip review to check.'); return; }
      setFresh({ data: refreshed.structuredContent }); restoreTarget.current = 'protection';
      setActionNotice(refreshed.structuredContent.protection ? 'Your latest trip has another protection choice. The current plan is shown.' : 'The protection example was removed. Your planning estimate is updated.');
    } catch { if (request === generation.current) setActionError('Removal could not be confirmed. Refresh the trip review to check the current choice.'); }
    finally { actionInFlight.current = false; if (request === generation.current) setActionsPending(false); }
  };
  const navigate = async (requested: MissingTripComponent | 'continue') => {
    if (actionInFlight.current) return;
    actionInFlight.current = true; setActionsPending(true); setActionError(undefined); setActionNotice(undefined);
    const request = ++generation.current;
    try {
      // Historical widgets cannot know about later selections. Read current
      // server state before searching; this never verifies fares or books.
      const response = await review.callToolAsync({});
      if (request !== generation.current) return;
      if (response.isError || !isTripPlanningReview(response.structuredContent)) {
        setActionError('Your current selections could not be checked. Try again; no new search was started.'); return;
      }
      const current = response.structuredContent;
      setFresh({ data: current });
      const component = requested === 'continue'
        ? (['stay', 'experiences', 'flight'] as const).find(item => current.missing.includes(item))
        : requested;
      if (component && !current.missing.includes(component)) {
        setActionNotice('That part of your trip is already selected. Your current plan is shown here.'); return;
      }
      let reason: string | undefined;
      if (component === 'stay') {
        const plan = planTripHotelSearch(current);
        if (plan.input) { setDiscovery({ kind: 'stay', plan }); return; }
        reason = plan.error;
      } else if (component === 'experiences') {
        const plan = planTripExperienceSearch(current);
        if (plan.input) { setDiscovery({ kind: 'experiences', plan }); return; }
        reason = plan.error;
      }
      if (!supportsFollowUp) { setActionError(reason ?? 'Continue in the conversation to plan the next part of your trip.'); return; }
      if (layout.supports?.modelContext) await updateContext({ content: [{ type: 'text', text: current.fallback }], structuredContent: { tripPlanning: tripPlanningSnapshot(current) } }).catch(() => undefined);
      if (request !== generation.current) return;
      try { await send({ prompt: component ? `${tripSuggestion(current, component)}${reason ? ` ${reason}` : ''}` : continuePlanningPrompt(current) }); }
      catch { if (request === generation.current) setActionError('The conversation could not be opened. Please type your request in the chat.'); }
    } catch {
      if (request === generation.current) setActionError('Your current selections could not be checked. Try again; no new search was started.');
    } finally {
      actionInFlight.current = false;
      if (request === generation.current) setActionsPending(false);
    }
  };
  if (data && discovery?.kind === 'experiences' && discovery.plan.input) return <TripExperienceDiscovery review={data} plan={{ ...discovery.plan, input: discovery.plan.input }} onBack={refreshReview} />;
  if (data && discovery?.kind === 'stay' && discovery.plan.input) return <TripHotelDiscovery review={data} plan={{ ...discovery.plan, input: discovery.plan.input }} onBack={refreshReview} />;
  if (data && optional) return <TripOptionalFlow kind={optional} review={data} onBack={() => { restoreTarget.current = optional; refreshReview(); }} onSaved={(current, message) => { restoreTarget.current = optional; setFresh({ data: current }); setOptional(undefined); setActionNotice(message); }} />;
  return <div ref={panelHost}><TripReviewView data={data} locale={layout.locale ?? 'en-CA'} state={state} onBack={onBack} backLabel={backLabel} onRetry={fresh ? refreshReview : onRetry} actionError={actionError} actionNotice={actionNotice} actionsPending={actionsPending}
    onPoints={ready && data ? () => { void openOptional('points'); } : undefined}
    onProtection={ready && data ? () => { void openOptional('protection'); } : undefined}
    onRemoveProtection={ready && data?.protection ? () => { void removeProtection(); } : undefined}
    disabledSuggestions={supportsFollowUp ? undefined : ['flight', ...(data && planTripHotelSearch(data).input ? [] : ['stay' as const])]}
    onSuggest={ready && data ? component => { void navigate(component); } : undefined}
    onContinue={ready && data ? () => { void navigate('continue'); } : undefined} /></div>;
}

// Navigation reads authoritative state without starting a conversational turn.
// No persisted trip snapshot: every mount/retry fetches the latest selections.
export function InlineTripReview({ onBack, backLabel }: { readonly onBack: () => void; readonly backLabel?: string }) {
  const ready = useWidgetReady();
  const review = useCallTool('review_trip');
  const call = useRef(review.callToolAsync);
  call.current = review.callToolAsync;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ data?: DemoTripReview; state?: ReviewState }>({ state: 'loading' });
  useEffect(() => {
    if (!ready) return;
    let current = true;
    setResult({ state: 'loading' });
    void call.current({}).then(response => {
      if (!current) return;
      setResult(response.isError ? { state: 'error' } : isTripPlanningReview(response.structuredContent) ? { data: response.structuredContent } : { state: 'malformed' });
    }).catch(() => { if (current) setResult({ state: 'error' }); });
    return () => { current = false; };
  }, [ready, attempt]);
  const goBack = () => {
    onBack();
    // The selection screen may remount; restore focus after it becomes visible.
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('button[data-trip-review-trigger]')?.focus());
  };
  return <TripReviewPanel {...result} state={!ready ? 'loading' : result.state} onBack={goBack} backLabel={backLabel} onRetry={ready ? () => setAttempt(value => value + 1) : undefined} />;
}

export default function TripReview() {
  const ready = useWidgetReady();
  const toolInfo = useToolInfo('review_trip');
  const data = isTripPlanningReview(toolInfo.structuredContent) ? toolInfo.structuredContent : undefined;
  return <TripReviewPanel data={data} state={!ready || !Object.keys(toolInfo).length ? 'loading' : toolInfo.isError ? 'error' : !data ? 'malformed' : undefined} />;
}
