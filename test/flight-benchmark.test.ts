import { describe, expect, it } from 'vitest';
import { createScenarios, summarizeRuns } from '../scripts/benchmark-flight-search.mjs';

describe('flight latency benchmark', () => {
  it('keeps errors and empty searches in the timely-fare denominator', () => {
    expect(summarizeRuns([
      { outcome: 'success', firstFareMs: 10_000, turnMs: 40_000 },
      { outcome: 'partial', firstFareMs: 20_000, turnMs: 49_000 },
      { outcome: 'success', firstFareMs: 21_000, turnMs: 21_000 },
      { outcome: 'error', turnMs: 1_000 },
      { outcome: 'empty', turnMs: 2_000 },
    ])).toMatchObject({ attempts: 5, timelyFares: 2, timelyFareRate: 0.4, firstFareP50Ms: 20_000, firstFareP95Ms: 21_000, outcomes: { success: 2, partial: 1, error: 1, empty: 1 } });
  });

  it('never substitutes tool completion or final prose for a missing first fare', () => {
    expect(summarizeRuns([{ outcome: 'error', toolCompleteMs: 100, turnMs: 200 }])).toMatchObject({ timelyFares: 0, firstFareP50Ms: null, firstFareP95Ms: null });
  });

  it('creates the same balanced future-dated workload from an explicit start date', () => {
    const scenarios = createScenarios('2027-01-12');
    expect(scenarios).toHaveLength(30);
    expect(scenarios.filter(s => s.returnDate)).toHaveLength(10);
    expect(scenarios.filter(s => s.session === 'fresh')).toHaveLength(15);
    expect(scenarios[0]).toMatchObject({ origin: 'LHR', destination: 'FCO', departureDate: '2027-01-12', currency: 'GBP', country: 'GB' });
    expect(new Set(scenarios.map(s => s.id)).size).toBe(30);
    expect(createScenarios('2027-01-12')).toEqual(scenarios);
    expect(() => createScenarios('2027-02-30')).toThrow();
  });
});
