export const starterConfig = {
  brand: {
    name: 'Cedar & Cloud Travel',
    mark: 'C',
    assistantName: 'Travel assistant',
    tagline: 'Thoughtful journeys, conversationally planned',
    accent: '#2B6F6D',
    signal: '#CFE86A',
    canvas: '#FBFBFB',
    surface: '#EAE8EC',
    surfaceDark: '#101B22',
    ink: '#2C2C2E',
    muted: '#737479',
    boundary: '#CBCDD5',
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
