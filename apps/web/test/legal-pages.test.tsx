import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(cleanup);

describe('Wayfare legal pages', () => {
  it('explains the real guest, assistant, provider, and location data flow', async () => {
    const privacyModule = await import('../app/privacy/page').catch(() => undefined);

    expect(privacyModule).toBeDefined();
    if (!privacyModule) return;
    render(<privacyModule.default />);

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' }))
      .toBeVisible();
    expect(screen.getByRole('heading', { name: 'How location defaults work' }))
      .toBeVisible();
    expect(screen.getByText(/does not request browser geolocation/i)).toBeVisible();
    expect(screen.getAllByText(/IPinfo/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/does not create bookings/i)).toBeVisible();
    for (const link of screen.getAllByRole('link', { name: 'Terms of service' })) {
      expect(link).toHaveAttribute('href', '/terms');
    }
  });

  it('states the demonstration and provider-owned transaction boundaries', async () => {
    const termsModule = await import('../app/terms/page').catch(() => undefined);

    expect(termsModule).toBeDefined();
    if (!termsModule) return;
    render(<termsModule.default />);

    expect(screen.getByRole('heading', { level: 1, name: 'Terms of service' }))
      .toBeVisible();
    expect(screen.getByRole('heading', { name: 'Demonstration service' }))
      .toBeVisible();
    expect(screen.getByText(/does not book, hold inventory, issue tickets/i))
      .toBeVisible();
    expect(screen.getByRole('heading', { name: 'Acceptable use' })).toBeVisible();
    for (const link of screen.getAllByRole('link', { name: 'Privacy policy' })) {
      expect(link).toHaveAttribute('href', '/privacy');
    }
  });
});
