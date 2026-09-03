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
    expect(siteConfig.prompts).toHaveLength(4);
    expect(siteConfig.prompts.join(' ')).toMatch(/flights/i);
    expect(siteConfig.prompts.join(' ')).toMatch(/compare hotels/i);
    expect(siteConfig.prompts.join(' ')).toMatch(/travel protection/i);
    expect(siteConfig.prompts.join(' ')).toMatch(/illustrative rewards/i);
    expect(siteConfig.prompts.join(' ')).not.toMatch(
      /book|checkout|pay|redeem|cancel/i,
    );
  });

  it('uses the canonical Wayfare hero and vector brand mark', () => {
    expect(siteConfig.brand.heroImagePath)
      .toBe('/images/immersive/wayfare-explore-windows-v2.png');
    expect(travelCompanionDemoConfig.assets.logo.status)
      .toBe('repository_vector_component');
    expect(travelCompanionDemoConfig.assets.hero.status)
      .toBe('repository_owned_starter_asset');
  });

  it('keeps the mixed-source disclosure persistent and explicit', () => {
    expect(siteConfig.disclosure.persistent).toContain(
      'Flight and stay results come from connected providers.',
    );
    expect(siteConfig.disclosure.persistent).toContain(
      'Rewards and travel protection are illustrative previews.',
    );
    expect(siteConfig.disclosure.persistent).toContain(
      'Booking, redemption, and policy purchase are unavailable.',
    );
    expect(siteConfig.disclosure.persistent).not.toMatch(/\bdemo\b|\bsandbox\b/iu);
  });
});
