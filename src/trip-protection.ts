export type TripProtectionInput = {
  kind: 'prepare' | 'select' | 'review' | 'acknowledge';
  review?: unknown;
  comparison?: unknown;
  state?: unknown;
  readOk?: boolean;
  tripReadOk?: boolean;
  requestedAt?: string;
  action?: 'select' | 'remove';
  comparisonId?: string;
  planId?: string;
  proposal?: unknown;
  patchOk?: boolean;
};

/** Self-contained for serialized compute. All state and comparison records are server-owned. */
export function runTripProtection(input: TripProtectionInput): Record<string, unknown> {
  type ObjectValue = Record<string, unknown>;
  const ttl = 30 * 60 * 1000;
  const record = (value: unknown): ObjectValue | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : undefined;
  const text = (value: unknown, min: number, max: number): value is string => typeof value === 'string' && value.trim().length >= min && value.length <= max;
  const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
  const id = (value: unknown, prefix: string): value is string => typeof value === 'string' && new RegExp(`^${prefix}_[a-f0-9]{32}$`).test(value);
  const currency = (value: unknown): value is string => typeof value === 'string' && ['CAD', 'USD', 'EUR', 'GBP'].includes(value);
  // Noodle compute has no ambient Date. Validate supplied UTC instants and
  // derive their expiry using the same integer calendar math as demo-runtime.
  const dayNumber = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    const adjustedYear = year! - (month! <= 2 ? 1 : 0);
    const era = Math.floor(adjustedYear / 400);
    const yearOfEra = adjustedYear - era * 400;
    const shiftedMonth = month! + (month! > 2 ? -3 : 9);
    const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day! - 1;
    return era * 146097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  };
  const dateFromDayNumber = (value: number) => {
    const era = Math.floor(value / 146097);
    const dayOfEra = value - era * 146097;
    const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365);
    let year = yearOfEra + era * 400;
    const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
    const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
    const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
    const month = shiftedMonth + (shiftedMonth < 10 ? 3 : -9);
    year += month <= 2 ? 1 : 0;
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };
  const epochDay = dayNumber('1970-01-01');
  const calendar = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const day = dayNumber(value);
    return dateFromDayNumber(day) === value ? (day - epochDay) * 86_400_000 : NaN;
  };
  const time = (value: unknown) => {
    const parts = text(value, 1, 64) ? /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/.exec(value) : null;
    if (!parts) return NaN;
    const day = calendar(parts[1]);
    const hours = Number(parts[2]), minutes = Number(parts[3]), seconds = Number(parts[4]);
    if (!Number.isFinite(day) || hours > 23 || minutes > 59 || seconds > 59) return NaN;
    return day + hours * 3_600_000 + minutes * 60_000 + seconds * 1_000 + Number((parts[5] ?? '').padEnd(3, '0').slice(0, 3));
  };
  const formatInstant = (value: number) => {
    const days = Math.floor(value / 86_400_000);
    const withinDay = value - days * 86_400_000;
    const hours = Math.floor(withinDay / 3_600_000);
    const minutes = Math.floor((withinDay % 3_600_000) / 60_000);
    const seconds = Math.floor((withinDay % 60_000) / 1_000);
    const millis = withinDay % 1_000;
    return `${dateFromDayNumber(days + epochDay)}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}Z`;
  };
  const fields = (value: ObjectValue, names: string[]) => Object.fromEntries(names.filter(name => value[name] !== undefined).map(name => [name, value[name]]));
  const strings = (value: unknown, countMin: number, countMax: number, min: number, max: number): value is string[] =>
    Array.isArray(value) && value.length >= countMin && value.length <= countMax && value.every(item => text(item, min, max));
  const money = (value: unknown, unit: string, max: number) => {
    const item = record(value);
    return item && item.currency === unit && typeof item.amount === 'number' && Number.isFinite(item.amount)
      && item.amount >= 0 && item.amount <= max ? fields(item, ['amount', 'currency']) : undefined;
  };
  const search = (value: unknown): ObjectValue | undefined => {
    const item = record(value);
    if (!item || !text(item.destination, 2, 100) || !currency(item.currency)
      || !integer(item.adults, 1, 8) || !integer(item.children, 0, 6) || item.adults + item.children > 8
      || typeof item.residenceCountry !== 'string' || !/^[A-Z]{2}$/.test(item.residenceCountry)) return undefined;
    const duration = calendar(item.returnDate) - calendar(item.departureDate);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 90 * 86_400_000) return undefined;
    if (item.estimatedTripCost !== undefined && (typeof item.estimatedTripCost !== 'number'
      || !Number.isFinite(item.estimatedTripCost) || item.estimatedTripCost < 0 || item.estimatedTripCost > 1_000_000)) return undefined;
    return fields(item, ['destination', 'departureDate', 'returnDate', 'adults', 'children', 'residenceCountry', 'currency', 'estimatedTripCost']);
  };
  const plan = (value: unknown, unit: string): ObjectValue | undefined => {
    const item = record(value);
    if (!item || !id(item.planId, 'inplan') || item.dataSource !== 'illustrative'
      || !text(item.name, 2, 80) || !text(item.summary, 20, 180)
      || !strings(item.highlights, 1, 5, 2, 120) || !strings(item.exclusions, 1, 5, 20, 180)
      || !Array.isArray(item.coverages) || item.coverages.length < 4 || item.coverages.length > 6) return undefined;
    const illustrativePrice = money(item.illustrativePrice, unit, 1_000_000);
    const deductible = money(item.deductible, unit, 1_000_000);
    const coverages = item.coverages.map(value => {
      const coverage = record(value);
      if (!coverage || !text(coverage.name, 2, 80) || !text(coverage.summary, 20, 180)
        || (coverage.basis !== 'per_traveler' && coverage.basis !== 'per_trip')) return undefined;
      const limit = money(coverage.limit, unit, 10_000_000);
      return limit ? { ...fields(coverage, ['name', 'basis', 'summary']), limit } : undefined;
    });
    if (!illustrativePrice || !deductible || coverages.some(value => !value)) return undefined;
    return { ...fields(item, ['planId', 'dataSource', 'name', 'summary']), illustrativePrice, deductible, coverages,
      highlights: [...item.highlights], exclusions: [...item.exclusions] };
  };
  const comparison = (value: unknown): ObjectValue | undefined => {
    const item = record(value);
    const context = search(item?.searchContext);
    if (!item || !context || !id(item.comparisonId, 'inscmp') || item.status !== 'success' || item.dataSource !== 'illustrative'
      || !text(item.disclosure, 40, 420) || !text(item.message, 2, 320) || !text(item.fallback, 40, 700)
      || !strings(item.assumptions, 1, 6, 20, 180) || !Array.isArray(item.plans) || item.plans.length !== 3) return undefined;
    const plans = item.plans.map(value => plan(value, context.currency as string));
    if (plans.some(value => !value) || new Set(plans.map(value => value!.planId)).size !== plans.length) return undefined;
    return { ...fields(item, ['status', 'dataSource', 'disclosure', 'message', 'fallback', 'comparisonId']),
      searchContext: context, assumptions: [...item.assumptions], plans };
  };
  const selection = (value: unknown): ObjectValue | undefined => {
    const item = record(value);
    const context = search(item?.searchContext);
    const chosen = context && plan(item?.plan, context.currency as string);
    if (!item || !context || !chosen || !id(item.comparisonId, 'inscmp') || !text(item.tripKey, 1, 3000)) return undefined;
    const duration = time(item.expiresAt) - time(item.addedAt);
    if (!Number.isFinite(duration) || duration <= 0 || duration > ttl) return undefined;
    return { ...fields(item, ['comparisonId', 'tripKey', 'addedAt', 'expiresAt']), plan: chosen, searchContext: context };
  };
  const conflict = 'Your trip changed before this protection choice could be saved. Review your trip, then try again.';
  if (input.kind === 'acknowledge') {
    const proposal = record(input.proposal);
    const chosen = selection(proposal?.selection);
    const status = proposal?.status;
    const message = proposal?.message;
    const selectedStatus = status === 'selected' || status === 'already_selected';
    const mutation = status === 'selected' || status === 'removed';
    const supported = selectedStatus || (typeof status === 'string' && ['removed', 'unavailable', 'conflict', 'expired'].includes(status));
    if (!supported || !text(message, 1, 240) || (selectedStatus && !chosen) || (mutation && input.patchOk !== true)) {
      return { status: 'conflict', message: conflict };
    }
    return { status, message, ...(selectedStatus ? { selection: chosen } : {}) };
  }

  const now = time(input.requestedAt);
  const clockOk = Number.isFinite(now) && now <= time('9999-12-31T23:59:59.999Z') - ttl;
  const rawState = input.state === undefined ? {} : record(input.state);
  const rawComparison = record(rawState?.comparison);
  const cachedResult = comparison(rawComparison?.result);
  const cacheDuration = time(rawComparison?.expiresAt) - time(rawComparison?.createdAt);
  const cached = rawComparison && cachedResult && text(rawComparison.tripKey, 1, 3000) && cacheDuration === ttl
    ? { tripKey: rawComparison.tripKey, createdAt: rawComparison.createdAt, expiresAt: rawComparison.expiresAt, result: cachedResult } : undefined;
  const saved = selection(rawState?.selected);
  const stateOk = Boolean(rawState)
    && (rawState!.comparison === undefined || rawState!.comparison === null || Boolean(cached))
    && (rawState!.selected === undefined || rawState!.selected === null || Boolean(saved));
  const reversed = Boolean((cached && now < time(cached.createdAt)) || (saved && now < time(saved.addedAt)));
  const available = input.readOk === true && input.tripReadOk === true && clockOk && stateOk && !reversed;

  const review = record(input.review);
  const context = record(review?.planningContext);
  const flight = record(review?.flight);
  const stay = record(review?.stay);
  const experiences = Array.isArray(review?.experiences) ? review.experiences : [];
  const experiencesValid = (review?.experiences === undefined || Array.isArray(review.experiences))
    && experiences.length <= 8 && experiences.every(value => id(record(value)?.selectionId, 'esel'));
  const tripIds = {
    flight: flight?.selectionId ?? null,
    stay: stay?.selectionId ?? null,
    experiences: experiencesValid ? experiences.map(value => record(value)!.selectionId as string).sort() : [],
  };
  const idsOk = (review?.flight === undefined || id(flight?.selectionId, 'sel'))
    && (review?.stay === undefined || id(stay?.selectionId, 'hsel')) && experiencesValid
    && new Set(tripIds.experiences).size === tripIds.experiences.length
    && Boolean(tripIds.flight || tripIds.stay || tripIds.experiences.length);
  const activity = context?.dateBasis === 'flight_departure' && context.activityDates !== undefined ? record(context.activityDates) : undefined;
  const startDate = activity ? activity.startDate : context?.startDate;
  const endDate = activity ? activity.endDate : context?.endDate;
  const duration = calendar(endDate) - calendar(startDate);
  const contextOk = Boolean(context) && typeof context!.source === 'string' && ['flight', 'stay', 'experience'].includes(context!.source)
    && typeof context!.dateBasis === 'string' && ['flight_departure', 'stay', 'experience_search'].includes(context!.dateBasis)
    && text(context!.destination, 2, 100) && integer(context!.adults, 1, 8) && integer(context!.children, 0, 6)
    && (context!.adults as number) + (context!.children as number) <= 8
    && (context!.infants === undefined || context!.infants === 0) && currency(context!.currency)
    && Number.isFinite(duration) && duration > 0 && duration <= 90 * 86_400_000
    && !(context!.dateBasis === 'flight_departure' && context!.activityDates !== undefined && !activity);
  const relevant = contextOk ? { source: context!.source, dateBasis: context!.dateBasis,
    destination: (context!.destination as string).trim().toUpperCase(), startDate, endDate,
    adults: context!.adults, children: context!.children, infants: 0, currency: context!.currency } : undefined;
  const tripKey = idsOk && relevant ? JSON.stringify({ ...tripIds, context: relevant }) : undefined;
  const tripOk = Boolean(tripKey && tripKey.length <= 3000);
  const matches = (value: unknown) => {
    const candidate = record(value);
    return Boolean(relevant && candidate && typeof candidate.destination === 'string'
      && candidate.destination.trim().toUpperCase() === relevant.destination
      && candidate.departureDate === relevant.startDate && candidate.returnDate === relevant.endDate
      && candidate.adults === relevant.adults && candidate.children === relevant.children && candidate.currency === relevant.currency);
  };
  const currentSelection = saved && time(saved.expiresAt) > now && saved.tripKey === tripKey && matches(saved.searchContext) ? saved : undefined;
  const unavailableMessage = 'Protection choices could not be checked. Review your trip, then try again.';
  const contextMessage = 'Protection examples need your selected trip’s destination, start and end dates, party and supported currency.';
  if (input.kind === 'review') {
    if (!available) return { note: unavailableMessage };
    if (!saved) return {};
    if (time(saved.expiresAt) <= now) return { note: 'Your protection example expired. Compare current examples to add a planning choice.' };
    if (!tripOk || !currentSelection) return { note: 'Your trip changed. Compare protection examples again for the current plan.' };
    return { selection: currentSelection };
  }
  if (input.kind === 'prepare') {
    if (!available) return { canSelect: false, message: unavailableMessage, mayWrite: false };
    const result = comparison(input.comparison);
    if (!tripOk) return { canSelect: false, message: contextMessage, mayWrite: false };
    if (!result || !matches(result.searchContext)) return { canSelect: false,
      message: 'These protection examples do not match your current trip. Compare again from your trip review.', mayWrite: false };
    return { canSelect: true, message: 'You can add one fictional protection concept to your plan. You are not insured.', mayWrite: true,
      nextState: { comparison: { result, tripKey, createdAt: formatInstant(now), expiresAt: formatInstant(now + ttl) },
        // State patches merge fields, so omission would retain an older choice.
        selected: currentSelection ?? null } };
  }

  const failure = (status: string, message: string) => ({ status, message, mayWrite: false });
  if (!available) return failure('unavailable', unavailableMessage);
  if (!tripOk) return failure('unavailable', contextMessage);
  if (!id(input.comparisonId, 'inscmp') || !id(input.planId, 'inplan') || (input.action !== 'select' && input.action !== 'remove')) {
    return failure('unavailable', 'Choose a returned protection example from your current trip review.');
  }
  const sameSelection = saved?.comparisonId === input.comparisonId && record(saved?.plan)?.planId === input.planId;
  if ((saved && time(saved.expiresAt) > now && saved.tripKey !== tripKey) || (cached && cached.tripKey !== tripKey)) return failure('conflict', conflict);
  if (input.action === 'remove') {
    if (!saved) return failure('unavailable', 'There is no current protection choice to remove.');
    if (sameSelection && time(saved.expiresAt) <= now) return failure('expired', 'That protection example expired. Compare current examples before choosing again.');
    if (!sameSelection || !currentSelection) return failure('conflict', conflict);
    return { status: 'removed', message: 'The fictional protection choice was removed from your plan.', mayWrite: true,
      nextState: { comparison: cached && time(cached.expiresAt) > now ? cached : null, selected: null } };
  }
  if (sameSelection && currentSelection) return { status: 'already_selected',
    message: 'This fictional protection concept is already in your plan. You are not insured.', selection: currentSelection, mayWrite: false };
  if (!cached || cached.result.comparisonId !== input.comparisonId) return failure('unavailable', 'That protection example is not in your current comparison. Compare again.');
  if (time(cached.expiresAt) <= now) return failure('expired', 'That protection comparison expired. Compare current examples before choosing again.');
  if (!matches(cached.result.searchContext)) return failure('conflict', conflict);
  const chosen = (cached.result.plans as ObjectValue[]).find(value => value.planId === input.planId);
  if (!chosen) return failure('unavailable', 'That protection example is not in your current comparison. Compare again.');
  const selected = { comparisonId: input.comparisonId, plan: chosen, searchContext: cached.result.searchContext,
    tripKey, addedAt: formatInstant(now), expiresAt: cached.expiresAt };
  return { status: 'selected', message: 'The fictional protection concept was added to your plan. You are not insured.',
    selection: selected, nextState: { comparison: cached, selected }, mayWrite: true };
}
