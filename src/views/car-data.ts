import type {
  CarOffer,
  CarSearchResult,
  CarSelection,
  CarSearchInput,
} from "../car-schemas.js";
import type { DemoTripReview } from "../demo-schemas.js";
const record = (v: unknown): Record<string, unknown> | undefined =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
const text = (v: unknown, max = 240): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const number = (v: unknown, max = 1_000_000): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
export const carDate = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v + "T12:00:00Z")) &&
  new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v;
const currency = (v: unknown) =>
  ["EUR", "CAD", "USD", "GBP", "JPY"].includes(String(v));
const money = (v: unknown) => {
  const m = record(v);
  return !!m && number(m.amount) && currency(m.currency);
};
const context = (v: unknown) => {
  const c = record(v);
  return (
    !!c &&
    text(c.destination, 100) &&
    carDate(c.startDate) &&
    carDate(c.endDate) &&
    c.endDate > c.startDate &&
    (Date.parse(c.endDate) - Date.parse(c.startDate)) / 86400000 <= 30 &&
    Number.isInteger(c.adults) &&
    Number(c.adults) >= 1 &&
    Number(c.adults) <= 9 &&
    currency(c.currency) &&
    ["airport", "hotel"].includes(String(c.pickup)) &&
    typeof c.carName === "string" &&
    c.carName.length <= 100 &&
    ["all", "xiaomi", "electric", "budget", "roomy"].includes(String(c.filter))
  );
};
function offer(v: unknown): v is CarOffer {
  const c = record(v);
  return (
    !!c &&
    /^car_[a-f0-9]{16}$/.test(String(c.carRef)) &&
    /^[a-z0-9]{2,16}$/.test(String(c.key)) &&
    text(c.name, 100) &&
    text(c.kind, 40) &&
    text(c.line) &&
    text(c.note) &&
    ["Electric", "Hybrid", "Petrol"].includes(String(c.energy)) &&
    Number.isInteger(c.seats) &&
    Number(c.seats) >= 2 &&
    Number(c.seats) <= 9 &&
    Number.isInteger(c.bags) &&
    number(c.bags, 8) &&
    typeof c.xiaomi === "boolean" &&
    money(c.dailyPrice) &&
    money(c.deposit) &&
    money(c.totalPrice) &&
    record(c.dailyPrice)?.currency === record(c.totalPrice)?.currency &&
    record(c.deposit)?.currency === record(c.totalPrice)?.currency
  );
}
export function isCarSelection(v: unknown): v is CarSelection {
  const s = record(v);
  return (
    !!s &&
    /^carsel_[a-f0-9]{16}$/.test(String(s.selectionId)) &&
    offer(s.car) &&
    context(s.searchContext) &&
    ["airport", "hotel"].includes(String(s.pickup)) &&
    typeof s.secondDriver === "boolean" &&
    money(s.totalPrice) &&
    s.car.dailyPrice.currency === record(s.searchContext)?.currency &&
    record(s.totalPrice)?.currency === record(s.searchContext)?.currency &&
    typeof s.selectedAt === "string" &&
    Number.isFinite(Date.parse(s.selectedAt)) &&
    typeof s.expiresAt === "string" &&
    Date.parse(s.expiresAt) > Date.parse(s.selectedAt)
  );
}
export function isCarSearch(v: unknown): v is CarSearchResult {
  const s = record(v),
    f = record(s?.fees);
  return (
    !!s &&
    ["success", "empty", "invalid", "unavailable"].includes(String(s.status)) &&
    s.dataSource === "wayfare_demo" &&
    s.isFictional === true &&
    text(s.disclosure) &&
    text(s.message) &&
    text(s.fallback, 500) &&
    text(s.searchId, 80) &&
    context(s.searchContext) &&
    Number.isInteger(s.days) &&
    Number(s.days) >= 1 &&
    Number(s.days) <= 30 &&
    !!f &&
    number(f.airport) &&
    number(f.hotel) &&
    number(f.driverPerDay) &&
    f.currency === record(s.searchContext)?.currency &&
    Array.isArray(s.assumptions) &&
    s.assumptions.length <= 6 &&
    s.assumptions.every((v) => text(v)) &&
    Array.isArray(s.cars) &&
    s.cars.length <= 15 &&
    s.cars.every((v) => offer(v) && v.dailyPrice.currency === f.currency) &&
    new Set(s.cars.map((c) => c.carRef)).size === s.cars.length &&
    (s.status === "success") === s.cars.length > 0 &&
    typeof s.canSelect === "boolean" &&
    (!s.canSelect || s.status === "success") &&
    (s.selected === undefined || isCarSelection(s.selected))
  );
}
export function carSearchForTrip(
  review: DemoTripReview,
): CarSearchInput | undefined {
  const c = review.planningContext;
  if (!c?.destination) return undefined;
  const startDate = c.activityDates?.startDate ?? c.startDate ?? "";
  const knownEnd = c.activityDates?.endDate ?? c.endDate;
  return {
    destination: c.destination,
    startDate,
    endDate: knownEnd && knownEnd > startDate ? knownEnd : "",
    adults: c.adults ?? 1,
    currency: currency(c.currency)
      ? (c.currency as CarSearchInput["currency"])
      : "EUR",
    pickup: review.stay ? "hotel" : "airport",
    carName: "",
    filter: "all",
  };
}
