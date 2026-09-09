import { useEffect, useRef, useState } from 'react';
import type { DemoHotelSearchOutput, DemoTripReview } from '../demo-schemas.js';
import { Action, Feedback, useCallTool, useLayout, useWidgetReady } from '../helpers.js';
import { ArrowLeftIcon } from './icons.js';
import { HotelSelectionJourney, HotelResultsView, isDemoHotelSearchOutput } from './hotel-results.js';
import type { TripHotelSearchPlan } from './trip-hotel-search.js';
import './trip-experience-discovery.css';

export function TripHotelDiscovery({ review, plan, onBack }: {
  readonly review: DemoTripReview;
  readonly plan: TripHotelSearchPlan & { input: DemoHotelSearchOutput['searchContext'] };
  readonly onBack: () => void;
}) {
  const ready = useWidgetReady();
  const layout = useLayout();
  const search = useCallTool('search_hotels');
  const call = useRef(search.callToolAsync); call.current = search.callToolAsync;
  const [result, setResult] = useState<DemoHotelSearchOutput>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const container = useRef<HTMLElement>(null);
  const inputKey = JSON.stringify(plan.input);
  useEffect(() => {
    if (!ready) return;
    let current = true;
    setResult(undefined); setError(undefined);
    void call.current(plan.input).then(response => {
      if (!current) return;
      if (response.isError) setError('Stays could not load. Try again or return to your trip.');
      else if (!isDemoHotelSearchOutput(response.structuredContent)) setError('The hotel result was incomplete, so no stays were inferred. Try again or return to your trip.');
      else if (response.structuredContent.status === 'error') setError(response.structuredContent.message);
      else setResult(response.structuredContent);
    }).catch(() => { if (current) setError('Stays could not load. Try again or return to your trip.'); });
    return () => { current = false; };
  }, [ready, inputKey, attempt]);
  useEffect(() => {
    const heading = container.current?.querySelector<HTMLHeadingElement>('h2');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }, [result]);
  return <section ref={container} className="cc-app wf-experience-discovery" aria-label="Stays for your trip">
    <div className="wf-discovery-toolbar"><Action type="button" disabled={selecting} onClick={onBack}><ArrowLeftIcon />Back to your trip</Action></div>
    <div className="wf-discovery-note"><strong>Stays for your trip</strong><p>{plan.note}</p></div>
    {error ? <div className="wf-discovery-feedback"><Feedback status="error">{error}</Feedback><Action type="button" onClick={() => setAttempt(value => value + 1)}>Try again</Action></div>
      : result ? <HotelSelectionJourney key={`${result.searchId}:${attempt}`} toolInfo={{ structuredContent: result }} tripReview={review} onReview={onBack} onBusyChange={setSelecting} />
        : <HotelResultsView state="loading" displayMode={layout.displayMode} />}
  </section>;
}
