import { annotations, tool, when } from "@noodleseed/one";
import { CAR_CATALOG } from "./car-fixtures.js";
import {
  carActionSchema,
  carDecisionSchema,
  carSearchInputSchema,
  carSearchResultSchema,
} from "./car-schemas.js";

export function createCarCapabilities(
  viewPolicy: Readonly<Record<string, unknown>>,
) {
  const search = tool("search_cars", {
    title: "Explore demo cars",
    description:
      "Show 15 fictional car-rental concepts for Lisbon or Tokyo, including Xiaomi SU7/YU7/Ultra, Honda Civic Sport Touring Hybrid, MINI Countryman and Toyota Crown Signia. Reuse the known trip destination, dates, adults and currency. Resolve relative dates from temporal context. Omitted dates browse seven days from today for three days, with visible adjustable assumptions; do not ask repeatedly. Apply carName or filters only when explicitly requested. A unique named car opens its detail gallery; ambiguous names show matches. Search never selects a car. Invite the traveler to choose Add car to my trip in the widget; do not claim a car was added without acknowledgment. All vehicles, prices, deposits, fees, pickup and terms are illustrative, not local inventory, eligibility, guaranteed models, booking or payment.",
    annotations: annotations.readOnly(),
    input: carSearchInputSchema,
    output: carSearchResultSchema,
    fulfil: ({ input, context, connectors }) => {
      const current = connectors.state.readState({ handle: "car_selections" });
      const proposal = connectors.cars.execute({
        kind: "search",
        search: input,
        catalog: CAR_CATALOG,
        state: current.value,
        readOk: current.ok.optional(),
        requestedAt: context["temporal.instant"],
      });
      const patch = when(proposal.mayWrite.equals(true), () =>
        connectors.state.patchState({
          handle: "car_selections",
          expectedRevision: current.revision,
          value: proposal.nextState,
        }),
      );
      const saved = connectors.cars.execute({
        kind: "ack_search",
        result: proposal.result,
        patchOk: patch.ok.optional(),
      });
      return {
        status: saved["result.status"],
        dataSource: saved["result.dataSource"],
        isFictional: saved["result.isFictional"],
        disclosure: saved["result.disclosure"],
        message: saved["result.message"],
        fallback: saved["result.fallback"],
        searchId: saved["result.searchId"],
        searchContext: saved["result.searchContext"],
        days: saved["result.days"],
        fees: saved["result.fees"],
        assumptions: saved["result.assumptions"],
        cars: saved["result.cars"],
        canSelect: saved["result.canSelect"],
        selected: saved["result.selected"].optional(),
      };
    },
    viewTitle: "Find your kind of drive",
    viewDescription:
      "Fictional car carousel, two-car comparison, three-photo details and explicit trip planning selection. Let the widget carry the full list and prices; keep prose concise.",
    invoking: "Finding demo cars…",
    invoked: "Demo car ideas ready",
    view: { component: "car-results", entry: "./views/car-results.tsx" },
    ...viewPolicy,
  });
  const select = tool("select_car", {
    title: "Remember a car planning choice",
    visibility: ["app"],
    description:
      "Explicit widget add, replace or remove of one server-returned fictional car reference. Price and trip dates come only from stored search results. Acknowledges caller-state persistence. No rental provider, booking, eligibility, payment or external side effect.",
    annotations: annotations.readOnly(),
    input: carActionSchema,
    output: carDecisionSchema,
    fulfil: ({ input, context, connectors }) => {
      const current = connectors.state.readState({ handle: "car_selections" });
      const proposal = connectors.cars.execute({
        kind: "select",
        action: input,
        state: current.value,
        readOk: current.ok.optional(),
        requestedAt: context["temporal.instant"],
      });
      const patch = when(proposal.mayWrite.equals(true), () =>
        connectors.state.patchState({
          handle: "car_selections",
          expectedRevision: current.revision,
          value: proposal.nextState,
        }),
      );
      const saved = connectors.cars.execute({
        kind: "ack_selection",
        decision: proposal.decision,
        patchOk: patch.ok.optional(),
      });
      return {
        status: saved["decision.status"],
        message: saved["decision.message"],
        selection: saved["decision.selection"].optional(),
      };
    },
  });
  return [search, select] as const;
}
