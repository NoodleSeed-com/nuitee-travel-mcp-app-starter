export const starterConfig = {
  brand: {
    name: 'Wayfare',
    mark: 'W',
    assistantName: 'Wayfare travel assistant',
    tagline: 'One conversation. The whole journey.',
    accent: '#0D0D0D',
    signal: '#0D0D0D',
    canvas: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceDark: '#0D0D0D',
    ink: '#0D0D0D',
    muted: '#5D5D5D',
    boundary: '#E8E8E8',
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
      'https://gowayfare.io',
    ],
  },
} as const;

export type StarterConfig = typeof starterConfig;
