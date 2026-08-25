import { renderToStaticMarkup } from 'react-dom/server';
import type { HomeOutput, Itinerary, SearchOutput } from '../src/flight-schemas.js';
import { starterConfig } from '../src/starter-config.js';
import { FlightResultsView } from '../src/views/flight-results.js';
import { TravelHomeView } from '../src/views/travel-home.js';

const home: HomeOutput = {
  status: 'ready',
  brand: starterConfig.brand.name,
  message: 'Flights are available. Tell me your route, dates, travelers, currency, and point-of-sale country to begin.',
  domains: [
    { name: 'Flights', availability: 'available' },
    { name: 'Stays', availability: 'coming_soon' },
    { name: 'Loyalty', availability: 'coming_soon' },
    { name: 'Ground travel', availability: 'coming_soon' },
    { name: 'Experiences', availability: 'coming_soon' },
  ],
  fallback: 'Cedar & Cloud Travel can search and verify flights.',
};

const baseItinerary: Itinerary = {
  selectionId: 'sel_11111111111111111111111111111111',
  route: {
    origin: 'QZX',
    originName: 'Cedar Bay Test Aerodrome',
    destination: 'QZY',
    destinationName: 'Cloud Harbour Test Aerodrome',
  },
  carrier: { name: 'Cedar Skies', code: 'ZZ' },
  departureTime: '2030-04-20T09:00:00Z',
  arrivalTime: '2030-04-20T12:15:00Z',
  durationMinutes: 195,
  stops: 0,
  price: { total: 284.5, currency: 'CAD', base: 240, taxes: 40, fees: 4.5 },
  baggage: { carryOn: true, checked: false, allowances: ['One fictional cabin bag'] },
  expiresAt: '2030-04-01T12:15:00Z',
  retrievedAt: '2030-04-01T12:00:00Z',
  isCheapest: true,
  fare: { family: 'Cloudlight Economy', mixedCabin: false, seatsRemaining: 4 },
  terms: { changeable: true, refundable: false, hasChangeFee: true, hasRefundFee: false },
  amenities: [{
    category: 'wifi',
    name: 'Fictional Wi-Fi',
    available: true,
    chargeable: false,
    details: 'Test fixture only',
    aircraftType: 'Cedar 100',
  }],
  legs: [{
    direction: 'OUTBOUND',
    route: { origin: 'QZX', destination: 'QZY' },
    departureTime: '2030-04-20T09:00:00Z',
    arrivalTime: '2030-04-20T12:15:00Z',
    durationMinutes: 195,
    stops: 0,
  }],
  segments: [],
  messages: ['Fictional fixture fare; not live inventory.'],
};

const itineraries: Itinerary[] = [
  baseItinerary,
  {
    ...baseItinerary,
    selectionId: 'sel_22222222222222222222222222222222',
    departureTime: '2030-04-20T11:30:00Z',
    arrivalTime: '2030-04-20T15:25:00Z',
    durationMinutes: 235,
    stops: 1,
    price: { total: 316.2, currency: 'CAD', base: 266.2, taxes: 45, fees: 5 },
    isCheapest: false,
    fare: { family: 'Cedar Flex', mixedCabin: false, seatsRemaining: 7 },
    baggage: { carryOn: true, checked: true, allowances: ['One fictional cabin bag', 'One fictional checked bag'] },
    legs: [{
      ...baseItinerary.legs[0],
      departureTime: '2030-04-20T11:30:00Z',
      arrivalTime: '2030-04-20T15:25:00Z',
      durationMinutes: 235,
      stops: 1,
    }],
  },
  {
    ...baseItinerary,
    selectionId: 'sel_33333333333333333333333333333333',
    departureTime: '2030-04-20T15:10:00Z',
    arrivalTime: '2030-04-20T18:35:00Z',
    durationMinutes: 205,
    price: { total: 348.75, currency: 'CAD', base: 295, taxes: 48.75, fees: 5 },
    isCheapest: false,
    fare: { family: 'Cedar Comfort', mixedCabin: false, seatsRemaining: 2 },
    legs: [{
      ...baseItinerary.legs[0],
      departureTime: '2030-04-20T15:10:00Z',
      arrivalTime: '2030-04-20T18:35:00Z',
      durationMinutes: 205,
    }],
  },
];

const search: SearchOutput = {
  status: 'success',
  message: 'Three fictional test fares found.',
  fallback: 'Three fictional test fares from QZX to QZY.',
  retrievedAt: baseItinerary.retrievedAt,
  searchContext: {
    origin: 'QZX',
    destination: 'QZY',
    departureDate: '2030-04-20',
    adults: 1,
    children: 0,
    infants: 0,
    childrenAges: [],
    infantAges: [],
    cabinClass: 'ECONOMY',
    currency: 'CAD',
    country: 'CA',
  },
  itineraries,
};

export function renderWidgetPreview(name: 'home' | 'results') {
  if (name === 'home') {
    return renderToStaticMarkup(<TravelHomeView data={home} theme="light" onSearchPrompt={() => undefined} />);
  }
  return renderToStaticMarkup(
    <FlightResultsView
      result={search}
      displayMode="inline"
      selectedSelectionId={itineraries[1].selectionId}
      onSelect={() => undefined}
      onVerify={() => undefined}
      onEdit={() => undefined}
    />,
  );
}
