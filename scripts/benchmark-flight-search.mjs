// Opt-in, read-only browser benchmark. Output contains only synthetic scenario
// IDs and timings, never session tokens, transcripts or provider payloads.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export function createScenarios(startDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== startDate) throw new Error('Valid YYYY-MM-DD start date required');
  const date = offset => new Date(start.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
  const routes = [
    ['LHR', 'FCO', 'GBP', 'GB'], ['LHR', 'LIS', 'GBP', 'GB'],
    ['CDG', 'MAD', 'EUR', 'FR'], ['FCO', 'BCN', 'EUR', 'IT'], ['AMS', 'LHR', 'EUR', 'NL'],
    ['JFK', 'LAX', 'USD', 'US'], ['LAX', 'JFK', 'USD', 'US'],
    ['LHR', 'JFK', 'GBP', 'GB'], ['CDG', 'JFK', 'EUR', 'FR'], ['YYZ', 'LHR', 'CAD', 'CA'],
  ];
  return Array.from({ length: 30 }, (_, index) => {
    const route = index < 10 ? routes[Math.floor(index / 2)] : index < 20 ? routes[5 + Math.floor((index - 10) / 2)] : routes[index - 20];
    const [origin, destination, currency, country] = route;
    return { id: `search-${String(index + 1).padStart(2, '0')}`, session: index % 2 ? 'existing' : 'fresh', origin, destination, currency, country, departureDate: date(Math.floor(index / 2)), ...(index >= 20 ? { returnDate: date(Math.floor(index / 2) + 7) } : {}) };
  });
}

export function summarizeRuns(runs) {
  const fares = runs.filter(run => ['success', 'partial'].includes(run.outcome) && Number.isFinite(run.firstFareMs)).map(run => run.firstFareMs).sort((a, b) => a - b);
  const percentile = fraction => fares.length ? fares[Math.ceil(fares.length * fraction) - 1] : null;
  const timelyFares = fares.filter(duration => duration <= 20_000).length;
  const outcomes = {};
  for (const run of runs) outcomes[run.outcome] = (outcomes[run.outcome] ?? 0) + 1;
  return { attempts: runs.length, timelyFares, timelyFareRate: runs.length ? timelyFares / runs.length : 0, firstFareP50Ms: percentile(0.5), firstFareP95Ms: percentile(0.95), outcomes };
}

export async function runBrowserScenario(page, scenario, timeoutMs = 120_000) {
  const previousFrames = new Set(page.frames());
  const prompt = `For an independent search, find ${scenario.returnDate ? 'return' : 'one-way'} flights from ${scenario.origin} to ${scenario.destination} departing ${scenario.departureDate}${scenario.returnDate ? ` and returning ${scenario.returnDate}` : ''}, one adult, economy. Use ${scenario.currency} and ${scenario.country} pricing market. Search only; do not book or hold anything.`;
  await page.getByRole('textbox', { name: 'Ask the travel assistant' }).fill(prompt);
  const run = { scenarioId: scenario.id, session: scenario.session, startedAt: new Date().toISOString(), outcome: 'unknown' };
  const start = performance.now();
  const elapsed = () => Math.round(performance.now() - start);
  const onResponse = response => {
    if (new URL(response.url()).pathname === '/v1/assistant/public-sessions') {
      run.sessionResponseMs = elapsed();
      run.sessionHttpStatus = response.status();
    }
  };
  page.on('response', onResponse);
  try {
    await page.getByRole('button', { name: scenario.session === 'fresh' ? 'Submit trip request' : 'Continue trip', exact: true }).click();
    while (elapsed() < timeoutMs) {
      for (const frame of page.frames()) {
        if (previousFrames.has(frame) || frame.isDetached()) continue;
        const fare = frame.getByRole('button', { name: /^Select fare from / }).first();
        if (await fare.isVisible().catch(() => false) && await fare.isEnabled().catch(() => false)) {
          if (run.firstFareMs === undefined) {
            run.firstFareMs = elapsed();
            const partial = await frame.getByText(/Some Provider Results Were Incomplete/i).isVisible().catch(() => false);
            run.outcome = partial ? 'partial' : 'success';
          }
        } else if (run.firstFareMs === undefined && await frame.getByRole('heading', { name: /couldn.t load your flight options/i }).isVisible().catch(() => false)) {
          run.outcome = 'error';
        } else if (run.firstFareMs === undefined && await frame.getByRole('heading', { name: 'No flights found', exact: true }).isVisible().catch(() => false)) {
          run.outcome = 'empty';
        }
      }
      // Turn completion and nested widget rendering are independent. A done
      // event may remove Stop before the fare controls have even mounted.
      const conversation = page.getByRole('region', { name: 'Travel conversation', exact: true });
      if (run.turnMs === undefined && await conversation.count()
        && await conversation.getAttribute('aria-busy') === 'false') run.turnMs = elapsed();
      if (run.turnMs !== undefined && run.outcome !== 'unknown') return run;
      await page.waitForTimeout(100);
    }
    run.turnTimedOut = run.turnMs === undefined;
    run.observedMs = elapsed();
    return run;
  } finally {
    page.off('response', onResponse);
  }
}

async function main() {
  const { values } = parseArgs({ options: { url: { type: 'string' }, 'start-date': { type: 'string' }, limit: { type: 'string', default: '30' }, 'confirm-live': { type: 'boolean', default: false } } });
  if (!values['confirm-live']) throw new Error('Explicit --confirm-live required after approval of the target and request count');
  const url = new URL(values.url);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Use a root site URL without credentials, query or fragment');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('HTTPS or loopback URL required');
  const limit = Number(values.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error('Limit must be between 1 and 30');
  const scenarios = createScenarios(values['start-date']).slice(0, limit);
  if (scenarios[0].departureDate <= new Date().toISOString().slice(0, 10)) throw new Error('Start date must be in the future');
  const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
  const { chromium } = requireWeb('@playwright/test');
  const browser = await chromium.launch();
  const runs = [];
  let context;
  let page;
  try {
    for (const scenario of scenarios) {
      if (scenario.session === 'fresh') {
        await context?.close();
        context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        page = await context.newPage();
        await page.goto(url.href);
        await page.locator('[data-app-ready="true"]').waitFor();
      }
      const run = await runBrowserScenario(page, scenario).catch(() => ({ scenarioId: scenario.id, session: scenario.session, outcome: 'error', browserFailure: true }));
      runs.push(run);
      console.log(JSON.stringify({ kind: 'run', ...run }));
      // Do not overlap an unfinished turn or silently replace a planned warm
      // conversation with a fresh one. Report the incomplete benchmark instead.
      if (run.turnTimedOut || run.browserFailure) break;
    }
    console.log(JSON.stringify({ kind: 'summary', plannedAttempts: limit, ...summarizeRuns(runs) }));
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error('Benchmark stopped. Check approved arguments and browser availability; raw errors are suppressed to protect session data.');
    process.exitCode = 1;
  });
}
