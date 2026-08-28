import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { starterConfig } from '../../../starter.config';
import { TravelHeader } from '../src/components/travel-header';

afterEach(() => {
  cleanup();
});

describe('travel header', () => {
  it('renders one repository-owned Wayfare route mark beside the wordmark', () => {
    render(
      <TravelHeader
        mode="hero"
        onNewTrip={vi.fn()}
        onOpenSettings={vi.fn()}
        onPlanTrip={vi.fn()}
      />,
    );

    const home = screen.getByRole('link', { name: 'Wayfare' });
    const mark = home.querySelector('svg[data-wayfare-mark="true"]');
    expect(mark).not.toBeNull();
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark?.querySelector('path')).toHaveAttribute(
      'd',
      'M3.25 6.5L7.6 17.25L12 9L16.4 17.25L20.25 8',
    );
    expect(mark?.querySelector('circle')).toHaveAttribute('cx', '20.25');
  });

  it('keeps hero navigation focused on planning and opens settings from the menu', () => {
    const onPlanTrip = vi.fn();
    const onOpenSettings = vi.fn();
    render(
      <TravelHeader
        mode="hero"
        onNewTrip={vi.fn()}
        onOpenSettings={onOpenSettings}
        onPlanTrip={onPlanTrip}
      />,
    );

    expect(screen.getByRole('button', { name: 'Plan a trip' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'For developers' }))
      .toHaveAttribute('href', starterConfig.website.developerPath);
    expect(screen.queryByText('Guest trip')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Travel menu' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: 'Travel menu' }))
      .not.toBeInTheDocument();
  });

  it('restores menu-trigger focus after Escape dismisses the dialog', () => {
    render(
      <TravelHeader
        mode="hero"
        onNewTrip={vi.fn()}
        onOpenSettings={vi.fn()}
        onPlanTrip={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Open menu' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Travel menu' }), {
      key: 'Escape',
    });

    expect(screen.queryByRole('dialog', { name: 'Travel menu' }))
      .not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('calls the hero Plan a trip callback without starting a trip', () => {
    const onPlanTrip = vi.fn();
    const onNewTrip = vi.fn();
    render(
      <TravelHeader
        mode="hero"
        onNewTrip={onNewTrip}
        onOpenSettings={vi.fn()}
        onPlanTrip={onPlanTrip}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Plan a trip' }));

    expect(onPlanTrip).toHaveBeenCalledOnce();
    expect(onNewTrip).not.toHaveBeenCalled();
  });

  it('starts a new trip from the conversation menu', () => {
    const onNewTrip = vi.fn();
    render(
      <TravelHeader
        mode="conversation"
        onNewTrip={onNewTrip}
        onOpenSettings={vi.fn()}
        onPlanTrip={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Travel menu' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'New trip' }));

    expect(onNewTrip).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: 'Travel menu' }))
      .not.toBeInTheDocument();
  });

  it('keeps configured developer, support, and legal fallback navigation in the menu', () => {
    render(
      <TravelHeader
        mode="hero"
        onNewTrip={vi.fn()}
        onOpenSettings={vi.fn()}
        onPlanTrip={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Travel menu' });
    expect(within(dialog).getByRole('link', { name: 'For developers' }))
      .toHaveAttribute('href', starterConfig.website.developerPath);
    expect(within(dialog).getByRole('link', { name: 'Support' }))
      .toHaveAttribute('href', starterConfig.website.supportPath);
    expect(within(dialog).queryByRole('link', { name: 'Privacy' }))
      .not.toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'Terms' }))
      .not.toBeInTheDocument();
    expect(within(dialog).getByText('Privacy').parentElement)
      .toHaveTextContent('PrivacyNot configured');
    expect(within(dialog).getByText('Terms').parentElement)
      .toHaveTextContent('TermsNot configured');
  });

  it('does not expose unsupported travel utilities', () => {
    render(
      <TravelHeader
        mode="hero"
        onNewTrip={vi.fn()}
        onOpenSettings={vi.fn()}
        onPlanTrip={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.queryByText(/Manage booking|Check in|Flight status/i))
      .not.toBeInTheDocument();
  });
});
