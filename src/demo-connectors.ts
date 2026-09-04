import { connector, z } from '@noodleseed/one';
import { selectionStateSchema } from './flight-schemas.js';
import { runDemoGateway } from './demo-runtime.js';
import { prepareSelectionStates } from './selection-state.js';
import {
  demoHotelSearchInputSchema,
  demoHotelSearchOutputSchema,
  demoHotelSelectionIdSchema,
  demoHotelSelectionRecordSchema,
  demoHotelSelectionStateSchema,
  demoInsuranceComparisonInputSchema,
  demoInsuranceComparisonOutputSchema,
  demoLoyaltyOverviewSchema,
  demoRewardFlightSearchInputSchema,
  demoRewardFlightSearchOutputSchema,
  demoSelectHotelOutputSchema,
  demoTripReviewSchema,
} from './demo-schemas.js';

const demoGatewayInputSchema = z.object({
  kind: z.enum(['search', 'reward_search', 'insurance_compare', 'review', 'select']),
  search: demoHotelSearchInputSchema.optional(),
  catalog: z.unknown().optional(),
  aliases: z.unknown().optional(),
  flightState: selectionStateSchema.optional(),
  hotelState: demoHotelSelectionStateSchema.optional(),
  loyalty: demoLoyaltyOverviewSchema.optional(),
  selectionId: demoHotelSelectionIdSchema.optional(),
  rewardSearch: demoRewardFlightSearchInputSchema.optional(),
  rewardCatalog: z.unknown().optional(),
  insuranceComparison: demoInsuranceComparisonInputSchema.optional(),
  insuranceCatalog: z.unknown().optional(),
});

function reviewStateReadSchema(
  handle: 'flight_selections' | 'demo_hotel_selections',
  storedValue: typeof selectionStateSchema | typeof demoHotelSelectionStateSchema,
) {
  const metadata = z.object({
    ok: z.literal(true),
    handle: z.literal(handle),
    revision: z.number().int().nonnegative(),
    status: z.string(),
    expiresAt: z.string().optional(),
  });
  return z.union([
    // The native store returns an exact empty value on a fresh successful read.
    // Never accept a failed read or an empty value after a stored revision.
    metadata.extend({ revision: z.literal(0), value: z.object({}).strict() }),
    metadata.extend({ value: storedValue }),
  ]);
}

export const demoGatewayOutputSchema = z.object({
  kind: z.enum(['search', 'reward_search', 'insurance_compare', 'review', 'select']),
  result: demoHotelSearchOutputSchema.optional(),
  rewardResult: demoRewardFlightSearchOutputSchema.optional(),
  insuranceResult: demoInsuranceComparisonOutputSchema.optional(),
  records: z.array(demoHotelSelectionRecordSchema).max(10).optional(),
  review: demoTripReviewSchema.optional(),
  selection: demoSelectHotelOutputSchema.optional(),
  nextHotelState: demoHotelSelectionStateSchema.optional(),
});

export const demoGateway = connector('wayfare_preview_gateway')
  .version('1.0.0')
  .compute('review', {
    type: 'read',
    input: z.object({
      kind: z.literal('review_state'),
      flightRead: reviewStateReadSchema('flight_selections', selectionStateSchema),
      hotelRead: reviewStateReadSchema('demo_hotel_selections', demoHotelSelectionStateSchema),
      loyalty: demoLoyaltyOverviewSchema,
    }),
    output: z.object({ kind: z.literal('review'), review: demoTripReviewSchema }),
    limits: { timeoutMs: 1_000 },
    run: runDemoGateway,
  })
  .compute('prepare_states', {
    type: 'read',
    input: z.object({ flightState: z.unknown().optional(), hotelState: z.unknown().optional() }),
    output: z.object({ flightState: selectionStateSchema.optional(), hotelState: demoHotelSelectionStateSchema.optional() }),
    limits: { timeoutMs: 1_000 },
    run: prepareSelectionStates,
  })
  .compute('execute', {
    type: 'read',
    input: demoGatewayInputSchema,
    output: demoGatewayOutputSchema,
    limits: { timeoutMs: 1_000 },
    run: runDemoGateway,
  });
