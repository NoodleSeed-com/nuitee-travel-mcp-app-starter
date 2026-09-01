export const travelCompanionDemoConfig = {
  mode: 'expanded_travel_preview',
  brand: {
    name: 'Wayfare',
    assistantName: 'Wayfare travel assistant',
    tagline: 'Travel, planned around you.',
    intro:
      'Search current flights, compare illustrative stays, and preview rewards in one conversation.',
    palette: {
      light: {
        ink: '#0B1F33',
        primary: '#2F70E8',
        primaryHover: '#245FC8',
        focus: '#2F70E8',
        decorativeCyan: '#4DB8AE',
        canvas: '#F7F8FA',
        surface: '#FFFFFF',
        surfaceTint: '#EEF4FD',
        muted: '#526173',
        boundary: '#D8DEE7',
        onPrimary: '#FFFFFF',
      },
      dark: {
        ink: '#F7F8FA',
        primary: '#9DC4F7',
        primaryHover: '#BCD6FA',
        focus: '#9DC4F7',
        decorativeCyan: '#8AD5CE',
        canvas: '#081725',
        surface: '#0B1F33',
        surfaceTint: '#142D45',
        muted: '#B8C4D1',
        boundary: '#2B4157',
        onPrimary: '#0B1F33',
      },
    },
    colorUsage: {
      decorativeCyan: 'decoration_only',
    },
  },
  dataSources: {
    flights: {
      mode: 'live_sandbox',
      label: 'Current flight fares',
    },
    hotels: {
      mode: 'synthetic_fixture',
      label: 'Illustrative stays',
    },
    loyalty: {
      mode: 'synthetic_fixture',
      label: 'Illustrative rewards',
    },
  },
  disclosure: {
    badge: 'Preview only',
    persistent:
      'Flight results come from the connected flight provider. Stays and rewards are illustrative previews. Booking and redemption are unavailable.',
  },
  assets: {
    logo: {
      status: 'repository_vector_component',
      sourcePath: 'apps/web/src/components/wayfare-mark.tsx',
      provenanceRecordPath: 'docs/architecture.md',
      reviewedBinaryBlob: false,
    },
    hero: {
      status: 'repository_owned_starter_asset',
      sourcePath: 'apps/web/public/images/wayfare-hybrid-hero-v2.jpg',
      provenanceRecordPath: 'docs/visual-assets/wayfare-premium-concierge.md',
      sha256:
        '5834743c2c7b9802bc903ee60e2da6770d2b23373014abd04e7e4d30e09be4eb',
      licenseConfirmed: true,
      reviewedBinaryBlob: true,
    },
  },
  publicRelease: {
    ready: false,
    status: 'blocked_pending_owner_review',
    brandAuthorizationReference: null,
    assetLicenseReference: null,
    blockers: [
      'complete_final_release_review',
    ],
  },
} as const;

export type TravelCompanionDemoConfig = typeof travelCompanionDemoConfig;
