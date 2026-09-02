export interface LandingDestination {
  readonly id: 'rome' | 'london' | 'istanbul' | 'lisbon' | 'banff';
  readonly name: string;
  readonly descriptor: string;
  readonly prompt: string;
  readonly imageSrc: string;
  readonly imagePosition: string;
}

export interface LandingEditorialFeature {
  readonly heading: string;
  readonly support: string;
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
  {
    id: 'lisbon',
    name: 'Lisbon',
    descriptor: 'Sunlit stays',
    prompt: 'Help me plan flights and a three-night stay in Lisbon.',
    imageSrc: '/images/destinations/lisbon-editorial-v1.png',
    imagePosition: '50% 54%',
  },
  {
    id: 'banff',
    name: 'Banff',
    descriptor: 'Mountain escapes',
    prompt: 'Plan a flight and hotel trip to Banff for two.',
    imageSrc: '/images/destinations/banff-editorial-v1.png',
    imagePosition: '50% 48%',
  },
] as const satisfies readonly LandingDestination[];

export const landingEditorialFeature = {
  heading: 'One conversation, every part of the trip.',
  support: 'Tell Wayfare what you are planning. It will bring in the relevant parts of the journey as they become useful.',
} as const satisfies LandingEditorialFeature;
