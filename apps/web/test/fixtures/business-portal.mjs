// Isolated fictional browser fixture. Never reads the owner's portal or credentials.
import { createServer } from 'node:http';
let published = true;
let exchanged = false;
let longBrand = false;
const token = 'synthetic_preview_cookie_for_browser';
const ticket = 'synthetic_preview_ticket_for_browser';
const projection = (preview = false) => ({
  status: 'ready', release: { id: `r_${preview ? '22222222' : '11111111'}-1111-4111-8111-111111111111`, digest: 'a'.repeat(64),
    settings: { name: longBrand ? 'North Star Travel For Curious Explorers' : preview ? 'North Star Preview' : 'North Star Travel', initials: 'NS', welcome: longBrand ? 'Thoughtful travel for curious people. Find your next good place and enjoy the journey.' : preview ? 'Review your next good place.' : 'Find your next good place.', currency: 'CAD', language: 'French', capabilities: { flights: true, hotels: false, experiences: false, cars: false, checkout: false } },
    knowledge: [{ content: 'Private fixture source never rendered' }], provider: { apiKey: 'synthetic_secret_never_rendered' },
  },
  runtime: { status: 'ready', serviceUrl: 'http://127.0.0.1:3313', ...(preview ? { sessionEndpoint: '/api/business/preview/session' } : { embedId: 'pub_browser_fixture' }) },
});
const server = createServer(async (request, response) => {
  const send = (body, status = 200) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(body)); };
  if (request.url === '/health') return send({ ok: true });
  if (request.url === '/__fixture/published' && request.method === 'POST') { published = true; exchanged = false; longBrand = false; return send({ ok: true }); }
  if (request.url === '/__fixture/long' && request.method === 'POST') { longBrand = true; return send({ ok: true }); }
  if (request.url === '/__fixture/unpublished' && request.method === 'POST') { published = false; return send({ ok: true }); }
  if (request.url === '/api/storefront') return send(published ? projection() : { status: 'not_published' });
  if (request.url === '/api/storefront/preview/exchange' && request.method === 'POST') {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (value.ticket !== ticket || exchanged) return send({ error: 'Invalid fixture ticket' }, 401);
    exchanged = true; return send({ token, expiresAt: new Date(Date.now() + 300_000).toISOString() });
  }
  if (request.url === '/api/storefront/preview') return send(request.headers.authorization === `Bearer ${token}` ? projection(true) : { error: 'No preview' }, request.headers.authorization === `Bearer ${token}` ? 200 : 401);
  send({ error: 'Not found' }, 404);
});
server.listen(3313, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
