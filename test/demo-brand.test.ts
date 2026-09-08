import { readFileSync } from 'node:fs';
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
      hotels: { mode: 'live_nuitee', label: 'Current hotel rates' },
      experiences: { mode: 'synthetic_fixture', label: 'Fictional Lisbon and Tokyo ideas' },
      loyalty: { mode: 'synthetic_fixture', label: 'Illustrative rewards' },
      insurance: { mode: 'synthetic_fixture', label: 'Illustrative travel protection' },
    });
    expect(travelCompanionDemoConfig.disclosure.badge).toBe('Preview only');
    expect(travelCompanionDemoConfig.disclosure.persistent).toMatch(/Flight and stay results come from connected providers/u);
    expect(travelCompanionDemoConfig.disclosure.persistent).toMatch(/Lisbon and Tokyo experiences, rewards, and travel protection are fictional or illustrative previews/u);
    expect(travelCompanionDemoConfig.disclosure.persistent).toMatch(/Booking, experience reservations, redemption, and policy purchase are unavailable/u);
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

describe('ported card design tokens', () => {
  const css = readFileSync(new URL('../src/views/travel.css', import.meta.url), 'utf8');

  it('defines the card token layer on .cc-app', () => {
    for (const token of [
      '--cc-radius-card:',
      '--cc-shadow-card:',
      '--cc-shadow-card-hover:',
      '--cc-good:',
      '--cc-rail-gap:',
    ]) {
      expect(css).toContain(token);
    }
  });

  it('never introduces the Tribe brand blue', () => {
    expect(css.toLowerCase()).not.toContain('#1570ef');
  });

  it('uses a neutral card shadow rather than a decorative semantic tint', () => {
    expect(css).toMatch(/--cc-shadow-card-hover:[^;]*rgb\(13 13 13/);
  });

  it('hides the rail scrollbar on all three engines', () => {
    expect(css).toContain('scrollbar-width: none');
    expect(css).toContain('-ms-overflow-style: none');
    expect(css).toMatch(/\.cc-rail::-webkit-scrollbar\s*\{\s*display:\s*none/);
  });

  it('shows rail arrows only at 640px and up', () => {
    expect(css).toMatch(/@media \(min-width: 640px\)\s*\{\s*\.cc-app \.cc-rail-arrow\s*\{\s*display:\s*grid/);
  });

  it('keeps the rail arrow at the global 44px tap target', () => {
    expect(css).toContain('.cc-app .cc-rail-arrow');
    expect(css).not.toMatch(/^\.cc-rail-arrow\s*\{/m);
    expect(css).toMatch(/\.cc-app \.cc-rail-arrow\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s);
  });

  it('qualifies the hotel card and its neutral selected state so they outrank .cc-card', () => {
    // .cc-card sets border/border-radius/background at (0,1,0) and is
    // declared later in this file; a bare .cc-hotel-card or
    // .cc-hotel-card-selected at equal specificity would silently lose to
    // it on source order, making the selected card diverge from its neutral shell.
    expect(css).toContain('.cc-app .cc-hotel-card {');
    expect(css).toContain('.cc-app .cc-hotel-card-selected {');
    expect(css).not.toMatch(/^\.cc-hotel-card-selected\s*\{/m);
  });

  it('reasserts display:none under [hidden] for panels that also set an author display', () => {
    // Origin beats specificity: an author `display` rule on the very same
    // element unconditionally outranks the UA stylesheet's
    // `[hidden] { display: none }`, regardless of selector specificity. Any
    // selector that sets `display` AND is toggled via the `hidden`
    // attribute needs its own `[hidden] { display: none }` reassertion, or
    // the "collapsed" state silently renders visible.
    expect(css).toContain('.cc-hotel-detail-content[hidden]');
  });
});
