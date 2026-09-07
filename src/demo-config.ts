export const travelCompanionDemoConfig = {
  mode: 'expanded_travel_preview',
  brand: {
    name: 'Wayfare',
    assistantName: 'Wayfare travel assistant',
    tagline: 'Travel, planned around you.',
    intro:
      'Search current flights and stays, explore fictional Lisbon and Tokyo experiences, compare travel protection concepts, and preview rewards in one conversation.',
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
      mode: 'live_nuitee',
      label: 'Current hotel rates',
    },
    loyalty: {
      mode: 'synthetic_fixture',
      label: 'Illustrative rewards',
    },
    insurance: {
      mode: 'synthetic_fixture',
      label: 'Illustrative travel protection',
    },
    experiences: {
      mode: 'synthetic_fixture',
      label: 'Fictional Lisbon and Tokyo ideas',
    },
  },
  disclosure: {
    badge: 'Preview only',
    persistent:
      'Flight and stay results come from connected providers. Lisbon and Tokyo experiences, rewards, and travel protection are fictional or illustrative previews. Booking, experience reservations, redemption, and policy purchase are unavailable.',
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
      sourcePath: 'apps/web/public/images/immersive/wayfare-explore-windows-v2.png',
      provenanceRecordPath: 'docs/visual-assets/wayfare-premium-concierge.md',
      sha256:
        '4f28eb6b9f00c101cb9a66d7731a07ae760d4cf61b436750a7e6172b0b98e41a',
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
