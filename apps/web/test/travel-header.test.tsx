import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { starterConfig } from '../../../starter.config';
import { TravelHeader } from '../src/components/travel-header';

afterEach(() => {
  cleanup();
});

describe('travel header', () => {
  it('exposes only honest consumer and developer navigation', () => {
    render(<TravelHeader mode="hero" onNewTrip={vi.fn()} onOpenSettings={vi.fn()} />);

    expect(screen.getByText(starterConfig.brand.name)).toBeVisible();
    expect(screen.getByRole('link', { name: 'For developers' })).toHaveAttribute(
      'href', starterConfig.website.developerPath,
    );
    expect(screen.getByText('Guest trip')).toBeVisible();
    expect(screen.queryByText(/Manage booking|Check in|Flight status/i))
      .not.toBeInTheDocument();
  });
});
