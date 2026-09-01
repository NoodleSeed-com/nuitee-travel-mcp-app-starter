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

  it('does not show a summary before an application-issued selection exists', () => {
    const { container } = render(<TripBrief projection={{
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

    expect(screen.queryByRole('region', { name: 'Current trip' }))
      .not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('discloses selected trip facts on demand', () => {
    render(<TripBrief projection={{
      phase: 'selected',
      hasFlightSelection: true,
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
    expect(brief).toHaveTextContent('Fare selected');
    expect(brief).not.toHaveTextContent(/point-of-sale/i);

    fireEvent.click(within(brief).getByRole('button', {
      name: 'Show trip details',
    }));

    expect(brief).toHaveTextContent('USD');
    expect(brief).toHaveTextContent('US market');
  });

  it('renders a stay-only selection without inventing flight facts', () => {
    render(<TripBrief projection={{
      phase: 'stay-selected',
      hasStaySelection: true,
      focus: 'stays',
      stayDestination: 'Lisbon',
      checkInDate: '2026-09-18',
      checkOutDate: '2026-09-21',
    }} />);

    expect(screen.getByRole('region', { name: 'Current trip' }))
      .toHaveTextContent('Stay in Lisbon');
    expect(screen.getByText('Stay selected')).toBeVisible();
    expect(screen.queryByText('→')).not.toBeInTheDocument();
  });
});
