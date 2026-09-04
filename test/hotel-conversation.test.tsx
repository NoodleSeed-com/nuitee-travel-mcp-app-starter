import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('../src/helpers.js', () => ({
  Frame: ({ children, title, displayMode: _, ...props }: any) => <section {...props}><h1>{title}</h1>{children}</section>,
  Action: ({ children, variant: _, pending: __, pendingLabel: ___, ...props }: any) => <button {...props}>{children}</button>,
  Feedback: ({ children }: any) => <p>{children}</p>,
}));
import { HotelResultsView } from '../src/views/hotel-results.js';
import { searchSyntheticHotels } from '../src/demo-fixtures.js';

it('offers inspection before selection without match-score controls in the shortlist', () => {
  const result = searchSyntheticHotels({ destination: 'Lisbon', checkInDate: '2030-04-20', checkOutDate: '2030-04-23', adults: 2, children: 0, rooms: 1, currency: 'CAD' });
  const html = renderToStaticMarkup(<HotelResultsView result={result} displayMode="inline" onAdd={() => {}} />);
  expect(html).toContain('View stay');
  expect(html).not.toContain('cc-match-score-button');
  expect(html).not.toContain('Hotel result view');
});
