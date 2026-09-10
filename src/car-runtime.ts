import type { CarFixture } from "./car-fixtures.js";
import type {
  CarContext,
  CarDecision,
  CarFees,
  CarOffer,
  CarSearchResult,
  CarSelection,
  CarState,
} from "./car-schemas.js";
import type { DemoTripReview } from "./demo-schemas.js";

type Result = {
  result?: CarSearchResult;
  nextState?: CarState;
  decision?: CarDecision;
  review?: DemoTripReview;
  tripReadOk?: boolean;
  mayWrite?: boolean;
};
// Self-contained pure compute boundary. No network, credentials, clock reads,
// provider writes or client-supplied prices. The caller state store owns isolation.
export function runCarGateway(input: Record<string, unknown>): Result {
  const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const dayNumber = (value: string) => {
    const parts = value.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const adjustedYear = year - (month <= 2 ? 1 : 0);
    const era = Math.floor(adjustedYear / 400);
    const yearOfEra = adjustedYear - era * 400;
    const shiftedMonth = month + (month > 2 ? -3 : 9);
    const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
    const dayOfEra =
      yearOfEra * 365 +
      Math.floor(yearOfEra / 4) -
      Math.floor(yearOfEra / 100) +
      dayOfYear;
    return era * 146097 + dayOfEra;
  };
  const dateFromDayNumber = (value: number) => {
    const era = Math.floor(value / 146097);
    const dayOfEra = value - era * 146097;
    const yearOfEra = Math.floor(
      (dayOfEra -
        Math.floor(dayOfEra / 1460) +
        Math.floor(dayOfEra / 36524) -
        Math.floor(dayOfEra / 146096)) /
        365,
    );
    let year = yearOfEra + era * 400;
    const dayOfYear =
      dayOfEra -
      (365 * yearOfEra +
        Math.floor(yearOfEra / 4) -
        Math.floor(yearOfEra / 100));
    const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
    const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
    const month = shiftedMonth + (shiftedMonth < 10 ? 3 : -9);
    year += month <= 2 ? 1 : 0;
    return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  };
  // Noodle compute intentionally has no ambient Date clock. Parse only the
  // explicitly supplied UTC invocation instant and use integer calendar math.
  const instantMillis = (value: string): number => {
    const match =
      /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/.exec(value);
    if (!match) return Number.NaN;
    const hours = Number(match[2]);
    const minutes = Number(match[3]);
    const seconds = Number(match[4]);
    if (
      hours > 23 ||
      minutes > 59 ||
      seconds > 59 ||
      dateFromDayNumber(dayNumber(match[1]!)) !== match[1]
    )
      return Number.NaN;
    return (
      (dayNumber(match[1]!) - dayNumber("1970-01-01")) * 86_400_000 +
      hours * 3_600_000 +
      minutes * 60_000 +
      seconds * 1_000 +
      Number((match[5] ?? "").padEnd(3, "0").slice(0, 3))
    );
  };
  const formatInstant = (value: number): string => {
    const days = Math.floor(value / 86_400_000);
    const withinDay = value - days * 86_400_000;
    const hours = Math.floor(withinDay / 3_600_000);
    const minutes = Math.floor((withinDay % 3_600_000) / 60_000);
    const seconds = Math.floor((withinDay % 60_000) / 1_000);
    const millis = withinDay % 1_000;
    return `${dateFromDayNumber(days + dayNumber("1970-01-01"))}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}Z`;
  };

  const validDate = (value: unknown): value is string =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    dateFromDayNumber(dayNumber(value)) === value;
  const parseDate = (value: string) =>
    value.includes("T")
      ? instantMillis(value)
      : validDate(value)
        ? (dayNumber(value) - dayNumber("1970-01-01")) * 86400000
        : NaN;
  const opaque = (prefix: string, value: string) => {
    let a = 2166136261,
      b = 5381;
    for (let i = 0; i < value.length; i++) {
      a = Math.imul(a ^ value.charCodeAt(i), 16777619);
      b = Math.imul(b, 33) ^ value.charCodeAt(i);
    }
    return (
      prefix +
      "_" +
      (a >>> 0).toString(16).padStart(8, "0") +
      (b >>> 0).toString(16).padStart(8, "0")
    );
  };
  const normalize = (value: unknown) =>
    String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const aliases: Record<
    string,
    { destination: string; countryCode: "PT" | "JP" }
  > = {
    lisbon: { destination: "Lisbon", countryCode: "PT" },
    lisboa: { destination: "Lisbon", countryCode: "PT" },
    lis: { destination: "Lisbon", countryCode: "PT" },
    tokyo: { destination: "Tokyo", countryCode: "JP" },
    hnd: { destination: "Tokyo", countryCode: "JP" },
    nrt: { destination: "Tokyo", countryCode: "JP" },
  };
  const now =
    typeof input.requestedAt === "string" ? parseDate(input.requestedAt) : NaN;
  const rawState = record(input.state);
  const records = (
    Array.isArray(rawState.records) ? rawState.records : []
  ) as CarState["records"];
  const rawSelected = record(rawState.selected);
  const selected =
    input.readOk === true &&
    Number.isFinite(now) &&
    typeof rawSelected.selectionId === "string" &&
    /^carsel_[a-f0-9]{16}$/.test(rawSelected.selectionId) &&
    parseDate(String(rawSelected.expiresAt)) > now &&
    parseDate(String(rawSelected.selectedAt)) <= now
      ? (rawSelected as CarSelection)
      : undefined;
  const fail = (status: CarDecision["status"], message: string): Result => ({
    decision: { status, message },
  });

  if (input.kind === "ack_search") {
    const result = input.result as CarSearchResult;
    return {
      result: {
        ...result,
        canSelect: result.status === "success" && input.patchOk === true,
        ...(result.status === "success" && input.patchOk !== true
          ? {
              message:
                "Cars are available to browse, but saving the options failed. Search again before adding a car.",
            }
          : {}),
      },
    };
  }
  if (input.kind === "ack_selection") {
    const decision = input.decision as CarDecision;
    return ["selected", "removed"].includes(decision?.status) &&
      input.patchOk !== true
      ? fail(
          "conflict",
          "Your trip changed before this car choice could be saved. Review your current plan and try again.",
        )
      : { decision };
  }
  if (input.kind === "search") {
    const search = record(input.search);
    const canonical = aliases[normalize(search.destination)];
    const today = formatInstant(Number.isFinite(now) ? now : 0).slice(0, 10);
    const plus = (value: string, days: number) =>
      dateFromDayNumber(dayNumber(value) + days);
    const startDate = validDate(search.startDate)
      ? search.startDate
      : plus(today, 7);
    const proposedEnd = validDate(search.endDate)
      ? search.endDate
      : plus(startDate, 3);
    const days = Math.round(
      (parseDate(proposedEnd) - parseDate(startDate)) / 86400000,
    );
    const endDate = days >= 1 && days <= 30 ? proposedEnd : plus(startDate, 3);
    const currency = (
      ["EUR", "CAD", "USD", "GBP", "JPY"].includes(String(search.currency))
        ? search.currency
        : "EUR"
    ) as CarContext["currency"];
    const adults =
      Number.isInteger(search.adults) &&
      Number(search.adults) >= 1 &&
      Number(search.adults) <= 9
        ? Number(search.adults)
        : 1;
    const context: CarContext = {
      destination:
        canonical?.destination ??
        String(search.destination ?? "Unknown destination").slice(0, 100),
      ...(canonical ? { countryCode: canonical.countryCode } : {}),
      startDate,
      endDate,
      adults,
      currency,
      pickup: search.pickup === "hotel" ? "hotel" : "airport",
      carName: String(search.carName ?? "")
        .trim()
        .slice(0, 100),
      filter: (["all", "xiaomi", "electric", "budget", "roomy"].includes(
        String(search.filter),
      )
        ? search.filter
        : "all") as CarContext["filter"],
    };
    // Fixed illustrative currency tables, not an FX service or a real quote.
    const exampleScale = { EUR: 1, CAD: 1.5, USD: 1.1, GBP: 0.85, JPY: 180 }[
      currency
    ];
    const round = (n: number) =>
      Math.round(n * (currency === "JPY" ? 1 : 100)) /
      (currency === "JPY" ? 1 : 100);
    const sample = (n: number) => round(n * exampleScale);
    const fees: CarFees = {
      airport: sample(24),
      hotel: sample(36),
      driverPerDay: sample(6),
      currency,
    };
    const invalid = Boolean(
      (search.startDate && !validDate(search.startDate)) ||
        (search.endDate && !validDate(search.endDate)) ||
        days < 1 ||
        days > 30,
    );
    const searchId = opaque(
      "carsearch",
      JSON.stringify(context) + String(input.requestedAt),
    );
    const name = normalize(context.carName);
    const words = name.split(" ").filter(Boolean);
    const catalog = (
      Array.isArray(input.catalog) ? input.catalog : []
    ) as readonly CarFixture[];
    const exact = name
      ? catalog.filter((car) =>
          [car.name, ...(car.aliases ?? [])].some(
            (alias) => normalize(alias) === name,
          ),
        )
      : [];
    const candidates = exact.length ? exact : catalog;
    const matched =
      canonical && !invalid && Number.isFinite(now)
        ? candidates
            .filter((car) => {
              const matches =
                !name ||
                [car.name, ...(car.aliases ?? [])].some((alias) => {
                  const candidate = normalize(alias);
                  return (
                    candidate === name ||
                    words.every((word) => candidate.split(" ").includes(word))
                  );
                });
              return (
                matches &&
                (context.filter === "xiaomi"
                  ? car.xiaomi
                  : context.filter === "electric"
                    ? car.energy === "Electric"
                    : context.filter === "budget"
                      ? car.price < 60
                      : context.filter === "roomy"
                        ? car.bags >= 3
                        : true)
              );
            })
            .slice(0, 15)
        : [];
    const cars: CarOffer[] = matched.map((car) => ({
      carRef: opaque("car", searchId + ":" + car.id),
      key: car.id,
      name: car.name,
      kind: car.kind,
      energy: car.energy as CarOffer["energy"],
      seats: car.seats,
      bags: car.bags,
      line: car.line,
      note: car.note,
      xiaomi: !!car.xiaomi,
      dailyPrice: { amount: sample(car.price), currency },
      deposit: { amount: sample(car.deposit), currency },
      totalPrice: {
        amount: round(sample(car.price) * days + fees[context.pickup]),
        currency,
      },
    }));
    const status = !Number.isFinite(now)
      ? "unavailable"
      : invalid
        ? "invalid"
        : cars.length
          ? "success"
          : "empty";
    const assumptions = [
      ...(!search.startDate
        ? ["Browsing seven days from today; you can change the rental dates."]
        : []),
      ...(!search.endDate
        ? ["Using a three-day rental unless you choose another return date."]
        : []),
      ...(!search.adults ? ["Starting with one adult and one driver."] : []),
      "12:00 pickup and return are browsing assumptions, not a confirmed arrival or appointment.",
      "Photos show model references; local inventory, exact trim, driver eligibility and rental terms are unverified.",
    ];
    const message =
      status === "success"
        ? context.carName && cars.length === 1
          ? `${cars[0]!.name} details are ready. Review the example terms before adding it to your plan.`
          : `${cars.length} fictional car ideas for ${context.destination}.`
        : status === "invalid"
          ? "Choose valid rental dates, with a return 1 to 30 days after pickup."
          : status === "unavailable"
            ? "The search time could not be checked. Please try again."
            : !canonical
              ? "The demo car catalog supports Lisbon and Tokyo only. Your existing trip choices are unchanged."
              : "No demo cars match that model or filter. Broaden the search without changing your trip.";
    const result: CarSearchResult = {
      status,
      dataSource: "wayfare_demo",
      isFictional: true,
      disclosure:
        "Fictional fleet, prices, fees and rental terms. No local inventory or eligibility checked. Nothing is reserved.",
      message,
      fallback:
        message +
        " All prices are illustrative, not rental quotes. Choose in the widget to add a car; search alone changes no selected trip item.",
      searchId,
      searchContext: context,
      days: Math.max(1, Math.min(30, days)),
      fees,
      assumptions,
      cars,
      canSelect: false,
      ...(selected ? { selected } : {}),
    };
    const mayWrite = status === "success" && input.readOk === true;
    return {
      result,
      mayWrite,
      ...(mayWrite
        ? {
            nextState: {
              updatedAt: formatInstant(now),
              records: cars.map((car) => ({
                car,
                searchContext: context,
                fees,
                expiresAt: formatInstant(now + 1800000),
              })),
              selected: selected ?? null,
            },
          }
        : {}),
    };
  }
  if (input.kind === "select") {
    if (input.readOk !== true || !Number.isFinite(now))
      return fail(
        "unavailable",
        "Your current car choices could not be read. Search cars again before changing the plan.",
      );
    const action = record(input.action);
    if (action.action === "remove") {
      if (!selected || action.expectedSelectionId !== selected.selectionId)
        return fail(
          "conflict",
          "The selected car changed or expired. Review the current trip before removing a car.",
        );
      return {
        mayWrite: true,
        nextState: { updatedAt: formatInstant(now), records, selected: null },
        decision: {
          status: "removed",
          message:
            "Car removed from the plan. Your other trip choices are unchanged.",
        },
      };
    }
    const pickup = action.pickup === "hotel" ? "hotel" : "airport";
    const secondDriver = action.secondDriver === true;
    if (
      selected &&
      selected.car.carRef === action.carRef &&
      selected.pickup === pickup &&
      selected.secondDriver === secondDriver
    )
      return {
        decision: {
          status: "already_selected",
          message: "This car is already in your plan. Nothing is reserved.",
          selection: selected,
        },
      };
    if ((selected?.selectionId ?? "") !== (action.expectedSelectionId ?? ""))
      return fail(
        "conflict",
        "Another car is now selected. Review your trip before replacing it.",
      );
    const saved = records.find((entry) => entry?.car?.carRef === action.carRef);
    if (!saved)
      return fail(
        "unavailable",
        "That car reference is not available in this conversation. Search cars again.",
      );
    if (
      !Number.isFinite(parseDate(saved.expiresAt)) ||
      parseDate(saved.expiresAt) <= now
    )
      return fail(
        "expired",
        "These car options expired. Search again before selecting a car.",
      );
    const days = Math.round(
      (parseDate(saved.searchContext.endDate) -
        parseDate(saved.searchContext.startDate)) /
        86400000,
    );
    const amount =
      saved.car.dailyPrice.amount * days +
      saved.fees[pickup] +
      (secondDriver ? saved.fees.driverPerDay * days : 0);
    if (
      days < 1 ||
      days > 30 ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 1000000
    )
      return fail(
        "unavailable",
        "The car price could not be checked. Search again before selecting it.",
      );
    const selection: CarSelection = {
      selectionId: opaque(
        "carsel",
        String(action.carRef) + pickup + secondDriver,
      ),
      car: saved.car,
      searchContext: saved.searchContext,
      pickup,
      secondDriver,
      totalPrice: {
        amount: Math.round(amount * 100) / 100,
        currency: saved.searchContext.currency,
      },
      selectedAt: formatInstant(now),
      expiresAt: formatInstant(now + 1800000),
    };
    return {
      mayWrite: true,
      nextState: {
        updatedAt: formatInstant(now),
        records,
        selected: selection,
      },
      decision: {
        status: "selected",
        message:
          "Car added to your trip plan. No car reserved, no card charged, and your other choices are unchanged.",
        selection,
      },
    };
  }
  if (input.kind === "review") {
    const base = input.review as DemoTripReview;
    const notes = [...(base.notes ?? [])];
    if (input.readOk !== true)
      notes.push(
        "The car choice could not be read. It is excluded from this estimate until you refresh the plan.",
      );
    else if (rawState.selected && !selected)
      notes.push(
        "Your temporary car choice expired. Search cars again to add it to the plan.",
      );
    if (
      selected &&
      base.planningContext &&
      normalize(base.planningContext.destination) !==
        normalize(selected.searchContext.destination) &&
      aliases[normalize(base.planningContext.destination)]?.destination !==
        selected.searchContext.destination
    )
      notes.push(
        "The car destination differs from the rest of your plan. Review it before making travel arrangements.",
      );
    const browse =
      input.readOk === true &&
      records[0] &&
      parseDate(records[0].expiresAt) > now
        ? records[0].searchContext
        : undefined;
    const carContext = selected?.searchContext ?? browse;
    const context =
      base.planningContext ??
      (carContext
        ? {
            source: "car" as const,
            destination: carContext.destination,
            countryCode: carContext.countryCode,
            startDate: carContext.startDate,
            endDate: carContext.endDate,
            dateBasis: "car_rental" as const,
            adults: carContext.adults,
            currency: carContext.currency,
          }
        : undefined);
    return {
      tripReadOk: input.tripReadOk === true && input.readOk === true,
      review: {
        ...base,
        status:
          selected || base.flight || base.stay || base.experiences.length
            ? "ready"
            : "incomplete",
        car: selected,
        planningContext: context,
        notes: notes.slice(0, 3),
        fallback: selected
          ? `Your trip includes ${selected.car.name}, ${selected.searchContext.startDate} to ${selected.searchContext.endDate}, ${selected.totalPrice.currency} ${selected.totalPrice.amount} fictional rental estimate. Other selected items remain in the plan. No car reserved.`
          : base.fallback,
      },
    };
  }
  return fail(
    "unavailable",
    "This car action is unavailable. Return to your trip and try again.",
  );
}
