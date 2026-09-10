export type TripEstimateItem = {
  component: 'flight' | 'stay' | 'experience' | 'protection' | 'car';
  label: string;
  source: 'provider_search' | 'fictional';
  currency?: string;
  fractionDigits?: number;
  amountMinor?: number;
  /** Native major-unit amount retained even when arithmetic precision is unknown. */
  amount?: number;
};
export type TripPlanningEstimate = {
  status: 'complete' | 'mixed_currencies' | 'incomplete' | 'empty';
  items: TripEstimateItem[];
  currency?: string;
  fractionDigits?: number;
  totalMinor?: number;
  providerSubtotalMinor?: number;
  fictionalSubtotalMinor?: number;
};

// Self-contained for the Noodle compute boundary and shared by the actual UI.
// No FX lookup, points deduction, per-person multiplication or invented fees.
export function tripPlanningEstimate(input: { review: unknown; protection?: unknown }): TripPlanningEstimate {
  const record = (value: unknown): Record<string, unknown> | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  const review = record(input.review) ?? {};
  const items: TripEstimateItem[] = [];
  // These are the currencies supported by this starter's combined demo plan.
  // Other flight currencies remain visible but cannot receive a guessed scale.
  const precision: Record<string, number> = { CAD: 2, USD: 2, EUR: 2, GBP: 2, JPY: 0 };
  const append = (component: TripEstimateItem['component'], label: string, source: TripEstimateItem['source'], value: unknown, key: string, isMinor = false) => {
    const price = record(value);
    const currency = typeof price?.currency === 'string' && /^[A-Z]{3}$/.test(price.currency) ? price.currency : undefined;
    const fractionDigits = currency ? precision[currency] : undefined;
    const amount = price?.[key];
    const scaled = typeof amount === 'number' && fractionDigits !== undefined ? amount * (isMinor ? 1 : 10 ** fractionDigits) : NaN;
    const valid = typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 && amount <= 100_000_000
      && Number.isSafeInteger(Math.round(scaled)) && Math.abs(scaled - Math.round(scaled)) < 0.000001;
    const nativeAmount = !isMinor && typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 && amount <= 100_000_000 ? amount : undefined;
    items.push({ component, label, source, ...(currency ? { currency } : {}), ...(fractionDigits !== undefined ? { fractionDigits } : {}), ...(nativeAmount !== undefined ? { amount: nativeAmount } : {}), ...(valid ? { amountMinor: Math.round(scaled) } : {}) });
  };
  if (review.flight !== undefined) append('flight', 'Flight', 'provider_search', record(review.flight)?.searchPrice, 'total');
  if (review.stay !== undefined) append('stay', 'Stay', record(review.stay)?.dataSource === 'live_nuitee' ? 'provider_search' : 'fictional', record(review.stay)?.staySubtotal, 'amount');
  if (Array.isArray(review.experiences)) for (const selection of review.experiences.slice(0, 8)) {
    const title = record(record(selection)?.experience)?.title;
    append('experience', typeof title === 'string' && title.length <= 100 ? title : 'Experience', 'fictional', record(selection)?.totalPrice, 'amountMinor', true);
  }
  const protection = record(input.protection ?? review.protection);
  if (review.car !== undefined) append('car', 'Car rental', 'fictional', record(review.car)?.totalPrice, 'amount');
  if (protection) append('protection', 'Protection', 'fictional', record(protection.plan)?.illustrativePrice, 'amount');
  if (!items.length) return { status: 'empty', items };
  if (items.some(item => item.amountMinor === undefined)) return { status: 'incomplete', items };
  if (new Set(items.map(item => item.currency)).size !== 1) return { status: 'mixed_currencies', items };
  const providerSubtotalMinor = items.reduce((sum, item) => sum + (item.source === 'provider_search' ? item.amountMinor! : 0), 0);
  const fictionalSubtotalMinor = items.reduce((sum, item) => sum + (item.source === 'fictional' ? item.amountMinor! : 0), 0);
  return { status: 'complete', items, currency: items[0]!.currency, fractionDigits: items[0]!.fractionDigits,
    totalMinor: providerSubtotalMinor + fictionalSubtotalMinor, providerSubtotalMinor, fictionalSubtotalMinor };
}
