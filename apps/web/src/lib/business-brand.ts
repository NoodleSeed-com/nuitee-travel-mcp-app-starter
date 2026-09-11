import type { SupportedCurrency } from './travel-defaults';

/** Public presentation only. Credentials, approved source text and owner identity never enter these props. */
export interface BusinessBrand {
  readonly name: string;
  readonly initials: string;
  readonly welcome: string;
  readonly currency: SupportedCurrency;
  readonly language: 'English' | 'French' | 'Spanish';
  readonly capabilities: Readonly<Record<'flights' | 'hotels' | 'experiences' | 'cars' | 'checkout', boolean>>;
}

export const businessLocale = (brand?: BusinessBrand) => brand
  ? ({ English: 'en', French: 'fr', Spanish: 'es' } as const)[brand.language]
  : undefined;
