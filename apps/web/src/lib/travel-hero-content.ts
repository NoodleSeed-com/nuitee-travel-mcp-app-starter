export type CoreHeroMode = 'explore' | 'flight' | 'stay' | 'flight-stay' | 'insurance';

export type HeroSceneLayout = 'standard' | 'center' | 'editorial';
export type HeroSceneTone = 'standard' | 'light' | 'dark';

export interface HeroSuggestion {
  readonly label: string;
  readonly prompt: string;
}

export interface HeroSceneDefinition {
  readonly id: string;
  readonly label: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly support: string;
  readonly imageSrc: string;
  readonly imagePosition: string;
  readonly placeholder: string;
  readonly detail?: string;
  readonly layout?: HeroSceneLayout;
  readonly tone?: HeroSceneTone;
  readonly suggestions?: readonly HeroSuggestion[];
}

export interface HeroModeDefinition<TMode extends string = string> {
  readonly id: TMode;
  readonly label: string;
  readonly scenes: readonly HeroSceneDefinition[];
}

/**
 * One source of truth for the core Wayfare hero content and image masters.
 * Both the standard landing page and the full-bleed alternative consume this
 * catalog so their visual story cannot drift.
 */
export const coreHeroModes = [
  {
    id: 'explore',
    label: 'Explore',
    scenes: [{
      id: 'explore-windows',
      label: 'Explore',
      eyebrow: 'Your trip, brought together',
      heading: 'Plan your whole trip',
      support: 'Flights, stays, and rewards—brought together in one conversation.',
      imageSrc: '/images/immersive/wayfare-explore-windows-v2.png',
      imagePosition: '50% 50%',
      placeholder: 'to somewhere warm for two, next week',
      detail: 'A window into what comes next',
    }],
  },
  {
    id: 'flight',
    label: 'Flights',
    scenes: [{
      id: 'flight-cockpit',
      label: 'Flights',
      eyebrow: 'Flight planning',
      heading: 'Choose your horizon',
      support: 'Compare current routes and fares around the journey you have in mind.',
      imageSrc: '/images/immersive/wayfare-cockpit-v2.png',
      imagePosition: '50% 50%',
      placeholder: 'Where do you want to fly?',
      detail: 'Round trip · 1 adult · Economy',
    }],
  },
  {
    id: 'stay',
    label: 'Stays',
    scenes: [{
      id: 'stay-suite',
      label: 'Stays',
      eyebrow: 'Stay planning',
      heading: 'Wake up somewhere new',
      support: 'Compare welcoming stays around your destination and travel dates.',
      imageSrc: '/images/immersive/wayfare-stay-v1.png',
      imagePosition: '50% 50%',
      placeholder: 'Where would you like to stay?',
      detail: '2 guests · 1 room · Flexible dates',
    }],
  },
  {
    id: 'flight-stay',
    label: 'Flight + Stay',
    scenes: [{
      id: 'flight-stay-coast',
      label: 'Flight + Stay',
      eyebrow: 'One connected plan',
      heading: 'From takeoff to check-in',
      support: 'Shape the journey and the stay together without switching planning flows.',
      imageSrc: '/images/immersive/wayfare-flight-stay-v1.png',
      imagePosition: '50% 50%',
      placeholder: 'Plan my flight and stay…',
      detail: 'Return flight · 2 guests · 3 nights',
    }],
  },
  {
    id: 'insurance',
    label: 'Insurance',
    scenes: [{
      id: 'insurance-airport-lounge',
      label: 'Insurance',
      eyebrow: 'Illustrative travel protection',
      heading: 'Compare with confidence',
      support: 'Explore three fictional protection concepts around the trip you have in mind.',
      imageSrc: '/images/immersive/wayfare-insurance-v1.png',
      imagePosition: '50% 50%',
      placeholder: 'Compare illustrative travel protection for my trip…',
      detail: 'Comparison only · No quote, policy, eligibility check, or purchase',
    }],
  },
] as const satisfies readonly HeroModeDefinition<CoreHeroMode>[];
