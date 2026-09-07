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
  demoExperienceSearchInputSchema,
  demoExperienceSearchOutputSchema,
  demoInsuranceComparisonInputSchema,
  demoInsuranceComparisonOutputSchema,
  demoLoyaltyOverviewSchema,
  demoRewardFlightSearchInputSchema,
  demoRewardFlightSearchOutputSchema,
  demoSelectHotelOutputSchema,
  demoTripReviewSchema,
} from './demo-schemas.js';

const demoGatewayInputSchema = z.object({
  kind: z.enum(['search', 'reward_search', 'insurance_compare', 'experience_search', 'review', 'select']),
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
  experienceSearch: demoExperienceSearchInputSchema.optional(),
  experienceCatalog: z.unknown().optional(),
  experienceAliases: z.unknown().optional(),
});

export const demoGatewayOutputSchema = z.object({
  kind: z.enum(['search', 'reward_search', 'insurance_compare', 'experience_search', 'review', 'select']),
  result: demoHotelSearchOutputSchema.optional(),
  rewardResult: demoRewardFlightSearchOutputSchema.optional(),
  insuranceResult: demoInsuranceComparisonOutputSchema.optional(),
  experienceResult: demoExperienceSearchOutputSchema.optional(),
  records: z.array(demoHotelSelectionRecordSchema).max(10).optional(),
  review: demoTripReviewSchema.optional(),
  selection: demoSelectHotelOutputSchema.optional(),
  nextHotelState: demoHotelSelectionStateSchema.optional(),
});

export const demoGateway = connector('wayfare_preview_gateway')
  .version('1.0.0')
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
