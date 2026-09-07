import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { demoGatewayOutputSchema } from '../src/demo-connectors.js';
import {
  demoExperienceSearchInputSchema,
  demoExperienceSearchOutputSchema,
} from '../src/demo-schemas.js';
import {
  DEMO_EXPERIENCE_ALIASES,
  DEMO_EXPERIENCE_CATALOG,
} from '../src/experience-fixtures.js';
import { runDemoGateway } from '../src/demo-runtime.js';

const lisbonSearch = {
  destination: 'Lisbon',
  startDate: '2030-04-20',
  endDate: '2030-04-23',
  adults: 2,
  children: 0,
  currency: 'EUR' as const,
  interests: ['FOOD', 'CULTURE'] as const,
};

function search(input: Readonly<Record<string, unknown>>) {
  return demoGatewayOutputSchema.parse(runDemoGateway({
    kind: 'experience_search',
    experienceSearch: input,
    experienceCatalog: DEMO_EXPERIENCE_CATALOG,
    experienceAliases: DEMO_EXPERIENCE_ALIASES,
  })).experienceResult!;
}

describe('two-city fictional experience discovery', () => {
  it('rejects invalid ranges, unsupported currencies, and unbounded parties', () => {
    expect(demoExperienceSearchInputSchema.parse(lisbonSearch)).toEqual(lisbonSearch);
    expect(demoExperienceSearchInputSchema.safeParse({
      ...lisbonSearch,
      endDate: lisbonSearch.startDate,
    }).success).toBe(false);
    expect(demoExperienceSearchInputSchema.safeParse({
      ...lisbonSearch,
      endDate: '2030-06-20',
    }).success).toBe(false);
    expect(demoExperienceSearchInputSchema.safeParse({
      ...lisbonSearch,
      adults: 8,
      children: 3,
    }).success).toBe(false);
    expect(demoExperienceSearchInputSchema.safeParse({
      ...lisbonSearch,
      currency: 'BTC',
    }).success).toBe(false);
  });

  it('returns three bounded Lisbon ideas with opaque IDs and future-date slots', () => {
    const first = search(lisbonSearch);
    const second = search(lisbonSearch);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      status: 'success',
      dataSource: 'illustrative',
      source: 'WAYFARE_DEMO',
      supportedDestination: true,
    });
    expect(first).not.toHaveProperty('emptyReason');
    expect(first.experiences).toHaveLength(3);
    expect(first.fallback).toContain('fictional');
    expect(first.fallback).toContain('Lisbon');
    for (const experience of first.experiences) {
      expect(experience.experienceId).toMatch(/^exp_[a-f0-9]{32}$/);
      expect(experience.dataSource).toBe('illustrative');
      expect(experience.source).toBe('WAYFARE_DEMO');
      expect(experience.city).toBe('Lisbon');
      expect(experience.price.currency).toBe('EUR');
      expect(experience.price.amountMinor).toBeGreaterThan(0);
      expect(experience.slots.length).toBeGreaterThan(0);
      expect(experience.slots.length).toBeLessThanOrEqual(4);
      for (const slot of experience.slots) {
        expect(slot.startLocal.slice(0, 10) >= lisbonSearch.startDate).toBe(true);
        expect(slot.startLocal.slice(0, 10) < lisbonSearch.endDate).toBe(true);
        expect(slot.timeZone).toBe('Europe/Lisbon');
        expect(slot.isFictional).toBe(true);
      }
    }
    expect(demoExperienceSearchOutputSchema.parse(first)).toEqual(first);
  });

  it('supports Tokyo aliases and filters only on explicitly advertised facts', () => {
    const result = search({
      ...lisbonSearch,
      destination: 'HND',
      currency: 'JPY',
      interests: ['DESIGN'],
      accessibility: 'STEP_FREE',
    });

    expect(result.status).toBe('success');
    expect(result.searchContext.destination).toBe('HND');
    expect(result.experiences.length).toBeGreaterThan(0);
    expect(result.experiences.every((experience) => experience.city === 'Tokyo')).toBe(true);
    expect(result.experiences.every((experience) => experience.categories.includes('DESIGN'))).toBe(true);
    expect(result.experiences.every((experience) => experience.accessibility.stepFree === true)).toBe(true);
    expect(result.experiences.every((experience) => experience.price.currency === 'JPY')).toBe(true);
  });

  it('returns a successful unsupported-destination empty result without fallback inventory', () => {
    const result = search({ ...lisbonSearch, destination: 'Reykjavík' });

    expect(result).toMatchObject({
      status: 'empty',
      source: 'WAYFARE_DEMO',
      supportedDestination: false,
      emptyReason: 'UNSUPPORTED_DESTINATION',
      experiences: [],
    });
    expect(result.message).toContain('not configured');
    expect(result.fallback).toContain('No provider call was made');
  });

  it('keeps the serialized gateway self-contained', () => {
    const isolated = runInNewContext(
      `(${runDemoGateway.toString()})`,
      Object.create(null),
    ) as typeof runDemoGateway;
    const result = demoGatewayOutputSchema.parse(isolated({
      kind: 'experience_search',
      experienceSearch: lisbonSearch,
      experienceCatalog: DEMO_EXPERIENCE_CATALOG,
      experienceAliases: DEMO_EXPERIENCE_ALIASES,
    })).experienceResult!;

    expect(result.status).toBe('success');
    expect(result.experiences).toHaveLength(3);
  });
});
