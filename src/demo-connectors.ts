import { connector, z } from '@noodleseed/one';
import { selectionStateSchema } from './flight-schemas.js';
import { runDemoGateway } from './demo-runtime.js';
import { acknowledgeExperienceSelection, prepareSelectionStates } from './selection-state.js';
import { openStoredHotel } from './hotel-opening.js';
import {
  demoHotelSearchInputSchema,
  demoHotelSearchOutputSchema,
  demoHotelSelectionIdSchema,
  demoHotelSelectionRecordSchema,
  demoHotelSelectionStateSchema,
  demoExperienceSearchInputSchema,
  demoExperienceSearchOutputSchema,
  demoExperienceSelectionStateSchema,
  demoExperienceIdSchema,
  demoExperienceSlotIdSchema,
  demoExperienceSelectionDecisionSchema,
  demoInsuranceComparisonInputSchema,
  demoInsuranceComparisonOutputSchema,
  demoLoyaltyOverviewSchema,
  demoRewardFlightSearchInputSchema,
  demoRewardFlightSearchOutputSchema,
  demoSelectHotelOutputSchema,
  demoTripReviewSchema,
  openHotelOutputSchema,
} from './demo-schemas.js';

const demoGatewayInputSchema = z.object({
  kind: z.enum(['search', 'reward_search', 'insurance_compare', 'experience_search', 'experience_select', 'review', 'select']),
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
  experienceState: demoExperienceSelectionStateSchema.optional(),
  experienceReadOk: z.boolean().optional(),
  experienceId: demoExperienceIdSchema.optional(),
  slotId: demoExperienceSlotIdSchema.optional(),
  requestedAt: z.string().datetime().optional(),
});

export const demoGatewayOutputSchema = z.object({
  kind: z.enum(['search', 'reward_search', 'insurance_compare', 'experience_search', 'experience_select', 'review', 'select']),
  result: demoHotelSearchOutputSchema.optional(),
  rewardResult: demoRewardFlightSearchOutputSchema.optional(),
  insuranceResult: demoInsuranceComparisonOutputSchema.optional(),
  experienceResult: demoExperienceSearchOutputSchema.optional(),
  experienceSelection: demoExperienceSelectionDecisionSchema.optional(),
  nextExperienceState: demoExperienceSelectionStateSchema.optional(),
  mayWriteExperienceState: z.boolean().optional(),
  records: z.array(demoHotelSelectionRecordSchema).max(10).optional(),
  review: demoTripReviewSchema.optional(),
  selection: demoSelectHotelOutputSchema.optional(),
  nextHotelState: demoHotelSelectionStateSchema.optional(),
});

export const demoGateway = connector('wayfare_preview_gateway')
  .version('1.0.0')
  .compute('open_hotel', {
    type: 'read',
    input: z.object({ hotelName: z.string().max(100), hotelState: demoHotelSelectionStateSchema.optional(), readOk: z.boolean().optional() }),
    output: openHotelOutputSchema,
    limits: { timeoutMs: 1_000 },
    run: openStoredHotel,
  })
  .compute('prepare_states', {
    type: 'read',
    input: z.object({ flightState: z.unknown().optional(), hotelState: z.unknown().optional(), experienceState: z.unknown().optional() }),
    output: z.object({ flightState: selectionStateSchema.optional(), hotelState: demoHotelSelectionStateSchema.optional(), experienceState: demoExperienceSelectionStateSchema.optional() }),
    limits: { timeoutMs: 1_000 },
    run: prepareSelectionStates,
  })
  .compute('acknowledge_experience_selection', {
    type: 'read',
    input: z.object({ proposal: demoExperienceSelectionDecisionSchema, patchOk: z.boolean().optional() }),
    output: demoExperienceSelectionDecisionSchema,
    limits: { timeoutMs: 1_000 },
    run: acknowledgeExperienceSelection,
  })
  .compute('execute', {
    type: 'read',
    input: demoGatewayInputSchema,
    output: demoGatewayOutputSchema,
    limits: { timeoutMs: 1_000 },
    run: runDemoGateway,
  });
