import { describe, expect, it } from "vitest";
import { runCarGateway } from "../src/car-runtime.js";
import { CAR_CATALOG } from "../src/car-fixtures.js";
import {
  carSearchResultSchema,
  carSelectionSchema,
} from "../src/car-schemas.js";
import { tripPlanningEstimate } from "../src/trip-planning-estimate.js";

const now = "2026-09-10T12:00:00.000Z";
const search = (input: Record<string, unknown> = {}) =>
  runCarGateway({
    kind: "search",
    search: {
      destination: "Lisbon",
      startDate: "2026-09-18",
      endDate: "2026-09-21",
      adults: 2,
      currency: "EUR",
      ...input,
    },
    catalog: CAR_CATALOG,
    state: {},
    readOk: true,
    requestedAt: now,
  });
const choose = (
  result: ReturnType<typeof search>,
  input: Record<string, unknown> = {},
) =>
  runCarGateway({
    kind: "select",
    state: result.nextState,
    readOk: true,
    requestedAt: now,
    action: {
      action: "select",
      carRef: result.result!.cars[0]!.carRef,
      pickup: "airport",
      secondDriver: false,
      expectedSelectionId: "",
      ...input,
    },
  });

describe("fictional car planning", () => {
  it("offers all 15 named models without selecting or claiming inventory", () => {
    const result = search();
    expect(carSearchResultSchema.safeParse(result.result).success).toBe(true);
    expect(result.result?.cars).toHaveLength(15);
    expect(result.nextState?.selected).toBeNull();
    expect(result.result?.cars.map((car) => car.name)).toEqual(
      expect.arrayContaining([
        "Honda Civic Sport Touring Hybrid",
        "MINI Countryman",
        "Toyota Crown Signia",
      ]),
    );
    expect(result.result?.disclosure).toMatch(/fictional/i);
    expect(result.result?.canSelect).toBe(false);
  });
  it("acknowledges saved search results only after state persistence", () => {
    const result = search();
    const failed = runCarGateway({
      kind: "ack_search",
      result: result.result,
      patchOk: false,
    });
    const saved = runCarGateway({
      kind: "ack_search",
      result: result.result,
      patchOk: true,
    });
    expect(failed.result?.canSelect).toBe(false);
    expect(saved.result?.canSelect).toBe(true);
  });
  it("opens a unique named car and supports precise short aliases", () => {
    expect(
      search({ carName: "Honda Civic" }).result?.cars.map((car) => car.key),
    ).toEqual(["civic"]);
    expect(
      search({ carName: "Xiaomi SU7" }).result?.cars.map((car) => car.key),
    ).toEqual(["su7"]);
    expect(search({ carName: "Xiaomi" }).result?.cars).toHaveLength(3);
    expect(
      search({ carName: "Crowninsignia" }).result?.cars.map((car) => car.key),
    ).toEqual(["crown"]);
    expect(search({ carName: "MINI" }).result?.cars).toHaveLength(2);
    expect(search({ carName: "Not in our fleet" }).result?.status).toBe(
      "empty",
    );
  });
  it("resolves disclosed reversible browsing defaults and bounds date ranges", () => {
    const result = search({ startDate: "", endDate: "", adults: undefined });
    expect(result.result?.searchContext).toMatchObject({
      startDate: "2026-09-17",
      endDate: "2026-09-20",
      adults: 1,
    });
    expect(result.result?.assumptions.length).toBeGreaterThan(0);
    expect(search({ startDate: "2026-02-30" }).result?.status).toBe("invalid");
    expect(search({ endDate: "2026-12-01" }).result?.status).toBe("invalid");
    expect(search({ destination: "Atlantis" }).result?.status).toBe("empty");
  });
  it("computes the sample extras on the server and requires an acknowledged write", () => {
    const selection = choose(search(), { secondDriver: true });
    expect(selection.decision?.selection?.totalPrice).toEqual({
      amount: 276,
      currency: "EUR",
    });
    expect(
      carSelectionSchema.safeParse(selection.decision?.selection).success,
    ).toBe(true);
    expect(
      runCarGateway({
        kind: "ack_selection",
        decision: selection.decision,
        patchOk: false,
      }).decision?.status,
    ).toBe("conflict");
    expect(
      runCarGateway({
        kind: "ack_selection",
        decision: selection.decision,
        patchOk: true,
      }).decision?.status,
    ).toBe("selected");
  });
  it("rejects expired, cross-caller, unknown and unreadable references", () => {
    const result = search();
    expect(
      runCarGateway({
        kind: "select",
        state: {},
        readOk: true,
        requestedAt: now,
        action: {
          action: "select",
          carRef: result.result!.cars[0]!.carRef,
          expectedSelectionId: "",
        },
      }).decision?.status,
    ).toBe("unavailable");
    expect(
      runCarGateway({
        kind: "select",
        state: result.nextState,
        readOk: false,
        requestedAt: now,
        action: { action: "select", carRef: result.result!.cars[0]!.carRef },
      }).decision?.status,
    ).toBe("unavailable");
    expect(
      runCarGateway({
        kind: "select",
        state: result.nextState,
        readOk: true,
        requestedAt: "2026-09-10T13:00:00Z",
        action: {
          action: "select",
          carRef: result.result!.cars[0]!.carRef,
          expectedSelectionId: "",
        },
      }).decision?.status,
    ).toBe("expired");
  });
  it("does not silently replace or remove a different current car", () => {
    const result = search(),
      first = choose(result);
    const selected = first.decision!.selection!;
    const replay = runCarGateway({
      kind: "select",
      state: first.nextState,
      readOk: true,
      requestedAt: now,
      action: {
        action: "select",
        carRef: selected.car.carRef,
        pickup: "airport",
        secondDriver: false,
        expectedSelectionId: "",
      },
    });
    expect(replay.decision?.status).toBe("already_selected");
    expect(
      runCarGateway({
        kind: "select",
        state: first.nextState,
        readOk: true,
        requestedAt: now,
        action: {
          action: "select",
          carRef: result.result!.cars[1]!.carRef,
          expectedSelectionId: "",
        },
      }).decision?.status,
    ).toBe("conflict");
    expect(
      runCarGateway({
        kind: "select",
        state: first.nextState,
        readOk: true,
        requestedAt: now,
        action: { action: "remove", expectedSelectionId: "old-car" },
      }).decision?.status,
    ).toBe("conflict");
    const replaced = runCarGateway({
      kind: "select",
      state: first.nextState,
      readOk: true,
      requestedAt: now,
      action: {
        action: "select",
        carRef: result.result!.cars[1]!.carRef,
        pickup: "hotel",
        secondDriver: false,
        expectedSelectionId: selected.selectionId,
      },
    });
    expect(replaced.decision?.selection?.car.key).toBe("yu7");
    const removed = runCarGateway({
      kind: "select",
      state: replaced.nextState,
      readOk: true,
      requestedAt: now,
      action: {
        action: "remove",
        expectedSelectionId: replaced.decision!.selection!.selectionId,
      },
    });
    expect(removed.decision?.status).toBe("removed");
    expect(removed.nextState?.selected).toBeNull();
  });
  it("retains a selection while refining search dates and excludes expired car selections", () => {
    const selected = choose(search());
    const result = runCarGateway({
      kind: "search",
      search: {
        destination: "Tokyo",
        startDate: "2026-10-10",
        endDate: "2026-10-12",
      },
      catalog: CAR_CATALOG,
      state: selected.nextState,
      readOk: true,
      requestedAt: now,
    });
    expect(result.nextState?.selected?.searchContext.destination).toBe(
      "Lisbon",
    );
    const base = {
      status: "incomplete",
      experiences: [],
      missing: ["flight", "stay", "experiences"],
      notes: [],
      fallback: "No selections",
      dataSource: "synthetic",
      disclosure: "Example plan",
      loyalty: {},
    };
    const review = runCarGateway({
      kind: "review",
      review: base,
      state: selected.nextState,
      readOk: true,
      tripReadOk: true,
      requestedAt: now,
    });
    expect(review.review).toMatchObject({
      status: "ready",
      car: { car: { key: "su7" } },
      planningContext: { source: "car", destination: "Lisbon" },
    });
    const expired = runCarGateway({
      kind: "review",
      review: base,
      state: selected.nextState,
      readOk: true,
      tripReadOk: true,
      requestedAt: "2026-09-10T13:00:00Z",
    });
    expect(expired.review?.car).toBeUndefined();
    expect(expired.review?.notes?.join(" ")).toMatch(/expired/i);
  });
  it("adds a fictional car subtotal without mixing currencies or guessing unknowns", () => {
    const selected = choose(search()).decision!.selection;
    const estimate = tripPlanningEstimate({
      review: { car: selected, experiences: [] },
    });
    expect(estimate).toMatchObject({
      status: "complete",
      totalMinor: 25800,
      fictionalSubtotalMinor: 25800,
    });
    expect(
      tripPlanningEstimate({
        review: {
          car: selected,
          experiences: [],
          flight: { searchPrice: { total: 100, currency: "USD" } },
        },
      }).status,
    ).toBe("mixed_currencies");
  });
  it("clears a car under merge-patch storage semantics and retains browsing context without claiming a selection", () => {
    const chosen = choose(search());
    const removed = runCarGateway({
      kind: "select",
      state: chosen.nextState,
      readOk: true,
      requestedAt: now,
      action: {
        action: "remove",
        expectedSelectionId: chosen.decision!.selection!.selectionId,
      },
    });
    const stored = { ...chosen.nextState, ...removed.nextState };
    const base = {
      status: "incomplete",
      experiences: [],
      missing: ["flight", "stay", "experiences"],
      notes: [],
      fallback: "No selections",
      dataSource: "illustrative",
      disclosure: "Example plan",
      loyalty: {},
    };
    const reviewed = runCarGateway({
      kind: "review",
      review: base,
      state: stored,
      readOk: true,
      tripReadOk: true,
      requestedAt: now,
    });
    expect(reviewed.review?.car).toBeUndefined();
    expect(reviewed.review?.status).toBe("incomplete");
    expect(reviewed.review?.planningContext?.destination).toBe("Lisbon");
    expect(
      tripPlanningEstimate({ review: reviewed.review }).items,
    ).toHaveLength(0);
  });
});
