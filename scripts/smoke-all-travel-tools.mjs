// Local live-provider smoke. Performs reads and local planning selections only.
// No booking, payment, redemption, or policy purchase. Never reads credentials.
import { createRequire } from 'node:module';
const requireSdk = createRequire(import.meta.resolve('@noodleseed/one'));
const { Client } = requireSdk('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = requireSdk('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { ElicitRequestSchema, CallToolResultSchema } = requireSdk('@modelcontextprotocol/sdk/types.js');

const endpoint = new URL(process.argv[2]);
if (endpoint.protocol !== 'http:' || endpoint.hostname !== '127.0.0.1') throw new Error('Local loopback MCP endpoint required');
const departure = new Date(); departure.setUTCDate(departure.getUTCDate() + 44);
const returnDay = new Date(departure); returnDay.setUTCDate(returnDay.getUTCDate() + 3);
const departureDate = departure.toISOString().slice(0, 10);
const returnDate = returnDay.toISOString().slice(0, 10);
const client = new Client({ name: 'wayfare-local-tool-smoke', version: '1.0.0' }, { capabilities: { elicitation: { form: {} } } });
client.setRequestHandler(ElicitRequestSchema, request => {
  if (request.params.mode === 'url' || !request.params.requestedSchema?.properties?.departureDate) return { action: 'decline' };
  return { action: 'accept', content: { departureDate } };
});
let failures = 0;
const seen = new Set();
async function call(name, args, statuses, label = name) {
  seen.add(name);
  try {
    // Read the expected missing-input response through the generic protocol
    // method: SDK callTool validates even error continuations as success data.
    let response = name === 'plan_flight_search'
      ? await client.request({ method: 'tools/call', params: { name, arguments: args } }, CallToolResultSchema, { timeout: 45000 })
      : await client.callTool({ name, arguments: args }, undefined, { timeout: 45000 });
    if (name === 'plan_flight_search' && response.structuredContent?.code === 'interaction_unavailable') {
      const pending = response.structuredContent;
      if (pending.retry?.tool !== name || pending.request?.id !== 'choose_travel_dates') throw new Error('Unexpected continuation');
      console.log(JSON.stringify({ check: 'planner structured continuation offered', pass: true }));
      response = await client.callTool({ name, arguments: { ...args, __noodleInteraction: { responses: {
        [pending.request.id]: { action: 'accept', content: { departureDate } },
      } } } }, undefined, { timeout: 45000 });
    }
    const output = response.structuredContent;
    const pass = !response.isError && output && statuses.includes(output.status);
    if (!pass) failures++;
    console.log(JSON.stringify({ check: label, pass: Boolean(pass), status: output?.status, errorCode: output?.error?.code,
      dataSource: output?.dataSource, count: output?.itineraries?.length ?? output?.hotels?.length ?? output?.options?.length ?? output?.plans?.length,
      missing: output?.missing, toolError: response.isError ? response.content?.filter(c => c.type === 'text').map(c => c.text).join(' ').slice(0, 500) : undefined }));
    return pass ? output : undefined;
  } catch (error) {
    failures++;
    console.log(JSON.stringify({ check: label, pass: false, errorType: error.name, code: error.code, detail: error.message?.slice(0, 500) }));
  }
}
try {
  await client.connect(new StreamableHTTPClientTransport(endpoint));
  const { tools } = await client.listTools();
  await call('open_travel_starter', {}, ['ready']);
  await call('plan_flight_search', { origin: 'YYZ', destination: 'LIS', currency: 'CAD', country: 'CA' }, ['planned']);
  await call('open_loyalty', {}, ['success']);
  await call('compare_reward_flights', {}, ['success']);
  await call('compare_travel_insurance', { destination: 'Portugal', departureDate, returnDate }, ['success']);
  // A reused local runtime may already contain selections. Fresh-runtime
  // incomplete behavior is also covered separately before the live sequence.
  await call('review_trip', {}, ['incomplete', 'ready'], 'review_trip initial state');
  const flights = await call('search_flights', { origin: 'YYZ', destination: 'LIS', departureDate, tripType: 'ONE_WAY', currency: 'CAD', country: 'CA' }, ['success', 'partial']);
  if (flights?.itineraries?.length) {
    await call('select_flight_offer', { selectionId: flights.itineraries[0].selectionId }, ['selected']);
    await call('verify_flight_offer', { selectionMode: 'active' }, ['success']);
  }
  const hotels = await call('search_hotels', { destination: 'Lisbon', countryCode: 'PT', checkInDate: departureDate, checkOutDate: returnDate, currency: 'CAD' }, ['success', 'partial']);
  if (hotels?.hotels?.length) await call('select_hotel', { selectionId: hotels.hotels[0].selectionId }, ['selected']);
  const review = await call('review_trip', {}, ['ready'], 'review_trip after selections');
  if (review && review.stay?.dataSource !== 'live_nuitee') {
    failures++; console.log(JSON.stringify({ check: 'review_trip live hotel provenance', pass: false }));
  }
  for (const tool of tools) {
    const uri = tool._meta?.ui?.resourceUri ?? tool._meta?.['openai/outputTemplate'];
    if (!uri) continue;
    try {
      const resource = await client.readResource({ uri });
      const pass = resource.contents.some(c => typeof c.text === 'string' && c.text.length > 100);
      if (!pass) failures++;
      console.log(JSON.stringify({ check: `${tool.name} widget resource`, pass }));
    } catch { failures++; console.log(JSON.stringify({ check: `${tool.name} widget resource`, pass: false })); }
  }
  const skipped = tools.filter(tool => !seen.has(tool.name)).map(tool => tool.name);
  failures += skipped.length;
  console.log(JSON.stringify({ testedTools: seen.size, totalTools: tools.length, failures, skipped, departureDate, returnDate }));
} finally { await client.close(); }
process.exitCode = failures ? 1 : 0;
