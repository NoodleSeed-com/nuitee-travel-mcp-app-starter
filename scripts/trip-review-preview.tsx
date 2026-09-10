import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AdjustmentsHorizontalIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Action } from '../src/helpers.js';
import type { DemoInsuranceComparisonOutput, DemoRewardFlightSearchOutput } from '../src/demo-schemas.js';
import { runDemoGateway } from '../src/demo-runtime.js';
import { runTripProtection } from '../src/trip-protection.js';
import { isTripPlanningReview, TripReviewView } from '../src/views/trip-review.js';
import { TripPointsView } from '../src/views/trip-points.js';
import { TripProtectionView } from '../src/views/trip-protection-view.js';
import { planTripPoints, planTripProtection } from '../src/views/trip-optional-search.js';
import { isTripProtectionSelection } from '../src/views/trip-protection-data.js';
import { buildPreviewReview, PREVIEW_INSURANCE_CATALOG, PREVIEW_NOW, type PreviewScenario } from './trip-review-preview-fixtures.js';

const scenarios: readonly [PreviewScenario, string][] = [
  ['full', 'Full trip'], ['mixed', 'Mixed currencies'], ['missing', 'Missing flight price'],
  ['partial', 'Experience only'], ['failed-save', 'Failed save'],
];
type Screen = 'review' | 'points' | 'protection';
type OptionalResult<T> = { data?: T; message?: string; note?: string; state?: 'unavailable' | 'error' };

function Preview() {
  const [screen, setScreen] = useState<Screen>('review');
  const [scenario, setScenario] = useState<PreviewScenario>('full');
  const [showScenarios, setShowScenarios] = useState(false);
  const [protectionState, setProtectionState] = useState<Record<string, unknown>>({});
  const [points, setPoints] = useState<OptionalResult<DemoRewardFlightSearchOutput>>({});
  const [protection, setProtection] = useState<OptionalResult<DemoInsuranceComparisonOutput>>({});
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const product = useRef<HTMLDivElement>(null);
  const restoreSelector = useRef<string | undefined>(undefined);
  const previousScreen = useRef<Screen>('review');

  const baseReview = buildPreviewReview(scenario);
  const saved = runTripProtection({
    kind: 'review', review: baseReview, state: protectionState,
    requestedAt: PREVIEW_NOW, readOk: true, tripReadOk: true,
  });
  const review = { ...baseReview, ...(isTripProtectionSelection(saved.selection) ? { protection: saved.selection } : {}) };
  if (!isTripPlanningReview(review)) throw new Error('The local trip fixture did not pass the real review guard.');

  useEffect(() => {
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    const frame = requestAnimationFrame(() => {
      const target = screen === 'review' && restoreSelector.current
        ? product.current?.querySelector<HTMLElement>(restoreSelector.current)
        : product.current?.querySelector<HTMLElement>('h2');
      if (!target) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: screen === 'review' ? 'center' : 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [screen]);

  function reset(next: PreviewScenario = 'full') {
    if (pending) return;
    setScenario(next);
    setScreen('review');
    setProtectionState({});
    setPoints({});
    setProtection({});
    setNotice('');
    setActionError('');
    restoreSelector.current = undefined;
  }

  function openPoints() {
    const plan = planTripPoints(review);
    const output = plan.input ? runDemoGateway({ kind: 'reward_search', rewardSearch: plan.input }).rewardResult : undefined;
    setPoints(output ? { data: output as DemoRewardFlightSearchOutput, message: plan.note } : { state: 'unavailable', message: plan.error });
    setNotice('');
    setActionError('');
    restoreSelector.current = '[data-trip-optional="points"]';
    setScreen('points');
  }

  function openProtection() {
    const plan = planTripProtection(review);
    if (!plan.input) {
      setProtection({ state: 'unavailable', message: plan.error });
    } else {
      const comparison = runDemoGateway({
        kind: 'insurance_compare', insuranceComparison: plan.input,
        insuranceCatalog: PREVIEW_INSURANCE_CATALOG,
      }).insuranceResult as DemoInsuranceComparisonOutput;
      const prepared = runTripProtection({
        kind: 'prepare', review: baseReview, comparison, state: protectionState,
        requestedAt: PREVIEW_NOW, readOk: true, tripReadOk: true,
      });
      if (prepared.mayWrite === true && prepared.nextState) setProtectionState(current => ({ ...current, ...prepared.nextState as Record<string, unknown> }));
      setProtection({ data: { ...comparison, planning: { canSelect: prepared.canSelect === true, message: String(prepared.message) } }, note: plan.note });
    }
    setNotice('');
    setActionError('');
    restoreSelector.current = '[data-trip-optional="protection"]';
    setScreen('protection');
  }

  async function saveProtection(action: 'select' | 'remove', comparisonId: string, planId: string) {
    if (pending) return;
    setPending(true);
    setNotice('');
    setActionError('');
    const proposal = runTripProtection({
      kind: 'select', action, comparisonId, planId, review: baseReview,
      state: protectionState, requestedAt: PREVIEW_NOW, readOk: true, tripReadOk: true,
    });
    // The local delay makes the actual pending presentation inspectable. No I/O occurs.
    await new Promise(resolve => window.setTimeout(resolve, 350));
    const acknowledged = runTripProtection({ kind: 'acknowledge', proposal, patchOk: scenario !== 'failed-save' });
    if (acknowledged.status === 'selected' || acknowledged.status === 'removed' || acknowledged.status === 'already_selected') {
      if (proposal.mayWrite === true && proposal.nextState) setProtectionState(current => ({ ...current, ...proposal.nextState as Record<string, unknown> }));
      setNotice(String(acknowledged.message));
      setScreen('review');
    } else {
      setActionError(scenario === 'failed-save'
        ? 'Local fixture: the save was intentionally rejected. No protection concept was added. Choose Full trip in Preview states to try a successful save.'
        : String(acknowledged.message));
    }
    setPending(false);
  }

  return <div className="wf-preview">
    <header className="wf-preview-header">
      <div><strong>Wayfare</strong><span>Local fixture preview</span></div>
      <Action type="button" variant="secondary" className="wf-preview-control" aria-expanded={showScenarios} aria-controls="trip-preview-scenarios" onClick={() => setShowScenarios(!showScenarios)}><AdjustmentsHorizontalIcon aria-hidden="true" />Preview states</Action>
    </header>
    {showScenarios ? <section id="trip-preview-scenarios" className="wf-preview-scenarios" aria-label="Local preview scenarios">
      <p>These controls change only the local fixture. Every flight, stay, price and account value shown below is an example.</p>
      <div role="group" aria-label="Trip scenario">{scenarios.map(([value, label]) => <Action type="button" variant="secondary" className="wf-preview-control" key={value} aria-pressed={scenario === value} disabled={pending} onClick={() => reset(value)}>{label}</Action>)}</div>
      <Action type="button" variant="quiet" className="wf-preview-control" disabled={pending} onClick={() => reset()}><ArrowPathIcon aria-hidden="true" />Reset preview</Action>
    </section> : null}
    <main className="wf-preview-main">
      <div className="wf-preview-conversation"><div>Review my Lisbon trip, then show me points and protection options.</div><p>Actual Wayfare components · local fixtures only · no provider API calls</p></div>
      <div ref={product} className="wf-preview-product">
        {screen === 'review' ? <TripReviewView data={review} locale="en-IE" actionsPending={pending} actionNotice={notice} actionError={actionError}
          onPoints={openPoints} onProtection={openProtection}
          onRemoveProtection={review.protection ? () => { void saveProtection('remove', review.protection!.comparisonId, review.protection!.plan.planId); } : undefined}
          onSuggest={() => setNotice('Local preview only: this action continues the conversation in the connected product. No search was requested here.')}
          onContinue={() => setNotice('Local preview only: continue the conversation to refine your flight, stay or experiences. Nothing is booked or purchased.')} />
          : screen === 'points' ? <TripPointsView {...points} destination="Lisbon" contextLabel="16–17 Sep 2030 · 2 adults" locale="en-IE" onBack={() => setScreen('review')} onRetry={openPoints} />
            : <TripProtectionView {...protection} destination="Lisbon" contextLabel="16–17 Sep 2030 · 2 adults" locale="en-IE" pending={pending} actionError={actionError}
              selectedPlanId={review.protection?.plan.planId} onSelect={(comparisonId, planId) => { void saveProtection('select', comparisonId, planId); }}
              onBack={() => setScreen('review')} onRetry={openProtection} />}
      </div>
      <aside className="wf-preview-footnote"><strong>Local preview boundary</strong><p>This page renders the real TripReviewView, TripPointsView and TripProtectionView. Flight and stay source labels illustrate the product hierarchy using fictional inputs. Rewards and protection use the shared fixture calculations; protection changes stay in browser memory and require a simulated acknowledgement. Refreshing clears the plan. The airline thumbnail demonstrates an existing, verified static asset; it does not identify the fictional itinerary's carrier. The experience uses its existing decorative Unsplash photo. These public image loads may contact their image hosts; no provider API or account is accessed. The hotel keeps its real missing-photo fallback because no verified hotel photograph is supplied. Nothing is booked, redeemed or insured.</p></aside>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<Preview />);
