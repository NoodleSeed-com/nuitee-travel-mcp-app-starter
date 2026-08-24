// QZX/QZY/QZH are schema-shaped fictional fixture codes. No assigned airport
// was found in IATA's public code search on 2026-08-24; recheck before release.
// ZZ is IATA's reserved computer-test designator, not an operating airline.
export const fictionalSearchResponse = {
  data: [
    {
      journeys: [
        {
          journeyKey: 'fictional-journey-1',
          isCheapest: true,
          timestamp: '2030-04-01T12:00:00Z',
          totalDuration: { minutes: 195, iso8601: 'PT3H15M' },
          legDurations: [
            {
              direction: 'OUTBOUND',
              duration: { minutes: 195, iso8601: 'PT3H15M' },
              overnightFlight: false,
              dayChange: 0,
            },
          ],
          segments: [
            {
              segmentKey: 'fictional-segment-1',
              originCode: 'QZX',
              originName: 'Cedar Bay Test Aerodrome',
              destinationCode: 'QZY',
              destinationName: 'Cloud Harbour Test Aerodrome',
              departureTime: '2030-04-20T09:00:00Z',
              arrivalTime: '2030-04-20T12:15:00Z',
              direction: 'OUTBOUND',
              duration: { minutes: 195, iso8601: 'PT3H15M' },
              carrier: {
                marketingCode: 'ZZ',
                marketingName: 'Cedar Skies',
                operatingCode: 'ZZ',
                operatingName: 'Cedar Skies',
                // Fictional carrier code on Nuitee's documented airline-image origin.
                // Tests never fetch this URL.
                marketingLogo: 'https://sandbox.nuitee.flights/static/images/airlines/ZZ.png',
              },
              flight: { marketingNumber: 'ZZ101', operatingNumber: 'ZZ101' },
            },
          ],
          cheapestOffer: {
            offerId: 'provider-offer-must-stay-private-1',
            expiration: '2030-04-01T12:15:00Z',
            pricing: {
              display: { total: 284.5, currency: 'CAD', base: 240, taxes: 40, fees: 4.5 },
              converted: false,
            },
            fare: { family: 'Cloudlight Economy', mixedCabin: false, seatsRemaining: 4 },
            baggage: {
              hasCarryOnBag: true,
              hasCheckedBag: false,
              included: [
                {
                  bagType: 'cabin',
                  description: 'One fictional cabin bag',
                  passengerType: 'ADT',
                  pieces: 1,
                  weightKg: 8,
                  unit: 'kg',
                },
              ],
            },
            terms: {
              changeable: true,
              refundable: false,
              hasChangeFee: true,
              hasRefundFee: false,
              summary: [{ level: 'warning', message: 'Fictional fixture fare; not live inventory.' }],
            },
            segmentAmenities: [
              {
                segmentKey: 'fictional-segment-1',
                aircraftType: 'Cedar 100',
                amenities: [
                  { available: true, category: 'wifi', chargeable: false, name: 'Fictional Wi-Fi', details: 'Test fixture only' },
                  { available: true, category: 'power', chargeable: null, name: 'Seat power', details: null },
                ],
              },
            ],
          },
          offers: [],
        },
      ],
    },
  ],
} as const;

export const fictionalVerifyResponse = {
  data: [
    {
      journey: {
        journeyKey: 'fictional-journey-1',
        expiration: '2030-04-01T12:20:00Z',
        timestamp: '2030-04-01T12:02:00Z',
        pricing: {
          display: { total: 299.5, currency: 'CAD', base: 250, taxes: 45, fees: 4.5 },
          converted: false,
        },
        baggage: { hasCarryOnBag: true, hasCheckedBag: false, included: [] },
        fare: { family: 'Cloudlight Economy', mixedCabin: false, seatsRemaining: 3 },
        segments: fictionalSearchResponse.data[0].journeys[0].segments,
      },
      changes: {
        priceChanged: true,
        cabinChanged: false,
        fareChanged: false,
        messages: ['The fictional fixture fare changed during verification.'],
        pricing: {
          old: fictionalSearchResponse.data[0].journeys[0].cheapestOffer.pricing,
          new: {
            display: { total: 299.5, currency: 'CAD', base: 250, taxes: 45, fees: 4.5 },
            converted: false,
          },
        },
      },
    },
  ],
} as const;

export const validSearchInput = {
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
} as const;

export const selectionState = {
  searchId: 'search_fictional',
  updatedAt: '2030-04-01T12:00:00Z',
  records: [
    {
      selectionId: 'sel_0123456789abcdef0123456789abcdef',
      offerId: 'provider-offer-must-stay-private-1',
      searchId: 'search_fictional',
      originalTotal: 284.5,
      currency: 'CAD',
      expiresAt: '2030-04-01T12:15:00Z',
    },
  ],
} as const;
