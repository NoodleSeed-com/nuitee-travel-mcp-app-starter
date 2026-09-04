import '@fontsource-variable/host-grotesk';
import '@noodleseed/one/react/styles.css';
import {
  Feedback,
  Flow,
  Frame,
  useLayout,
  useToolInfo,
  useWidgetReady,
} from '../helpers.js';
import type {
  DemoLoyaltyOverview,
  DemoTripReview,
} from '../demo-schemas.js';
import './travel.css';
import { CardCarousel } from './card-carousel.js';

export const WAYFARE_PREVIEW_DISCLOSURE =
  'Flight and stay results come from connected providers. Rewards are illustrative previews. Booking and redemption are unavailable.';

type LoyaltyData = DemoLoyaltyOverview | DemoTripReview;
type LoyaltyState = 'loading' | 'error' | 'malformed';

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const boundedString = (
  value: unknown,
  minimum: number,
  maximum: number,
): value is string =>
  typeof value === 'string' &&
  value.trim().length >= minimum &&
  value.length <= maximum;

const boundedInteger = (
  value: unknown,
  minimum: number,
  maximum: number,
): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= minimum &&
  value <= maximum;

const boundedAmount = (value: unknown) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100_000_000;

const isCurrency = (value: unknown) =>
  typeof value === 'string' && /^[A-Z]{3}$/.test(value);

const isCalendarDate = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isDemoMoney = (value: unknown) => {
  const money = record(value);
  return (
    boundedAmount(money?.amount) &&
    (money?.currency === 'CAD' ||
      money?.currency === 'USD' ||
      money?.currency === 'EUR')
  );
};

export function isDemoLoyaltyOverview(
  value: unknown,
): value is DemoLoyaltyOverview {
  const root = record(value);
  const member = record(root?.member);
  const progress = record(root?.progress);
  const pointsValue = record(root?.illustrativePointsValue);
  if (
    !root ||
    !member ||
    !progress ||
    !pointsValue ||
    root?.status !== 'success' ||
    root.dataSource !== 'illustrative' ||
    !boundedString(root.disclosure, 20, 320) ||
    !boundedString(root.fallback, 20, 500) ||
    member?.displayName !== 'Preview traveler' ||
    member.reference !== 'WAYFARE-PREVIEW-0001' ||
    member.tier !== 'Explorer concept tier' ||
    !boundedInteger(member.pointsBalance, 0, 1_000_000) ||
    !boundedString(progress?.label, 2, 100) ||
    !boundedInteger(progress?.current, 0, 1_000_000) ||
    !boundedInteger(progress?.target, 1, 1_000_000) ||
    !Array.isArray(root.benefits) ||
    root.benefits.length < 1 ||
    root.benefits.length > 6 ||
    !boundedInteger(pointsValue?.points, 1, 1_000_000) ||
    !isDemoMoney(pointsValue?.value) ||
    !boundedString(pointsValue?.explanation, 20, 240)
  ) {
    return false;
  }

  return root.benefits.every((candidate) => {
    const benefit = record(candidate);
    return (
      benefit !== undefined &&
      boundedString(benefit?.name, 2, 80) &&
      boundedString(benefit.description, 2, 180)
    );
  });
}

const isFlightSelection = (value: unknown) => {
  const flight = record(value);
  const price = record(flight?.searchPrice);
  return (
    flight !== undefined &&
    price !== undefined &&
    flight?.dataSource === 'live_nuitee_selection' &&
    typeof flight.selectionId === 'string' &&
    /^sel_[a-f0-9]{32}$/.test(flight.selectionId) &&
    boundedAmount(price?.total) &&
    isCurrency(price?.currency) &&
    (flight.expiresAt === undefined || boundedString(flight.expiresAt, 1, 64)) &&
    boundedString(flight.disclosure, 20, 240)
  );
};

const isStaySelection = (value: unknown) => {
  const stay = record(value);
  return (
    stay !== undefined &&
    (stay?.dataSource === 'illustrative' || stay?.dataSource === 'live_nuitee') &&
    typeof stay.selectionId === 'string' &&
    /^hsel_[a-f0-9]{32}$/.test(stay.selectionId) &&
    boundedString(stay.propertyName, 2, 100) &&
    boundedString(stay.city, 2, 80) &&
    isCalendarDate(stay.checkInDate) &&
    isCalendarDate(stay.checkOutDate) &&
    boundedInteger(stay.nights, 1, 30) &&
    boundedInteger(stay.rooms, 1, 4) &&
    isDemoMoney(stay.staySubtotal)
  );
};

export function isDemoTripReview(value: unknown): value is DemoTripReview {
  const root = record(value);
  if (
    !root ||
    (root?.status !== 'ready' && root?.status !== 'incomplete') ||
    root.dataSource !== 'illustrative' ||
    !boundedString(root.disclosure, 20, 400) ||
    !boundedString(root.fallback, 20, 500) ||
    !isDemoLoyaltyOverview(root.loyalty) ||
    !Array.isArray(root.missing) ||
    root.missing.length > 2 ||
    !root.missing.every((item) => item === 'flight' || item === 'stay') ||
    new Set(root.missing).size !== root.missing.length ||
    (root.status === 'ready' && root.missing.length !== 0) ||
    (root.status === 'incomplete' && root.missing.length === 0) ||
    (root.flight !== undefined && !isFlightSelection(root.flight)) ||
    (root.stay !== undefined && !isStaySelection(root.stay))
  ) {
    return false;
  }
  return true;
}

const rewardsLabel = (label: string) => label.replace(/\b(illustrative|simulated|synthetic|preview|concept)\b/gi, '').replace(/\s+/g, ' ').trim();

function LoyaltySkeleton() {
  return (
    <Frame
      className="cc-app cc-loyalty"
      displayMode="auto"
      title="Wayfare Rewards"
      subtitle="Rewards overview"
    >
      <section className="cc-loyalty-skeleton" role="status" aria-live="polite" aria-busy="true">
        <span className="cc-visually-hidden">Preparing the rewards profile…</span>
        <div className="cc-demo-disclosure cc-loyalty-skeleton-disclosure" aria-hidden="true">
          <span className="cc-skeleton-block cc-shimmer" />
          <span className="cc-skeleton-block cc-shimmer" />
        </div>
        <div className="cc-loyalty-hero cc-loyalty-skeleton-hero" aria-hidden="true">
          <div>
            <span className="cc-skeleton-block cc-shimmer" />
            <span className="cc-skeleton-block cc-shimmer" />
            <span className="cc-skeleton-block cc-shimmer" />
          </div>
          <span className="cc-skeleton-block cc-shimmer" />
        </div>
        <div className="cc-loyalty-progress cc-loyalty-skeleton-progress" aria-hidden="true">
          <span className="cc-skeleton-block cc-shimmer" />
          <span className="cc-skeleton-block cc-shimmer" />
        </div>
        <div className="cc-loyalty-benefits cc-loyalty-skeleton-benefits" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span className="cc-loyalty-benefit" key={index}>
              <span className="cc-skeleton-block cc-shimmer" />
              <span className="cc-skeleton-block cc-shimmer" />
            </span>
          ))}
        </div>
        <div className="cc-loyalty-value cc-loyalty-skeleton-value" aria-hidden="true">
          <span className="cc-skeleton-block cc-shimmer" />
          <span className="cc-skeleton-block cc-shimmer" />
        </div>
      </section>
    </Frame>
  );
}

function LoyaltySummary({
  loyalty,
  locale,
}: {
  readonly loyalty: DemoLoyaltyOverview;
  readonly locale: string;
}) {
  const points = new Intl.NumberFormat(locale);
  const value = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: loyalty.illustrativePointsValue.value.currency,
  });
  const progressValue = Math.min(
    loyalty.progress.current,
    loyalty.progress.target,
  );

  return (
    <CardCarousel label="Rewards overview" itemName="rewards panel" className="cc-loyalty-summary">
      <section className="cc-loyalty-hero" aria-labelledby="cc-loyalty-balance-title">
        <div className="cc-loyalty-member">
          <span>Rewards profile</span>
        </div>
        <div className="cc-loyalty-balance">
          <span id="cc-loyalty-balance-title">Points balance</span>
          <strong>{points.format(loyalty.member.pointsBalance)}</strong>
          <span>points</span>
        </div>
        <span>{rewardsLabel(loyalty.member.tier)}</span>
      </section>

      <section className="cc-loyalty-progress" aria-labelledby="cc-loyalty-progress-title">
        <div className="cc-loyalty-progress-copy">
          <h2 id="cc-loyalty-progress-title">Tier progress</h2>
          <span>Progress toward the next tier</span>
        </div>
        <progress
          aria-label={`Tier progress: ${loyalty.progress.current} of ${loyalty.progress.target}`}
          max={loyalty.progress.target}
          value={progressValue}
        />
        <small>
          {points.format(loyalty.progress.current)} of{' '}
          {points.format(loyalty.progress.target)} progress units
        </small>
      </section>

      <section className="cc-loyalty-benefits-panel" aria-labelledby="cc-loyalty-benefits-title">
        <div className="cc-loyalty-section-heading">
          <h2 id="cc-loyalty-benefits-title">Tier benefits</h2>
        </div>
        <ul className="cc-loyalty-benefits">
          {loyalty.benefits.map((benefit) => (
            <li className="cc-loyalty-benefit" key={benefit.name}>
              <strong>{rewardsLabel(benefit.name)}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="cc-loyalty-value" aria-labelledby="cc-loyalty-value-title">
        <div>
          <span>Points value</span>
          <h2 id="cc-loyalty-value-title">
            {points.format(loyalty.illustrativePointsValue.points)} points ≈{' '}
            {value.format(loyalty.illustrativePointsValue.value.amount)}
          </h2>
        </div>
      </section>
    </CardCarousel>
  );
}

function Overview({ data, locale }: {
  readonly data: DemoLoyaltyOverview;
  readonly locale: string;
}) {
  return (
    <Flow variant="stack" density="comfortable">
      <LoyaltySummary loyalty={data} locale={locale} />
      <p className="cc-loyalty-footer">
        Example rewards only · no real account was accessed and no points were earned or redeemed.
      </p>
    </Flow>
  );
}

function TripReview({ data, locale }: {
  readonly data: DemoTripReview;
  readonly locale: string;
}) {
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

  return (
    <Flow variant="stack" density="comfortable">

      {data.status === 'incomplete' ? (
        <section className="cc-loyalty-missing" role="status" aria-labelledby="cc-loyalty-missing-title">
          <h2 id="cc-loyalty-missing-title">Trip review needs another selection</h2>
          <p>
            Select {data.missing.map((item) => item === 'flight' ? 'a flight' : 'a hotel').join(' and ')}
            {' '}in the conversation to complete this comparison.
          </p>
        </section>
      ) : null}

      <section className="cc-loyalty-review" aria-labelledby="cc-loyalty-review-title">
        <div className="cc-loyalty-section-heading">
          <span>Selected in this conversation</span>
          <h2 id="cc-loyalty-review-title">Trip selections</h2>
        </div>
        <CardCarousel label="Trip selections" itemName="trip selection" className="cc-loyalty-selections">
          {data.flight ? (
            <article className="cc-loyalty-selection">
              <span>
                Current Nuitee flight selection
              </span>
              <h3>Selected flight</h3>
              <strong>
                {money(data.flight.searchPrice.total, data.flight.searchPrice.currency)}
              </strong>
              <p>{data.flight.disclosure}</p>
              {data.flight.expiresAt ? <small>Offer expiry: {data.flight.expiresAt}</small> : null}
            </article>
          ) : null}
          {data.stay ? (
            <article className="cc-loyalty-selection">
              <span>{data.stay.dataSource === 'live_nuitee' ? 'Current Nuitee hotel selection' : 'Hotel selection'}</span>
              <h3>{data.stay.propertyName}</h3>
              <span>{data.stay.city}</span>
              <strong>
                {money(data.stay.staySubtotal.amount, data.stay.staySubtotal.currency)}
              </strong>
              <p>
                {data.stay.nights} {data.stay.nights === 1 ? 'night' : 'nights'} ·{' '}
                {data.stay.rooms} {data.stay.rooms === 1 ? 'room' : 'rooms'} ·{' '}
                {data.stay.checkInDate} to {data.stay.checkOutDate}
              </p>
            </article>
          ) : null}
        </CardCarousel>
      </section>

      <LoyaltySummary loyalty={data.loyalty} locale={locale} />
      <p className="cc-loyalty-footer">
        Planning only · {data.stay?.dataSource === 'illustrative' ? 'stay and rewards are examples' : 'rewards are examples'}; not a bookable package total. Nothing booked, held, paid, or redeemed.
      </p>
    </Flow>
  );
}

export function LoyaltyOverviewView({
  data,
  state,
  locale = 'en-CA',
}: {
  readonly data?: LoyaltyData;
  readonly state?: LoyaltyState;
  readonly theme: 'light' | 'dark';
  readonly locale?: string;
}) {
  if (state === 'loading') {
    return <LoyaltySkeleton />;
  }

  const frameClassName = 'cc-app cc-loyalty';
  if (state === 'error') {
    return (
      <Frame className={frameClassName} displayMode="auto" title="Wayfare Rewards">
        <Feedback status="error">
          The loyalty experience could not load. No account, points, booking, or payment was changed.
        </Feedback>
      </Frame>
    );
  }
  if (state === 'malformed' || !data) {
    return (
      <Frame className={frameClassName} displayMode="auto" title="Wayfare Rewards">
        <Feedback status="error">
          The result was incomplete, so no balance, benefit, or trip value was inferred.
        </Feedback>
      </Frame>
    );
  }

  const review = isDemoTripReview(data);
  return (
    <Frame
      className={frameClassName}
      displayMode="auto"
      title={review ? 'Trip and rewards review' : 'Wayfare Rewards'}
      subtitle={review ? 'Selected travel and rewards' : 'Rewards overview'}
      data-llm={data.fallback}
    >
      {review ? (
        <TripReview data={data} locale={locale} />
      ) : (
        <Overview data={data} locale={locale} />
      )}
    </Frame>
  );
}

export default function LoyaltyOverview() {
  const ready = useWidgetReady();
  const layout = useLayout();
  const toolInfo = useToolInfo();
  const pending = !ready || Object.keys(toolInfo).length === 0;
  const structured = toolInfo.structuredContent;
  const data = isDemoLoyaltyOverview(structured)
    ? structured
    : isDemoTripReview(structured)
      ? structured
      : undefined;

  return (
    <LoyaltyOverviewView
      data={data}
      state={pending ? 'loading' : toolInfo.isError ? 'error' : data ? undefined : 'malformed'}
      theme={layout.theme === 'dark' ? 'dark' : 'light'}
      locale={layout.locale ?? 'en-CA'}
    />
  );
}
