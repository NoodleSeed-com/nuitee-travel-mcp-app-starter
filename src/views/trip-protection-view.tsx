import '@fontsource-variable/host-grotesk';
import { useId } from 'react';
import { InformationCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import type { DemoInsuranceComparisonOutput, DemoInsurancePlan } from '../demo-schemas.js';
import { Action } from '../helpers.js';
import { CardCarousel } from './card-carousel.js';
import { ArrowLeftIcon, CheckIcon } from './icons.js';
import { isDemoInsuranceComparisonOutput } from './insurance-results.js';
import './travel.css';
import './trip-protection-view.css';

type TripProtectionProps = {
  readonly data?: DemoInsuranceComparisonOutput;
  readonly destination: string;
  readonly contextLabel?: string;
  readonly locale?: string;
  readonly state?: 'loading' | 'error' | 'unavailable';
  readonly message?: string;
  readonly note?: string;
  readonly onBack: () => void;
  readonly onRetry?: () => void;
  readonly onSelect?: (comparisonId: string, planId: string) => void;
  readonly pending?: boolean;
  readonly actionError?: string;
  readonly selectedPlanId?: string;
};

const displayedCoverages = [
  { name: 'Emergency medical', label: 'Medical example limit' },
  { name: 'Trip cancellation', label: 'Cancellation example limit' },
  { name: 'Baggage', label: 'Baggage example limit' },
] as const;

function formatMoney(money: DemoInsurancePlan['illustrativePrice'], locale: string, price = false) {
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency: money.currency,
    minimumFractionDigits: price ? 2 : 0, maximumFractionDigits: 2,
  }).format(money.amount);
}

/** The parent owns saving and acknowledgement; this view never makes a local selection. */
export function TripProtectionView({ data, destination, contextLabel, locale = 'en-CA', state, message, note, onBack, onRetry, onSelect, pending = false, actionError, selectedPlanId }: TripProtectionProps) {
  const headingId = useId();
  const result = !state && isDemoInsuranceComparisonOutput(data) ? data : undefined;
  const failed = state !== 'loading' && state !== 'unavailable' && !result;
  // Older comparison-only responses have no planning capability and remain read-only.
  const planning = (result as (DemoInsuranceComparisonOutput & {
    planning?: { canSelect?: unknown; message?: unknown };
  }) | undefined)?.planning;
  const canSelect = planning?.canSelect === true && Boolean(onSelect);
  const planningMessage = typeof planning?.message === 'string' && planning.message.length <= 320 ? planning.message : undefined;
  const party = result ? `${result.searchContext.adults} adult${result.searchContext.adults === 1 ? '' : 's'}${result.searchContext.children ? ` · ${result.searchContext.children} ${result.searchContext.children === 1 ? 'child' : 'children'}` : ''}` : undefined;

  return <section className="cc-app wf-trip-protection" aria-labelledby={headingId} aria-busy={state === 'loading' || pending || undefined} data-llm={result?.fallback}>
    <div className="wf-trip-protection-back">
      <Action type="button" variant="quiet" onClick={onBack} disabled={pending}><ArrowLeftIcon />Back to your trip</Action>
    </div>
    <header className="wf-trip-protection-header">
      <div>
        <h2 id={headingId} tabIndex={-1}>{destination.trim() ? `Travel protection for ${destination}` : 'Travel protection for your trip'}</h2>
        {contextLabel ? <p>{contextLabel}</p> : null}
      </div>
      <span className="wf-trip-protection-badge">Example data</span>
    </header>
    <div className="wf-trip-protection-content">
      {state === 'loading' ? <div className="wf-trip-protection-loading" role="status">
        <p>Loading protection concepts…</p>
        <div className="wf-trip-protection-skeleton" aria-hidden="true"><span /><span /><span /></div>
      </div> : failed || state === 'unavailable' ? <div className="wf-trip-protection-feedback" role={failed ? 'alert' : 'status'}>
        <h3>{failed ? 'Protection concepts could not load' : 'Protection concepts are unavailable for this trip'}</h3>
        <p>{message ?? (failed
          ? 'Return to your trip or try loading the comparison again.'
          : 'Continue planning in the conversation to explore a supported protection comparison.')}</p>
        {note ? <p>{note}</p> : null}
        {failed && onRetry ? <Action type="button" variant="secondary" className="wf-trip-protection-secondary" onClick={onRetry}>Try again</Action> : null}
      </div> : result ? <>
        <section className="wf-trip-protection-intro">
          <div className="wf-trip-protection-glyph"><ShieldCheckIcon aria-hidden="true" /></div>
          <div>
            <h3>Compare protection concepts</h3>
            <p>Optional examples for {party} · {result.searchContext.departureDate}–{result.searchContext.returnDate}. No insurer or eligibility check has been made.</p>
            {message ? <p>{message}</p> : null}
          </div>
        </section>
        <p className="wf-trip-protection-context"><InformationCircleIcon aria-hidden="true" />
          <span>This comparison uses {result.searchContext.residenceCountry === 'CA' ? 'an example Canadian residence' : `an example residence in ${result.searchContext.residenceCountry}`}. A real quote would need confirmed traveler details and policy terms.</span>
        </p>
        {note ? <p className="wf-trip-protection-note">{note}</p> : null}
        {!canSelect ? <p className="wf-trip-protection-note">{planningMessage || 'Comparison only. Return to your trip to check whether a concept can be added to the demo plan.'}</p> : null}
        <CardCarousel label="Protection concepts" itemName="protection concept" className="wf-trip-protection-options">
          {result.plans.map(plan => {
            const selected = selectedPlanId === plan.planId;
            return <article className="wf-trip-protection-card" key={plan.planId}>
              <h3>{plan.name}</h3>
              <p>{plan.summary}</p>
              <div className="wf-trip-protection-price">
                <strong>{formatMoney(plan.illustrativePrice, locale, true)}</strong>
                <span>Fictional trip price · {party}</span>
              </div>
              <dl>
                {displayedCoverages.map(({ name, label }) => {
                  const coverage = plan.coverages.find(item => item.name === name);
                  return <div key={name}>
                    <dt>{label}</dt>
                    <dd>{coverage ? <>{formatMoney(coverage.limit, locale)}<small>{coverage.basis === 'per_traveler' ? 'per traveler' : 'per trip'}</small></> : 'Not provided'}</dd>
                  </div>;
                })}
                <div><dt>Example deductible</dt><dd>{formatMoney(plan.deductible, locale)}</dd></div>
              </dl>
              <p className="wf-trip-protection-exclusions">Actual exclusions, covered reasons and pre-existing-condition terms remain unknown.</p>
              <Action type="button" variant="primary" className="wf-trip-protection-add" disabled={!canSelect || pending || selected} aria-pressed={selected} aria-label={`Add ${plan.name} to plan`}
                onClick={() => { if (canSelect && !pending && !selected) onSelect?.(result.comparisonId, plan.planId); }}>
                {pending ? 'Saving…' : selected ? <><CheckIcon />Selected in demo plan</> : 'Add to plan (demo)'}
              </Action>
            </article>;
          })}
        </CardCarousel>
      </> : null}
      {actionError ? <><p className="wf-trip-protection-action-error" role="alert"><InformationCircleIcon aria-hidden="true" />{actionError}</p>{onRetry ? <Action type="button" className="wf-trip-protection-secondary" onClick={onRetry} disabled={pending}>Reload comparison</Action> : null}</> : null}
      <footer className="wf-trip-protection-footer">
        <p>Illustrative concepts, not insurance advice or a quote. No policy was purchased and no coverage is in force. You are not insured.</p>
        <Action type="button" variant="secondary" className="wf-trip-protection-secondary" onClick={onBack} disabled={pending}>Back without changing protection</Action>
      </footer>
    </div>
  </section>;
}
