export const flightCatchersDemoConfig = {
  mode: 'private_partner_demo',
  brand: {
    name: 'Flight Catchers',
    assistantName: 'Flight Catchers travel assistant',
    tagline: 'Flights, hotels, and rewards in one conversation.',
    intro:
      'Search current flights, compare illustrative stays, and preview rewards in one conversation.',
    palette: {
      light: {
        ink: '#071D29',
        primary: '#006D84',
        primaryHover: '#005769',
        focus: '#007D95',
        decorativeCyan: '#00AFC3',
        canvas: '#F5FAFB',
        surface: '#FFFFFF',
        surfaceTint: '#E8F7F9',
        muted: '#536A73',
        boundary: '#CFE0E5',
        onPrimary: '#FFFFFF',
      },
      dark: {
        ink: '#F3FAFC',
        primary: '#55D6E5',
        primaryHover: '#7DE3ED',
        focus: '#55D6E5',
        decorativeCyan: '#55D6E5',
        canvas: '#061A22',
        surface: '#0A222C',
        surfaceTint: '#10323D',
        muted: '#B5C7CD',
        boundary: '#24404A',
        onPrimary: '#071D29',
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
      status: 'temporary_demo_asset',
      sourcePath: 'apps/web/public/brand/flight-catchers-demo-logo.png',
      compactMarkPath: null,
      lightWordmarkPath: 'apps/web/public/brand/flight-catchers-demo-logo.png',
      darkWordmarkPath: 'apps/web/public/brand/flight-catchers-demo-logo.png',
      provenanceRecordPath: 'docs/assets/flight-catchers-logo.md',
      reviewedBinaryBlob: false,
    },
  },
  publicRelease: {
    ready: false,
    status: 'blocked_pending_owner_review',
    brandAuthorizationReference: null,
    assetLicenseReference: null,
    blockers: [
      'record_brand_authorization',
      'replace_temporary_logo_with_original_asset',
      'record_asset_provenance',
      'complete_final_brand_review',
    ],
  },
} as const;

export type FlightCatchersDemoConfig = typeof flightCatchersDemoConfig;
