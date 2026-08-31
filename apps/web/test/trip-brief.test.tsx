import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TripBrief } from '../src/components/trip-brief';

afterEach(() => {
  cleanup();
});

describe('trip brief', () => {
  it('renders no contradictory rail before typed trip state exists', () => {
    const { container } = render(<TripBrief projection={{ phase: 'idle' }} />);

    expect(screen.queryByRole('region', { name: 'Current trip' }))
      .not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('discloses secondary accepted trip facts on demand', () => {
    render(<TripBrief projection={{
      phase: 'planned',
      origin: 'ISB',
      destination: 'NYC',
      departureDate: '2026-09-18',
      returnDate: '2026-09-27',
      travelers: '1 adult',
      cabinClass: 'Economy',
      currency: 'USD',
      country: 'US',
    }} />);

    const brief = screen.getByRole('region', { name: 'Current trip' });
    expect(brief).toHaveTextContent('ISB → NYC');
    expect(brief).toHaveTextContent('1 adult');
    expect(brief).toHaveTextContent('Economy');
    expect(brief).not.toHaveTextContent('USD');
    expect(brief).not.toHaveTextContent('US market');
    expect(brief).toHaveTextContent('Ready to search');
    expect(brief).not.toHaveTextContent(/point-of-sale/i);

    fireEvent.click(within(brief).getByRole('button', {
      name: 'Show trip details',
    }));

    expect(brief).toHaveTextContent('USD');
    expect(brief).toHaveTextContent('US market');
  });

  it('renders only validated projected trip facts', () => {
    render(<TripBrief projection={{
      phase: 'comparing',
      origin: 'ISB',
      destination: 'FCO',
      departureDate: '2026-09-11',
      returnDate: '2026-09-15',
      travelers: '2 adults',
    }} />);

    expect(screen.getByRole('region', { name: 'Current trip' }))
      .toHaveTextContent('ISB → FCO');
    expect(screen.getByText('Comparing fares')).toBeVisible();
    expect(screen.queryByText('Provider offer')).not.toBeInTheDocument();
  });
});
