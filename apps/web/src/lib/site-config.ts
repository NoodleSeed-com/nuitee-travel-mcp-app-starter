import { starterConfig } from '../../../../starter.config';
import { travelCompanionDemoConfig } from '../../../../src/demo-config';

const light = travelCompanionDemoConfig.brand.palette.light;
const dark = travelCompanionDemoConfig.brand.palette.dark;

/**
 * The expanded travel companion keeps the canonical Wayfare identity while
 * adding the bounded stays and rewards preview capabilities.
 */
export const siteConfig = {
  brand: {
    name: travelCompanionDemoConfig.brand.name,
    assistantName: travelCompanionDemoConfig.brand.assistantName,
    tagline: travelCompanionDemoConfig.brand.tagline,
    intro: travelCompanionDemoConfig.brand.intro,
    accent: light.primary,
    signal: light.ink,
    canvas: light.canvas,
    surface: light.surface,
    surfaceDark: dark.surface,
    ink: light.ink,
    muted: light.muted,
    boundary: light.boundary,
    heroImagePath: '/images/wayfare-hybrid-hero-v2.jpg',
    heroImagePosition: '50% 50%',
  },
  disclosure: travelCompanionDemoConfig.disclosure,
  website: starterConfig.website,
  prompts: [
    'Find flights from Toronto to Lisbon next week for two adults.',
    'Compare hotels in Lisbon for three nights.',
    'Show my illustrative rewards and review this trip.',
  ],
} as const;

export type SiteConfig = typeof siteConfig;
