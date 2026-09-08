export const travelCompanionDemoConfig = {
  mode: 'expanded_travel_preview',
  brand: {
    name: 'Wayfare',
    assistantName: 'Wayfare travel assistant',
    tagline: 'One conversation. The whole journey.',
    intro:
      'Search current flights and stays, explore fictional Lisbon and Tokyo experiences, compare travel protection concepts, and preview rewards in one conversation.',
    palette: {
      light: {
        ink: '#0D0D0D',
        primary: '#0D0D0D',
        primaryHover: '#262626',
        focus: '#0D0D0D',
        decorativeCyan: '#2AA6A4',
        canvas: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceTint: '#F7F7F7',
        muted: '#5D5D5D',
        boundary: '#E8E8E8',
        onPrimary: '#FFFFFF',
      },
      // Portable host fallback only. Wayfare's website stays light; adapted
      // MCP Apps inherit their host's neutral tokens instead of a navy theme.
      dark: {
        ink: '#FFFFFF',
        primary: '#FFFFFF',
        primaryHover: '#E8E8E8',
        focus: '#FFFFFF',
        decorativeCyan: '#2AA6A4',
        canvas: '#0D0D0D',
        surface: '#0D0D0D',
        surfaceTint: '#262626',
        muted: '#B8B8B8',
        boundary: '#404040',
        onPrimary: '#0D0D0D',
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
