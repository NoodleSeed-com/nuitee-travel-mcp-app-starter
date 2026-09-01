import { connector, z } from '@noodleseed/one';
import { selectionStateSchema } from './flight-schemas.js';
import { runDemoGateway } from './demo-runtime.js';
import {
  demoHotelSearchInputSchema,
  demoHotelSearchOutputSchema,
  demoHotelSelectionIdSchema,
  demoHotelSelectionRecordSchema,
  demoHotelSelectionStateSchema,
  demoLoyaltyOverviewSchema,
  demoRewardFlightSearchInputSchema,
  demoRewardFlightSearchOutputSchema,
  demoSelectHotelOutputSchema,
  demoTripReviewSchema,
} from './demo-schemas.js';

const demoGatewayInputSchema = z.object({
  kind: z.enum(['search', 'reward_search', 'review', 'select']),
  search: demoHotelSearchInputSchema.optional(),
  catalog: z.unknown().optional(),
  aliases: z.unknown().optional(),
  flightState: selectionStateSchema.optional(),
  hotelState: demoHotelSelectionStateSchema.optional(),
  loyalty: demoLoyaltyOverviewSchema.optional(),
  selectionId: demoHotelSelectionIdSchema.optional(),
  rewardSearch: demoRewardFlightSearchInputSchema.optional(),
  rewardCatalog: z.unknown().optional(),
});

export const demoGatewayOutputSchema = z.object({
  kind: z.enum(['search', 'reward_search', 'review', 'select']),
  result: demoHotelSearchOutputSchema.optional(),
  rewardResult: demoRewardFlightSearchOutputSchema.optional(),
  records: z.array(demoHotelSelectionRecordSchema).max(10).optional(),
  review: demoTripReviewSchema.optional(),
  selection: demoSelectHotelOutputSchema.optional(),
  nextHotelState: demoHotelSelectionStateSchema.optional(),
});

export const demoGateway = connector('flightcatchers_demo_gateway')
  .version('1.0.0')
  .compute('execute', {
    type: 'read',
    input: demoGatewayInputSchema,
    output: demoGatewayOutputSchema,
    limits: { timeoutMs: 1_000 },
    run: runDemoGateway,
  });
