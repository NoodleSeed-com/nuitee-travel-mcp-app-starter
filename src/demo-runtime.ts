export type DemoGatewayInput =
  | {
      readonly kind: 'search';
      readonly search: Readonly<Record<string, unknown>>;
      readonly catalog: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>;
      readonly aliases: Readonly<Record<string, string>>;
    }
  | {
      readonly kind: 'review';
      readonly flightState: unknown;
      readonly hotelState: unknown;
      readonly experienceState?: unknown;
      readonly experienceReadOk?: boolean;
      readonly requestedAt?: string;
      readonly aliases?: Readonly<Record<string, string>>;
      readonly loyalty: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: 'reward_search';
      readonly rewardSearch: Readonly<Record<string, unknown>>;
      readonly rewardCatalog?: readonly Readonly<Record<string, unknown>>[];
    }
  | {
      readonly kind: 'insurance_compare';
      readonly insuranceComparison: Readonly<Record<string, unknown>>;
      readonly insuranceCatalog?: readonly Readonly<Record<string, unknown>>[];
    }
  | {
      readonly kind: 'experience_search';
      readonly experienceSearch: Readonly<Record<string, unknown>>;
      readonly experienceCatalog: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>;
      readonly experienceAliases: Readonly<Record<string, string>>;
      readonly experienceState?: unknown;
      readonly experienceReadOk?: boolean;
      readonly requestedAt?: string;
    }
  | {
      readonly kind: 'experience_select';
      readonly experienceState?: unknown;
      readonly experienceReadOk?: boolean;
      readonly experienceId: string;
      readonly slotId: string;
      readonly requestedAt: string;
    }
  | {
      readonly kind: 'select';
      readonly selectionId: string;
      readonly hotelState: unknown;
    };

export type DemoGatewayResult = Readonly<Record<string, unknown>>;

/**
 * Sandboxed Noodle compute entrypoint. Everything used at runtime stays inside
 * this function because Noodle serializes `run` without module imports or
 * closure state.
 */
export function runDemoGateway(input: DemoGatewayInput): DemoGatewayResult {
  const record = (value: unknown): Record<string, unknown> | undefined =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  const array = (value: unknown): readonly unknown[] => Array.isArray(value) ? value : [];
  const string = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;
  const number = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  const opaque = (
    prefix: 'hsearch' | 'hsel' | 'rsearch' | 'rwd' | 'inscmp' | 'inplan' | 'exsearch' | 'exp' | 'slot' | 'esel',
    value: string,
  ) => {
    let first = 2166136261;
    let second = 2246822519;
    let third = 3266489917;
    let fourth = 668265263;
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      first = Math.imul(first ^ code, 16777619) >>> 0;
      second = Math.imul(second ^ code, 3266489917) >>> 0;
      third = Math.imul(third ^ code, 668265263) >>> 0;
      fourth = Math.imul(fourth ^ code, 374761393) >>> 0;
    }
    const hex = [first, second, third, fourth]
      .map((part) => part.toString(16).padStart(8, '0'))
      .join('');
    return `${prefix}_${hex}`;
  };
  const dayNumber = (value: string) => {
    const parts = value.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const adjustedYear = year - (month <= 2 ? 1 : 0);
    const era = Math.floor(adjustedYear / 400);
    const yearOfEra = adjustedYear - era * 400;
    const shiftedMonth = month + (month > 2 ? -3 : 9);
    const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
    const dayOfEra = yearOfEra * 365
      + Math.floor(yearOfEra / 4)
      - Math.floor(yearOfEra / 100)
      + dayOfYear;
    return era * 146097 + dayOfEra;
  };
  const dateFromDayNumber = (value: number) => {
    const era = Math.floor(value / 146097);
    const dayOfEra = value - era * 146097;
    const yearOfEra = Math.floor(
      (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365,
    );
    let year = yearOfEra + era * 400;
    const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
    const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
    const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
    const month = shiftedMonth + (shiftedMonth < 10 ? 3 : -9);
    year += month <= 2 ? 1 : 0;
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };
  // Noodle compute intentionally has no ambient Date clock. Parse only the
  // explicitly supplied UTC invocation instant and use integer calendar math.
  const instantMillis = (value: string): number => {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/.exec(value);
    if (!match) return Number.NaN;
    const hours = Number(match[2]);
    const minutes = Number(match[3]);
    const seconds = Number(match[4]);
    if (hours > 23 || minutes > 59 || seconds > 59 || dateFromDayNumber(dayNumber(match[1]!)) !== match[1]) return Number.NaN;
    return (dayNumber(match[1]!) - dayNumber('1970-01-01')) * 86_400_000
      + hours * 3_600_000 + minutes * 60_000 + seconds * 1_000
      + Number((match[5] ?? '').padEnd(3, '0').slice(0, 3));
  };
  const formatInstant = (value: number): string => {
    const days = Math.floor(value / 86_400_000);
    const withinDay = value - days * 86_400_000;
    const hours = Math.floor(withinDay / 3_600_000);
    const minutes = Math.floor((withinDay % 3_600_000) / 60_000);
    const seconds = Math.floor((withinDay % 60_000) / 1_000);
    const millis = withinDay % 1_000;
    return `${dateFromDayNumber(days + dayNumber('1970-01-01'))}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}Z`;
  };

  if (input.kind === 'experience_search') {
    const search = { ...record(input.experienceSearch) };
    // Hosts may supply an empty optional string. Normalize before filtering,
    // hashing, returning context, or persisting options for later selection.
    if (typeof search.experienceName === 'string') {
      const name = search.experienceName.trim();
      if (name) search.experienceName = name;
      else delete search.experienceName;
    }
    const destination = string(search.destination) ?? '';
    const startDate = string(search.startDate) ?? '';
    const endDate = string(search.endDate) ?? '';
    const currency = string(search.currency) ?? 'CAD';
    const partySize = (number(search.adults) ?? 1) + (number(search.children) ?? 0);
    const interests = array(search.interests).filter((entry): entry is string => typeof entry === 'string');
    const stepFreeOnly = search.accessibility === 'STEP_FREE';
    // Match title words only; do not guess a winner among similar names.
    const titleWords = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(word => word && word !== 'and');
    const experienceName = string(search.experienceName);
    const requestedWords = experienceName ? titleWords(experienceName) : [];
    const canonical = input.experienceAliases[destination.trim().toUpperCase()];
    const searchId = opaque('exsearch', JSON.stringify({
      ...search,
      destination: canonical ?? destination.trim().toUpperCase(),
    }));
    const fixtures = canonical ? input.experienceCatalog[canonical] ?? [] : [];
    const firstDay = dayNumber(startDate);
    const lastDay = dayNumber(endDate);
    const matched = fixtures.map(record).filter((entry): entry is Record<string, unknown> => Boolean(entry)).filter((fixture) => {
      const categories = array(fixture.categories).filter((entry): entry is string => typeof entry === 'string');
      const matchesInterest = interests.length === 0 || interests.some((interest) => categories.includes(interest));
      const accessibility = record(fixture.accessibility) ?? {};
      const words = titleWords(string(fixture.title) ?? '');
      const matchesName = !experienceName || requestedWords.length > 0 && requestedWords.every(word => words.includes(word));
      return matchesName && matchesInterest && (!stepFreeOnly || accessibility.stepFree === true);
    });
    const experiences = matched.slice(0, 6).map((fixture) => {
      const key = string(fixture.key) ?? 'demo_experience_unknown';
      const experienceId = opaque('exp', `${searchId}:${key}`);
      const prices = record(fixture.pricesMinor) ?? {};
      const localTimes = array(fixture.localTimes).filter((entry): entry is string => typeof entry === 'string').slice(0, 2);
      const slots: Array<Record<string, unknown>> = [];
      for (let day = firstDay; day < lastDay && slots.length < 4; day += 1) {
        const date = dateFromDayNumber(day);
        for (const localTime of localTimes) {
          if (slots.length >= 4) break;
          const startLocal = `${date}T${localTime}:00`;
          const slotId = opaque('slot', `${experienceId}:${startLocal}`);
          const capacitySeed = Number.parseInt(slotId.slice(-2), 16);
          slots.push({
            slotId,
            startLocal,
            timeZone: string(fixture.timeZone) ?? 'Europe/Lisbon',
            remainingCapacity: Math.max(partySize, 4 + (capacitySeed % 9)),
            isFictional: true,
          });
        }
      }
      const accessibility = record(fixture.accessibility) ?? {};
      return {
        experienceId,
        dataSource: 'illustrative',
        source: 'WAYFARE_DEMO',
        isFictional: true,
        city: string(fixture.city) ?? destination,
        countryCode: string(fixture.countryCode) ?? 'ZZ',
        timeZone: string(fixture.timeZone) ?? 'Europe/Lisbon',
        title: string(fixture.title) ?? 'Fictional experience idea',
        operatorLabel: string(fixture.operatorLabel) ?? 'Wayfare demo operator',
        shortDescription: string(fixture.shortDescription) ?? 'A fictional Wayfare experience idea for conversation testing.',
        categories: array(fixture.categories).filter((entry): entry is string => typeof entry === 'string').slice(0, 4),
        durationMinutes: number(fixture.durationMinutes) ?? 60,
        meetingArea: string(fixture.meetingArea) ?? 'Fictional meeting area',
        accessibility: {
          stepFree: accessibility.stepFree === true,
          summary: string(accessibility.summary) ?? 'Accessibility details are not configured.',
        },
        inclusions: array(fixture.inclusions).filter((entry): entry is string => typeof entry === 'string').slice(0, 5),
        restrictions: array(fixture.restrictions).filter((entry): entry is string => typeof entry === 'string').slice(0, 3),
        cancellationPolicy: string(fixture.cancellationPolicy) ?? 'Fictional cancellation terms are not configured.',
        price: { amountMinor: number(prices[currency]) ?? 0, currency },
        slots,
      };
    }).filter((experience) => experience.slots.length > 0 && experience.price.amountMinor > 0);
    const supportedDestination = Boolean(canonical);
    const status = experiences.length > 0 ? 'success' : 'empty';
    const emptyReason = supportedDestination ? 'NO_MATCHING_EXPERIENCES' : 'UNSUPPORTED_DESTINATION';
    const destinationLabel = string(record(fixtures[0])?.city) ?? destination;
    const now = instantMillis(input.requestedAt ?? '');
    const currentState = record(input.experienceState) ?? {};
    const nextExperienceState = Number.isFinite(now) && input.experienceReadOk === true ? {
      updatedAt: input.requestedAt,
      records: experiences.map((experience) => ({
        experience,
        searchContext: search,
        createdAt: input.requestedAt,
        expiresAt: formatInstant(now + 1_800_000),
      })),
      // A new search refreshes available options, never silently clears a trip
      // or extends the lifetime of an already chosen option.
      selected: array(currentState.selected).slice(0, 8),
    } : undefined;
    return {
      kind: 'experience_search',
      mayWriteExperienceState: Boolean(nextExperienceState),
      ...(nextExperienceState ? { nextExperienceState } : {}),
      experienceResult: {
        status,
        dataSource: 'illustrative',
        source: 'WAYFARE_DEMO',
        isFictional: true,
        disclosure: 'Fictional Wayfare demo experiences. No operator inventory, capacity, admission, or live availability was checked.',
        message: status === 'success'
          ? experienceName && experiences.length === 1
            ? `${experiences[0]!.title} details are open. Choose a date and time to add it to your plan.`
            : `${experiences.length} fictional experience ideas are ready to explore for ${destinationLabel}.`
          : supportedDestination
            ? `No fictional experiences matched the requested name, interests, or accessibility filters for ${destinationLabel}.`
            : `The fictional Wayfare experience catalog is not configured for ${destinationLabel}.`,
        fallback: status === 'success'
          ? experienceName && experiences.length === 1
            ? `${experiences[0]!.title}: fictional Wayfare experience in ${destinationLabel}. Choose a date and time from the returned slots in the detail widget, or in chat if the widget is unavailable. Nothing has been added or reserved by this search.`
            : `${experiences.length} fictional Wayfare experience ideas for ${destinationLabel} from ${startDate} to ${endDate}; no live operator inventory or booking availability was checked.${experienceName ? ' More than one title matches; choose an experience before a date/time.' : ''}`
          : supportedDestination
            ? `No fictional Wayfare experiences matched the current filters for ${destinationLabel}. No provider call was made.`
            : `No fictional Wayfare experience catalog is configured for ${destinationLabel}. No provider call was made; continue with flights and hotels.`,
        searchId,
        searchContext: search,
        supportedDestination,
        ...(status === 'empty' ? { emptyReason } : {}),
        experiences,
      },
    };
  }

  if (input.kind === 'experience_select') {
    const failure = (status: string, message: string) => ({ kind: 'experience_select', experienceSelection: { status, message } });
    const state = record(input.experienceState) ?? {};
    const now = instantMillis(input.requestedAt);
    if (input.experienceReadOk !== true) return failure('unavailable', 'Your saved experience options could not be read. Try again before adding an experience.');
    if (!Number.isFinite(now)) return failure('unavailable', 'The experience options could not be checked. Search experiences again before adding one.');
    const storedSelections = array(state.selected).map(record).filter((entry): entry is Record<string, unknown> => Boolean(entry));
    const previous = storedSelections.find((entry) => record(entry.experience)?.experienceId === input.experienceId
      && record(entry.slot)?.slotId === input.slotId);
    if (previous && instantMillis(string(previous.expiresAt) ?? '') > now) {
      return { kind: 'experience_select', experienceSelection: {
        status: 'already_selected', message: 'This experience is already in your trip. It is selected, not reserved.', selection: previous,
      } };
    }
    const stored = array(state.records).map(record).find((entry) => record(entry?.experience)?.experienceId === input.experienceId);
    const experience = record(stored?.experience);
    const slot = array(experience?.slots).map(record).find((entry) => entry?.slotId === input.slotId);
    const search = record(stored?.searchContext);
    if (!stored || !experience || !slot || !search) {
      if (previous) return failure('expired', 'These experience options expired. Search again and choose a current date and time.');
      return failure('unavailable', 'That experience and time are not available in this conversation. Search experiences again.');
    }
    const createdAt = instantMillis(string(stored.createdAt) ?? '');
    const expiresAt = instantMillis(string(stored.expiresAt) ?? '');
    if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || now < createdAt || expiresAt > createdAt + 1_800_000) {
      return failure('unavailable', 'The experience options could not be checked. Search experiences again before adding one.');
    }
    if (now >= expiresAt) return failure('expired', 'These experience options expired. Search again and choose a current date and time.');
    const adults = number(search.adults);
    const children = number(search.children);
    const capacity = number(slot.remainingCapacity);
    const slotDate = string(slot.startLocal)?.slice(0, 10);
    const price = record(experience.price);
    const amount = number(price?.amountMinor);
    if (!adults || !Number.isInteger(adults) || children === undefined || !Number.isInteger(children)
      || adults < 1 || children < 0 || adults + children > 8 || capacity === undefined || capacity < adults + children
      || !slotDate || slotDate < String(search.startDate) || slotDate >= String(search.endDate)
      || slot.timeZone !== experience.timeZone || amount === undefined || !Number.isSafeInteger(amount)
      || amount <= 0 || !price || price.currency !== search.currency || amount * adults > 100_000_000) {
      return failure('unavailable', 'This option cannot accommodate the stored trip details. Search again with your dates and party size.');
    }
    if (children > 0) {
      return failure('unavailable', 'Child pricing is unknown for these fictional experiences. I cannot add a priced family selection. Clarify whether this experience is for adults only, then search again.');
    }
    const selected = storedSelections.filter((entry) => instantMillis(string(entry.expiresAt) ?? '') > now);
    const sameChoice = selected.find((entry) => {
      const savedExperience = record(entry.experience);
      const savedSearch = record(entry.searchContext);
      return savedExperience?.city === experience.city && savedExperience?.title === experience.title
        && record(entry.slot)?.startLocal === slot.startLocal && savedSearch?.adults === adults && savedSearch?.children === children;
    });
    if (sameChoice) return { kind: 'experience_select', experienceSelection: {
      status: 'already_selected', message: 'This experience is already in your trip. It is selected, not reserved.', selection: sameChoice,
    } };
    if (selected.length >= 8) return failure('limit_reached', 'This conversation can keep up to eight experience choices. Start a new trip to plan more.');
    const selection = {
      selectionId: opaque('esel', `${input.experienceId}:${input.slotId}`),
      experience, slot, searchContext: search,
      totalPrice: { amountMinor: amount * adults, currency: price.currency },
      addedAt: input.requestedAt, expiresAt: stored.expiresAt,
    };
    return {
      kind: 'experience_select',
      // Proposal only. The public tool must gate this result on patch_state.ok.
      experienceSelection: { status: 'selected', message: 'Added to your trip. This fictional experience is selected, not reserved.', selection },
      nextExperienceState: { ...state, updatedAt: input.requestedAt, selected: [...selected, selection] },
    };
  }

  if (input.kind === 'search') {
    const search = record(input.search) ?? {};
    const destination = string(search.destination) ?? '';
    const checkInDate = string(search.checkInDate) ?? '';
    const checkOutDate = string(search.checkOutDate) ?? '';
    const currency = string(search.currency) ?? 'CAD';
    const rooms = number(search.rooms) ?? 1;
    const canonical = input.aliases[destination.trim().toUpperCase()];
    const searchFingerprint = JSON.stringify({
      ...search,
      destination: canonical ?? destination.trim().toUpperCase(),
    });
    const searchId = opaque('hsearch', searchFingerprint);
    const fixtures = canonical ? input.catalog[canonical] ?? [] : [];
    const nights = dayNumber(checkOutDate) - dayNumber(checkInDate);
    const hotels = fixtures.slice(0, 10).map((fixtureValue) => {
      const fixture = record(fixtureValue) ?? {};
      const key = string(fixture.key) ?? 'demo_hotel_unknown';
      const nightly = record(fixture.nightly) ?? {};
      const nightlyAmount = number(nightly[currency]) ?? 0;
      const latitude = number(fixture.lat);
      const longitude = number(fixture.lng);
      return {
        selectionId: opaque('hsel', `${searchId}:${key}`),
        dataSource: 'illustrative',
        name: string(fixture.name) ?? 'Unavailable illustrative property',
        city: string(fixture.city) ?? destination,
        countryCode: string(fixture.countryCode) ?? 'ZZ',
        neighborhood: string(fixture.neighborhood) ?? 'Illustrative district',
        ...(latitude !== undefined && longitude !== undefined
          && latitude >= -90 && latitude <= 90
          && longitude >= -180 && longitude <= 180
          ? { lat: latitude, lng: longitude }
          : {}),
        description: string(fixture.description) ?? 'Illustrative property.',
        roomName: string(fixture.roomName) ?? 'Illustrative room',
        category: number(fixture.category) ?? 1,
        amenities: array(fixture.amenities).filter((item): item is string => typeof item === 'string').slice(0, 6),
        nights,
        rooms,
        nightlyPrice: { amount: nightlyAmount, currency },
        staySubtotal: { amount: nightlyAmount * nights * rooms, currency },
        taxesAndFeesIncluded: false,
        policySummary: string(fixture.illustrativePolicy) ?? 'Illustrative terms only; no reservation is available.',
      };
    });
    const destinationLabel = string(record(fixtures[0])?.city) ?? destination;
    const result = {
      status: hotels.length > 0 ? 'success' : 'empty',
      dataSource: 'illustrative',
      disclosure: 'Illustrative stays — these fictional properties do not represent live availability. Booking is unavailable.',
      message: hotels.length > 0
        ? `${hotels.length} synthetic stays are available to compare for ${destinationLabel}.`
        : `No synthetic stay fixtures are available for ${destinationLabel}.`,
      fallback: hotels.length > 0
        ? `${hotels.length} illustrative ${destinationLabel} stays for ${checkInDate} to ${checkOutDate}. Prices are illustrative; no live availability or reservation was checked.`
        : `No illustrative stay options are configured for ${destinationLabel}. No live hotel search was attempted.`,
      searchId,
      searchContext: search,
      hotels,
    };
    const records = hotels.map((hotel, index) => ({
      selectionId: hotel.selectionId,
      searchId,
      dataSource: 'illustrative',
      fixtureKey: string(record(fixtures[index])?.key) ?? 'demo_hotel_unknown',
      propertyName: hotel.name,
      city: hotel.city,
      checkInDate,
      checkOutDate,
      nights,
      rooms,
      staySubtotal: hotel.staySubtotal,
    }));
    return { kind: 'search', result, records };
  }

  if (input.kind === 'reward_search') {
    const search = record(input.rewardSearch) ?? {};
    const origin = string(search.origin) ?? 'Toronto';
    const destination = string(search.destination);
    const departureDate = string(search.departureDate);
    const adults = number(search.adults) ?? 1;
    const cabinClass = string(search.cabinClass) ?? 'ECONOMY';
    const pointsBudget = number(search.pointsBudget) ?? 42_500;
    const currency = string(search.currency) ?? 'CAD';
    const routedFixtures = destination ? [
      {
        destination,
        partnerLabel: 'Concept partner A',
        pointsPerAdult: 18_000,
        estimatedTaxes: { CAD: 68, USD: 49, EUR: 45 },
        stops: 0,
        durationMinutes: 420,
      },
      {
        destination,
        partnerLabel: 'Concept partner B',
        pointsPerAdult: 21_000,
        estimatedTaxes: { CAD: 82, USD: 60, EUR: 55 },
        stops: 1,
        durationMinutes: 475,
      },
      {
        destination,
        partnerLabel: 'Concept partner C',
        pointsPerAdult: 24_000,
        estimatedTaxes: { CAD: 96, USD: 70, EUR: 64 },
        stops: 1,
        durationMinutes: 510,
      },
    ] : array(input.rewardCatalog).map(record).filter((entry): entry is Record<string, unknown> => Boolean(entry));
    const searchId = opaque('rsearch', JSON.stringify(search));
    const premiumMultiplier = cabinClass === 'PREMIUM_ECONOMY' ? 1.4 : 1;
    const options = routedFixtures.map((fixture) => {
      const routeDestination = string(fixture.destination) ?? 'Illustrative destination';
      const partnerLabel = string(fixture.partnerLabel) ?? 'Concept partner';
      const basePoints = number(fixture.pointsPerAdult) ?? 1_000_000;
      const pointsPerAdult = Math.round(basePoints * premiumMultiplier / 500) * 500;
      const totalPoints = pointsPerAdult * adults;
      const taxes = record(fixture.estimatedTaxes) ?? {};
      return {
        optionId: opaque('rwd', `${searchId}:${partnerLabel}:${routeDestination}:${totalPoints}`),
        dataSource: 'illustrative',
        route: { origin, destination: routeDestination },
        ...(departureDate ? { departureDate } : {}),
        cabinClass,
        partnerLabel,
        stops: number(fixture.stops) ?? 0,
        durationMinutes: number(fixture.durationMinutes) ?? 60,
        pointsPerAdult,
        totalPoints,
        estimatedTaxes: {
          amount: (number(taxes[currency]) ?? 0) * adults,
          currency,
        },
        balanceAfter: pointsBudget - totalPoints,
        notes: [
          'Illustrative reward-seat comparison',
          'No live availability or redemption action',
        ],
      };
    }).filter((option) => option.totalPoints <= pointsBudget).slice(0, 6);
    const routeLabel = destination ? `${origin} to ${destination}` : `from ${origin}`;
    return {
      kind: 'reward_search',
      rewardResult: {
        status: options.length > 0 ? 'success' : 'empty',
        dataSource: 'illustrative',
        disclosure: 'Illustrative reward-flight comparisons only. No live reward inventory was checked, and points cannot be applied or redeemed.',
        message: options.length > 0
          ? `${options.length} illustrative reward-flight ${options.length === 1 ? 'idea fits' : 'ideas fit'} within ${pointsBudget} points.`
          : `No illustrative reward-flight option fits within ${pointsBudget} points.`,
        fallback: options.length > 0
          ? `${options.length} illustrative reward-flight ideas ${routeLabel} fit within ${pointsBudget} points. No live availability or redemption was checked.`
          : `No illustrative reward-flight option ${routeLabel} fits within ${pointsBudget} points. No live availability or redemption was checked.`,
        searchId,
        searchContext: search,
        pointsContext: { available: pointsBudget, source: 'illustrative_profile' },
        options,
      },
    };
  }

  if (input.kind === 'insurance_compare') {
    const search = record(input.insuranceComparison) ?? {};
    const destination = string(search.destination) ?? 'Illustrative destination';
    const departureDate = string(search.departureDate) ?? '';
    const returnDate = string(search.returnDate) ?? '';
    const adults = number(search.adults) ?? 1;
    const children = number(search.children) ?? 0;
    const residenceCountry = string(search.residenceCountry) ?? 'CA';
    const currency = string(search.currency) ?? 'CAD';
    const estimatedTripCost = number(search.estimatedTripCost);
    const comparisonId = opaque('inscmp', JSON.stringify(search));
    const tripDays = dayNumber(returnDate) - dayNumber(departureDate);
    const travelerUnits = adults + (children * 0.5);
    const currencyRates: Record<string, number> = {
      CAD: 1,
      USD: 0.74,
      EUR: 0.68,
      GBP: 0.58,
    };
    const currencyRate = currencyRates[currency] ?? 1;
    const moneyFromCad = (amount: number) => ({
      amount: Math.round(amount * currencyRate),
      currency,
    });
    const plans = array(input.insuranceCatalog)
      .map(record)
      .filter((entry): entry is Record<string, unknown> => Boolean(entry))
      .slice(0, 3)
      .map((fixture) => {
        const key = string(fixture.key) ?? 'demo_insurance_unknown';
        return {
          planId: opaque('inplan', `${comparisonId}:${key}`),
          dataSource: 'illustrative',
          name: string(fixture.name) ?? 'Illustrative protection concept',
          summary: string(fixture.summary) ?? 'Illustrative travel protection comparison only.',
          illustrativePrice: moneyFromCad(
            ((number(fixture.basePriceCad) ?? 0) + ((number(fixture.dailyPriceCad) ?? 0) * tripDays))
              * travelerUnits,
          ),
          deductible: moneyFromCad(number(fixture.deductibleCad) ?? 0),
          coverages: array(fixture.coverages).map((coverageValue) => {
            const coverage = record(coverageValue) ?? {};
            return {
              name: string(coverage.name) ?? 'Illustrative coverage category',
              limit: moneyFromCad(number(coverage.limitCad) ?? 0),
              basis: string(coverage.basis) ?? 'per_trip',
              summary: string(coverage.summary) ?? 'Illustrative maximum only; actual terms were not checked.',
            };
          }).slice(0, 6),
          highlights: array(fixture.highlights)
            .filter((item): item is string => typeof item === 'string')
            .slice(0, 5),
          exclusions: array(fixture.exclusions)
            .filter((item): item is string => typeof item === 'string')
            .slice(0, 5),
        };
      });
    const residenceLabel = residenceCountry === 'CA' ? 'Canada' : residenceCountry;
    return {
      kind: 'insurance_compare',
      insuranceResult: {
        status: 'success',
        dataSource: 'illustrative',
        disclosure: 'Illustrative travel protection only. This is not an insurance quote, policy, recommendation, or statement of coverage. No insurer, eligibility, availability, or policy wording was checked, and nothing can be purchased.',
        message: 'Three illustrative travel protection concepts are ready to compare.',
        fallback: `Three illustrative travel protection concepts for a ${tripDays}-day trip to ${destination} are ready to compare. No insurer, eligibility, availability, or policy wording was checked, and nothing can be purchased.`,
        comparisonId,
        searchContext: search,
        assumptions: [
          `Residence is treated as ${residenceLabel} for this illustrative comparison.`,
          `The comparison uses ${adults} adult${adults === 1 ? '' : 's'} and ${children} child traveler${children === 1 ? '' : 's'}.`,
          estimatedTripCost === undefined
            ? 'Trip cost was not supplied; cancellation figures are fixed illustrative limits.'
            : `Trip cost is treated as ${estimatedTripCost} ${currency} for context only.`,
          'No traveler health, eligibility, or policy information was collected.',
        ],
        plans,
      },
    };
  }

  if (input.kind === 'select') {
    const state = record(input.hotelState) ?? {};
    const records = array(state.records).map(record).filter((entry): entry is Record<string, unknown> => Boolean(entry));
    const selected = records.find((entry) => entry.selectionId === input.selectionId);
    if (!selected) {
      return {
        kind: 'select',
        selection: {
          status: 'unavailable',
          message: 'That stay is no longer in the current comparison. Search the stays again.',
        },
        ...(input.hotelState ? { nextHotelState: state } : {}),
      };
    }
    return {
      kind: 'select',
      selection: {
        status: 'selected',
        message: selected.dataSource === 'live_nuitee'
          ? 'The current hotel option is ready for the trip review. No room was held or reserved.'
          : 'The illustrative stay is ready for the trip review.',
        selectionId: input.selectionId,
      },
      nextHotelState: { ...state, activeSelectionId: input.selectionId },
    };
  }

  const flightState = record(input.flightState) ?? {};
  const hotelState = record(input.hotelState) ?? {};
  const activeFlightId = string(flightState.activeSelectionId);
  const activeHotelId = string(hotelState.activeSelectionId);
  const flight = array(flightState.records)
    .map(record)
    .find((entry) => entry?.selectionId === activeFlightId);
  const stay = array(hotelState.records)
    .map(record)
    .find((entry) => entry?.selectionId === activeHotelId);
  const now = instantMillis(input.requestedAt ?? '');
  const savedExperiences = array(input.experienceReadOk === true ? record(input.experienceState)?.selected : undefined).map(record)
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  const experiences = savedExperiences.filter((entry) => Number.isFinite(now)
    && instantMillis(string(entry.addedAt) ?? '') <= now && instantMillis(string(entry.expiresAt) ?? '') > now).slice(0, 8);
  const missing = [
    ...(flight ? [] : ['flight']),
    ...(stay ? [] : ['stay']),
    ...(experiences.length ? [] : ['experiences']),
  ];
  const ready = Boolean(flight || stay || experiences.length);
  const flightReview = flight ? {
    dataSource: 'live_nuitee_selection',
    selectionId: flight.selectionId,
    ...(string(record(flight.planningContext)?.origin) ? { origin: record(flight.planningContext)!.origin } : {}),
    ...(string(record(flight.planningContext)?.destination) ? { destination: record(flight.planningContext)!.destination } : {}),
    searchPrice: {
      total: flight.originalTotal,
      currency: flight.currency,
    },
    ...(typeof flight.expiresAt === 'string' ? { expiresAt: flight.expiresAt } : {}),
    disclosure: 'Live Nuitee search price selected in this session; it still requires fare verification.',
  } : undefined;
  const stayDataSource = stay?.dataSource === 'live_nuitee' ? 'live_nuitee' : 'illustrative';
  const stayImage = string(stay?.imageUrl);
  const safeStayImage = stayImage && stayImage.length <= 2_048
    && /^https:\/\/(?:snaphotelapi\.com|static\.cupid\.travel)\/[^\s\\]*$/i.test(stayImage)
    ? stayImage : undefined;
  const stayReview = stay ? {
    dataSource: stayDataSource,
    selectionId: stay.selectionId,
    propertyName: stay.propertyName,
    ...(safeStayImage ? { imageUrl: safeStayImage } : {}),
    city: stay.city,
    checkInDate: stay.checkInDate,
    checkOutDate: stay.checkOutDate,
    nights: stay.nights,
    rooms: stay.rooms,
    staySubtotal: stay.staySubtotal,
  } : undefined;
  const selectedExperience = record(experiences[0]?.experience);
  const experienceContext = record(experiences[0]?.searchContext);
  const flightContext = record(flight?.planningContext);
  const staySearchResult = record(record(input.hotelState)?.searchResult);
  const staySearchContext = stay && staySearchResult && staySearchResult.searchId === stay.searchId ? record(staySearchResult.searchContext) : undefined;
  const basePlanningContext = stay ? {
    source: 'stay', destination: stay.city, startDate: stay.checkInDate, endDate: stay.checkOutDate,
    dateBasis: 'stay', propertyName: stay.propertyName, currency: record(stay.staySubtotal)?.currency,
  } : selectedExperience && experienceContext ? {
    source: 'experience', destination: selectedExperience.city, countryCode: selectedExperience.countryCode,
    startDate: experienceContext.startDate, endDate: experienceContext.endDate, dateBasis: 'experience_search',
    adults: experienceContext.adults, children: experienceContext.children, currency: experienceContext.currency,
    meetingArea: selectedExperience.meetingArea,
  } : flightContext ? {
    source: 'flight', destination: flightContext.destination, origin: flightContext.origin,
    startDate: flightContext.departureDate, ...(flightContext.returnDate ? { endDate: flightContext.returnDate } : {}),
    dateBasis: 'flight_departure', adults: flightContext.adults, children: flightContext.children,
    infants: flightContext.infants, currency: flightContext.currency,
    ...(record(flightContext.activityDates) ? { activityDates: flightContext.activityDates } : {}),
  } : undefined;
  const canonicalDestination = (value: unknown) => {
    const name = string(value)?.trim().toUpperCase() ?? '';
    return input.aliases?.[name] ?? name;
  };
  const matchingFlight = flightContext && basePlanningContext?.endDate
    && canonicalDestination(flightContext.destination) === canonicalDestination(basePlanningContext.destination)
    && flightContext.departureDate === basePlanningContext.startDate && flightContext.returnDate === basePlanningContext.endDate
    ? flightContext : undefined;
  const matchingExperience = experiences.find((entry) => {
    const context = record(entry.searchContext);
    return basePlanningContext && canonicalDestination(record(entry.experience)?.city) === canonicalDestination(basePlanningContext.destination)
      && context?.startDate === basePlanningContext.startDate && context?.endDate === basePlanningContext.endDate;
  });
  const matchingExperienceContext = record(matchingExperience?.searchContext);
  const parties = [staySearchContext, matchingFlight, matchingExperienceContext].filter((entry): entry is Record<string, unknown> => Boolean(entry));
  const conflictingParty = parties.some(entry => entry.adults !== parties[0]?.adults || entry.children !== parties[0]?.children
    || (number(entry.infants) ?? 0) !== (number(parties[0]?.infants) ?? 0));
  const partyContext = conflictingParty ? undefined : parties[0];
  const planningContext = basePlanningContext ? {
    ...basePlanningContext,
    ...(matchingFlight ? { origin: matchingFlight.origin } : {}),
    ...(partyContext ? { adults: partyContext.adults, children: partyContext.children,
      ...(partyContext.infants !== undefined ? { infants: partyContext.infants } : {}),
    } : {}),
  } : undefined;
  const notes = [
    ...(savedExperiences.length > experiences.length ? ['Some experience choices expired. Search experiences again to add current options.'] : []),
    ...(planningContext?.source === 'flight' ? ['The flight date is its departure date. Confirm local arrival and the final stay date before searching accommodation.'] : []),
    ...(conflictingParty ? ['Selected components have different participant details. Confirm who is joining the next part of the trip.'] : []),
  ];
  return {
    kind: 'review',
    review: {
      status: ready ? 'ready' : 'incomplete',
      dataSource: 'illustrative',
      disclosure: 'Selected items are a conversation plan, not reservations. Experiences and rewards are illustrative; each flight and stay identifies its own source. Prices remain separate. Nothing was booked, paid, or redeemed.',
      fallback: ready
        ? `Your selected trip is ready to review: ${[...(flight ? ['flight'] : []), ...(stay ? ['stay'] : []), ...(experiences.length ? [`${experiences.length} fictional experience${experiences.length === 1 ? '' : 's'}`] : [])].join(', ')}. Other components are optional; prices stay separate and nothing is reserved.${notes.length ? ` ${notes[0]}` : ''}`
        : `No current trip selections are saved. Choose a flight, stay, or experience to start a plan.${notes.length ? ` ${notes[0]}` : ''}`,
      ...(flightReview ? { flight: flightReview } : {}),
      ...(stayReview ? { stay: stayReview } : {}),
      experiences,
      ...(planningContext ? { planningContext } : {}),
      ...(notes.length ? { notes } : {}),
      loyalty: input.loyalty,
      missing,
    },
  };
}
