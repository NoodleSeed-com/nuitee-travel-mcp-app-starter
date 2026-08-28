export const starterConfig = {
  brand: {
    name: 'Wayfare',
    mark: 'W',
    assistantName: 'Travel assistant',
    tagline: 'Travel, planned around you.',
    accent: '#2F80ED',
    signal: '#071A2A',
    canvas: '#FAFAFA',
    surface: '#F4F7FB',
    surfaceDark: '#071A2A',
    ink: '#071A2A',
    muted: '#4B5563',
    boundary: '#CBD5E1',
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
