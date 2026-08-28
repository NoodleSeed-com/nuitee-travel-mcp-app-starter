export interface LandingDestination {
  readonly id: 'rome' | 'london' | 'istanbul';
  readonly name: string;
  readonly descriptor: string;
  readonly prompt: string;
  readonly imageSrc: string;
  readonly imagePosition: string;
}

export interface LandingEditorialFeature {
  readonly eyebrow: string;
  readonly heading: string;
  readonly support: string;
  readonly action: string;
  readonly prompt: string;
  readonly imageSrc: string;
  readonly imagePosition: string;
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
  eyebrow: 'Travel inspiration',
  heading: 'A few words can take you somewhere new.',
  support: 'Refine the dates, travellers, cabin, and route as you go.',
  action: 'Start with a flexible trip',
  prompt: 'Help me find a trip somewhere warm with flexible dates.',
  imageSrc: '/images/destinations/warm-horizon-v1.jpg',
  imagePosition: 'center 54%',
} as const satisfies LandingEditorialFeature;
