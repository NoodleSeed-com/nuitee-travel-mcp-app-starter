import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { SearchOutput } from '../src/flight-schemas.js';
import { searchSyntheticHotels } from '../src/demo-fixtures.js';

vi.mock('../src/helpers.js', () => ({
  Frame: ({ children, title, displayMode: _, ...props }: any) => <section {...props}>{title ? <h1>{title}</h1> : null}{children}</section>,
  Action: ({ children, variant: _, pending: __, pendingLabel: ___, ...props }: any) => <button {...props}>{children}</button>,
  ActionBar: ({ children }: any) => <div>{children}</div>,
  Feedback: ({ children }: any) => <p>{children}</p>,
  Region: ({ children }: any) => <section>{children}</section>,
  StatusBadge: ({ children }: any) => <span>{children}</span>,
}));

import { FlightResultsView, selectionOutcome } from '../src/views/flight-results.js';
import { HotelJourney } from '../src/views/hotel-journey.js';

const flight: SearchOutput = {
  status: 'success', message: 'One fixture fare.', fallback: 'One fixture fare; not live inventory.',
  itineraries: [{
    selectionId: 'sel_0123456789abcdef0123456789abcdef',
    route: { origin: 'YYZ', destination: 'LIS' }, carrier: { name: 'Fixture Air', code: 'ZZ' },
    departureTime: '2030-04-20T09:00:00Z', arrivalTime: '2030-04-20T12:15:00Z', durationMinutes: 195, stops: 0,
    price: { total: 284.5, currency: 'CAD' }, baggage: { carryOn: true, checked: false, allowances: [] },
    retrievedAt: '2030-04-01T12:00:00Z', isCheapest: true, fare: {}, terms: {}, amenities: [], segments: [], messages: [],
    legs: [{ direction: 'OUTBOUND', route: { origin: 'YYZ', destination: 'LIS' }, departureTime: '2030-04-20T09:00:00Z', arrivalTime: '2030-04-20T12:15:00Z', durationMinutes: 195, stops: 0 }],
  }],
};
const stay = searchSyntheticHotels({ destination: 'Lisbon', checkInDate: '2030-04-20', checkOutDate: '2030-04-23', adults: 2, children: 0, rooms: 1, currency: 'CAD' });

describe('connected selection handoffs', () => {
  it('never acknowledges a flight selection from an explicit tool error', () => {
    const selectionId = flight.itineraries[0]!.selectionId;
    expect(selectionOutcome({ isError: true, structuredContent: { status: 'selected', selectionId } }, selectionId).confirmed).toBe(false);
  });
  it('shows flight acknowledgment, inline review and the existing verification action after selection', () => {
    const html = renderToStaticMarkup(<FlightResultsView result={flight} displayMode="inline" selectedSelectionId={flight.itineraries[0]!.selectionId} onVerify={vi.fn()} onReview={vi.fn()} />);
    expect(html).toContain('Flight added to your trip');
    expect(html).toContain('Not reserved');
    expect(html).toContain('Fare not yet verified');
    expect(html).toContain('Review my trip');
    expect(html).toContain('Verify current fare');
  });
  it('does not show review for unselected flights or in the starter without a review callback', () => {
    expect(renderToStaticMarkup(<FlightResultsView result={flight} displayMode="inline" onVerify={vi.fn()} onReview={vi.fn()} />)).not.toContain('Review my trip');
    expect(renderToStaticMarkup(<FlightResultsView result={flight} displayMode="inline" selectedSelectionId={flight.itineraries[0]!.selectionId} onVerify={vi.fn()} />)).not.toContain('Review my trip');
  });
  it('acknowledges the chosen stay and offers review without requiring a typed request', () => {
    const html = renderToStaticMarkup(<HotelJourney result={stay} displayMode="inline" selectedSelectionId={stay.hotels[0]!.selectionId} onReview={vi.fn()} />);
    expect(html).toContain('Stay added to your trip');
    expect(html).toContain('Not reserved');
    expect(html).toContain(stay.hotels[0]!.name);
    expect(html).toContain('Review my trip');
  });
  it('does not offer review for unselected, unknown or unavailable stays', () => {
    for (const selectedSelectionId of [undefined, 'hsel_99999999999999999999999999999999']) {
      expect(renderToStaticMarkup(<HotelJourney result={stay} displayMode="inline" selectedSelectionId={selectedSelectionId} onReview={vi.fn()} />)).not.toContain('Review my trip');
    }
    expect(renderToStaticMarkup(<HotelJourney result={stay} displayMode="inline" selectedSelectionId={stay.hotels[0]!.selectionId} />)).not.toContain('Review my trip');
  });
});
