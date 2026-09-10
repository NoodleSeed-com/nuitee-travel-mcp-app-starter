import { z } from "@noodleseed/one";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const carCurrencySchema = z.enum(["EUR", "CAD", "USD", "GBP", "JPY"]);
const money = z.object({
  amount: z.number().nonnegative().max(1_000_000),
  currency: carCurrencySchema,
});
const text = z.string().min(1).max(240);
export const carSearchInputSchema = z.object({
  destination: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .describe(
      "Known trip destination. Demo catalog supports Lisbon/LIS and Tokyo/HND/NRT only.",
    ),
  startDate: z
    .union([date, z.literal("")])
    .default("")
    .describe(
      "Reuse known trip dates; resolve relative dates using temporal context. Empty means visibly browse seven days from today.",
    ),
  endDate: z
    .union([date, z.literal("")])
    .default("")
    .describe(
      "Reuse the known return or stay end date. Empty means three rental days, adjustable in the widget.",
    ),
  adults: z.number().int().min(1).max(9).default(1),
  currency: carCurrencySchema.default("EUR"),
  pickup: z
    .enum(["airport", "hotel"])
    .default("airport")
    .describe(
      "Illustrative pickup only. Use hotel only when requested or continuing from a selected stay.",
    ),
  carName: z
    .string()
    .trim()
    .max(100)
    .default("")
    .describe(
      "Only an explicitly requested model/name. One match opens details; ambiguous names show matching cars. Empty means all cars.",
    ),
  filter: z
    .enum(["all", "xiaomi", "electric", "budget", "roomy"])
    .default("all")
    .describe("Use all unless the traveler explicitly requests a filter."),
});
export const carContextSchema = z.object({
  destination: z.string().min(2).max(100),
  countryCode: z.enum(["PT", "JP"]).optional(),
  startDate: date,
  endDate: date,
  adults: z.number().int().min(1).max(9),
  currency: carCurrencySchema,
  pickup: z.enum(["airport", "hotel"]),
  carName: z.string().max(100),
  filter: z.enum(["all", "xiaomi", "electric", "budget", "roomy"]),
});
export const carFeesSchema = z.object({
  airport: z.number().nonnegative(),
  hotel: z.number().nonnegative(),
  driverPerDay: z.number().nonnegative(),
  currency: carCurrencySchema,
});
export const carOfferSchema = z.object({
  carRef: z.string().regex(/^car_[a-f0-9]{16}$/),
  key: z.string().regex(/^[a-z0-9]{2,16}$/),
  name: z.string().min(2).max(100),
  kind: z.string().min(2).max(40),
  energy: z.enum(["Electric", "Hybrid", "Petrol"]),
  seats: z.number().int().min(2).max(9),
  bags: z.number().int().min(0).max(8),
  line: text,
  note: text,
  xiaomi: z.boolean(),
  dailyPrice: money,
  deposit: money,
  totalPrice: money,
});
export const carSelectionSchema = z.object({
  selectionId: z.string().regex(/^carsel_[a-f0-9]{16}$/),
  car: carOfferSchema,
  searchContext: carContextSchema,
  pickup: z.enum(["airport", "hotel"]),
  secondDriver: z.boolean(),
  totalPrice: money,
  selectedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export const carStateSchema = z.object({
  updatedAt: z.string().datetime(),
  records: z
    .array(
      z.object({
        car: carOfferSchema,
        searchContext: carContextSchema,
        fees: carFeesSchema,
        expiresAt: z.string().datetime(),
      }),
    )
    .max(15),
  selected: carSelectionSchema.nullable().optional(),
});
export const carSearchResultSchema = z.object({
  status: z.enum(["success", "empty", "invalid", "unavailable"]),
  dataSource: z.literal("wayfare_demo"),
  isFictional: z.literal(true),
  disclosure: text,
  message: text,
  fallback: z.string().min(1).max(500),
  searchId: z.string().min(1).max(80),
  searchContext: carContextSchema,
  days: z.number().int().min(1).max(30),
  fees: carFeesSchema,
  assumptions: z.array(text).max(6),
  cars: z.array(carOfferSchema).max(15),
  canSelect: z.boolean(),
  selected: carSelectionSchema.optional(),
});
export const carActionSchema = z.object({
  action: z.enum(["select", "remove"]),
  carRef: z
    .string()
    .regex(/^car_[a-f0-9]{16}$/)
    .optional(),
  pickup: z.enum(["airport", "hotel"]).default("airport"),
  secondDriver: z.boolean().default(false),
  expectedSelectionId: z
    .string()
    .max(80)
    .default("")
    .describe(
      "The current selected car ID shown in this widget. Empty means no car was selected. Stale replacements or removals fail safely.",
    ),
});
export const carDecisionSchema = z.object({
  status: z.enum([
    "selected",
    "already_selected",
    "removed",
    "unavailable",
    "expired",
    "conflict",
  ]),
  message: text,
  selection: carSelectionSchema.optional(),
});
export type CarSearchInput = z.infer<typeof carSearchInputSchema>;
export type CarContext = z.infer<typeof carContextSchema>;
export type CarFees = z.infer<typeof carFeesSchema>;
export type CarOffer = z.infer<typeof carOfferSchema>;
export type CarSelection = z.infer<typeof carSelectionSchema>;
export type CarState = z.infer<typeof carStateSchema>;
export type CarSearchResult = z.infer<typeof carSearchResultSchema>;
export type CarDecision = z.infer<typeof carDecisionSchema>;
