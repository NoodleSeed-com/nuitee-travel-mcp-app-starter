export const starterConfig = {
  brand: {
    name: 'Cedar & Cloud Travel',
    mark: 'C',
    assistantName: 'Travel assistant',
    tagline: 'Thoughtful journeys, conversationally planned',
    accent: '#737373',
    signal: '#171717',
    canvas: '#FAFAFA',
    surface: '#F5F5F5',
    surfaceDark: '#0A0A0A',
    ink: '#0A0A0A',
    muted: '#525252',
    boundary: '#D4D4D4',
  },
  website: {
    developerPath: '/developers',
    supportPath: '/developers#support',
    privacyUrl: null,
    termsUrl: null,
  },
  prompts: [
    'Find a weekend flight to Rome',
    'Compare nonstop fares to London',
    'Plan a round trip for two',
  ],
  widgets: { domain: null },
  embeddedAssistant: {
    origins: ['http://localhost:3000', 'http://localhost:3001'],
  },
} as const;

export type StarterConfig = typeof starterConfig;
