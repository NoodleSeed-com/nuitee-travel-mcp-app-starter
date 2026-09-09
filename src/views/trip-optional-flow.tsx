import { useEffect, useRef, useState } from 'react';
import type { DemoInsuranceComparisonOutput, DemoRewardFlightSearchOutput, DemoTripReview } from '../demo-schemas.js';
import { useCallTool, useLayout } from '../helpers.js';
import { isDemoInsuranceComparisonOutput } from './insurance-results.js';
import { isDemoRewardFlightSearchOutput } from './reward-flight-results.js';
import { planTripPoints, planTripProtection } from './trip-optional-search.js';
import { TripPointsView } from './trip-points.js';
import { TripProtectionView } from './trip-protection-view.js';
import { isTripPlanningReview } from './trip-review.js';
import { isTripProtectionSelection } from './trip-protection-data.js';

export type TripOptionalKind = 'points' | 'protection';
export function TripOptionalFlow({ kind, review, onBack, onSaved }: {
  readonly kind: TripOptionalKind;
  readonly review: DemoTripReview;
  readonly onBack: () => void;
  readonly onSaved: (data: DemoTripReview, message: string) => void;
}) {
  const layout = useLayout();
  const points = useCallTool('compare_reward_flights');
  const protection = useCallTool('compare_travel_insurance');
  const select = useCallTool('select_trip_protection');
  const currentReview = useCallTool('review_trip');
  const calls = useRef({ points, protection, select, currentReview });
  calls.current = { points, protection, select, currentReview };
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ state?: 'loading' | 'error' | 'unavailable'; data?: unknown; message?: string }>({ state: 'loading' });
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const busy = useRef(false);
  const alive = useRef(true);
  const host = useRef<HTMLDivElement>(null);
  const plan = kind === 'points' ? planTripPoints(review) : planTripProtection(review);
  const planKey = JSON.stringify(plan);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setActionError(undefined);
    if (!plan.input) { setResult({ state: 'unavailable', message: plan.error }); return; }
    setResult({ state: 'loading' });
    const call = kind === 'points' ? calls.current.points : calls.current.protection;
    void call.callToolAsync(plan.input).then(response => {
      if (!active) return;
      const valid = kind === 'points' ? isDemoRewardFlightSearchOutput(response.structuredContent) : isDemoInsuranceComparisonOutput(response.structuredContent);
      setResult(response.isError || !valid ? { state: 'error' } : { data: response.structuredContent });
    }).catch(() => { if (active) setResult({ state: 'error' }); });
    return () => { active = false; };
  }, [kind, planKey, attempt]);
  useEffect(() => {
    const heading = host.current?.querySelector<HTMLHeadingElement>('h2');
    heading?.focus({ preventScroll: true });
    if (result.state !== 'loading') heading?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [result.state]);
  const save = async (comparisonId: string, planId: string) => {
    if (busy.current) return;
    busy.current = true; setPending(true); setActionError(undefined);
    try {
      const response = await calls.current.select.callToolAsync({ action: 'select', comparisonId, planId });
      if (!alive.current) return;
      const value = response.structuredContent as Record<string, unknown> | undefined;
      if (response.isError || !value || !['selected', 'already_selected'].includes(String(value.status)) || !isTripProtectionSelection(value.selection)
        || value.selection.comparisonId !== comparisonId || value.selection.plan.planId !== planId) {
        setActionError('The protection choice was not confirmed. Reload the comparison and try again; no coverage was purchased.'); return;
      }
      const refreshed = await calls.current.currentReview.callToolAsync({});
      if (!alive.current) return;
      if (refreshed.isError || !isTripPlanningReview(refreshed.structuredContent)) {
        setActionError('The save was acknowledged, but your latest trip could not load. Return to your trip to check the current choice.'); return;
      }
      const data = refreshed.structuredContent;
      const matches = data.protection?.comparisonId === comparisonId && data.protection.plan.planId === planId;
      onSaved(data, matches ? 'Protection example added to your plan. You are not insured.' : 'Your trip changed, so that protection choice is not included in the current estimate.');
    } catch { if (alive.current) setActionError('The protection choice could not be confirmed. Return to your trip to check before trying again.'); }
    finally { busy.current = false; if (alive.current) setPending(false); }
  };
  const c = review.planningContext;
  const shared = { destination: c?.destination ?? '', contextLabel: [c?.startDate && `${c.startDate}${c.endDate ? `–${c.endDate}` : ''}`, c?.adults && `${c.adults} adult${c.adults === 1 ? '' : 's'}`].filter(Boolean).join(' · '), locale: layout.locale ?? 'en-CA',
    state: result.state, message: result.message ?? plan.note, onBack: () => { if (!busy.current) onBack(); }, onRetry: () => { if (!busy.current) setAttempt(value => value + 1); } };
  return <div ref={host}>{kind === 'points'
    ? <TripPointsView {...shared} data={result.data as DemoRewardFlightSearchOutput | undefined} />
    : <TripProtectionView {...shared} data={result.data as DemoInsuranceComparisonOutput | undefined} pending={pending} actionError={actionError} onSelect={(comparisonId, planId) => { void save(comparisonId, planId); }} selectedPlanId={review.protection?.plan.planId} />}</div>;
}
