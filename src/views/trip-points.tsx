import '@fontsource-variable/host-grotesk';
import { useId, useState } from 'react';
import { InformationCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { DemoRewardFlightSearchOutput } from '../demo-schemas.js';
import { Action } from '../helpers.js';
import { CardCarousel } from './card-carousel.js';
import { ArrowLeftIcon, CheckIcon } from './icons.js';
import { isDemoRewardFlightSearchOutput } from './reward-flight-results.js';
import './travel.css';
import './trip-points.css';

type TripPointsProps = {
  readonly data?: DemoRewardFlightSearchOutput;
  readonly destination: string;
  readonly contextLabel?: string;
  readonly locale?: string;
  readonly state?: 'loading' | 'error' | 'unavailable';
  readonly message?: string;
  readonly onBack: () => void;
  readonly onRetry?: () => void;
};

/** A local example view. Choosing an example never selects a flight or changes a trip. */
export function TripPointsView({ data, destination, contextLabel, locale = 'en-CA', state, message, onBack, onRetry }: TripPointsProps) {
  const headingId = useId();
  const budgetId = useId();
  const [viewed, setViewed] = useState<{ searchId: string; optionId: string }>();
  const result = !state && isDemoRewardFlightSearchOutput(data) ? data : undefined;
  const active = result?.options.find(option => viewed?.searchId === result.searchId && option.optionId === viewed.optionId)
    ?? result?.options[0];
  const points = new Intl.NumberFormat(locale);
  const title = destination.trim() ? `Points for your ${destination} trip` : 'Points for your trip';
  const failed = state !== 'loading' && state !== 'unavailable' && !result;

  return <section className="cc-app wf-trip-points" aria-labelledby={headingId} aria-busy={state === 'loading' || undefined} data-llm={result?.fallback}>
    <div className="wf-trip-points-back">
      <Action type="button" variant="quiet" onClick={onBack}><ArrowLeftIcon />Back to your trip</Action>
    </div>
    <header className="wf-trip-points-header">
      <div>
        <h2 id={headingId} tabIndex={-1}>{title}</h2>
        {contextLabel ? <p className="wf-trip-points-context">{contextLabel}</p> : null}
      </div>
      <span className="wf-trip-points-badge">Example data</span>
    </header>
    <div className="wf-trip-points-content">
      {state === 'loading' ? <div className="wf-trip-points-loading" role="status">
        <p>Loading points examples…</p>
        <div className="wf-trip-points-skeleton" aria-hidden="true">
          <span className="wf-trip-points-skeleton-balance" />
          <div><span /><span /></div>
          <span className="wf-trip-points-skeleton-budget" />
        </div>
      </div> : failed || state === 'unavailable' ? <div className="wf-trip-points-feedback" role={failed ? 'alert' : 'status'}>
        <h3>{failed ? 'Points examples could not load' : 'Points examples are unavailable for this trip'}</h3>
        <p>{message ?? (failed
          ? 'Return to your trip or try loading the comparison again.'
          : 'Continue planning your trip in the conversation to explore a supported rewards example.')}</p>
        {failed && onRetry ? <Action type="button" variant="secondary" className="wf-trip-points-secondary" onClick={onRetry}>Try again</Action> : null}
      </div> : result ? <>
        <section className="wf-trip-points-intro">
          <div className="wf-trip-points-glyph"><SparklesIcon aria-hidden="true" /></div>
          <div>
            <h3>What could {points.format(result.pointsContext.available)} points look like?</h3>
            <p>A sample comparison for {result.searchContext.adults} adult{result.searchContext.adults === 1 ? '' : 's'}{destination.trim() ? ` visiting ${destination}` : ''}. It does not change your selected flight or cash estimate.</p>
            {message ? <p className="wf-trip-points-assumption">{message}</p> : null}
          </div>
        </section>
        <div className="wf-trip-points-balance">
          <span>Sample rewards balance</span>
          <strong>{points.format(result.pointsContext.available)} <small>points</small></strong>
          <p>Example profile. Not a live account balance.</p>
        </div>
        {active ? <>
          <CardCarousel label="Reward examples" itemName="reward example" className="wf-trip-points-options">
            {result.options.map(option => <article className="wf-trip-points-option" key={option.optionId}>
              <h3>{option.partnerLabel}</h3>
              <p className="wf-trip-points-route">{option.route.origin} to {option.route.destination}</p>
              <strong>{points.format(option.totalPoints)} points
                <small>+ {new Intl.NumberFormat(locale, { style: 'currency', currency: option.estimatedTaxes.currency }).format(option.estimatedTaxes.amount)}</small>
              </strong>
              <span>{result.searchContext.adults} adult{result.searchContext.adults === 1 ? '' : 's'} · example taxes</span>
              <Action type="button" variant="secondary" className="wf-trip-points-choice" aria-label={`View ${option.partnerLabel} example`} aria-pressed={active.optionId === option.optionId}
                onClick={() => setViewed({ searchId: result.searchId, optionId: option.optionId })}>
                {active.optionId === option.optionId ? <><CheckIcon />Viewing example</> : 'View example'}
              </Action>
            </article>)}
          </CardCarousel>
          <section className="wf-trip-points-budget" aria-labelledby={budgetId}>
            <h3 id={budgetId}>Within the sample points budget</h3>
            <dl aria-live="polite" aria-atomic="true">
              <div><dt>Example flight points needed</dt><dd>{points.format(active.totalPoints)}</dd></div>
              <div><dt>Example points left afterward</dt><dd>{points.format(active.balanceAfter)}</dd></div>
              <div><dt>Actual reward-seat availability</dt><dd>Not checked</dd></div>
              <div><dt>Your selected cash fare</dt><dd>Reward eligibility unknown</dd></div>
            </dl>
            <p><InformationCircleIcon aria-hidden="true" />Enough example points is not proof of eligibility. These are separate reward ideas, not a discount on the flight you selected.</p>
          </section>
        </> : <section className="wf-trip-points-empty" role="status">
          <h3>No reward examples fit this trip</h3>
          <p>Try a different points budget or destination in the conversation.</p>
        </section>}
      </> : null}
      <footer className="wf-trip-points-footer">
        <p>Example rewards only. No real account or award inventory was accessed; no points were earned, applied or redeemed.</p>
        <Action type="button" variant="primary" className="wf-trip-points-primary" onClick={onBack}>Back to your trip</Action>
      </footer>
    </div>
  </section>;
}
