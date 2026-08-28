import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TripBrief } from '../src/components/trip-brief';

afterEach(() => {
  cleanup();
});

describe('trip brief', () => {
  it('renders only validated projected trip facts', () => {
    render(<TripBrief projection={{
      phase: 'comparing',
      origin: 'ISB',
      destination: 'FCO',
      departureDate: '2026-09-11',
      returnDate: '2026-09-15',
      travelers: '2 adults',
    }} />);

    expect(screen.getByRole('complementary', { name: 'Live trip brief' }))
      .toHaveTextContent('ISB → FCO');
    expect(screen.getByText('Comparing fares')).toBeVisible();
    expect(screen.queryByText('Provider offer')).not.toBeInTheDocument();
  });
});
