import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { applyCustomization, renderStarterConfig, validateStarterConfig } from '../scripts/customize.mjs';
import { starterConfig } from '../starter.config.js';
import { createTravelServer } from '../src/travel-server.js';

describe('safe starter customization', () => {
  it('accepts the shipped presentation config and renders it deterministically', () => {
    const validated = validateStarterConfig(starterConfig);
    expect(validated.widgets.domain).toBeNull();
    expect(renderStarterConfig(validated)).toBe(renderStarterConfig(validated));
  });

  it('keeps one canonical config in the authoring source with a root public facade', async () => {
    expect(starterConfig.embeddedAssistant.origins).toContain('http://localhost:3000');
    expect(starterConfig.prompts).toHaveLength(3);
    expect(starterConfig.website.developerPath).toBe('/developers');
    expect(starterConfig.website.privacyUrl).toBeNull();
    const canonicalSource = await readFile(
      new URL('../src/starter-config.ts', import.meta.url),
      'utf8',
    );
    const publicFacadeSource = await readFile(
      new URL('../starter.config.ts', import.meta.url),
      'utf8',
    );
    expect(canonicalSource).toContain('export const starterConfig =');
    expect(publicFacadeSource).toBe(
      "export { starterConfig, type StarterConfig } from './src/starter-config.js';\n",
    );
  });

  it.each([
    '',
    'https://app.example.com',
    'https://brand.example',
    'https://brand.invalid',
    'https://brand.test',
    'https://foo.localhost',
    'https://localhost.',
    'https://*.travel.example.co',
    'https://travel.example.co/path',
    'https://travel.example.co/',
    'https://travel.example.co?tenant=demo',
    'https://user@travel.example.co',
    'http://travel.example.co',
    'http://localhost',
    '[https://travel.example.co]',
  ])('rejects unsafe or placeholder embedded origin %j', (origin) => {
    expect(() => validateStarterConfig({
      ...starterConfig,
      embeddedAssistant: { origins: [origin] },
    })).toThrow();
  });

  it.each([
    'https://travel.example.co',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ])('accepts an exact production or loopback development origin %s', (origin) => {
    expect(validateStarterConfig({
      ...starterConfig,
      embeddedAssistant: { origins: [origin] },
    }).embeddedAssistant.origins).toEqual([origin]);
  });

  it.each([
    '',
    'https://app.example.com',
    'https://brand.example',
    'https://*.travel.example.co',
    'https://travel.example.co/path',
    'https://travel.example.co/',
    'http://travel.example.co',
    'http://localhost:5173',
  ])('rejects unsafe or placeholder widget domain %j', (domain) => {
    expect(() => validateStarterConfig({
      ...starterConfig,
      widgets: { domain },
    })).toThrow();
  });

  it('configures one exact widget domain idempotently without changing assistant origins', () => {
    const domain = 'https://widgets.travel.example.co';
    const first = applyCustomization(starterConfig, { widgetDomain: domain });
    const second = applyCustomization(first.config, { widgetDomain: domain });

    expect(first.config.widgets.domain).toBe(domain);
    expect(first.config.embeddedAssistant.origins).toEqual(starterConfig.embeddedAssistant.origins);
    expect(second.changed).toBe(false);
  });

  it('bounds brand copy and requires strict hexadecimal colors', () => {
    expect(() => validateStarterConfig({
      ...starterConfig,
      brand: { ...starterConfig.brand, name: 'A\u0000brand' },
    })).toThrow();
    expect(() => validateStarterConfig({
      ...starterConfig,
      brand: { ...starterConfig.brand, tagline: 'x'.repeat(121) },
    })).toThrow();
    expect(() => validateStarterConfig({
      ...starterConfig,
      brand: { ...starterConfig.brand, accent: '#abc' },
    })).toThrow();
    expect(() => validateStarterConfig({
      ...starterConfig,
      brand: { ...starterConfig.brand, assistantName: 'Travel\u0000assistant' },
    })).toThrow();
  });

  it('bounds unique prompts and requires safe website links', () => {
    expect(() => validateStarterConfig({
      ...starterConfig,
      prompts: [...starterConfig.prompts, 'Find an extra flight'],
    })).toThrow();
    expect(() => validateStarterConfig({
      ...starterConfig,
      prompts: [starterConfig.prompts[0], starterConfig.prompts[0], starterConfig.prompts[2]],
    })).toThrow();
    expect(() => validateStarterConfig({
      ...starterConfig,
      website: { ...starterConfig.website, privacyUrl: 'http://travel.example.co/privacy' },
    })).toThrow();
  });

  it('rejects unknown and credential-shaped configuration fields', () => {
    expect(() => validateStarterConfig({ ...starterConfig, apiKey: 'not-a-real-secret' })).toThrow();
    expect(() => validateStarterConfig({ ...starterConfig, unexpected: true })).toThrow();
  });

  it('applies the same customization idempotently', () => {
    const baseline = {
      brand: {
        name: 'Baseline Travel',
        mark: 'B',
        assistantName: 'Travel assistant',
        tagline: 'A stable customization baseline',
        accent: '#234567',
        signal: '#CFE86A',
        canvas: '#FBFBFB',
        surface: '#F1F2F3',
        surfaceDark: '#111213',
        ink: '#2C2C2E',
        muted: '#737479',
        boundary: '#CBCDD5',
      },
      website: {
        developerPath: '/developers',
        supportPath: '/developers#support',
        privacyUrl: null,
        termsUrl: null,
      },
      prompts: [
        'Find a weekend flight to Rome',
        'Compare nonstop fares to London',
        'Plan a round trip for two',
      ],
      widgets: { domain: null },
      embeddedAssistant: { origins: ['http://localhost:3000'] },
    };
    const options = {
      brandName: 'North Star Travel',
      brandMark: 'N',
      tagline: 'Travel planning, made calm',
      accent: '#123456',
      surface: '#F0F1F2',
      surfaceDark: '#101112',
      productionOrigin: 'https://travel.example.co',
      keepLocalDemo: false,
    };
    const first = applyCustomization(baseline, options);
    const second = applyCustomization(first.config, options);
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.content).toBe(first.content);
  });

  it('makes local-demo retention declarative and requires HTTPS for production', () => {
    const productionOnly = {
      ...starterConfig,
      widgets: { domain: null },
      embeddedAssistant: { origins: ['https://travel.example.co'] },
    };
    expect(applyCustomization(productionOnly, {
      productionOrigin: 'https://book.example.co',
      keepLocalDemo: true,
    }).config.embeddedAssistant.origins).toEqual([
      'http://localhost:3000',
      'https://book.example.co',
    ]);
    expect(() => applyCustomization(starterConfig, { keepLocalDemo: true })).toThrow();
    expect(() => applyCustomization(starterConfig, {
      productionOrigin: 'http://localhost:5173',
    })).toThrow();
  });

  it('keeps the embedded manifest and home schema aligned with the owned config', async () => {
    const manifest = await createTravelServer('embedded').toManifest() as any;
    expect(manifest.server.branding.name).toBe(starterConfig.brand.name);
    expect(manifest.server.assistant.surfaces).toEqual([
      {
        mode: 'public',
        origins: [...starterConfig.embeddedAssistant.origins],
        capabilities: [
          { kind: 'tool', name: 'open_travel_starter' },
          { kind: 'tool', name: 'search_flights' },
          { kind: 'tool', name: 'verify_flight_offer' },
          { kind: 'tool', name: 'select_flight_offer' },
        ],
      },
    ]);
    expect(manifest.server.assistant.layout).toEqual({ mode: 'inline' });
    const homeTool = manifest.tools.find((entry: any) => entry.name === 'open_travel_starter');
    expect(JSON.stringify(homeTool)).toContain(starterConfig.brand.name);
  });

  it('does not read environment or secret files', async () => {
    const source = await readFile(new URL('../scripts/customize.mjs', import.meta.url), 'utf8');
    expect(source).not.toContain('process.env');
    expect(source).not.toMatch(/\.env(?:\W|$)/);
  });
});
