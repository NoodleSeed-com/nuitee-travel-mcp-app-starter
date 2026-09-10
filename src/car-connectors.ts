import { connector, z } from "@noodleseed/one";
import { runCarGateway } from "./car-runtime.js";
import {
  carActionSchema,
  carDecisionSchema,
  carSearchInputSchema,
  carSearchResultSchema,
  carStateSchema,
} from "./car-schemas.js";
import { demoTripReviewSchema } from "./demo-schemas.js";

export const carGateway = connector("wayfare_car_planning")
  .version("1.0.0")
  .compute("execute", {
    type: "read",
    input: z.object({
      kind: z.enum([
        "search",
        "select",
        "review",
        "ack_search",
        "ack_selection",
      ]),
      search: carSearchInputSchema.optional(),
      catalog: z.unknown().optional(),
      state: z.unknown().optional(),
      readOk: z.boolean().optional(),
      tripReadOk: z.boolean().optional(),
      requestedAt: z.string().datetime().optional(),
      action: carActionSchema.optional(),
      result: carSearchResultSchema.optional(),
      decision: carDecisionSchema.optional(),
      patchOk: z.boolean().optional(),
      review: demoTripReviewSchema.optional(),
    }),
    output: z.object({
      result: carSearchResultSchema.optional(),
      nextState: carStateSchema.optional(),
      decision: carDecisionSchema.optional(),
      review: demoTripReviewSchema.optional(),
      tripReadOk: z.boolean().optional(),
      mayWrite: z.boolean().optional(),
    }),
    limits: { timeoutMs: 1000 },
    run: runCarGateway,
  });
