import { connector, secret, z } from '@noodleseed/one';
import {
  demoHotelSearchInputSchema,
  demoHotelSearchOutputSchema,
  demoHotelSelectionRecordSchema,
} from './demo-schemas.js';
import { runHotelGateway } from './hotel-runtime.js';

const hotelRatesRequestSchema = z.object({
  cityName: z.string().min(2).max(80).optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  iataCode: z.string().regex(/^[A-Z]{3}$/).optional(),
  occupancies: z.array(z.object({
    rooms: z.literal(1),
    adults: z.number().int().min(1).max(8),
    children: z.array(z.number().int().min(0).max(17)).max(6),
  })).min(1).max(4),
  currency: z.enum(['CAD', 'USD', 'EUR']),
  guestNationality: z.string().regex(/^[A-Z]{2}$/),
  checkin: z.iso.date(),
  checkout: z.iso.date(),
  timeout: z.number().int().min(1).max(20),
  maxRatesPerHotel: z.number().int().min(1).max(5),
  limit: z.number().int().min(1).max(10),
  includeHotelData: z.boolean(),
  stream: z.literal(false),
});

export const nuiteeHotelsHttp = connector('nuitee_hotels_http')
  .version('1.0.0')
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
        path: '/hotels/rates',
        limits: { maxResponseBytes: 6 * 1024 * 1024 },
        input: hotelRatesRequestSchema,
        output: z.object({ raw: z.unknown() }),
        request: {
          cityName: '${args.cityName}',
          countryCode: '${args.countryCode}',
          iataCode: '${args.iataCode}',
          occupancies: '${args.occupancies}',
          currency: '${args.currency}',
          guestNationality: '${args.guestNationality}',
          checkin: '${args.checkin}',
          checkout: '${args.checkout}',
          timeout: '${args.timeout}',
          maxRatesPerHotel: '${args.maxRatesPerHotel}',
          limit: '${args.limit}',
          includeHotelData: '${args.includeHotelData}',
          stream: '${args.stream}',
        },
        response: { raw: '${response}' },
      },
    },
  });

const hotelGatewayInputSchema = z.object({
  search: demoHotelSearchInputSchema,
  requestedAt: z.string().max(64).optional(),
});

const hotelGatewayOutputSchema = z.object({
  result: demoHotelSearchOutputSchema,
  records: z.array(demoHotelSelectionRecordSchema).max(10),
});

export const nuiteeHotelsGateway = connector('nuitee_hotels_gateway')
  .version('1.0.0')
  .compute('execute', {
    type: 'read',
    input: hotelGatewayInputSchema,
    output: hotelGatewayOutputSchema,
    calls: { search: 'nuitee_hotels_http.search' },
    limits: { timeoutMs: 15_000, maxHostCalls: 1 },
    run: runHotelGateway,
  });
