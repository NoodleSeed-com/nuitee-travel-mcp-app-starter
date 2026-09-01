export interface LandingDestination {
  readonly id: 'rome' | 'london' | 'istanbul';
  readonly name: string;
  readonly descriptor: string;
  readonly prompt: string;
  readonly imageSrc: string;
  readonly imagePosition: string;
}

export interface LandingEditorialFeature {
  readonly heading: string;
  readonly support: string;
  readonly action: string;
  readonly prompt: string;
}

export const landingDestinations = [
  {
    id: 'rome',
    name: 'Rome',
    descriptor: 'Long weekends',
    prompt: 'Help me plan a long-weekend flight to Rome for two.',
    imageSrc: '/images/destinations/rome-editorial-v2.jpg',
    imagePosition: '72% 48%',
  },
  {
    id: 'london',
    name: 'London',
    descriptor: 'Nonstop options',
    prompt: 'Compare nonstop flight options to London.',
    imageSrc: '/images/destinations/london-editorial-v2.jpg',
    imagePosition: '58% 50%',
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    descriptor: 'Flexible dates',
    prompt: 'Find flights to Istanbul with flexible dates.',
    imageSrc: '/images/destinations/istanbul-editorial-v2.jpg',
    imagePosition: '30% 50%',
  },
] as const satisfies readonly LandingDestination[];

export const landingEditorialFeature = {
  heading: 'One conversation, every part of the trip.',
  support: 'Refine current flights, compare illustrative stays, and preview rewards as you go.',
  action: 'Build a trip',
  prompt: 'Help me build a trip somewhere warm with flexible dates and a hotel.',
} as const satisfies LandingEditorialFeature;
