import { connector, secret, z } from '@noodleseed/one';
import { runNuiteeGateway } from './flight-runtime.js';
import { selectStoredFlight } from './selection-state.js';
import {
  errorSchema,
  itinerarySchema,
  searchInputSchema,
  selectionRecordSchema,
  selectionIdSchema,
  selectFlightOutputSchema,
  verificationSchema,
} from './flight-schemas.js';

const searchRequestSchema = z.object({
  legs: z.array(z.object({
    origin: z.string(),
    destination: z.string(),
    date: z.string(),
    direction: z.enum(['OUTBOUND', 'INBOUND']),
  })).min(1).max(2),
  adults: z.number().int(),
  children: z.number().int(),
  infants: z.number().int(),
  childrenAges: z.array(z.number().int()).max(8),
  infantAges: z.array(z.number().int()).max(9),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']),
  currency: z.string(),
  country: z.string(),
});

export const nuiteeHttp = connector('nuitee_flights_http')
  .version('1.0.1')
  .http({
    baseUrl: 'https://api.liteapi.travel/v3.0',
    allowedOrigins: ['https://api.liteapi.travel'],
    auth: {
      kind: 'apiKey',
      header: 'X-API-Key',
      secret: secret('NUITEE_API_KEY'),
    },
    operations: {
      search: {
        type: 'read',
        method: 'POST',
        limits: { maxResponseBytes: 6 * 1024 * 1024 },
        path: '/flights/rates',
        input: searchRequestSchema,
        output: z.object({ raw: z.unknown() }),
        request: {
          legs: '${args.legs}',
          adults: '${args.adults}',
          children: '${args.children}',
          infants: '${args.infants}',
          childrenAges: '${args.childrenAges}',
          infantAges: '${args.infantAges}',
          cabinClass: '${args.cabinClass}',
          currency: '${args.currency}',
          country: '${args.country}',
        },
        response: { raw: '${response}' },
      },
      verify: {
        type: 'read',
        method: 'POST',
        path: '/flights/verify',
        input: z.object({ offerId: z.string().min(1).max(16_384) }),
        output: z.object({ raw: z.unknown() }),
        request: { offerId: '${args.offerId}' },
        response: { raw: '${response}' },
      },
    },
  });

const gatewayInputSchema = z.object({
  kind: z.enum(['search', 'verify']),
  search: z.unknown().optional(),
  today: z.string().optional(),
  requestedAt: z.string().optional(),
  selectionId: z.string().optional(),
  selectionMode: z.enum(['active', 'explicit']).optional(),
  state: z.unknown().optional(),
});

export const gatewayOutputSchema = z.object({
  kind: z.enum(['search', 'verify']),
  status: z.enum(['success', 'empty', 'partial', 'error']),
  message: z.string().max(400),
  fallback: z.string().max(500),
  retrievedAt: z.string().max(64).optional(),
  searchId: z.string().max(39).optional(),
  searchContext: searchInputSchema.optional(),
  itineraries: z.array(itinerarySchema).max(10).optional(),
  records: z.array(selectionRecordSchema).max(10).optional(),
  verification: verificationSchema.optional(),
  error: errorSchema.optional(),
});

export const nuiteeGateway = connector('nuitee_flights_gateway')
  .version('1.0.1')
  .compute('select', {
    type: 'read',
    input: z.object({ state: z.unknown(), selectionId: selectionIdSchema }),
    output: selectFlightOutputSchema,
    limits: { timeoutMs: 1_000 },
    run: selectStoredFlight,
  })
  .compute('execute', {
    type: 'read',
    input: gatewayInputSchema,
    output: gatewayOutputSchema,
    calls: {
      search: 'nuitee_flights_http.search',
      verify: 'nuitee_flights_http.verify',
    },
    limits: { timeoutMs: 12_000, maxHostCalls: 1 },
    run: runNuiteeGateway,
  });

export const noodleState = connector('noodle_state')
  .version('1.0.0')
  .operation('read_state', {
    type: 'read',
    input: z.object({ handle: z.string(), key: z.string().optional() }),
    output: z.object({ value: z.unknown(), revision: z.number().int(), status: z.string(), ok: z.boolean().optional() }),
  })
  .operation('patch_state', {
    type: 'action',
    input: z.object({ handle: z.string(), expectedRevision: z.number().int(), value: z.unknown() }),
    output: z.object({ value: z.unknown(), revision: z.number().int(), status: z.string(), ok: z.boolean().optional() }),
  });
