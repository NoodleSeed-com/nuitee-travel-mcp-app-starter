import '@fontsource-variable/host-grotesk';
import '@noodleseed/one/react/styles.css';
import { useEffect } from 'react';
import type { DemoExperience, DemoExperienceSearchOutput } from '../demo-schemas.js';
import {
  Action,
  Feedback,
  Frame,
  StatusBadge,
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
import './travel.css';
import './experience-results.css';

export interface ExperienceJourneyState {
  readonly searchId: string;
  readonly screen: 'results' | 'detail' | 'compare';
  readonly detailId?: string;
  readonly compareIds: readonly string[];
}

type ExperienceState = 'loading' | 'error' | 'malformed';

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
const text = (value: unknown, minimum: number, maximum: number): value is string =>
  typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum;
const integer = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;
const currencies = new Set(['CAD', 'USD', 'EUR', 'GBP', 'JPY']);
const categories = new Set(['FOOD', 'CULTURE', 'WATER', 'DESIGN', 'FAMILY', 'EVENING', 'CRAFT', 'TEA']);

interface ExperiencePhoto {
  readonly url: string;
  readonly credit: string;
}

const EXPERIENCE_PHOTOS: Readonly<Record<string, ExperiencePhoto>> = {
  'Alfama Tastes & Tiles Walk': {
    url: 'https://images.unsplash.com/photo-1651237170873-0445e48bf802?auto=format&fit=crop&w=900&q=82',
    credit: 'Photo: Colin + Meg · Unsplash',
  },
  'Tagus Sunset Sailing Circle': {
    url: 'https://images.unsplash.com/photo-1681204620631-3c4c8d29b882?auto=format&fit=crop&w=900&q=82',
    credit: 'Photo: Abigail Prowse · Unsplash',
  },
  'Belém Makers Morning': {
    url: 'https://images.unsplash.com/photo-1585334954347-e50fe83cc6ce?auto=format&fit=crop&w=900&q=82',
    credit: 'Photo: gemmmm · Unsplash',
  },
  'Yanaka Food & Craft Walk': {
    url: 'https://images.unsplash.com/photo-1590582917892-a6e11d1b32bc?auto=format&fit=crop&w=900&q=82',
    credit: 'Photo: Michael Wu · Unsplash',
  },
  'Sumida Evening Waterways': {
    url: 'https://images.unsplash.com/photo-1692080355318-2ed92347877d?auto=format&fit=crop&w=900&q=82',
    credit: 'Photo: Taro Ohtani · Unsplash',
  },
  'Quiet Tea & Design Studio': {
    url: 'https://images.unsplash.com/photo-1545830017-e4c7878841d0?auto=format&fit=crop&w=900&q=82',
    credit: 'Photo: Emile Guillemot · Unsplash',
  },
};

const EXPERIENCE_CITY_FALLBACK_PHOTOS: Readonly<Record<DemoExperience['city'], ExperiencePhoto>> = {
  Lisbon: EXPERIENCE_PHOTOS['Alfama Tastes & Tiles Walk']!,
  Tokyo: EXPERIENCE_PHOTOS['Quiet Tea & Design Studio']!,
};

function experiencePhoto(experience: DemoExperience) {
  return EXPERIENCE_PHOTOS[experience.title] ?? EXPERIENCE_CITY_FALLBACK_PHOTOS[experience.city];
}

function isExperience(value: unknown): value is DemoExperience {
  const experience = record(value);
  const accessibility = record(experience?.accessibility);
  const price = record(experience?.price);
  if (!experience || !accessibility || !price ||
    typeof experience.experienceId !== 'string' || !/^exp_[a-f0-9]{32}$/.test(experience.experienceId) ||
    experience.dataSource !== 'illustrative' || experience.source !== 'WAYFARE_DEMO' || experience.isFictional !== true ||
    !['Lisbon', 'Tokyo'].includes(String(experience.city)) || !['PT', 'JP'].includes(String(experience.countryCode)) ||
    !['Europe/Lisbon', 'Asia/Tokyo'].includes(String(experience.timeZone)) ||
    !text(experience.title, 2, 100) || !text(experience.operatorLabel, 2, 80) ||
    !text(experience.shortDescription, 20, 240) || !integer(experience.durationMinutes, 30, 720) ||
    !text(experience.meetingArea, 2, 100) || typeof accessibility.stepFree !== 'boolean' ||
    !text(accessibility.summary, 2, 160) || !text(experience.cancellationPolicy, 2, 180) ||
    !integer(price.amountMinor, 0, 100_000_000) || !currencies.has(String(price.currency)) ||
    !Array.isArray(experience.categories) || experience.categories.length < 1 || experience.categories.length > 4 ||
    !experience.categories.every((category) => categories.has(String(category))) ||
    !Array.isArray(experience.inclusions) || experience.inclusions.length < 1 || experience.inclusions.length > 5 ||
    !experience.inclusions.every((entry) => text(entry, 2, 100)) ||
    !Array.isArray(experience.restrictions) || experience.restrictions.length > 3 ||
    !experience.restrictions.every((entry) => text(entry, 2, 160)) ||
    !Array.isArray(experience.slots) || experience.slots.length < 1 || experience.slots.length > 4) return false;
  return experience.slots.every((candidate) => {
    const slot = record(candidate);
    return slot && typeof slot.slotId === 'string' && /^slot_[a-f0-9]{32}$/.test(slot.slotId) &&
      typeof slot.startLocal === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(slot.startLocal) &&
      slot.timeZone === experience.timeZone && integer(slot.remainingCapacity, 1, 20) && slot.isFictional === true;
  });
}

export function isDemoExperienceSearchOutput(value: unknown): value is DemoExperienceSearchOutput {
  const result = record(value);
  if (!result || !['success', 'empty'].includes(String(result.status)) || result.dataSource !== 'illustrative' ||
    result.source !== 'WAYFARE_DEMO' || result.isFictional !== true || !text(result.disclosure, 20, 320) ||
    !text(result.message, 2, 320) || !text(result.fallback, 20, 700) ||
    typeof result.searchId !== 'string' || !/^exsearch_[a-f0-9]{32}$/.test(result.searchId) ||
    typeof result.supportedDestination !== 'boolean' || !record(result.searchContext) ||
    !Array.isArray(result.experiences) || result.experiences.length > 6 || !result.experiences.every(isExperience)) return false;
  const success = result.status === 'success';
  if (success !== (result.experiences.length > 0)) return false;
  if (success) return result.emptyReason === undefined && result.supportedDestination === true;
  return ['UNSUPPORTED_DESTINATION', 'NO_MATCHING_EXPERIENCES'].includes(String(result.emptyReason)) &&
    (result.supportedDestination ? result.emptyReason === 'NO_MATCHING_EXPERIENCES' : result.emptyReason === 'UNSUPPORTED_DESTINATION');
}

function initialJourney(searchId: string): ExperienceJourneyState {
  return { searchId, screen: 'results', compareIds: [] };
}

export function restoreExperienceJourney(value: unknown, result: DemoExperienceSearchOutput): ExperienceJourneyState {
  const saved = record(value);
  const ids = new Set(result.experiences.map((experience) => experience.experienceId));
  if (!saved || saved.searchId !== result.searchId || !['results', 'detail', 'compare'].includes(String(saved.screen)) ||
    !Array.isArray(saved.compareIds)) return initialJourney(result.searchId);
  const compareIds = [...new Set(saved.compareIds.filter((id): id is string => typeof id === 'string' && ids.has(id)))].slice(0, 2);
  const detailId = typeof saved.detailId === 'string' && ids.has(saved.detailId) ? saved.detailId : undefined;
  const requestedScreen = saved.screen as ExperienceJourneyState['screen'];
  const screen = requestedScreen === 'detail' && !detailId
    ? 'results'
    : requestedScreen === 'compare' && compareIds.length !== 2
      ? 'results'
      : requestedScreen;
  return { searchId: result.searchId, screen, ...(detailId ? { detailId } : {}), compareIds };
}

function durationLabel(minutes: number) {
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`;
  return `${Math.floor(minutes / 60)}.5 hours`;
}

function formatMoney(experience: DemoExperience, locale: string) {
  const divisor = experience.price.currency === 'JPY' ? 1 : 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency: experience.price.currency,
      maximumFractionDigits: experience.price.currency === 'JPY' ? 0 : 2,
    }).format(experience.price.amountMinor / divisor);
  } catch {
    return `${experience.price.currency} ${experience.price.amountMinor / divisor}`;
  }
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

export function ExperienceResultsView({ result, state, displayMode, locale = 'en-CA', journey, onJourneyChange, onAsk }: {
  readonly result?: DemoExperienceSearchOutput;
  readonly state?: ExperienceState;
  readonly displayMode: 'inline' | 'fullscreen' | 'pip';
  readonly locale?: string;
  readonly journey?: ExperienceJourneyState;
  readonly onJourneyChange?: (state: ExperienceJourneyState) => void;
  readonly onAsk?: (experience: DemoExperience) => void;
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

  if (current.screen === 'detail') {
    const experience = result.experiences.find((candidate) => candidate.experienceId === current.detailId)!;
    const photo = experiencePhoto(experience);
    return <Frame className="cc-app cc-experiences" displayMode="auto" data-llm={result.fallback}>
      <header className="cc-experience-heading"><div><h2>Experience details</h2><p>Fictional Wayfare catalog</p></div><span>WAYFARE DEMO</span></header>
      <button className="cc-experience-back" type="button" onClick={() => change({ screen: 'results', detailId: undefined })}>← Back to results</button>
      <PhotoBand name={experience.title} imageUrl={photo.url} glyph={<CompassIcon />} height={220}><StatusBadge tone="info">{experience.categories.map((category) => category.toLowerCase()).join(' · ')}</StatusBadge><span className="cc-experience-photo-credit">{photo.credit}</span></PhotoBand>
      <div className="cc-experience-detail-grid"><section><h3>{experience.title}</h3><p>{experience.shortDescription}</p><p className="cc-experience-operator">Fictional operator: {experience.operatorLabel}</p><h4>Included</h4><ul>{experience.inclusions.map((item) => <li key={item}>{item}</li>)}</ul><h4>Important to know</h4><ul>{experience.restrictions.map((item) => <li key={item}>{item}</li>)}</ul></section><aside>
        <dl className="cc-experience-facts"><div><dt>Duration</dt><dd>{durationLabel(experience.durationMinutes)}</dd></div><div><dt>Area</dt><dd>{experience.meetingArea}</dd></div><div><dt>Sample times</dt><dd>{slotLabel(experience)}</dd></div><div><dt>Access</dt><dd>{experience.accessibility.summary}</dd></div><div><dt>Policy</dt><dd>{experience.cancellationPolicy}</dd></div></dl>
        <p className="cc-experience-price"><strong>{formatMoney(experience, locale)}</strong><span> fictional · per adult</span></p>
        <Action className="cc-experience-ask" type="button" variant="primary" onClick={() => onAsk?.(experience)}>Ask about this experience</Action>
      </aside></div>
      <p className="cc-experience-disclosure">This preview cannot save or book an experience. {result.disclosure}</p>
    </Frame>;
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
  const ready = useWidgetReady();
  const layout = useLayout();
  const toolInfo = useToolInfo('search_experiences');
  const sendFollowUp = useSendFollowUpMessage();
  const updateModelContext = useUpdateModelContext();
  const [savedJourney, setSavedJourney] = useViewState<ExperienceJourneyState | undefined>('experience_journey', undefined);
  const pending = !ready || Object.keys(toolInfo).length === 0;
  const result = isDemoExperienceSearchOutput(toolInfo.structuredContent) ? toolInfo.structuredContent : undefined;
  const journey = result ? restoreExperienceJourney(savedJourney, result) : undefined;
  const compared = journey?.compareIds.join(',') ?? '';

  useEffect(() => {
    if (!ready || !result || !layout.supports?.modelContext) return;
    const detail = result.experiences.find((experience) => experience.experienceId === journey?.detailId);
    void updateModelContext({
      content: [{ type: 'text', text: detail ? `Inspecting fictional experience: ${detail.title}. Nothing saved or booked.` : `${result.experiences.length} fictional experience ideas are available; nothing selected or booked.` }],
      structuredContent: { experienceSearchId: result.searchId, inspectedExperience: detail ? { experienceId: detail.experienceId, title: detail.title } : null, comparingExperienceIds: journey?.compareIds ?? [] },
    }).catch(() => { /* Model-context delivery is optional. */ });
  }, [ready, result?.searchId, journey?.detailId, compared, layout.supports?.modelContext, updateModelContext]);

  return <ExperienceResultsView result={result} state={pending ? 'loading' : toolInfo.isError ? 'error' : result ? undefined : 'malformed'} displayMode={layout.displayMode} locale={layout.locale ?? 'en-CA'} journey={journey} onJourneyChange={setSavedJourney}
    onAsk={ready && layout.supports?.followUpMessage ? (experience) => { void sendFollowUp({ prompt: `Tell me more about the fictional Wayfare experience “${experience.title}”, especially its pace, accessibility, timing, and cancellation terms. Do not imply live availability or booking.` }); } : undefined} />;
}
