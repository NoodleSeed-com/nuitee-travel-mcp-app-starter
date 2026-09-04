import '@fontsource-variable/host-grotesk';
import '@noodleseed/one/react/styles.css';
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
  useLayout,
  useToolInfo,
  useWidgetReady,
} from '../helpers.js';
import { CheckIcon } from './icons.js';
import { CardCarousel } from './card-carousel.js';
import './travel.css';

type InsuranceResultsState = 'loading' | 'error' | 'malformed';

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

function isPlan(value: unknown): value is DemoInsurancePlan {
  const plan = record(value);
  if (
    !plan
    || typeof plan.planId !== 'string'
    || !/^inplan_[a-f0-9]{32}$/u.test(plan.planId)
    || plan.dataSource !== 'illustrative'
    || !boundedString(plan.name, 2, 80)
    || !boundedString(plan.summary, 20, 180)
    || !isMoney(plan.illustrativePrice, 1_000_000)
    || !isMoney(plan.deductible, 1_000_000)
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
      && (coverage.basis === 'per_traveler' || coverage.basis === 'per_trip')
      && boundedString(coverage.summary, 20, 180),
    );
  });
}

export function isDemoInsuranceComparisonOutput(
  value: unknown,
): value is DemoInsuranceComparisonOutput {
  const result = record(value);
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
    && isSearchContext(result.searchContext)
    && Array.isArray(result.assumptions)
    && result.assumptions.length >= 1
    && result.assumptions.length <= 6
    && result.assumptions.every((item) => boundedString(item, 20, 180))
    && Array.isArray(result.plans)
    && result.plans.length === 3
    && result.plans.every(isPlan)
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

function InsuranceLoading() {
  return (
    <Frame
      className="cc-app cc-insurance-results"
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
        <div className="cc-insurance-plan-grid cc-card-carousel-track" aria-hidden="true">
          <InsuranceSkeletonCard />
          <InsuranceSkeletonCard />
          <InsuranceSkeletonCard />
        </div>
      </section>
    </Frame>
  );
}

function statusView(
  state: Exclude<InsuranceResultsState, 'loading'>,
) {
  const malformed = state === 'malformed';
  return (
    <Frame
      className="cc-app cc-insurance-results"
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
  locale = 'en-CA',
}: {
  readonly result?: DemoInsuranceComparisonOutput;
  readonly state?: InsuranceResultsState;
  readonly displayMode: string;
  readonly theme?: 'light' | 'dark';
  readonly locale?: string;
}) {
  if (state === 'loading') return <InsuranceLoading />;
  if (state) return statusView(state);
  if (!result) return statusView('malformed');

  return (
    <Frame
      className="cc-app cc-insurance-results"
      displayMode="auto"
      title="Travel protection"
      subtitle="Three fictional concepts · no live policy check"
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
        <CardCarousel label="Illustrative travel protection concepts" itemName="travel protection concept" className="cc-insurance-plan-grid">
          {result.plans.map((plan) => <PlanCard key={plan.planId} locale={locale} plan={plan} />)}
        </CardCarousel>
        <Region
          title="What to check before buying elsewhere"
          description="These concepts cannot establish whether any real product is suitable or available."
        >
          <ul className="cc-insurance-assumptions">
            {result.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
          </ul>
          <p className="cc-insurance-boundary">
            Review actual policy wording, eligibility, limits, deductibles, and exclusions with a licensed provider before relying on any real product.
          </p>
        </Region>
      </Flow>
    </Frame>
  );
}

export default function InsuranceResults() {
  const ready = useWidgetReady();
  const layout = useLayout();
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
    />
  );
}
