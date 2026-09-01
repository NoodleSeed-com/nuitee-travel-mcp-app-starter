import { starterConfig } from '../../../../starter.config';
import { flightCatchersDemoConfig } from '../../../../src/demo-config';

const light = flightCatchersDemoConfig.brand.palette.light;
const dark = flightCatchersDemoConfig.brand.palette.dark;

/**
 * Website-only identity for the private Flight Catchers demonstration.
 *
 * The canonical starterConfig intentionally remains Wayfare so the public
 * starter and its customization contract are not silently rebranded.
 */
export const siteConfig = {
  brand: {
    name: flightCatchersDemoConfig.brand.name,
    assistantName: flightCatchersDemoConfig.brand.assistantName,
    tagline: flightCatchersDemoConfig.brand.tagline,
    intro: flightCatchersDemoConfig.brand.intro,
    accent: light.primary,
    signal: light.ink,
    canvas: light.canvas,
    surface: light.surface,
    surfaceDark: dark.surface,
    ink: light.ink,
    muted: light.muted,
    boundary: light.boundary,
    logoPath: '/brand/flight-catchers-demo-logo.png',
  },
  disclosure: flightCatchersDemoConfig.disclosure,
  website: starterConfig.website,
  prompts: [
    'Find flights from Toronto to Lisbon next week for two adults.',
    'Compare hotels in Lisbon for three nights.',
    'Show my illustrative rewards and review this trip.',
  ],
} as const;

export type SiteConfig = typeof siteConfig;
