import { useEffect, useRef, useState } from 'react';
import type { DemoExperienceSearchOutput, DemoTripReview } from '../demo-schemas.js';
import { Action, Feedback, useCallTool, useLayout, useWidgetReady } from '../helpers.js';
import { ArrowLeftIcon } from './icons.js';
import { ExperienceJourney, ExperienceResultsView, isDemoExperienceSearchOutput } from './experience-results.js';
import type { TripExperienceSearchPlan } from './trip-experience-search.js';
import './trip-experience-discovery.css';

export function TripExperienceDiscovery({ review, plan, onBack }: {
  readonly review: DemoTripReview;
  readonly plan: TripExperienceSearchPlan & { input: DemoExperienceSearchOutput['searchContext'] };
  readonly onBack: () => void;
}) {
  const ready = useWidgetReady();
  const layout = useLayout();
  const search = useCallTool('search_experiences');
  const call = useRef(search.callToolAsync);
  call.current = search.callToolAsync;
  const container = useRef<HTMLElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<DemoExperienceSearchOutput>();
  const [error, setError] = useState<string>();
  const [adding, setAdding] = useState(false);
  const inputKey = JSON.stringify(plan.input);
  useEffect(() => {
    if (!ready) return;
    let current = true;
    setResult(undefined); setError(undefined);
    void call.current(plan.input).then(response => {
      if (!current) return;
      if (response.isError) setError('Experience ideas could not load. Try again; your trip selections are unchanged.');
      else if (!isDemoExperienceSearchOutput(response.structuredContent)) setError('The experience result was incomplete, so no ideas were inferred. Try again or return to your trip.');
      else setResult(response.structuredContent);
    }).catch(() => { if (current) setError('Experience ideas could not load. Try again; your trip selections are unchanged.'); });
    return () => { current = false; };
  }, [ready, inputKey, attempt]);
  useEffect(() => {
    if (!result) return;
    const heading = container.current?.querySelector<HTMLHeadingElement>('h2');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }, [result?.searchId]);
  const date = (value: string) => new Intl.DateTimeFormat(layout.locale ?? 'en-CA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
  const lastDate = new Date(Date.parse(`${plan.input.endDate}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return <section ref={container} className="cc-app wf-experience-discovery" aria-label="Experiences for your trip">
    <div className="wf-discovery-toolbar"><Action type="button" disabled={adding} onClick={onBack}><ArrowLeftIcon />Back to your trip</Action></div>
    <div className="wf-discovery-note"><strong>Browsing {date(plan.input.startDate)}{lastDate !== plan.input.startDate ? ` to ${date(lastDate)}` : ''}</strong><p>{plan.note}</p><p>City-wide demo ideas. Distance from your stay or airport has not been checked.</p></div>
    {error ? <div className="wf-discovery-feedback"><Feedback status="error">{error}</Feedback><Action type="button" onClick={() => setAttempt(value => value + 1)}>Try again</Action></div>
      : result ? <ExperienceJourney key={result.searchId} toolInfo={{ structuredContent: result }} tripReview={review} browsingPlan={plan} onReview={onBack} onBusyChange={setAdding} onRefresh={() => setAttempt(value => value + 1)} />
        : <ExperienceResultsView state="loading" displayMode={layout.displayMode} />}
  </section>;
}
