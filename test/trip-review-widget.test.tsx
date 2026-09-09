import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/helpers.js', () => ({
  Action: ({ children, variant: _variant, ...props }: any) => <button {...props}>{children}</button>,
  Feedback: ({ children, status }: any) => <div data-status={status}>{children}</div>,
  Frame: ({ children, displayMode: _displayMode, ...props }: any) => <section {...props}>{children}</section>,
  useLayout: vi.fn(), useSendFollowUpMessage: vi.fn(), useToolInfo: vi.fn(),
  useUpdateModelContext: vi.fn(), useWidgetReady: vi.fn(),
}));
import { TripReviewView, tripSuggestion, continuePlanningPrompt } from '../src/views/trip-review.js';

const experience = {
  selectionId: `esel_${'a'.repeat(32)}`,
  experience: { title: 'Tagus Sunset Sailing Circle', city: 'Lisbon', durationMinutes: 120 },
  slot: { startLocal: '2030-04-21T18:30:00', timeZone: 'Europe/Lisbon' },
  searchContext: { destination: 'Lisbon', startDate: '2030-04-20', endDate: '2030-04-23', adults: 2, children: 0, currency: 'CAD' },
  totalPrice: { amountMinor: 17_200, currency: 'CAD' },
};
const review: any = {
  status: 'ready', experiences: [experience], missing: ['flight', 'stay'],
  disclosure: 'Experience prices are fictional. Nothing was booked.',
  fallback: 'One experience is selected. Flights and stays are optional.',
  planningContext: { destination: 'Lisbon', startDate: '2030-04-20', endDate: '2030-04-23', adults: 2, children: 0, currency: 'CAD', meetingArea: 'Belém marina meeting point' },
};
describe('trip planning review', () => {
  const flight = { dataSource: 'live_nuitee_selection', selectionId: `sel_${'b'.repeat(32)}`, searchPrice: { total: 500, currency: 'CAD' }, disclosure: 'Fare verification needed.' } as const;
  it('shows the selected airline logo without cropping it into a destination photo', () => {
    const html = renderToStaticMarkup(<TripReviewView data={{ ...review, flight: { ...flight, airlineLogoUrl: 'https://sandbox.nuitee.flights/static/images/airlines/ZZ.png' } }} />);
    expect(html).toContain('src="https://sandbox.nuitee.flights/static/images/airlines/ZZ.png"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain('wf-review-flight-thumbnail');
  });
  it.each([undefined, 'javascript:alert(1)', 'https://untrusted.example/a.jpg', 'https://sandbox.nuitee.flights.evil.example/static/images/airlines/ZZ.png'])('keeps the flight readable with an icon when its logo is unusable: %s', airlineLogoUrl => {
    const html = renderToStaticMarkup(<TripReviewView data={{ ...review, experiences: [], flight: { ...flight, airlineLogoUrl } }} />);
    expect(html).toContain('Your selected flight');
    expect(html).not.toContain('<img');
  });
  const stay = { dataSource: 'live_nuitee', selectionId: `hsel_${'b'.repeat(32)}`, propertyName: 'Selected Lisbon Hotel', city: 'Lisbon', checkInDate: '2030-04-20', checkOutDate: '2030-04-23', nights: 3, rooms: 1, staySubtotal: { amount: 500, currency: 'CAD' } };
  it('shows the selected stay photo with the existing review thumbnail geometry', () => {
    const html = renderToStaticMarkup(<TripReviewView data={{ ...review, stay: { ...stay, imageUrl: 'https://static.cupid.travel/selected-hotel.jpg' } }} />);
    expect(html).toContain('src="https://static.cupid.travel/selected-hotel.jpg"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain('wf-review-stay-thumbnail');
  });
  it.each([undefined, 'https://untrusted.example/a.jpg', 'https://static.cupid.travel.evil.example/a.jpg', 'http://static.cupid.travel/a.jpg'])('keeps a readable stay with an icon when its photo is unusable: %s', imageUrl => {
    const html = renderToStaticMarkup(<TripReviewView data={{ ...review, experiences: [], stay: { ...stay, imageUrl } }} />);
    expect(html).toContain('Selected Lisbon Hotel');
    expect(html).not.toContain('<img');
  });
  it('continues from selected context without requesting another review', () => {
    const prompt = continuePlanningPrompt(review);
    expect(prompt).toContain('Lisbon');
    expect(prompt).toContain('stays');
    expect(prompt).toContain('flights');
    expect(prompt).toContain('Do not repeat');
    expect(prompt).toContain('Do not recheck my flight fare just to continue planning');
    expect(prompt).toContain('one short question');
    expect(prompt).not.toContain('Review my current trip');
  });
  it('provides inline back and retry actions without inventing a loaded plan', () => {
    const back = renderToStaticMarkup(<TripReviewView data={review} onBack={vi.fn()} backLabel="Back to experience" />);
    expect(back).toContain('Back to experience');
    const failed = renderToStaticMarkup(<TripReviewView state="error" onBack={vi.fn()} onRetry={vi.fn()} />);
    expect(failed).toContain('Try again');
    expect(failed).not.toContain('Your Lisbon plan');
  });
  it('shows an experience-only plan and only missing-component suggestions', () => {
    const html = renderToStaticMarkup(<TripReviewView data={review} onSuggest={vi.fn()} onContinue={vi.fn()} />);
    expect(html).toContain('Your Lisbon plan');
    expect(html).toContain('Tagus Sunset Sailing Circle');
    expect(html).toContain('172');
    expect(html).toContain('Selected · Not reserved');
    expect(html).toContain('Find flights');
    expect(html).toContain('Find a stay');
    expect(html).not.toContain('Explore experiences');
    expect(html).not.toContain('needs another selection');
    expect(html).not.toContain('package total');
  });
  it('shows a flight and experience together with a stay suggestion only', () => {
    const data = { ...review, missing: ['stay'], flight: { searchPrice: { total: 500, currency: 'CAD' }, disclosure: 'Fare verification needed.' } };
    const html = renderToStaticMarkup(<TripReviewView data={data} onSuggest={vi.fn()} />);
    expect(html).toContain('Your selected flight');
    expect(html).toContain('Find a stay');
    expect(html).not.toContain('Find flights');
    expect(html).not.toContain('Explore experiences');
  });
  it('makes a location/date/party-aware follow-up from selected experience context', () => {
    const prompt = tripSuggestion(review, 'stay');
    expect(prompt).toContain('Lisbon');
    expect(prompt).toContain('Belém marina meeting point');
    expect(prompt).toContain('2030-04-20');
    expect(prompt).toContain('2030-04-23');
    expect(prompt).toContain('2 adults');
  });
  it('uses hotel context for nearby experience suggestions without inventing a radius', () => {
    const prompt = tripSuggestion({ ...review, planningContext: { destination: 'Tokyo', propertyName: 'Example stay', startDate: '2030-05-01', endDate: '2030-05-04' } }, 'experiences');
    expect(prompt).toContain('Tokyo');
    expect(prompt).toContain('Example stay');
    expect(prompt).not.toMatch(/\d+\s?(km|mile)/);
  });
  it('does not mistake flight departure for a hotel check-in date and preserves infants', () => {
    const prompt = tripSuggestion({ ...review, planningContext: { source: 'flight', destination: 'LIS', origin: 'YYZ', startDate: '2030-04-20', endDate: '2030-04-23', dateBasis: 'flight_departure', adults: 2, infants: 1 } }, 'stay');
    expect(prompt).toContain('flight departing 2030-04-20');
    expect(prompt).toContain('Do not treat flight departure or return dates as confirmed local arrival, stay, or activity dates');
    expect(prompt).toContain('2 adults and 1 infant');
  });
  it.each(['stay', 'experiences'] as const)('asks only for missing %s dates after a one-way flight, without a review or fare check', component => {
    const prompt = tripSuggestion({ ...review, experiences: [], planningContext: { source: 'flight', destination: 'LIS', origin: 'IST', startDate: '2026-09-18', dateBasis: 'flight_departure', adults: 2, currency: 'CAD' } }, component);
    expect(prompt).toContain('flight departing 2026-09-18');
    expect(prompt).toContain('2 adults');
    expect(prompt).toContain('CAD');
    expect(prompt).toContain('Do not repeat the trip review, display another plan card, or recheck my flight fare for this search');
    expect(prompt).toContain('Reuse the stay or activity dates already established in our conversation');
    expect(prompt).toContain('Search immediately when the required details are known');
    expect(prompt).toContain(`one short question for only the missing ${component === 'stay' ? 'check-in or check-out' : 'activity'} dates`);
    expect(prompt).toContain('Do not require a return flight or an exact arrival time');
    expect(prompt).not.toContain('Check the local arrival date');
    expect(prompt).not.toContain('and returning');
  });
  it('preserves round-trip dates as flight context without treating them as an activity window', () => {
    const prompt = tripSuggestion({ ...review, planningContext: { source: 'flight', destination: 'LIS', startDate: '2026-09-18', endDate: '2026-09-22', dateBasis: 'flight_departure', adults: 2 } }, 'experiences');
    expect(prompt).toContain('flight departing 2026-09-18 and returning 2026-09-22');
    expect(prompt).toContain('Do not treat flight departure or return dates as confirmed local arrival, stay, or activity dates');
    expect(prompt).toContain('only the missing activity dates');
  });
  it('reuses a known stay window and location without demanding flight arrival information', () => {
    const prompt = tripSuggestion({ ...review, planningContext: { source: 'stay', dateBasis: 'stay', destination: 'Lisbon', propertyName: 'Hotel Mundial', startDate: '2026-09-18', endDate: '2026-09-22' } }, 'experiences');
    expect(prompt).toContain('around Hotel Mundial from 2026-09-18 to 2026-09-22');
    expect(prompt).toContain('Search immediately when the required details are known');
    expect(prompt).toContain('If dates are still missing');
    expect(prompt).not.toContain('Check the local arrival date');
    expect(prompt).not.toContain('flight departing');
  });
  it('uses the same no-repeat handoff when searching missing flights', () => {
    const prompt = tripSuggestion(review, 'flight');
    expect(prompt).toContain('Find flights to Lisbon');
    expect(prompt).toContain('ask only for missing flight details');
    expect(prompt).toContain('Do not repeat the trip review');
  });
  it('keeps empty, loading, and error states useful', () => {
    expect(renderToStaticMarkup(<TripReviewView data={{ ...review, status: 'incomplete', experiences: [], planningContext: {}, missing: ['flight', 'stay', 'experiences'] }} onSuggest={vi.fn()} />)).toContain('Your plan is open');
    expect(renderToStaticMarkup(<TripReviewView state="loading" />)).toContain('aria-busy');
    expect(renderToStaticMarkup(<TripReviewView state="error" />)).toContain('could not load');
  });
});
