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
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().int().min(1000).max(10_000).optional(),
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
      places: {
        type: 'read',
        method: 'GET',
        path: '/data/places',
        query: ['textQuery', 'type', 'language'],
        limits: { maxResponseBytes: 256 * 1024 },
        input: z.object({ textQuery: z.string().min(2).max(260), type: z.literal('establishment,point_of_interest'), language: z.literal('en') }),
        output: z.object({ raw: z.unknown() }),
        response: { raw: '${response}' },
      },
      place_details: {
        type: 'read',
        method: 'GET',
        path: '/data/places/${args.placeId}',
        query: ['language'],
        limits: { maxResponseBytes: 256 * 1024 },
        input: z.object({ placeId: z.string().regex(/^[A-Za-z0-9_-]{1,256}$/), language: z.literal('en') }),
        output: z.object({ raw: z.unknown() }),
        response: { raw: '${response}' },
      },
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
          latitude: '${args.latitude}',
          longitude: '${args.longitude}',
          radius: '${args.radius}',
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
    calls: { search: 'nuitee_hotels_http.search', places: 'nuitee_hotels_http.places', place_details: 'nuitee_hotels_http.place_details' },
    limits: { timeoutMs: 30_000, maxHostCalls: 3 },
    run: runHotelGateway,
  });
