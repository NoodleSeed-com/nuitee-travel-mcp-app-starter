import { describe, expect, it } from 'vitest';
import { flightCatchersDemoConfig } from '../src/demo-config.js';

function relativeLuminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/gu)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => (
      value <= 0.03928
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4
    ));
  return (0.2126 * channels[0]!) + (0.7152 * channels[1]!) + (0.0722 * channels[2]!);
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

describe('Flight Catchers demo brand contract', () => {
  it('keeps the partner demo separate from the public starter identity', () => {
    expect(flightCatchersDemoConfig.mode).toBe('private_partner_demo');
    expect(flightCatchersDemoConfig.brand).toMatchObject({
      name: 'Flight Catchers',
      assistantName: 'Flight Catchers travel assistant',
      tagline: 'Flights, hotels, and rewards in one conversation.',
    });
  });

  it('keeps the live and synthetic data boundary persistently visible', () => {
    expect(flightCatchersDemoConfig.dataSources).toEqual({
      flights: { mode: 'live_sandbox', label: 'Current flight fares' },
      hotels: { mode: 'synthetic_fixture', label: 'Illustrative stays' },
      loyalty: { mode: 'synthetic_fixture', label: 'Illustrative rewards' },
    });
    expect(flightCatchersDemoConfig.disclosure.badge).toBe('Preview only');
    expect(flightCatchersDemoConfig.disclosure.persistent).toMatch(/connected flight provider/u);
    expect(flightCatchersDemoConfig.disclosure.persistent).toMatch(/Stays and rewards are illustrative/u);
    expect(flightCatchersDemoConfig.disclosure.persistent).toMatch(/Booking and redemption are unavailable/u);
    expect(flightCatchersDemoConfig.disclosure.persistent).not.toMatch(/\bdemo\b|\bsandbox\b/iu);
  });

  it('uses accessible action, focus, text, and muted-text color pairs', () => {
    const { light, dark } = flightCatchersDemoConfig.brand.palette;

    expect(contrastRatio(light.primary, light.onPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.focus, light.canvas)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(light.ink, light.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.muted, light.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.primary, dark.onPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.focus, dark.canvas)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(dark.ink, dark.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.muted, dark.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(flightCatchersDemoConfig.brand.colorUsage.decorativeCyan).toBe('decoration_only');
  });

  it('fails closed on temporary-logo and public-release readiness', () => {
    expect(flightCatchersDemoConfig.assets.logo).toMatchObject({
      status: 'temporary_demo_asset',
      sourcePath: 'apps/web/public/brand/flight-catchers-demo-logo.png',
      compactMarkPath: null,
      lightWordmarkPath: 'apps/web/public/brand/flight-catchers-demo-logo.png',
      darkWordmarkPath: 'apps/web/public/brand/flight-catchers-demo-logo.png',
      provenanceRecordPath: 'docs/assets/flight-catchers-logo.md',
      reviewedBinaryBlob: false,
    });
    expect(flightCatchersDemoConfig.publicRelease).toMatchObject({
      ready: false,
      status: 'blocked_pending_owner_review',
      brandAuthorizationReference: null,
      assetLicenseReference: null,
    });
    expect(flightCatchersDemoConfig.publicRelease.blockers).toEqual([
      'record_brand_authorization',
      'replace_temporary_logo_with_original_asset',
      'record_asset_provenance',
      'complete_final_brand_review',
    ]);
  });
});
