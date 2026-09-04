import { starterConfig } from '../../../../starter.config';
import { travelCompanionDemoConfig } from '../../../../src/demo-config';

const wayfareWebBrand = {
  name: 'Wayfare',
  assistantName: 'Wayfare travel assistant',
  tagline: 'One conversation. The whole journey.',
  intro:
    'Search current flights, compare illustrative stays and travel protection, and preview rewards in one conversation.',
  light: {
    canvas: '#FFFFFF',
    surface: '#F7F7F7',
    raised: '#FFFFFF',
    ink: '#0D0D0D',
    muted: '#5D5D5D',
    boundary: '#E8E8E8',
    selected: '#66CCFF',
    confirmed: '#99FF99',
    actionNeeded: '#FF6666',
  },
} as const;

/**
 * The expanded travel companion keeps the canonical Wayfare identity while
 * adding the bounded stays and rewards preview capabilities.
 */
export const siteConfig = {
  brand: {
    name: wayfareWebBrand.name,
    assistantName: wayfareWebBrand.assistantName,
    tagline: wayfareWebBrand.tagline,
    intro: wayfareWebBrand.intro,
    accent: wayfareWebBrand.light.ink,
    selected: wayfareWebBrand.light.selected,
    confirmed: wayfareWebBrand.light.confirmed,
    actionNeeded: wayfareWebBrand.light.actionNeeded,
    signal: wayfareWebBrand.light.ink,
    canvas: wayfareWebBrand.light.canvas,
    surface: wayfareWebBrand.light.surface,
    ink: wayfareWebBrand.light.ink,
    muted: wayfareWebBrand.light.muted,
    boundary: wayfareWebBrand.light.boundary,
    heroViewImagePath: '/images/immersive/wayfare-window-view-v1.png',
    heroCabinImagePath: '/images/immersive/wayfare-cabin-frame-v1.png',
    heroImagePosition: '50% 50%',
  },
  disclosure: travelCompanionDemoConfig.disclosure,
  website: starterConfig.website,
  prompts: [
    'Find flights from Toronto to Lisbon next week for two adults.',
    'Compare hotels in Lisbon for three nights.',
    'Show my illustrative rewards and review this trip.',
    'Compare illustrative travel protection for two adults travelling from Toronto to Lisbon from 8 to 15 September 2026, with an estimated trip cost of CAD 2,500.',
  ],
} as const;

export type SiteConfig = typeof siteConfig;
