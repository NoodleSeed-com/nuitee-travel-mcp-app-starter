import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { starterConfig } from '../../../starter.config';
import { flightCatchersDemoConfig } from '../../../src/demo-config';
import { siteConfig } from '../src/lib/site-config';

describe('private demo website identity', () => {
  it('does not overwrite the canonical starter identity', () => {
    expect(starterConfig.brand.name).toBe('Wayfare');
    expect(siteConfig.brand.name).toBe('Flight Catchers');
    expect(siteConfig.brand.assistantName)
      .toBe(flightCatchersDemoConfig.brand.assistantName);
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

  it('uses a checked-in temporary asset with a recorded public-release block', async () => {
    const logo = await readFile(resolve(
      process.cwd(),
      'public/brand/flight-catchers-demo-logo.png',
    ));

    expect([...logo.subarray(0, 8)])
      .toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(flightCatchersDemoConfig.assets.logo.reviewedBinaryBlob).toBe(false);
    expect(flightCatchersDemoConfig.publicRelease.ready).toBe(false);
    expect(flightCatchersDemoConfig.publicRelease.blockers)
      .toContain('replace_temporary_logo_with_original_asset');
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
