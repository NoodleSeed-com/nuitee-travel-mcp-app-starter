export const starterConfig = {
  brand: {
    name: 'Wayfare',
    mark: 'W',
    assistantName: 'Travel assistant',
    tagline: 'Travel, planned around you.',
    accent: '#2F70E8',
    signal: '#0B1F33',
    canvas: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceDark: '#0B1F33',
    ink: '#0B1F33',
    muted: '#526173',
    boundary: '#D8DEE7',
  },
  website: {
    developerPath: '/developers',
    supportPath: '/developers#support',
    privacyUrl: '/privacy',
    termsUrl: '/terms',
  },
  prompts: [
    'Find a weekend flight to Rome',
    'Compare nonstop fares to London',
    'Plan a round trip for two',
  ],
  widgets: { domain: null },
  embeddedAssistant: {
    origins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://wayfare-experience.fly.dev',
      'https://gowayfare.io',
    ],
  },
} as const;

export type StarterConfig = typeof starterConfig;
