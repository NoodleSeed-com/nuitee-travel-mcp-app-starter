import '@fontsource-variable/host-grotesk';
import '@noodleseed/one/react/styles.css';
import { useEffect, useRef, useState } from 'react';
import type { DemoExperience, DemoExperienceSearchOutput, DemoExperienceSelection, DemoTripReview } from '../demo-schemas.js';
import {
  Action,
  Feedback,
  Frame,
  StatusBadge,
  useCallTool,
  useLayout,
  useSendFollowUpMessage,
  useToolInfo,
  useUpdateModelContext,
  useViewState,
  useWidgetReady,
} from '../helpers.js';
import { CardCarousel } from './card-carousel.js';
import { PhotoBand } from './card-primitives.js';
import { CompassIcon, XMarkIcon } from './icons.js';
import { ExperienceAddedView, ExperienceChooseView, type ExperienceAddState, type ExperienceSelectionState } from './experience-selection.js';
import { experiencePhoto, isExperience, isExperienceSearchContext, isExperienceTripSelection, matchesExperienceChoice, record, text, durationLabel, formatExperienceMoney } from './experience-selection-data.js';
import './travel.css';
import { InlineTripReview } from './trip-review.js';
import { tripPlanningSnapshot, type TripExperienceSearchPlan } from './trip-experience-search.js';
import './experience-results.css';

export interface ExperienceJourneyState {
  readonly searchId: string;
  readonly screen: 'results' | 'detail' | 'compare' | 'added';
  readonly detailId?: string;
  readonly compareIds: readonly string[];
  readonly choice?: ExperienceSelectionState;
  readonly selection?: DemoExperienceSelection;
}

type ExperienceState = 'loading' | 'error' | 'malformed';

export function isDemoExperienceSearchOutput(value: unknown): value is DemoExperienceSearchOutput {
  const result = record(value);
  if (!result || !['success', 'empty'].includes(String(result.status)) || result.dataSource !== 'illustrative' ||
    result.source !== 'WAYFARE_DEMO' || result.isFictional !== true || !text(result.disclosure, 20, 320) ||
    !text(result.message, 2, 320) || !text(result.fallback, 20, 700) ||
    typeof result.searchId !== 'string' || !/^exsearch_[a-f0-9]{32}$/.test(result.searchId) ||
    typeof result.supportedDestination !== 'boolean' || !isExperienceSearchContext(result.searchContext) ||
    !Array.isArray(result.experiences) || result.experiences.length > 6 || !result.experiences.every(isExperience)) return false;
  const success = result.status === 'success';
  if (success !== (result.experiences.length > 0)) return false;
  if (success) return result.emptyReason === undefined && result.supportedDestination === true;
  return ['UNSUPPORTED_DESTINATION', 'NO_MATCHING_EXPERIENCES'].includes(String(result.emptyReason)) &&
    (result.supportedDestination ? result.emptyReason === 'NO_MATCHING_EXPERIENCES' : result.emptyReason === 'UNSUPPORTED_DESTINATION');
}

function initialJourney(result: DemoExperienceSearchOutput): ExperienceJourneyState {
  const named = result.searchContext.experienceName && result.experiences.length === 1 ? result.experiences[0] : undefined;
  return { searchId: result.searchId, screen: named ? 'detail' : 'results', ...(named ? { detailId: named.experienceId } : {}), compareIds: [] };
}

export function restoreExperienceJourney(value: unknown, result: DemoExperienceSearchOutput): ExperienceJourneyState {
  const saved = record(value);
  const ids = new Set(result.experiences.map((experience) => experience.experienceId));
  if (!saved || saved.searchId !== result.searchId || !['results', 'detail', 'compare', 'added'].includes(String(saved.screen)) ||
    !Array.isArray(saved.compareIds)) return initialJourney(result);
  const compareIds = [...new Set(saved.compareIds.filter((id): id is string => typeof id === 'string' && ids.has(id)))].slice(0, 2);
  const detailId = typeof saved.detailId === 'string' && ids.has(saved.detailId) ? saved.detailId : undefined;
  const experience = result.experiences.find((item) => item.experienceId === detailId);
  const rawChoice = record(saved.choice);
  const date = experience && rawChoice && rawChoice.experienceId === detailId && typeof rawChoice.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawChoice.date) && experience.slots.some((slot) => slot.startLocal.slice(0, 10) === rawChoice.date) ? rawChoice.date : undefined;
  const slotId = date && experience?.slots.find((slot) => slot.slotId === rawChoice?.slotId && slot.startLocal.startsWith(date))?.slotId;
  const choice = date && detailId ? { experienceId: detailId, date, ...(slotId ? { slotId } : {}) } : undefined;
  const savedSelection = isExperienceTripSelection(saved.selection) ? saved.selection : undefined;
  const selection = savedSelection && result.experiences.some((item) => matchesExperienceChoice(savedSelection, item, result.searchContext)) ? savedSelection : undefined;
  const requestedScreen = saved.screen as ExperienceJourneyState['screen'];
  const screen = requestedScreen === 'detail' && !detailId
    ? 'results'
    : requestedScreen === 'added' && !selection ? 'results' : requestedScreen === 'compare' && compareIds.length !== 2
      ? 'results'
      : requestedScreen;
  return { searchId: result.searchId, screen, ...(detailId ? { detailId } : {}), compareIds, ...(choice ? { choice } : {}), ...(selection ? { selection } : {}) };
}

export function acknowledgedExperienceSelection(response: unknown, experienceId: string, slotId: string, expected?: { readonly experience: DemoExperience; readonly context: DemoExperienceSearchOutput['searchContext'] }): DemoExperienceSelection | undefined {
  const envelope = record(response), output = record(envelope?.structuredContent);
  if (envelope?.isError || !output || !['selected', 'already_selected'].includes(String(output.status)) ||
    output.requestedExperienceId !== experienceId || output.requestedSlotId !== slotId || !isExperienceTripSelection(output.selection)) return undefined;
  if (output.status === 'selected' && (output.selection.experience.experienceId !== experienceId || output.selection.slot.slotId !== slotId)) return undefined;
  if (expected && !matchesExperienceChoice(output.selection, expected.experience, expected.context, slotId)) return undefined;
  if (expected && output.status === 'selected' && (output.selection.experience.price.amountMinor !== expected.experience.price.amountMinor || output.selection.totalPrice.currency !== expected.context.currency)) return undefined;
  return output.selection;
}

function formatMoney(experience: DemoExperience, locale: string) {
  return formatExperienceMoney(experience.price.amountMinor, experience.price.currency, locale);
}

function slotLabel(experience: DemoExperience) {
  return experience.slots.slice(0, 2).map((slot) => slot.startLocal.slice(11, 16)).join(' or ');
}

function ExperienceSkeleton() {
  return <Frame className="cc-app cc-experiences" displayMode="auto">
    <section className="cc-experience-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="cc-visually-hidden">Finding fictional experience ideas…</span>
      {[0, 1, 2].map((index) => <article className="cc-experience-card" aria-hidden="true" key={index}>
        <div className="cc-experience-skeleton-art cc-shimmer" />
        <div className="cc-experience-card-body"><span className="cc-skeleton-block cc-shimmer" /><span className="cc-skeleton-block cc-shimmer" /><span className="cc-skeleton-block cc-shimmer" /></div>
      </article>)}
    </section>
  </Frame>;
}

function ExperienceCard({ experience, selected, locale, onCompare, onDetail }: {
  readonly experience: DemoExperience;
  readonly selected: boolean;
  readonly locale: string;
  readonly onCompare?: () => void;
  readonly onDetail?: () => void;
}) {
  const photo = experiencePhoto(experience);
  return <article className="cc-experience-card">
    <PhotoBand name={experience.title} imageUrl={photo.url} glyph={<CompassIcon />} height={190}>
      <StatusBadge tone="info">{experience.categories.slice(0, 2).map((category) => category.toLowerCase()).join(' · ')}</StatusBadge>
      <span className="cc-experience-photo-credit">{photo.credit}</span>
      {onCompare ? <Action className="cc-experience-compare-toggle" type="button" variant={selected ? 'primary' : 'secondary'} aria-pressed={selected} aria-label={`${selected ? 'Remove' : 'Compare'} ${experience.title}`} onClick={onCompare}>
        {selected ? '✓ Comparing' : '+ Compare'}
      </Action> : null}
    </PhotoBand>
    <div className="cc-experience-card-body">
      <h3>{experience.title}</h3>
      <div className="cc-experience-chips"><span>{durationLabel(experience.durationMinutes)}</span><span>{experience.meetingArea}</span></div>
      <p className="cc-experience-summary">{experience.shortDescription}</p>
      <dl className="cc-experience-facts"><div><dt>Next times</dt><dd>{slotLabel(experience)}</dd></div><div><dt>Access</dt><dd>{experience.accessibility.summary}</dd></div></dl>
      <p className="cc-experience-price"><strong>{formatMoney(experience, locale)}</strong><span> fictional · per adult</span></p>
      <Action className="cc-experience-detail-action" type="button" variant="primary" aria-label={`View details for ${experience.title}`} onClick={onDetail}>View details</Action>
    </div>
  </article>;
}

function CompareTray({ selected, locale, onRemove, onOpen }: {
  readonly selected: readonly DemoExperience[];
  readonly locale: string;
  readonly onRemove?: (id: string) => void;
  readonly onOpen?: () => void;
}) {
  return <footer className="cc-experience-tray">
    {selected.length === 0 ? <p>Select two cards to compare schedule, access, and cancellation terms.</p> : <div className="cc-experience-thumbs">
      {selected.map((experience) => <article className="cc-experience-thumb" key={experience.experienceId}>
        <span className="cc-experience-thumb-art" aria-hidden="true" style={{ backgroundImage: `linear-gradient(rgb(13 13 13 / .18), rgb(13 13 13 / .38)), url(${experiencePhoto(experience).url})` }}><CompassIcon /></span>
        <span><strong>{experience.title}</strong><small>{durationLabel(experience.durationMinutes)} · {formatMoney(experience, locale)}</small></span>
        <button aria-label={`Remove ${experience.title} from comparison`} onClick={() => onRemove?.(experience.experienceId)} type="button"><XMarkIcon /></button>
      </article>)}
      {selected.length === 1 ? <span className="cc-experience-choose-more">Choose one more</span> : null}
    </div>}
    {selected.length === 2 ? <Action type="button" onClick={onOpen}>Compare selected</Action> : null}
  </footer>;
}

function ExperienceCompareCard({ experience, locale, onDetail }: {
  readonly experience: DemoExperience;
  readonly locale: string;
  readonly onDetail?: () => void;
}) {
  const photo = experiencePhoto(experience);
  return <article>
    <PhotoBand name={experience.title} imageUrl={photo.url} glyph={<CompassIcon />} height={150}>
      <span className="cc-experience-photo-credit">{photo.credit}</span>
    </PhotoBand>
    <div className="cc-experience-compare-body">
      <h3>{experience.title}</h3>
      <dl className="cc-experience-compare-rows">
        <div><dt>Price</dt><dd>{formatMoney(experience, locale)} per adult</dd></div>
        <div><dt>Duration</dt><dd>{durationLabel(experience.durationMinutes)}</dd></div>
        <div><dt>Sample times</dt><dd>{slotLabel(experience)}</dd></div>
        <div><dt>Area</dt><dd>{experience.meetingArea}</dd></div>
        <div><dt>Accessibility</dt><dd>{experience.accessibility.summary}</dd></div>
        <div><dt>Cancellation</dt><dd>{experience.cancellationPolicy}</dd></div>
      </dl>
      <Action className="cc-experience-detail-action" type="button" variant="primary" aria-label={`View details for ${experience.title}`} onClick={onDetail}>View details</Action>
    </div>
  </article>;
}

export function ExperienceResultsView({ result, state, displayMode, locale = 'en-CA', journey, onJourneyChange, onAsk, onAdd, addState, addMessage, verifiedSelection, checkingSelection, onReview, onRefresh }: {
  readonly result?: DemoExperienceSearchOutput;
  readonly state?: ExperienceState;
  readonly displayMode: 'inline' | 'fullscreen' | 'pip';
  readonly locale?: string;
  readonly journey?: ExperienceJourneyState;
  readonly onJourneyChange?: (state: ExperienceJourneyState) => void;
  readonly onAsk?: (experience: DemoExperience) => void;
  readonly onAdd?: (experience: DemoExperience, slotId: string) => void;
  readonly addState?: ExperienceAddState;
  readonly addMessage?: string;
  readonly verifiedSelection?: DemoExperienceSelection;
  readonly checkingSelection?: boolean;
  readonly onReview?: () => void;
  readonly onRefresh?: () => void;
}) {
  if (state === 'loading') return <ExperienceSkeleton />;
  if (state === 'error') return <Frame className="cc-app cc-experiences" displayMode="auto" title="Experience ideas">
    <Feedback status="error">The fictional experience catalog could not load. No replacement inventory was generated; continue with flights and hotels or try again later.</Feedback>
  </Frame>;
  if (state === 'malformed' || !result) return <Frame className="cc-app cc-experiences" displayMode="auto" title="Experience ideas">
    <Feedback status="error">The experience result was incomplete and could not be shown safely. No experience facts were inferred.</Feedback>
  </Frame>;
  if (result.status === 'empty') return <Frame className="cc-app cc-experiences" displayMode="auto" title="Experience ideas" data-llm={result.fallback}>
    <section className="cc-experience-empty"><CompassIcon /><h2>{result.emptyReason === 'UNSUPPORTED_DESTINATION' ? `No demo catalog for ${result.searchContext.destination} yet` : 'No matching experience ideas'}</h2><p>{result.message}</p><p>Wayfare can continue helping with flights and hotels.</p></section>
    <p className="cc-experience-disclosure">{result.disclosure}</p>
  </Frame>;

  const current = restoreExperienceJourney(journey, result);
  const canCompare = result.experiences.length > 1;
  const ids = new Set(result.experiences.map((experience) => experience.experienceId));
  const change = (next: Partial<ExperienceJourneyState>) => onJourneyChange?.({ ...current, ...next });
  const selected = current.compareIds.map((id) => result.experiences.find((experience) => experience.experienceId === id)).filter((experience): experience is DemoExperience => Boolean(experience));

  if (current.screen === 'added' && verifiedSelection && current.selection?.selectionId === verifiedSelection.selectionId) {
    return <ExperienceAddedView selection={verifiedSelection} locale={locale} actionError={addMessage} onReview={onReview} onExplore={() => change({ screen: 'results' })} />;
  }
  if (current.screen === 'added' && checkingSelection) return <Frame className="cc-app cc-experiences" displayMode="auto"><Feedback status="loading">Checking your selected experience…</Feedback></Frame>;
  if (current.screen === 'detail' || current.screen === 'added') {
    const experience = result.experiences.find((candidate) => candidate.experienceId === current.detailId) ?? result.experiences.find((candidate) => current.selection && matchesExperienceChoice(current.selection, candidate, result.searchContext))!;
    return <ExperienceChooseView experience={experience} context={result.searchContext} choice={current.choice} locale={locale} status={addState} message={addMessage}
      onChoice={onJourneyChange ? (choice) => change({ choice }) : undefined}
      onBack={() => change({ screen: 'results', detailId: undefined, choice: undefined })}
      onAdd={onAdd ? (slotId) => onAdd(experience, slotId) : undefined}
      onAsk={onAsk ? () => onAsk(experience) : undefined} onRefresh={onRefresh} />;
  }

  if (current.screen === 'compare') {
    return <Frame className="cc-app cc-experiences" displayMode="auto" data-llm={result.fallback}>
      <header className="cc-experience-heading"><div><h2>Compare two ideas</h2><p>{selected[0]?.city} · fictional Wayfare catalog</p></div><span>WAYFARE DEMO</span></header>
      <button className="cc-experience-back" type="button" onClick={() => change({ screen: 'results' })}>← Back to results</button>
      <section className="cc-experience-compare-grid">{selected.map((experience) => <ExperienceCompareCard key={experience.experienceId} experience={experience} locale={locale} onDetail={() => change({ screen: 'detail', detailId: experience.experienceId })} />)}</section>
      <p className="cc-experience-disclosure">Comparison uses only the current fictional results. Nothing was selected, saved, or booked.</p>
    </Frame>;
  }

  return <Frame className="cc-app cc-experiences" displayMode="auto" data-llm={result.fallback}>
    <header className="cc-experience-heading"><div><h2>{result.experiences[0]?.city} experience ideas</h2><p>{result.experiences.length} fictional options · sample times for your stay</p></div><span>WAYFARE DEMO</span></header>
    <p className="cc-experience-disclosure">{result.disclosure}</p>
    <CardCarousel label={`${result.experiences[0]?.city} experience ideas`} itemName="experience">
      {result.experiences.map((experience) => <ExperienceCard key={experience.experienceId} experience={experience} selected={current.compareIds.includes(experience.experienceId)} locale={locale}
        onCompare={canCompare && onJourneyChange ? () => {
          const compareIds = current.compareIds.includes(experience.experienceId)
            ? current.compareIds.filter((id) => id !== experience.experienceId)
            : current.compareIds.length < 2 ? [...current.compareIds, experience.experienceId] : current.compareIds;
          change({ compareIds });
        } : undefined}
        onDetail={onJourneyChange ? () => change({ screen: 'detail', detailId: experience.experienceId }) : undefined} />)}
    </CardCarousel>
    {canCompare ? <CompareTray selected={selected} locale={locale} onRemove={onJourneyChange ? (id) => change({ compareIds: current.compareIds.filter((candidate) => candidate !== id) }) : undefined} onOpen={onJourneyChange ? () => change({ screen: 'compare' }) : undefined} /> : null}
  </Frame>;
}

export default function ExperienceResults() {
  const toolInfo = useToolInfo('search_experiences');
  return <ExperienceJourney toolInfo={toolInfo} />;
}

/** Shared controller for chat search results and direct in-widget discovery. */
export function ExperienceJourney({ toolInfo, onReview, onRefresh, tripReview, browsingPlan, onBusyChange }: {
  readonly toolInfo: { readonly structuredContent?: unknown; readonly isError?: boolean };
  readonly onReview?: () => void;
  readonly onRefresh?: () => void;
  readonly tripReview?: DemoTripReview;
  readonly browsingPlan?: TripExperienceSearchPlan;
  readonly onBusyChange?: (busy: boolean) => void;
}) {
  const ready = useWidgetReady();
  const layout = useLayout();
  const addTool = useCallTool('add_experience_to_trip');
  const reviewTool = useCallTool('review_trip');
  const sendFollowUp = useSendFollowUpMessage();
  const updateModelContext = useUpdateModelContext();
  const [savedJourney, setSavedJourney] = useViewState<ExperienceJourneyState | undefined>('experience_journey', undefined);
  const [verifiedSelection, setVerifiedSelection] = useState<DemoExperienceSelection>();
  const [addState, setAddState] = useState<ExperienceAddState>('idle');
  const [addMessage, setAddMessage] = useState<string>();
  const [checkingSelection, setCheckingSelection] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const inFlight = useRef<symbol | undefined>(undefined);
  const latestSearchId = useRef<string | undefined>(undefined);
  const lastRestoredId = useRef<string | undefined>(undefined);
  const pending = !ready || Object.keys(toolInfo).length === 0;
  const result = isDemoExperienceSearchOutput(toolInfo.structuredContent) ? toolInfo.structuredContent : undefined;
  const journey = result ? restoreExperienceJourney(savedJourney, result) : undefined;
  latestSearchId.current = result?.searchId;
  const compared = journey?.compareIds.join(',') ?? '';
  const savedId = journey?.selection?.selectionId;
  const currentSelection = verifiedSelection && result?.experiences.some((item) => matchesExperienceChoice(verifiedSelection, item, result.searchContext)) ? verifiedSelection : undefined;

  useEffect(() => { onBusyChange?.(addState === 'pending'); return () => onBusyChange?.(false); }, [addState, onBusyChange]);
  useEffect(() => {
    latestSearchId.current = result?.searchId;
    return () => { latestSearchId.current = undefined; inFlight.current = undefined; };
  }, [result?.searchId]);

  useEffect(() => {
    inFlight.current = undefined;
    setAddState('idle'); setAddMessage(undefined); setCheckingSelection(false);
    setShowReview(false);
  }, [result?.searchId]);

  useEffect(() => {
    if (!ready || !result || !journey?.selection || savedId === currentSelection?.selectionId || lastRestoredId.current === savedId) return;
    lastRestoredId.current = savedId;
    const searchId = result.searchId;
    setCheckingSelection(true);
    // Persisted widget state is presentation only. Re-read current server selections before restoring Added.
    void reviewTool.callToolAsync({}).then((response) => {
      if (latestSearchId.current !== searchId) return;
      const review = record(response.structuredContent);
      const selection = !response.isError && Array.isArray(review?.experiences)
        ? review.experiences.find((item) => isExperienceTripSelection(item) && item.selectionId === savedId)
        : undefined;
      if (isExperienceTripSelection(selection)) setVerifiedSelection(selection);
      else {
        setAddState('expired');
        setAddMessage('This saved choice could not be verified. Refresh the experience options before adding it again.');
      }
    }).catch(() => {
      if (latestSearchId.current === searchId) {
        setAddState('error');
        setAddMessage('Your saved choice could not be checked. Review your trip in the conversation to check its current status.');
      }
    }).finally(() => { if (latestSearchId.current === searchId) setCheckingSelection(false); });
  }, [ready, result?.searchId, savedId, currentSelection?.selectionId]);

  useEffect(() => {
    if (!currentSelection) return;
    const expire = () => {
      setVerifiedSelection(undefined);
      setAddState('expired');
      setAddMessage('These experience options have expired. Refresh them before adding a current choice.');
    };
    const remaining = Date.parse(currentSelection.expiresAt) - Date.now();
    if (remaining <= 0) { expire(); return; }
    const timer = setTimeout(expire, Math.min(remaining, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [currentSelection?.selectionId, currentSelection?.expiresAt]);

  useEffect(() => {
    if (showReview || !ready || !result || !layout.supports?.modelContext) return;
    const detail = result.experiences.find((experience) => experience.experienceId === journey?.detailId);
    const chosen = currentSelection ? {
      selectionId: currentSelection.selectionId, experienceId: currentSelection.experience.experienceId,
      title: currentSelection.experience.title, startLocal: currentSelection.slot.startLocal, timeZone: currentSelection.slot.timeZone,
      adults: currentSelection.searchContext.adults, totalPrice: currentSelection.totalPrice, status: 'selected',
    } : null;
    void updateModelContext({
      content: [{ type: 'text', text: chosen ? `Selected fictional experience: ${chosen.title} at ${chosen.startLocal}, ${chosen.timeZone}. Added to the plan; nothing reserved or paid.` : detail ? `Inspecting fictional experience: ${detail.title}. No new selection acknowledged.` : `${result.experiences.length} fictional experience ideas are available.` }],
      structuredContent: { experienceSearchId: result.searchId, experienceSearchContext: result.searchContext,
        ...(tripReview ? { tripPlanning: tripPlanningSnapshot(tripReview, currentSelection),
          experienceBrowsing: { dateBasis: browsingPlan?.dateBasis, note: browsingPlan?.note, proximity: 'Not measured; these are city-wide demo ideas.',
            experiences: result.experiences.map(item => ({ experienceId: item.experienceId, title: item.title, slots: item.slots.map(slot => ({ slotId: slot.slotId, startLocal: slot.startLocal, timeZone: slot.timeZone })) })) } } : {}),
        inspectedExperience: detail ? { experienceId: detail.experienceId, title: detail.title } : null, comparingExperienceIds: journey?.compareIds ?? [], selectedExperience: chosen, pendingSlotId: journey?.choice?.slotId ?? null },
    }).catch(() => { /* Server selections remain authoritative if optional context delivery fails. */ });
  }, [showReview, ready, result?.searchId, journey?.detailId, journey?.choice?.slotId, compared, currentSelection?.selectionId, layout.supports?.modelContext, updateModelContext]);

  const followUp = ready && layout.supports?.followUpMessage
    ? (prompt: string) => { void sendFollowUp({ prompt }).catch(() => { setAddMessage('The follow-up could not be sent. Continue in the conversation.'); }); }
    : undefined;
  if (showReview) return <InlineTripReview onBack={() => setShowReview(false)} backLabel="Back to experience" />;
  return <ExperienceResultsView result={result} state={pending ? 'loading' : toolInfo.isError ? 'error' : result ? undefined : 'malformed'} displayMode={layout.displayMode} locale={layout.locale ?? 'en-CA'} journey={journey}
    verifiedSelection={currentSelection} checkingSelection={checkingSelection || Boolean(journey?.screen === 'added' && !currentSelection && !addMessage)}
    addState={addState} addMessage={addMessage}
    onJourneyChange={ready ? (next) => { if (!inFlight.current) { setSavedJourney(next); setAddState('idle'); setAddMessage(undefined); } } : undefined}
    onAsk={followUp ? (experience) => followUp(`Tell me more about the fictional Wayfare experience “${experience.title}”, especially its pace, accessibility, timing, and cancellation terms. Do not imply live availability or booking.`) : undefined}
    onReview={ready ? onReview ?? (() => setShowReview(true)) : undefined}
    onRefresh={ready && onRefresh ? onRefresh : followUp && result ? () => followUp(`Refresh the fictional experience options for ${result.searchContext.destination}, ${result.searchContext.startDate} to ${result.searchContext.endDate}, for ${result.searchContext.adults} adults and ${result.searchContext.children} children in ${result.searchContext.currency}.`) : undefined}
    onAdd={ready && result && journey ? (experience, slotId) => {
      if (inFlight.current || !experience.slots.some((slot) => slot.slotId === slotId) || result.searchContext.children > 0) return;
      const searchId = result.searchId;
      const request = Symbol('add-experience');
      inFlight.current = request;
      setAddState('pending'); setAddMessage(undefined);
      void addTool.callToolAsync({ experienceId: experience.experienceId, slotId }).then((response) => {
        if (latestSearchId.current !== searchId) return;
        const selection = acknowledgedExperienceSelection(response, experience.experienceId, slotId, { experience, context: result.searchContext });
        if (selection && Date.parse(selection.expiresAt) > Date.now()) {
          lastRestoredId.current = selection.selectionId;
          setVerifiedSelection(selection);
          setSavedJourney({ ...journey, screen: 'added', detailId: experience.experienceId, selection });
          setAddState('idle');
        } else {
          const output = record(response.structuredContent);
          setAddState(output?.status === 'expired' ? 'expired' : 'error');
          setAddMessage(text(output?.message, 2, 500) ? output.message : 'The experience was not added. Your previous selections are unchanged. Try again.');
        }
      }).catch(() => {
        if (latestSearchId.current === searchId) {
          setAddState('error'); setAddMessage('The experience could not be added. Try again or review your trip to check whether it was saved.');
        }
      }).finally(() => { if (inFlight.current === request) inFlight.current = undefined; });
    } : undefined} />;
}
