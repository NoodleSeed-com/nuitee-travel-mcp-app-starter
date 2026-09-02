import { describe, expect, it } from 'vitest';
import { travelCompanionDemoConfig } from '../src/demo-config.js';

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

describe('Wayfare expanded travel brand contract', () => {
  it('uses Wayfare while retaining the expanded travel profile', () => {
    expect(travelCompanionDemoConfig.mode).toBe('expanded_travel_preview');
    expect(travelCompanionDemoConfig.brand).toMatchObject({
      name: 'Wayfare',
      assistantName: 'Wayfare travel assistant',
      tagline: 'Travel, planned around you.',
    });
  });

  it('keeps the live and synthetic data boundary persistently visible', () => {
    expect(travelCompanionDemoConfig.dataSources).toEqual({
      flights: { mode: 'live_sandbox', label: 'Current flight fares' },
      hotels: { mode: 'synthetic_fixture', label: 'Illustrative stays' },
      loyalty: { mode: 'synthetic_fixture', label: 'Illustrative rewards' },
      insurance: { mode: 'synthetic_fixture', label: 'Illustrative travel protection' },
    });
    expect(travelCompanionDemoConfig.disclosure.badge).toBe('Preview only');
    expect(travelCompanionDemoConfig.disclosure.persistent).toMatch(/connected flight provider/u);
    expect(travelCompanionDemoConfig.disclosure.persistent).toMatch(/Stays, rewards, and travel protection are illustrative/u);
    expect(travelCompanionDemoConfig.disclosure.persistent).toMatch(/Booking, redemption, and policy purchase are unavailable/u);
    expect(travelCompanionDemoConfig.disclosure.persistent).not.toMatch(/\bdemo\b|\bsandbox\b/iu);
  });

  it('uses accessible action, focus, text, and muted-text color pairs', () => {
    const { light, dark } = travelCompanionDemoConfig.brand.palette;

    expect(contrastRatio(light.primary, light.onPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.focus, light.canvas)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(light.ink, light.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.muted, light.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.primary, dark.onPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.focus, dark.canvas)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(dark.ink, dark.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.muted, dark.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(travelCompanionDemoConfig.brand.colorUsage.decorativeCyan).toBe('decoration_only');
  });

  it('uses the canonical repository-owned Wayfare assets', () => {
    expect(travelCompanionDemoConfig.assets.logo).toMatchObject({
      status: 'repository_vector_component',
      sourcePath: 'apps/web/src/components/wayfare-mark.tsx',
      reviewedBinaryBlob: false,
    });
    expect(travelCompanionDemoConfig.assets.hero).toMatchObject({
      status: 'repository_owned_starter_asset',
      sourcePath: 'apps/web/public/images/immersive/wayfare-explore-windows-v2.png',
      provenanceRecordPath: 'docs/visual-assets/wayfare-premium-concierge.md',
      reviewedBinaryBlob: true,
    });
  });
});
