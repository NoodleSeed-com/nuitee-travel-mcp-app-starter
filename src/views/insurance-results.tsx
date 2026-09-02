import '@fontsource-variable/inter';
import '@noodleseed/one/react/styles.css';
import { useEffect, useState, type CSSProperties } from 'react';
import type {
  DemoInsuranceComparisonOutput,
  DemoInsurancePlan,
} from '../demo-schemas.js';
import {
  Feedback,
  Flow,
  Frame,
  Region,
  StatusBadge,
  useBranding,
  useLayout,
  useToolInfo,
  useWidgetReady,
} from '../helpers.js';
import { CheckIcon } from './icons.js';
import './travel.css';

type InsuranceResultsState = 'loading' | 'error' | 'malformed';
type InsuranceStage = 'preferences' | 'comparison';
type InsurancePriorityId =
  | 'medical'
  | 'cancellation'
  | 'delays'
  | 'baggage'
  | 'rental-car'
  | 'schengen';

type InsurancePriority = {
  readonly id: InsurancePriorityId;
  readonly label: string;
  readonly explanation: string;
};

const insurancePriorities: readonly InsurancePriority[] = [
  {
    id: 'medical',
    label: 'Medical emergencies',
    explanation: 'Compare how the fictional concepts illustrate emergency-medical limits and deductibles.',
  },
  {
    id: 'cancellation',
    label: 'Cancellation',
    explanation: 'Compare fictional trip-cancellation maximums and the exclusions that still require policy review.',
  },
  {
    id: 'delays',
    label: 'Delays & connections',
    explanation: 'Keep illustrative travel-delay limits visible while comparing the three neutral concepts.',
  },
  {
    id: 'baggage',
    label: 'Baggage',
    explanation: 'Compare the fictional baggage limits shown for planning context.',
  },
  {
    id: 'rental-car',
    label: 'Rental car',
    explanation: 'Keep rental-car protection as a discussion point; the fictional concepts may not include it.',
  },
  {
    id: 'schengen',
    label: 'Schengen coverage',
    explanation: 'Keep Schengen-area requirements in view while comparing; no compliance check is performed.',
  },
] as const;

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;

const boundedString = (value: unknown, minimum: number, maximum: number): value is string =>
  typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum;

const boundedInteger = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;

const isCurrency = (value: unknown) =>
  value === 'CAD' || value === 'USD' || value === 'EUR' || value === 'GBP';

const forbiddenInsuranceKeyPattern =
  /^(?:purchaseUrl|checkoutUrl|bookingUrl|policyNumber|insurer|underwriter|dateOfBirth|medicalHistory|passport|payment|customerId|accountId)$/u;

const isMoney = (value: unknown, maximum: number) => {
  const money = record(value);
  return Boolean(
    money
    && typeof money.amount === 'number'
    && Number.isFinite(money.amount)
    && money.amount >= 0
    && money.amount <= maximum
    && isCurrency(money.currency),
  );
};

function hasForbiddenInsuranceKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenInsuranceKey);
  const candidate = record(value);
  if (!candidate) return false;
  for (const [key, nested] of Object.entries(candidate)) {
    if (forbiddenInsuranceKeyPattern.test(key)) {
      return true;
    }
    if (hasForbiddenInsuranceKey(nested)) return true;
  }
  return false;
}

function isSearchContext(value: unknown) {
  const context = record(value);
  return Boolean(
    context
    && boundedString(context.destination, 2, 80)
    && typeof context.departureDate === 'string'
    && /^\d{4}-\d{2}-\d{2}$/u.test(context.departureDate)
    && typeof context.returnDate === 'string'
    && /^\d{4}-\d{2}-\d{2}$/u.test(context.returnDate)
    && context.returnDate > context.departureDate
    && boundedInteger(context.adults, 1, 8)
    && boundedInteger(context.children, 0, 6)
    && Number(context.adults) + Number(context.children) <= 8
    && typeof context.residenceCountry === 'string'
    && /^[A-Z]{2}$/u.test(context.residenceCountry)
    && isCurrency(context.currency)
    && (
      context.estimatedTripCost === undefined
      || (
        typeof context.estimatedTripCost === 'number'
        && Number.isFinite(context.estimatedTripCost)
        && context.estimatedTripCost >= 0
        && context.estimatedTripCost <= 1_000_000
      )
    )
  );
}

function isPlan(value: unknown, expectedCurrency: string): value is DemoInsurancePlan {
  const plan = record(value);
  const illustrativePrice = record(plan?.illustrativePrice);
  const deductible = record(plan?.deductible);
  if (
    !plan
    || typeof plan.planId !== 'string'
    || !/^inplan_[a-f0-9]{32}$/u.test(plan.planId)
    || plan.dataSource !== 'illustrative'
    || !boundedString(plan.name, 2, 80)
    || !boundedString(plan.summary, 20, 180)
    || !isMoney(plan.illustrativePrice, 1_000_000)
    || illustrativePrice?.currency !== expectedCurrency
    || !isMoney(plan.deductible, 1_000_000)
    || deductible?.currency !== expectedCurrency
    || !Array.isArray(plan.coverages)
    || plan.coverages.length < 4
    || plan.coverages.length > 6
    || !Array.isArray(plan.highlights)
    || plan.highlights.length < 1
    || plan.highlights.length > 5
    || !plan.highlights.every((item) => boundedString(item, 2, 120))
    || !Array.isArray(plan.exclusions)
    || plan.exclusions.length < 1
    || plan.exclusions.length > 5
    || !plan.exclusions.every((item) => boundedString(item, 20, 180))
  ) return false;

  return plan.coverages.every((candidate) => {
    const coverage = record(candidate);
    return Boolean(
      coverage
      && boundedString(coverage.name, 2, 80)
      && isMoney(coverage.limit, 10_000_000)
      && record(coverage.limit)?.currency === expectedCurrency
      && (coverage.basis === 'per_traveler' || coverage.basis === 'per_trip')
      && boundedString(coverage.summary, 20, 180),
    );
  });
}

export function isDemoInsuranceComparisonOutput(
  value: unknown,
): value is DemoInsuranceComparisonOutput {
  const result = record(value);
  const searchContext = record(result?.searchContext);
  return Boolean(
    result
    && !hasForbiddenInsuranceKey(result)
    && result.status === 'success'
    && result.dataSource === 'illustrative'
    && boundedString(result.disclosure, 40, 420)
    && boundedString(result.message, 2, 320)
    && boundedString(result.fallback, 40, 700)
    && typeof result.comparisonId === 'string'
    && /^inscmp_[a-f0-9]{32}$/u.test(result.comparisonId)
    && isSearchContext(searchContext)
    && Array.isArray(result.assumptions)
    && result.assumptions.length >= 1
    && result.assumptions.length <= 6
    && result.assumptions.every((item) => boundedString(item, 20, 180))
    && Array.isArray(result.plans)
    && result.plans.length === 3
    && result.plans.every((plan) => isPlan(plan, String(searchContext?.currency)))
  );
}

function money(amount: number, currency: string, locale: string, digits = 0) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: digits,
  }).format(amount);
}

function InsuranceSkeletonCard() {
  return (
    <article aria-hidden="true" className="cc-insurance-plan-card cc-insurance-skeleton-card">
      <span className="cc-skeleton-block cc-shimmer" />
      <span className="cc-skeleton-block cc-shimmer" />
      <span className="cc-skeleton-block cc-shimmer" />
      <div className="cc-insurance-coverage-list">
        {[0, 1, 2, 3].map((index) => (
          <span className="cc-skeleton-block cc-shimmer" key={index} />
        ))}
      </div>
    </article>
  );
}

function InsurancePreferenceSkeleton() {
  return (
    <div className="cc-insurance-preference-skeleton" aria-hidden="true">
      <div className="cc-insurance-preference-heading">
        <span className="cc-skeleton-block cc-shimmer" />
        <span className="cc-skeleton-block cc-shimmer" />
      </div>
      <div className="cc-insurance-priority-grid">
        {insurancePriorities.map((priority) => (
          <span className="cc-insurance-priority-card cc-shimmer" key={priority.id} />
        ))}
      </div>
      <span className="cc-insurance-focus-panel cc-shimmer" />
      <span className="cc-insurance-preference-action cc-shimmer" />
    </div>
  );
}

function InsuranceLoading({ theme, brandStyle, stage }: {
  readonly theme: 'light' | 'dark';
  readonly brandStyle?: CSSProperties;
  readonly stage: InsuranceStage;
}) {
  return (
    <Frame
      className={`cc-app cc-insurance-results ${theme === 'dark' ? 'cc-theme-dark' : ''}`}
      style={brandStyle}
      displayMode="auto"
      title="Travel protection"
      subtitle="Preparing illustrative travel protection"
    >
      <section className="cc-insurance-skeleton" role="status" aria-live="polite" aria-busy="true">
        <span className="cc-visually-hidden">Preparing illustrative travel protection…</span>
        <div className="cc-demo-disclosure cc-insurance-skeleton-disclosure" aria-hidden="true">
          <span className="cc-skeleton-block cc-shimmer" />
          <span className="cc-skeleton-block cc-shimmer" />
        </div>
        <div className="cc-insurance-context" aria-hidden="true">
          <span className="cc-skeleton-block cc-shimmer" />
          <span className="cc-skeleton-block cc-shimmer" />
        </div>
        {stage === 'preferences' ? <InsurancePreferenceSkeleton /> : (
          <div className="cc-insurance-plan-grid" aria-hidden="true">
            <InsuranceSkeletonCard />
            <InsuranceSkeletonCard />
            <InsuranceSkeletonCard />
          </div>
        )}
      </section>
    </Frame>
  );
}

function PriorityIcon({ priority }: { readonly priority: InsurancePriorityId }) {
  const paths: Record<InsurancePriorityId, readonly string[]> = {
    medical: ['M12 21s-7-4.6-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.4-7 11-7 11Z', 'M8 12h2l1-2 2 5 1-3h2'],
    cancellation: ['M5 7h14v12H5z', 'M8 4v6M16 4v6M5 10h14'],
    delays: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
    baggage: ['M6 7h12v13H6z', 'M9 7V5h6v2M9 12v4M15 12v4'],
    'rental-car': ['m5 11 2-5h10l2 5', 'M4 11h16v7H4zM7 18v2m10-2v2'],
    schengen: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'],
  };

  return (
    <svg aria-hidden="true" className="cc-icon" fill="none" focusable="false" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
      {paths[priority].map((path) => <path d={path} key={path} />)}
    </svg>
  );
}

function PreferenceStage({
  selected,
  focused,
  onToggle,
  onFocus,
  onCompare,
}: {
  readonly selected: readonly InsurancePriorityId[];
  readonly focused: InsurancePriorityId;
  readonly onToggle: (priority: InsurancePriorityId) => void;
  readonly onFocus: (priority: InsurancePriorityId) => void;
  readonly onCompare: () => void;
}) {
  const focusedPriority = insurancePriorities.find((priority) => priority.id === focused)
    ?? insurancePriorities[0];
  const selectedPriorities = insurancePriorities.filter((priority) => selected.includes(priority.id));

  return (
    <section className="cc-insurance-preferences" aria-labelledby="cc-insurance-preference-title">
      <header className="cc-insurance-preference-heading">
        <p className="cc-insurance-eyebrow">Your comparison brief</p>
        <h2 id="cc-insurance-preference-title">What matters for this comparison?</h2>
        <p>Choose any topics to save in your comparison brief. They are context only and do not filter, rank, or change the fictional concepts.</p>
      </header>
      <div aria-label="Travel protection comparison brief topics" className="cc-insurance-priority-grid" role="group">
        {insurancePriorities.map((priority) => {
          const isSelected = selected.includes(priority.id);
          return (
            <button
              aria-pressed={isSelected}
              className={`cc-insurance-priority-card${isSelected ? ' is-selected' : ''}`}
              key={priority.id}
              onClick={() => onToggle(priority.id)}
              onFocus={() => onFocus(priority.id)}
              type="button"
            >
              <span className="cc-insurance-priority-icon"><PriorityIcon priority={priority.id} /></span>
              <span>{priority.label}</span>
              <span aria-hidden="true" className="cc-insurance-priority-check"><CheckIcon /></span>
            </button>
          );
        })}
      </div>
      <aside aria-live="polite" className="cc-insurance-focus-panel">
        <span className="cc-insurance-priority-icon"><PriorityIcon priority={focusedPriority.id} /></span>
        <div>
          <strong>{focusedPriority.label}</strong>
          <p>{focusedPriority.explanation}</p>
        </div>
      </aside>
      <section aria-label="Selected comparison brief topics" className="cc-insurance-priority-summary">
        <div className="cc-insurance-summary-heading">
          <h3>Trip protection brief</h3>
          <span>{selectedPriorities.length} selected</span>
        </div>
        {selectedPriorities.length > 0 ? (
          <div className="cc-insurance-selected-priorities">
            {selectedPriorities.map((priority) => (
              <button
                aria-label={`Remove ${priority.label}`}
                className="cc-insurance-priority-chip"
                key={priority.id}
                onClick={() => onToggle(priority.id)}
                type="button"
              >
                <PriorityIcon priority={priority.id} />
                <span>{priority.label}</span>
                <span aria-hidden="true" className="cc-insurance-chip-remove">×</span>
              </button>
            ))}
          </div>
        ) : <p className="cc-insurance-empty-summary">Select at least one topic to save in your brief before comparing the illustrative concepts.</p>}
        <button
          className="cc-insurance-compare-action"
          disabled={selectedPriorities.length === 0}
          onClick={onCompare}
          type="button"
        >
          Compare illustrative concepts
          <span aria-hidden="true">→</span>
        </button>
        <p className="cc-insurance-summary-disclosure">
          Illustrative planning only. Selections are saved as comparison context; they do not filter, rank, or change the concepts or verify any real product.
        </p>
      </section>
    </section>
  );
}

function statusView(
  state: Exclude<InsuranceResultsState, 'loading'>,
  theme: 'light' | 'dark',
  brandStyle?: CSSProperties,
) {
  const malformed = state === 'malformed';
  return (
    <Frame
      className={`cc-app cc-insurance-results ${theme === 'dark' ? 'cc-theme-dark' : ''}`}
      style={brandStyle}
      displayMode="auto"
      title="Travel protection"
    >
      <Feedback status="error">
        {malformed
          ? 'The travel protection result was incomplete and could not be shown safely.'
          : 'The travel protection comparison could not load.'}
      </Feedback>
      <p className="cc-insurance-status-note">
        {malformed
          ? 'No price, eligibility, or coverage was inferred from the incomplete result.'
          : 'No insurer or policy was contacted, and nothing can be purchased.'}
      </p>
    </Frame>
  );
}

function PlanCard({ plan, locale }: {
  readonly plan: DemoInsurancePlan;
  readonly locale: string;
}) {
  return (
    <article className="cc-insurance-plan-card">
      <header>
        <StatusBadge tone="info">Illustrative concept</StatusBadge>
        <h2>{plan.name}</h2>
        <p>{plan.summary}</p>
      </header>
      <div className="cc-insurance-price">
        <span>Illustrative trip estimate</span>
        <strong>{money(plan.illustrativePrice.amount, plan.illustrativePrice.currency, locale, 2)}</strong>
        <small>{money(plan.deductible.amount, plan.deductible.currency, locale)} illustrative deductible</small>
      </div>
      <dl className="cc-insurance-coverage-list">
        {plan.coverages.map((coverage) => (
          <div key={coverage.name} title={coverage.summary}>
            <dt>{coverage.name}</dt>
            <dd>
              {money(coverage.limit.amount, coverage.limit.currency, locale)}
              <span>{coverage.basis === 'per_traveler' ? 'per traveler' : 'per trip'}</span>
            </dd>
          </div>
        ))}
      </dl>
      <ul className="cc-insurance-highlights" aria-label={`${plan.name} highlights`}>
        {plan.highlights.map((highlight) => <li key={highlight}><CheckIcon />{highlight}</li>)}
      </ul>
      <div className="cc-insurance-exclusions">
        <strong>Illustrative exclusions to review</strong>
        <ul>{plan.exclusions.map((exclusion) => <li key={exclusion}>{exclusion}</li>)}</ul>
      </div>
    </article>
  );
}

export function InsuranceResultsView({
  result,
  state,
  displayMode,
  theme = 'light',
  locale = 'en-CA',
  brandStyle,
  initialStage = 'preferences',
}: {
  readonly result?: DemoInsuranceComparisonOutput;
  readonly state?: InsuranceResultsState;
  readonly displayMode: string;
  readonly theme?: 'light' | 'dark';
  readonly locale?: string;
  readonly brandStyle?: CSSProperties;
  readonly initialStage?: InsuranceStage;
}) {
  const [stage, setStage] = useState<InsuranceStage>(initialStage);
  const [selectedPriorities, setSelectedPriorities] = useState<readonly InsurancePriorityId[]>([]);
  const [focusedPriority, setFocusedPriority] = useState<InsurancePriorityId>('medical');

  useEffect(() => {
    setStage(initialStage);
    setSelectedPriorities([]);
    setFocusedPriority('medical');
  }, [initialStage, result?.comparisonId]);

  if (state === 'loading') return <InsuranceLoading theme={theme} brandStyle={brandStyle} stage={initialStage} />;
  if (state) return statusView(state, theme, brandStyle);
  if (!result) return statusView('malformed', theme, brandStyle);

  const togglePriority = (priority: InsurancePriorityId) => {
    setFocusedPriority(priority);
    setSelectedPriorities((current) => current.includes(priority)
      ? current.filter((candidate) => candidate !== priority)
      : [...current, priority]);
  };

  return (
    <Frame
      className={`cc-app cc-insurance-results ${theme === 'dark' ? 'cc-theme-dark' : ''}`}
      style={brandStyle}
      displayMode="auto"
      title="Travel protection"
      subtitle={stage === 'preferences' ? 'Build a comparison brief' : 'Three fictional concepts · no live policy check'}
      data-display-mode={displayMode}
      data-llm={result.fallback}
    >
      <Flow variant="stack" density={displayMode === 'fullscreen' ? 'comfortable' : 'compact'}>
        <aside className="cc-demo-disclosure cc-insurance-disclosure" aria-label="Illustrative travel protection disclosure">
          <StatusBadge tone="info">Illustrative travel protection</StatusBadge>
          <p>{result.disclosure}</p>
        </aside>
        <section className="cc-insurance-context" aria-label="Trip context">
          <div>
            <span>Destination</span>
            <strong>{result.searchContext.destination}</strong>
          </div>
          <div>
            <span>Trip</span>
            <strong>{result.searchContext.departureDate} – {result.searchContext.returnDate}</strong>
          </div>
          <div>
            <span>Travelers</span>
            <strong>{result.searchContext.adults} adult{result.searchContext.adults === 1 ? '' : 's'} · {result.searchContext.children} child traveler{result.searchContext.children === 1 ? '' : 's'}</strong>
          </div>
        </section>
        {stage === 'preferences' ? (
          <PreferenceStage
            focused={focusedPriority}
            onCompare={() => setStage('comparison')}
            onFocus={setFocusedPriority}
            onToggle={togglePriority}
            selected={selectedPriorities}
          />
        ) : (
          <>
            <section className="cc-insurance-comparison-heading">
              <div>
                <p className="cc-insurance-eyebrow">Illustrative comparison</p>
                <h2>Compare travel protection concepts</h2>
                <p>{selectedPriorities.length > 0
                  ? `Your brief includes ${selectedPriorities.length} selected ${selectedPriorities.length === 1 ? 'topic' : 'topics'}; all three concepts remain neutral and unchanged.`
                  : 'Three neutral fictional concepts for planning context.'}</p>
              </div>
              <button className="cc-insurance-change-priorities" onClick={() => setStage('preferences')} type="button">
                Change comparison brief
              </button>
            </section>
            {selectedPriorities.length > 0 ? (
              <div aria-label="Saved comparison topics" className="cc-insurance-comparison-priorities">
                {insurancePriorities.filter((priority) => selectedPriorities.includes(priority.id)).map((priority) => (
                  <span key={priority.id}><PriorityIcon priority={priority.id} />{priority.label}</span>
                ))}
              </div>
            ) : null}
            <section aria-label="Illustrative travel protection concepts" className="cc-insurance-plan-grid">
              {result.plans.map((plan) => <PlanCard key={plan.planId} locale={locale} plan={plan} />)}
            </section>
            <Region
              title="What to check before considering a real policy"
              description="These concepts cannot establish whether any real product is available or appropriate for a traveler."
            >
              <ul className="cc-insurance-assumptions">
                {result.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
              </ul>
              <p className="cc-insurance-boundary">
                Review actual policy wording, eligibility, limits, deductibles, and exclusions with a licensed provider before relying on any real product.
              </p>
            </Region>
          </>
        )}
      </Flow>
    </Frame>
  );
}

export default function InsuranceResults() {
  const ready = useWidgetReady();
  const layout = useLayout();
  const branding = useBranding();
  const toolInfo = useToolInfo('compare_travel_insurance');
  const pending = !ready || Object.keys(toolInfo).length === 0;
  const result = isDemoInsuranceComparisonOutput(toolInfo.structuredContent)
    ? toolInfo.structuredContent
    : undefined;

  return (
    <InsuranceResultsView
      result={result}
      state={pending ? 'loading' : toolInfo.isError ? 'error' : result ? undefined : 'malformed'}
      displayMode={layout.displayMode}
      theme={layout.theme === 'dark' ? 'dark' : 'light'}
      locale={layout.locale ?? 'en-CA'}
      brandStyle={{
        '--cc-accent': branding.theme?.[layout.theme]?.accent ?? branding.accent ?? '#006D84',
        '--cc-focus': branding.theme?.[layout.theme]?.focus ?? '#007D95',
      } as CSSProperties}
    />
  );
}
