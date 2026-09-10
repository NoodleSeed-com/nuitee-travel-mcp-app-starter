import type { DemoExperienceSearchOutput, DemoExperienceSelection, DemoTripReview } from '../src/demo-schemas.js';
import { DEMO_EXPERIENCE_ALIASES, DEMO_EXPERIENCE_CATALOG } from '../src/experience-fixtures.js';
import { runDemoGateway } from '../src/demo-runtime.js';

/**
 * Credential-free preview inputs. The insurance catalog and loyalty profile below
 * were derived from the existing public constants in src/demo-fixtures.ts.
 * Keep that Node-only module out of the browser. Prices remain fixture values,
 * never live inventory, exchange rates, or a provider response.
 */
export const PREVIEW_INSURANCE_CATALOG = [
  {
    "key": "demo_insurance_essential",
    "name": "Essential concept",
    "summary": "A compact concept for core emergency and interruption examples.",
    "basePriceCad": 24,
    "dailyPriceCad": 1.25,
    "deductibleCad": 250,
    "coverages": [
      {
        "name": "Emergency medical",
        "limitCad": 1000000,
        "basis": "per_traveler",
        "summary": "Illustrative maximum only; eligibility and actual terms were not checked."
      },
      {
        "name": "Trip cancellation",
        "limitCad": 1500,
        "basis": "per_trip",
        "summary": "Illustrative maximum only; covered reasons would depend on actual policy wording."
      },
      {
        "name": "Baggage",
        "limitCad": 750,
        "basis": "per_traveler",
        "summary": "Illustrative maximum only; item and sub-limits are not represented."
      },
      {
        "name": "Travel delay",
        "limitCad": 250,
        "basis": "per_trip",
        "summary": "Illustrative maximum only; waiting periods and eligible costs are not represented."
      }
    ],
    "highlights": [
      "Core concept comparison",
      "Higher illustrative deductible"
    ],
    "exclusions": [
      "Pre-existing-condition rules would require review of actual policy wording.",
      "Adventure activities and destination advisories may require separate review."
    ]
  },
  {
    "key": "demo_insurance_balanced",
    "name": "Balanced concept",
    "summary": "A broader concept with higher illustrative limits across the trip.",
    "basePriceCad": 39,
    "dailyPriceCad": 2,
    "deductibleCad": 100,
    "coverages": [
      {
        "name": "Emergency medical",
        "limitCad": 2000000,
        "basis": "per_traveler",
        "summary": "Illustrative maximum only; eligibility and actual terms were not checked."
      },
      {
        "name": "Trip cancellation",
        "limitCad": 3000,
        "basis": "per_trip",
        "summary": "Illustrative maximum only; covered reasons would depend on actual policy wording."
      },
      {
        "name": "Baggage",
        "limitCad": 1500,
        "basis": "per_traveler",
        "summary": "Illustrative maximum only; item and sub-limits are not represented."
      },
      {
        "name": "Travel delay",
        "limitCad": 500,
        "basis": "per_trip",
        "summary": "Illustrative maximum only; waiting periods and eligible costs are not represented."
      }
    ],
    "highlights": [
      "Broader concept comparison",
      "Mid-range illustrative deductible"
    ],
    "exclusions": [
      "Pre-existing-condition rules would require review of actual policy wording.",
      "Adventure activities and destination advisories may require separate review."
    ]
  },
  {
    "key": "demo_insurance_extended",
    "name": "Extended concept",
    "summary": "The widest illustrative limits in this fictional comparison.",
    "basePriceCad": 57,
    "dailyPriceCad": 2.8,
    "deductibleCad": 0,
    "coverages": [
      {
        "name": "Emergency medical",
        "limitCad": 5000000,
        "basis": "per_traveler",
        "summary": "Illustrative maximum only; eligibility and actual terms were not checked."
      },
      {
        "name": "Trip cancellation",
        "limitCad": 5000,
        "basis": "per_trip",
        "summary": "Illustrative maximum only; covered reasons would depend on actual policy wording."
      },
      {
        "name": "Baggage",
        "limitCad": 2500,
        "basis": "per_traveler",
        "summary": "Illustrative maximum only; item and sub-limits are not represented."
      },
      {
        "name": "Travel delay",
        "limitCad": 1000,
        "basis": "per_trip",
        "summary": "Illustrative maximum only; waiting periods and eligible costs are not represented."
      }
    ],
    "highlights": [
      "Expanded concept comparison",
      "Zero illustrative deductible"
    ],
    "exclusions": [
      "Pre-existing-condition rules would require review of actual policy wording.",
      "Adventure activities and destination advisories may require separate review."
    ]
  }
];

const previewLoyalty: DemoTripReview['loyalty'] = {
  "status": "success",
  "dataSource": "illustrative",
  "disclosure": "Illustrative rewards — this fixed profile is synthetic. No real account was accessed, and points cannot be earned, transferred, or applied.",
  "fallback": "Illustrative rewards profile for Preview traveler: Explorer concept tier with 42,500 synthetic points. No real account was accessed and no points action is available.",
  "member": {
    "displayName": "Preview traveler",
    "reference": "WAYFARE-PREVIEW-0001",
    "tier": "Explorer concept tier",
    "pointsBalance": 42500
  },
  "progress": {
    "label": "Illustrative progress toward the next concept tier",
    "current": 42500,
    "target": 60000
  },
  "benefits": [
    {
      "name": "Flexible planning preview",
      "description": "Concept-only access to trip-planning comparisons; this is not a commercial benefit."
    },
    {
      "name": "Travel support preview",
      "description": "Illustrative priority-help concept with no service entitlement."
    },
    {
      "name": "Stay discovery preview",
      "description": "Illustrative hotel highlights, not member-only inventory."
    }
  ],
  "illustrativePointsValue": {
    "points": 25000,
    "value": {
      "amount": 250,
      "currency": "CAD"
    },
    "explanation": "Illustrative comparison only; points cannot be applied and this value is not an offer."
  }
};

export const PREVIEW_NOW = '2030-09-09T12:00:00.000Z';
export type PreviewScenario = 'full' | 'mixed' | 'missing' | 'partial' | 'failed-save';

const experienceSearch = runDemoGateway({
  kind: 'experience_search',
  experienceSearch: {
    destination: 'Lisbon', experienceName: 'Belém Makers Morning',
    startDate: '2030-09-16', endDate: '2030-09-17', adults: 2, children: 0, currency: 'EUR',
  },
  experienceCatalog: DEMO_EXPERIENCE_CATALOG as unknown as Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>,
  experienceAliases: DEMO_EXPERIENCE_ALIASES,
  experienceState: {}, experienceReadOk: true, requestedAt: PREVIEW_NOW,
});
const experienceResult = experienceSearch.experienceResult as DemoExperienceSearchOutput;
const chosenExperience = experienceResult.experiences[0]!;
const selectedExperience = runDemoGateway({
  kind: 'experience_select', experienceState: experienceSearch.nextExperienceState,
  experienceReadOk: true, experienceId: chosenExperience.experienceId,
  slotId: chosenExperience.slots[0]!.slotId, requestedAt: PREVIEW_NOW,
});
const experienceSelection = (selectedExperience.experienceSelection as {
  status: string; selection: DemoExperienceSelection;
}).selection;
if (!experienceSelection || experienceSelection.totalPrice.amountMinor !== 9200) {
  throw new Error('The local experience fixture no longer matches the approved €92.00 example.');
}

export function buildPreviewReview(scenario: PreviewScenario): DemoTripReview {
  const partial = scenario === 'partial';
  return {
    status: 'ready', dataSource: 'illustrative',
    disclosure: 'Local fixtures only. Source labels show the real component presentation; no provider API or account was accessed.',
    fallback: 'Local fixture review: a fictional Lisbon planning example. Nothing was reserved, purchased or redeemed.',
    ...(!partial ? {
      flight: {
        dataSource: 'live_nuitee_selection' as const, selectionId: `sel_${'a'.repeat(32)}`,
        origin: 'YYZ', destination: 'LIS',
        // Existing repo asset URL verified 2026-09-09: HTTP 200, image/png.
        // Demonstrates the real image guard; does not identify this fixture's carrier.
        airlineLogoUrl: 'https://sandbox.nuitee.flights/static/images/airlines/QZ.png',
        searchPrice: scenario === 'missing' ? null : { total: 1743.32, currency: scenario === 'mixed' ? 'CAD' : 'EUR' },
        disclosure: 'Local fixture of a selected search fare. No live verification was performed.',
      },
      stay: {
        dataSource: 'live_nuitee' as const, selectionId: `hsel_${'b'.repeat(32)}`,
        propertyName: 'Hotel da Baixa', city: 'Lisbon',
        checkInDate: '2030-09-16', checkOutDate: '2030-09-17', nights: 1, rooms: 1,
        staySubtotal: { amount: 323.33, currency: 'EUR' as const },
      },
    } : {}),
    experiences: [experienceSelection],
    loyalty: previewLoyalty,
    missing: partial ? ['flight', 'stay'] : [],
    planningContext: {
      source: partial ? 'experience' : 'stay', dateBasis: partial ? 'experience_search' : 'stay',
      destination: 'Lisbon', origin: 'Toronto', countryCode: 'PT',
      startDate: '2030-09-16', endDate: '2030-09-17',
      adults: 2, children: 0, infants: 0, currency: 'EUR',
      ...(partial ? { meetingArea: 'Belém cultural district' } : { propertyName: 'Hotel da Baixa' }),
    },
  };
}
