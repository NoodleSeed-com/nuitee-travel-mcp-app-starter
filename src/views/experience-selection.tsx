import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, ClockIcon, MapPinIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef } from 'react';
import type { DemoExperience, DemoExperienceSearchInput, DemoExperienceSelection } from '../demo-schemas.js';
import { durationLabel, experienceDateLabel, experienceDayLabel, experiencePhoto, formatExperienceMoney } from './experience-selection-data.js';
import './experience-selection.css';

export interface ExperienceSelectionState {
  readonly experienceId: string;
  readonly date?: string;
  readonly slotId?: string;
}
export type ExperienceAddState = 'idle' | 'pending' | 'error' | 'expired';

export function ExperiencePhoto({ experience }: { readonly experience: DemoExperience }) {
  const photo = experiencePhoto(experience);
  return <div className="wf-trip-photo"><img src={photo.url} alt={`${experience.city} destination photograph`} onError={(event) => { event.currentTarget.hidden = true; }} /><span className="wf-trip-credit">{photo.credit}</span></div>;
}

export function ExperienceChooseView({ experience, context, choice, locale = 'en-CA', status = 'idle', message, onChoice, onAdd, onBack, onAsk, onRefresh }: {
  readonly experience: DemoExperience;
  readonly context: DemoExperienceSearchInput;
  readonly choice?: ExperienceSelectionState;
  readonly locale?: string;
  readonly status?: ExperienceAddState;
  readonly message?: string;
  readonly onChoice?: (value: ExperienceSelectionState) => void;
  readonly onAdd?: (slotId: string) => void;
  readonly onBack?: () => void;
  readonly onAsk?: () => void;
  readonly onRefresh?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [experience.experienceId]);
  const selected = choice?.experienceId === experience.experienceId ? choice : undefined;
  const dates = [...new Set(experience.slots.map((slot) => slot.startLocal.slice(0, 10)))];
  const date = selected?.date && dates.includes(selected.date) ? selected.date : undefined;
  const slots = date ? experience.slots.filter((slot) => slot.startLocal.startsWith(date)) : [];
  const slot = slots.find((candidate) => candidate.slotId === selected?.slotId);
  const timeOptions = slots.length ? slots : [...new Map(experience.slots.map((item) => [item.startLocal.slice(11, 16), item])).values()];
  const price = formatExperienceMoney(experience.price.amountMinor, experience.price.currency, locale, true);
  const subtotal = context.children ? undefined : formatExperienceMoney(experience.price.amountMinor * context.adults, experience.price.currency, locale, true);
  const busy = status === 'pending';
  const adults = `${context.adults} adult${context.adults === 1 ? '' : 's'}`;
  const party = `${adults}${context.children ? ` · ${context.children} ${context.children === 1 ? 'child' : 'children'}` : ''}`;
  const addLabel = busy ? 'Adding to your trip…' : status === 'expired' ? 'Refresh experience' : !date ? 'Choose a day to continue' : !slot ? 'Choose a time to continue' : 'Add to my trip';
  return <section className="cc-app wf-trip-widget" aria-label="Choose an experience for your trip">
    <div className="wf-trip-back-row"><button className="wf-trip-text-button" type="button" onClick={onBack} disabled={busy}><ArrowLeftIcon className="wf-trip-icon" aria-hidden="true" />Back to experiences</button><span className="wf-trip-badge">Wayfare demo</span></div>
    <ExperiencePhoto experience={experience} />
    <div className="wf-trip-detail">
      <div className="wf-trip-detail-top"><div><h2 ref={heading} tabIndex={-1}>{experience.title}</h2><div className="wf-trip-meta"><span><ClockIcon className="wf-trip-icon" aria-hidden="true" />{durationLabel(experience.durationMinutes)}</span><span><MapPinIcon className="wf-trip-icon" aria-hidden="true" />{experience.meetingArea}</span></div></div><div className="wf-trip-price"><strong>{price}</strong><span>{experience.price.currency} · per adult</span></div></div>
      <p className="wf-trip-description">{experience.shortDescription}</p>
      <div className="wf-trip-selection">
        <p className="wf-trip-selection-label">Choose a day</p>
        <div className="wf-trip-date-options" role="group" aria-label="Experience date">{dates.map((day) => <button className="wf-trip-date-option" type="button" key={day} aria-pressed={date === day} disabled={busy || !onChoice} onClick={() => {
          const daySlots = experience.slots.filter((candidate) => candidate.startLocal.startsWith(day));
          onChoice?.({ experienceId: experience.experienceId, date: day, ...(daySlots.length === 1 ? { slotId: daySlots[0]!.slotId } : {}) });
        }}><span>{experienceDayLabel(day, locale)}</span><strong>{experienceDateLabel(day, locale)}</strong></button>)}</div>
        <div className="wf-trip-time-row"><div><p className="wf-trip-selection-label">{timeOptions.length === 1 ? 'Start time' : 'Choose a time'}</p><small className="wf-trip-muted">Local time in {experience.city}</small></div><div className="wf-trip-time-options" role="group" aria-label="Experience start time">{timeOptions.map((item) => <button type="button" key={item.slotId} aria-pressed={slot?.slotId === item.slotId} disabled={!date || busy || !onChoice} onClick={() => onChoice?.({ experienceId: experience.experienceId, date, slotId: item.slotId })}>{item.startLocal.slice(11, 16)}</button>)}</div></div>
        <div className="wf-trip-party"><div><UserGroupIcon className="wf-trip-icon" aria-hidden="true" /><strong>{party}</strong></div><small>Using your trip’s traveler details</small></div>
      </div>
      <details className="wf-trip-details-disclosure"><summary>What’s included, access &amp; cancellation <ChevronDownIcon className="wf-trip-icon" aria-hidden="true" /></summary><p>{experience.inclusions.join(' · ')}</p><p>{experience.accessibility.summary}</p>{experience.restrictions.map((item) => <p key={item}>{item}</p>)}<p>{experience.cancellationPolicy}</p><p>Fictional operator: {experience.operatorLabel}</p></details>
      <div className="wf-trip-action-area">
        {message ? <p className="wf-trip-error-note" role="alert">{message}</p> : null}
        {context.children > 0 ? <p className="wf-trip-note">Child pricing is unknown for this demo experience. Ask about the experience before adding this party to your trip.</p> : null}
        <div className="wf-trip-selection-total"><div><p>{price} per adult × {context.adults}</p><p>Fictional experience price · {experience.price.currency}</p></div><strong>{subtotal ?? 'Total unknown'}</strong></div>
        <button className="wf-trip-primary" type="button" aria-busy={busy} disabled={busy || (status === 'expired' ? !onRefresh : !onAdd || !slot || !subtotal)} onClick={() => status === 'expired' ? onRefresh?.() : slot && onAdd?.(slot.slotId)}>{addLabel}</button>
        <p className="wf-trip-fine-print">Adds a planning choice for this conversation. No reservation or payment.</p>
        <div className="wf-trip-secondary-row"><button className="wf-trip-text-button" type="button" onClick={onAsk} disabled={!onAsk || busy}>Ask about this experience</button></div>
      </div>
    </div>
  </section>;
}

export function ExperienceAddedView({ selection, locale = 'en-CA', onReview, onExplore, actionError }: {
  readonly selection: DemoExperienceSelection;
  readonly locale?: string;
  readonly onReview?: () => void;
  readonly onExplore?: () => void;
  readonly actionError?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [selection.selectionId]);
  const { experience, slot, searchContext } = selection;
  const photo = experiencePhoto(experience);
  const date = slot.startLocal.slice(0, 10);
  const adults = `${searchContext.adults} adult${searchContext.adults === 1 ? '' : 's'}`;
  return <section className="cc-app wf-trip-widget" aria-label="Selected experience">
    <header className="wf-trip-widget-header"><div><h2 ref={heading} tabIndex={-1}>Part of your {experience.city} plan</h2><p>Selected for this conversation</p></div><span className="wf-trip-badge">Wayfare demo</span></header>
    <div className="wf-trip-added-content">
      <div className="wf-trip-primary wf-trip-selected" role="status"><CheckIcon className="wf-trip-icon" aria-hidden="true" />Added to your trip</div>
      <div className="wf-trip-summary-card"><img className="wf-trip-thumbnail" src={photo.url} alt="" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} /><div><small>Fictional experience</small><h3>{experience.title}</h3><p>{experienceDayLabel(date, locale)}, {experienceDateLabel(date, locale)} · {slot.startLocal.slice(11, 16)} · {experience.city} time</p><p>{adults} · {durationLabel(experience.durationMinutes)}</p></div></div>
      <div className="wf-trip-added-price"><span>Fictional price · {adults}</span><strong>{formatExperienceMoney(selection.totalPrice.amountMinor, selection.totalPrice.currency, locale, true)} {selection.totalPrice.currency}</strong></div>
      <div className="wf-trip-note">{experience.cancellationPolicy} No live availability has been checked.</div>
      <div className="wf-trip-action-area">{actionError ? <p className="wf-trip-error-note" role="alert">{actionError}</p> : null}<button className="wf-trip-primary" type="button" data-trip-review-trigger onClick={onReview} disabled={!onReview}>Review my trip</button><div className="wf-trip-secondary-row"><button className="wf-trip-text-button" type="button" onClick={onExplore} disabled={!onExplore}>Explore more experiences</button></div></div>
    </div>
  </section>;
}
