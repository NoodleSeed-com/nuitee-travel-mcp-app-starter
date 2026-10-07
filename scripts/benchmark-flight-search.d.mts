export interface FlightBenchmarkScenario {
  id: string;
  session: 'fresh' | 'existing';
  origin: string;
  destination: string;
  currency: string;
  country: string;
  departureDate: string;
  returnDate?: string;
}

export interface FlightBenchmarkRun {
  scenarioId: string;
  session: 'fresh' | 'existing';
  outcome: 'unknown' | 'success' | 'partial' | 'empty' | 'error';
  startedAt?: string;
  firstFareMs?: number;
  turnMs?: number;
  sessionResponseMs?: number;
  sessionHttpStatus?: number;
  turnTimedOut?: boolean;
  observedMs?: number;
  browserFailure?: boolean;
}

export function createScenarios(startDate: string): FlightBenchmarkScenario[];
export function summarizeRuns(runs: Pick<FlightBenchmarkRun, 'outcome' | 'firstFareMs'>[]): {
  attempts: number;
  timelyFares: number;
  timelyFareRate: number;
  firstFareP50Ms: number | null;
  firstFareP95Ms: number | null;
  outcomes: Record<string, number>;
};
// The executable resolves Playwright from apps/web; no root runtime dependency.
export function runBrowserScenario(page: unknown, scenario: FlightBenchmarkScenario, timeoutMs?: number): Promise<FlightBenchmarkRun>;
