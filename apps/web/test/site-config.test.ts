import { describe, expect, it } from 'vitest';

import { starterConfig } from '../../../starter.config';
import { travelCompanionDemoConfig } from '../../../src/demo-config';
import { siteConfig } from '../src/lib/site-config';

describe('Wayfare companion website identity', () => {
  it('uses the canonical Wayfare identity', () => {
    expect(starterConfig.brand.name).toBe('Wayfare');
    expect(siteConfig.brand.name).toBe('Wayfare');
    expect(siteConfig.brand.assistantName)
      .toBe(travelCompanionDemoConfig.brand.assistantName);
  });

  it('keeps every prompt within the supported demo boundary', () => {
    expect(siteConfig.prompts).toHaveLength(3);
    expect(siteConfig.prompts.join(' ')).toMatch(/flights/i);
    expect(siteConfig.prompts.join(' ')).toMatch(/compare hotels/i);
    expect(siteConfig.prompts.join(' ')).toMatch(/illustrative rewards/i);
    expect(siteConfig.prompts.join(' ')).not.toMatch(
      /book|checkout|pay|redeem|cancel/i,
    );
  });

  it('uses the canonical Wayfare hero and vector brand mark', () => {
    expect(siteConfig.brand.heroImagePath)
      .toBe('/images/wayfare-hybrid-hero-v2.jpg');
    expect(travelCompanionDemoConfig.assets.logo.status)
      .toBe('repository_vector_component');
    expect(travelCompanionDemoConfig.assets.hero.status)
      .toBe('repository_owned_starter_asset');
  });

  it('keeps the mixed-source disclosure persistent and explicit', () => {
    expect(siteConfig.disclosure.persistent).toContain(
      'Flight results come from the connected flight provider.',
    );
    expect(siteConfig.disclosure.persistent).toContain(
      'Stays and rewards are illustrative previews.',
    );
    expect(siteConfig.disclosure.persistent).toContain(
      'Booking and redemption are unavailable.',
    );
    expect(siteConfig.disclosure.persistent).not.toMatch(/\bdemo\b|\bsandbox\b/iu);
  });
});
