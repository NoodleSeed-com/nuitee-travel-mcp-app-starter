import '@fontsource-variable/host-grotesk';
import '@noodleseed/one/react/styles.css';
import { useEffect, useState } from 'react';
import { useHorizontalSwipe } from './card-carousel.js';
import {
  Action,
  Feedback,
  Flow,
  Frame,
  useLayout,
  useToolInfo,
  useWidgetReady,
} from '../helpers.js';
import type {
  DemoRewardFlightOption,
  DemoRewardFlightSearchOutput,
} from '../demo-schemas.js';
import { ArrowLeftIcon, PlaneIcon } from './icons.js';
import './travel.css';

type RewardFlightState = 'loading' | 'error' | 'malformed';

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;

const boundedString = (value: unknown, minimum: number, maximum: number): value is string =>
  typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum;

const boundedInteger = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;

const isCurrency = (value: unknown) => value === 'CAD' || value === 'USD' || value === 'EUR';
const isDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function isRewardFlightOption(value: unknown, availablePoints: number): value is DemoRewardFlightOption {
  const option = record(value);
  const route = record(option?.route);
  const taxes = record(option?.estimatedTaxes);
  return Boolean(
    option &&
    route &&
    taxes &&
    option.dataSource === 'illustrative' &&
    typeof option.optionId === 'string' &&
    /^rwd_[a-f0-9]{32}$/.test(option.optionId) &&
    boundedString(route.origin, 2, 80) &&
    boundedString(route.destination, 2, 80) &&
    (option.departureDate === undefined || isDate(option.departureDate)) &&
    (option.cabinClass === 'ECONOMY' || option.cabinClass === 'PREMIUM_ECONOMY') &&
    boundedString(option.partnerLabel, 2, 80) &&
    boundedInteger(option.stops, 0, 2) &&
    boundedInteger(option.durationMinutes, 30, 1_440) &&
    boundedInteger(option.pointsPerAdult, 1, 1_000_000) &&
    boundedInteger(option.totalPoints, 1, availablePoints) &&
    typeof taxes.amount === 'number' && Number.isFinite(taxes.amount) && taxes.amount >= 0 &&
    isCurrency(taxes.currency) &&
    boundedInteger(option.balanceAfter, 0, 1_000_000) &&
    option.balanceAfter === availablePoints - option.totalPoints &&
    Array.isArray(option.notes) &&
    option.notes.length <= 4 &&
    option.notes.every((note) => boundedString(note, 2, 120))
  );
}

export function isDemoRewardFlightSearchOutput(
  value: unknown,
): value is DemoRewardFlightSearchOutput {
  const root = record(value);
  const context = record(root?.searchContext);
  const points = record(root?.pointsContext);
  if (
    !root ||
    !context ||
    !points ||
    (root.status !== 'success' && root.status !== 'empty') ||
    root.dataSource !== 'illustrative' ||
    !boundedString(root.disclosure, 20, 320) ||
    !boundedString(root.message, 2, 320) ||
    !boundedString(root.fallback, 20, 500) ||
    typeof root.searchId !== 'string' ||
    !/^rsearch_[a-f0-9]{32}$/.test(root.searchId) ||
    !boundedString(context.origin, 2, 80) ||
    (context.destination !== undefined && !boundedString(context.destination, 2, 80)) ||
    (context.departureDate !== undefined && !isDate(context.departureDate)) ||
    !boundedInteger(context.adults, 1, 8) ||
    (context.cabinClass !== 'ECONOMY' && context.cabinClass !== 'PREMIUM_ECONOMY') ||
    !boundedInteger(context.pointsBudget, 5_000, 1_000_000) ||
    !isCurrency(context.currency) ||
    !boundedInteger(points.available, 5_000, 1_000_000) ||
    points.source !== 'illustrative_profile' ||
    points.available !== context.pointsBudget ||
    !Array.isArray(root.options) ||
    root.options.length > 6 ||
    (root.status === 'success' && root.options.length === 0) ||
    (root.status === 'empty' && root.options.length !== 0)
  ) {
    return false;
  }
  return root.options.every((option) => isRewardFlightOption(option, points.available as number));
}

function RewardFlightCard({ option, locale }: {
  readonly option: DemoRewardFlightOption;
  readonly locale: string;
}) {
  const points = new Intl.NumberFormat(locale);
  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: option.estimatedTaxes.currency,
  });
  const hours = Math.floor(option.durationMinutes / 60);
  const minutes = option.durationMinutes % 60;
  return (
    <article className="cc-reward-flight-card">
      <header className="cc-reward-flight-card-header">
        <div className="cc-reward-flight-partner-mark" aria-hidden="true"><PlaneIcon /></div>
        <div>
          <strong>{option.partnerLabel}</strong>
          <span>{option.cabinClass === 'PREMIUM_ECONOMY' ? 'Premium economy' : 'Economy'}</span>
        </div>
      </header>

      <div className="cc-reward-flight-route">
        <div><span>From</span><strong>{option.route.origin}</strong></div>
        <PlaneIcon />
        <div><span>To</span><strong>{option.route.destination}</strong></div>
      </div>

      <dl className="cc-reward-flight-facts">
        <div><dt>Travel date</dt><dd>{option.departureDate ?? 'Flexible-date idea'}</dd></div>
        <div><dt>Stops</dt><dd>{option.stops === 0 ? 'Nonstop' : `${option.stops} stop${option.stops === 1 ? '' : 's'}`}</dd></div>
        <div><dt>Travel time</dt><dd>{hours}h {minutes ? `${minutes}m` : ''}</dd></div>
      </dl>

      <div className="cc-reward-flight-points">
        <div>
          <span>Total points</span>
          <strong>{points.format(option.totalPoints)} points</strong>
          <small>{points.format(option.pointsPerAdult)} per adult</small>
        </div>
        <div>
          <span>Estimated taxes</span>
          <strong>{money.format(option.estimatedTaxes.amount)}</strong>
        </div>
      </div>

      <footer className="cc-reward-flight-card-footer">
        <span>{points.format(option.balanceAfter)} points would remain</span>
      </footer>
    </article>
  );
}

function RewardFlightCarousel({ options, locale }: {
  readonly options: readonly DemoRewardFlightOption[];
  readonly locale: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const lastIndex = Math.max(0, options.length - 1);
  useEffect(() => setActiveIndex((current) => Math.min(current, lastIndex)), [lastIndex]);
  const moveTo = (index: number) => setActiveIndex(Math.max(0, Math.min(lastIndex, index)));
  const active = options[activeIndex] ?? options[0]!;
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < lastIndex;
  const peekIndex = hasNext ? activeIndex + 1 : activeIndex - 1;
  const peek = options[peekIndex] ?? active;
  const previousPeek = !hasNext && hasPrevious;
  const swipe = useHorizontalSwipe(direction => moveTo(activeIndex + direction));

  return (
    <section
      aria-label="Reward flight ideas carousel"
      className="cc-reward-flight-carousel"
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        moveTo(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
      }}
    >
      <div className="cc-reward-flight-carousel-count" aria-live="polite" role="status">
        Idea {activeIndex + 1} of {options.length}
      </div>
      <div className="cc-reward-flight-carousel-stage" {...swipe}>
        <Action
          aria-label="Previous reward flight"
          className="cc-reward-flight-arrow cc-reward-flight-arrow-previous"
          disabled={!hasPrevious}
          onClick={() => moveTo(activeIndex - 1)}
          variant="quiet"
        >
          <ArrowLeftIcon />
        </Action>
        <div className="cc-reward-flight-carousel-window">
          <div className={`cc-reward-flight-carousel-track ${previousPeek ? 'cc-reward-flight-track-is-last' : ''}`}>
            {previousPeek ? (
              <div className="cc-reward-flight-peek-shell cc-reward-flight-previous-peek-shell">
                <div aria-hidden="true" className="cc-reward-flight-slide cc-reward-flight-peek-slide" inert>
                  <RewardFlightCard option={peek} locale={locale} />
                </div>
                <button aria-label={`Show reward-flight idea ${peekIndex + 1}`} className="cc-reward-flight-peek-target" onClick={() => moveTo(peekIndex)} type="button" />
              </div>
            ) : null}
            <div
              aria-label={`Reward-flight idea ${activeIndex + 1} of ${options.length}`}
              aria-roledescription="slide"
              className="cc-reward-flight-slide"
              key={active.optionId}
              role="region"
              tabIndex={0}
            >
              <RewardFlightCard option={active} locale={locale} />
            </div>
            {hasNext ? (
              <div className="cc-reward-flight-peek-shell">
                <div aria-hidden="true" className="cc-reward-flight-slide cc-reward-flight-peek-slide" inert>
                  <RewardFlightCard option={peek} locale={locale} />
                </div>
                <button aria-label={`Show reward-flight idea ${peekIndex + 1}`} className="cc-reward-flight-peek-target" onClick={() => moveTo(peekIndex)} type="button" />
              </div>
            ) : null}
          </div>
        </div>
        <Action
          aria-label="Next reward flight"
          className="cc-reward-flight-arrow cc-reward-flight-arrow-next"
          disabled={!hasNext}
          onClick={() => moveTo(activeIndex + 1)}
          variant="quiet"
        >
          <ArrowLeftIcon />
        </Action>
      </div>
    </section>
  );
}

function RewardFlightSkeleton() {
  return (
    <Frame
      className="cc-app cc-reward-flights"
      displayMode="auto"
      title="Reward flights"
      subtitle="Comparing points ideas"
    >
      <section className="cc-reward-flight-skeleton" role="status" aria-live="polite" aria-busy="true">
        <span className="cc-visually-hidden">Preparing reward-flight ideas…</span>
        <div className="cc-reward-flight-disclosure" aria-hidden="true">
          <span className="cc-skeleton-block cc-shimmer" />
          <span className="cc-skeleton-block cc-shimmer" />
        </div>
        <div className="cc-reward-flight-carousel" aria-hidden="true">
          <div className="cc-reward-flight-carousel-stage">
            <span className="cc-reward-flight-arrow cc-reward-flight-arrow-previous" />
            <div className="cc-reward-flight-carousel-window">
              <div className="cc-reward-flight-carousel-track">
                <div className="cc-reward-flight-slide"><span className="cc-reward-flight-skeleton-card cc-shimmer" /></div>
                <div className="cc-reward-flight-peek-shell"><div className="cc-reward-flight-slide cc-reward-flight-peek-slide"><span className="cc-reward-flight-skeleton-card cc-shimmer" /></div></div>
              </div>
            </div>
            <span className="cc-reward-flight-arrow cc-reward-flight-arrow-next" />
          </div>
        </div>
      </section>
    </Frame>
  );
}

function statusView(state: RewardFlightState) {
  if (state === 'loading') return <RewardFlightSkeleton />;
  return (
    <Frame
      className="cc-app cc-reward-flights"
      displayMode="auto"
      title="Reward flights"
    >
      <Feedback status="error">
        {state === 'malformed'
          ? 'The reward-flight result was incomplete and could not be shown safely.'
          : 'The reward-flight comparison could not load.'}
      </Feedback>
      <p className="cc-reward-flight-status-note">No points, booking, payment, or account data was changed.</p>
    </Frame>
  );
}

export function RewardFlightResultsView({
  result,
  state,
  displayMode: _displayMode,
  locale = 'en-CA',
}: {
  readonly result?: DemoRewardFlightSearchOutput;
  readonly state?: RewardFlightState;
  readonly displayMode: string;
  readonly theme?: 'light' | 'dark';
  readonly locale?: string;
}) {
  if (state) return statusView(state);
  if (!result) return statusView('malformed');
  const points = new Intl.NumberFormat(locale);
  const frameClassName = 'cc-app cc-reward-flights';
  if (result.status === 'empty') {
    return (
      <Frame className={frameClassName} displayMode="auto" title="Reward flights" data-llm={result.fallback}>
        <Flow variant="stack" density="comfortable">
          <section className="cc-reward-flight-empty">
            <h2>No reward-flight ideas fit</h2>
            <p>Try a different destination or points budget.</p>
          </section>
          <p className="cc-reward-flight-boundary">Comparison only · no points were applied and no reward seat was checked or held.</p>
        </Flow>
      </Frame>
    );
  }
  return (
    <Frame
      className={frameClassName}
      displayMode="auto"
      title="Reward flights"
      subtitle={`${points.format(result.pointsContext.available)} points available`}
      data-llm={result.fallback}
    >
      <Flow variant="stack" density="compact">
        <div className="cc-reward-flight-toolbar">
          <div><span>Starting point</span><strong>{result.searchContext.origin}</strong></div>
          <div><span>Points budget</span><strong>{points.format(result.pointsContext.available)} points available</strong></div>
        </div>
        <RewardFlightCarousel options={result.options} locale={locale} />
        <p className="cc-reward-flight-boundary">Comparison only · no points were applied and no reward seat was checked or held.</p>
      </Flow>
    </Frame>
  );
}

export default function RewardFlightResults() {
  const ready = useWidgetReady();
  const layout = useLayout();
  const toolInfo = useToolInfo('compare_reward_flights');
  const pending = !ready || Object.keys(toolInfo).length === 0;
  const result = isDemoRewardFlightSearchOutput(toolInfo.structuredContent)
    ? toolInfo.structuredContent
    : undefined;
  return (
    <RewardFlightResultsView
      result={result}
      state={pending ? 'loading' : toolInfo.isError ? 'error' : result ? undefined : 'malformed'}
      displayMode={layout.displayMode}
      theme={layout.theme === 'dark' ? 'dark' : 'light'}
      locale={layout.locale ?? 'en-CA'}
    />
  );
}
