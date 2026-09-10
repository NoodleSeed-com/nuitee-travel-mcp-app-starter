import { connector, z } from '@noodleseed/one';
import { selectionStateSchema } from './flight-schemas.js';
import { runDemoGateway } from './demo-runtime.js';
import { acknowledgeExperienceSelection, acknowledgeProtectionComparison, prepareSelectionStates } from './selection-state.js';
import { runTripProtection } from './trip-protection.js';
import { openStoredHotel } from './hotel-opening.js';
import { tripPlanningEstimate } from './trip-planning-estimate.js';
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
  tripPlanningEstimateSchema,
  tripProtectionSelectionSchema,
  tripProtectionStateSchema,
  tripProtectionResultSchema,
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
  .compute('estimate_trip', {
    type: 'read',
    input: z.object({ review: demoTripReviewSchema, protection: tripProtectionSelectionSchema.optional() }),
    output: tripPlanningEstimateSchema,
    limits: { timeoutMs: 1_000 },
    run: tripPlanningEstimate,
  })
  .compute('protection', {
    type: 'read',
    input: z.object({
      kind: z.enum(['prepare', 'select', 'review', 'acknowledge']),
      review: demoTripReviewSchema.optional(), comparison: demoInsuranceComparisonOutputSchema.optional(),
      state: tripProtectionStateSchema.optional(), readOk: z.boolean().optional(), tripReadOk: z.boolean().optional(),
      requestedAt: z.string().datetime().optional(), action: z.enum(['select', 'remove']).optional(),
      comparisonId: z.string().regex(/^inscmp_[a-f0-9]{32}$/).optional(), planId: z.string().regex(/^inplan_[a-f0-9]{32}$/).optional(),
      proposal: tripProtectionResultSchema.optional(), patchOk: z.boolean().optional(),
    }),
    output: z.object({
      status: z.enum(['selected', 'removed', 'already_selected', 'unavailable', 'conflict', 'expired']).optional(),
      message: z.string().min(1).max(240).optional(), note: z.string().min(1).max(240).optional(),
      selection: tripProtectionSelectionSchema.optional(), nextState: tripProtectionStateSchema.optional(),
      canSelect: z.boolean().optional(), mayWrite: z.boolean().optional(),
    }),
    limits: { timeoutMs: 1_000 },
    run: runTripProtection,
  })
  .compute('acknowledge_protection_comparison', {
    type: 'read',
    input: z.object({ proposal: z.object({ canSelect: z.boolean(), message: z.string().max(240) }), patchOk: z.boolean().optional() }),
    output: z.object({ canSelect: z.boolean(), message: z.string().min(1).max(240) }),
    limits: { timeoutMs: 1_000 },
    run: acknowledgeProtectionComparison,
  })
  .compute('open_hotel', {
    type: 'read',
    input: z.object({ hotelName: z.string().max(100), hotelState: demoHotelSelectionStateSchema.optional(), readOk: z.boolean().optional() }),
    output: openHotelOutputSchema,
    limits: { timeoutMs: 1_000 },
    run: openStoredHotel,
  })
  .compute('prepare_states', {
    type: 'read',
    input: z.object({ flightState: z.unknown().optional(), hotelState: z.unknown().optional(), experienceState: z.unknown().optional(), flightReadOk: z.boolean().optional(), hotelReadOk: z.boolean().optional(), experienceReadOk: z.boolean().optional() }),
    output: z.object({ flightState: selectionStateSchema.optional(), hotelState: demoHotelSelectionStateSchema.optional(), experienceState: demoExperienceSelectionStateSchema.optional(), tripReadOk: z.boolean().optional() }),
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
