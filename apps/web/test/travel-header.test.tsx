import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { starterConfig } from '../../../starter.config';
import { TravelHeader } from '../src/components/travel-header';

afterEach(() => {
  cleanup();
});

describe('travel header', () => {
  it('renders the repository-owned Wayfare route mark beside the wordmark', () => {
    render(
      <TravelHeader
        currency="USD"
        mode="hero"
        onCurrencyChange={vi.fn()}
        onNewTrip={vi.fn()}
        onOpenSettings={vi.fn()}
        onPlanTrip={vi.fn()}
      />,
    );

    const home = screen.getByRole('link', { name: 'Wayfare' });
    expect(home.querySelector('[data-wayfare-mark="true"]')).not.toBeNull();
  });

  it('keeps hero navigation focused on planning and opens settings from the menu', () => {
    const onPlanTrip = vi.fn();
    const onOpenSettings = vi.fn();
    render(
      <TravelHeader
        currency="USD"
        mode="hero"
        onCurrencyChange={vi.fn()}
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
        currency="USD"
        mode="hero"
        onCurrencyChange={vi.fn()}
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
        currency="USD"
        mode="hero"
        onCurrencyChange={vi.fn()}
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
        currency="USD"
        mode="conversation"
        onCurrencyChange={vi.fn()}
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
        currency="USD"
        mode="hero"
        onCurrencyChange={vi.fn()}
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
        currency="USD"
        mode="hero"
        onCurrencyChange={vi.fn()}
        onNewTrip={vi.fn()}
        onOpenSettings={vi.fn()}
        onPlanTrip={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.queryByText(/Manage booking|Check in|Flight status/i))
      .not.toBeInTheDocument();
  });

  it('renders a session-only currency selector before the menu', () => {
    const onCurrencyChange = vi.fn();
    const { container } = render(
      <TravelHeader
        currency="PKR"
        mode="hero"
        onCurrencyChange={onCurrencyChange}
        onNewTrip={vi.fn()}
        onOpenSettings={vi.fn()}
        onPlanTrip={vi.fn()}
      />,
    );

    const currency = screen.getByRole('combobox', { name: 'Currency' });
    const menu = screen.getByRole('button', { name: 'Open menu' });
    expect(currency).toHaveValue('PKR');
    expect(currency.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(container.querySelectorAll('select')).toHaveLength(1);

    fireEvent.change(currency, { target: { value: 'EUR' } });

    expect(onCurrencyChange).toHaveBeenCalledOnce();
    expect(onCurrencyChange).toHaveBeenCalledWith('EUR');
  });

  it('pairs the selected currency with a decorative local flag and chevron', () => {
    const sharedProps = {
      mode: 'hero' as const,
      onCurrencyChange: vi.fn(),
      onNewTrip: vi.fn(),
      onOpenSettings: vi.fn(),
      onPlanTrip: vi.fn(),
    };
    const { container, rerender } = render(
      <TravelHeader currency="PKR" {...sharedProps} />,
    );

    const control = container.querySelector('.travel-header__currency-control');
    const flag = container.querySelector('.travel-header__currency-flag');
    const chevron = container.querySelector('.travel-header__currency-chevron');

    expect(control).not.toBeNull();
    expect(flag).toHaveAttribute('aria-hidden', 'true');
    expect(flag).toHaveAttribute('data-currency-flag', 'PK');
    expect(flag?.querySelector('svg')).not.toBeNull();
    expect(chevron).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('option', { name: 'PKR' })).toHaveTextContent('PKR');

    rerender(<TravelHeader currency="EUR" {...sharedProps} />);

    expect(container.querySelector('.travel-header__currency-flag'))
      .toHaveAttribute('data-currency-flag', 'EU');
  });
});
