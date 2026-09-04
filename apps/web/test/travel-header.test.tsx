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

  it('keeps the hero header quiet and moves navigation into the menu', () => {
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

    expect(screen.queryByRole('navigation', { name: 'Primary navigation' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Plan a trip' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'For developers' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Currency' })).toBeVisible();
    expect(screen.queryByText('Guest trip')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Travel menu' });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Plan a trip' }))
      .toHaveClass('travel-navigation-dialog__primary');
    expect(within(dialog).getByRole('link', { name: 'For developers' }))
      .toHaveAttribute('href', starterConfig.website.developerPath);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Settings' }));
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

  it('calls the hero Plan a trip callback from the menu without starting a trip', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Travel menu' }))
      .getByRole('button', { name: 'Plan a trip' }));

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

  it('offers a direct New trip action beside the conversation controls', () => {
    const onNewTrip = vi.fn();
    const { rerender } = render(
      <TravelHeader
        currency="USD"
        mode="conversation"
        onCurrencyChange={vi.fn()}
        onNewTrip={onNewTrip}
        onOpenSettings={vi.fn()}
        onPlanTrip={vi.fn()}
      />,
    );

    const newTrip = screen.getByRole('button', { name: 'New trip' });
    const currency = screen.getByRole('combobox', { name: 'Currency' });
    expect(newTrip.compareDocumentPosition(currency))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    fireEvent.click(newTrip);
    expect(onNewTrip).toHaveBeenCalledOnce();

    rerender(
      <TravelHeader
        currency="USD"
        mode="hero"
        onCurrencyChange={vi.fn()}
        onNewTrip={onNewTrip}
        onOpenSettings={vi.fn()}
        onPlanTrip={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'New trip' }))
      .not.toBeInTheDocument();
  });

  it('keeps configured developer, support, and legal navigation in the menu', () => {
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
    expect(within(dialog).getByRole('link', { name: 'Privacy' }))
      .toHaveAttribute('href', '/privacy');
    expect(within(dialog).getByRole('link', { name: 'Terms' }))
      .toHaveAttribute('href', '/terms');
    const legalAvailability = within(dialog).getByRole('group', {
      name: 'Legal availability',
    });
    expect(within(legalAvailability).queryByText('Not configured'))
      .not.toBeInTheDocument();
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
    expect(currency).toHaveAttribute('data-value', 'PKR');
    expect(currency).toHaveAttribute('aria-expanded', 'false');
    expect(currency.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(container.querySelectorAll('select')).toHaveLength(0);

    fireEvent.click(currency);
    const listbox = screen.getByRole('listbox', { name: 'Currency' });
    expect(within(listbox).getAllByRole('option')).toHaveLength(13);
    for (const option of within(listbox).getAllByRole('option')) {
      expect(option.querySelector('[data-currency-option-flag] svg')).not.toBeNull();
    }
    fireEvent.click(within(listbox).getByRole('option', {
      name: 'EUR European Union',
    }));

    expect(onCurrencyChange).toHaveBeenCalledOnce();
    expect(onCurrencyChange).toHaveBeenCalledWith('EUR');
    expect(screen.queryByRole('listbox', { name: 'Currency' }))
      .not.toBeInTheDocument();
    expect(currency).toHaveFocus();
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
    fireEvent.click(screen.getByRole('combobox', { name: 'Currency' }));
    expect(screen.getByRole('option', { name: 'PKR Pakistan' }))
      .toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'PKR Pakistan' })
      .querySelector('[data-selected-check]')).not.toBeNull();

    rerender(<TravelHeader currency="EUR" {...sharedProps} />);

    expect(container.querySelector('.travel-header__currency-flag'))
      .toHaveAttribute('data-currency-flag', 'EU');
  });

  it('supports arrow-key selection and Escape dismissal', () => {
    const onCurrencyChange = vi.fn();
    render(
      <TravelHeader
        currency="USD"
        mode="hero"
        onCurrencyChange={onCurrencyChange}
        onNewTrip={vi.fn()}
        onOpenSettings={vi.fn()}
        onPlanTrip={vi.fn()}
      />,
    );

    const currency = screen.getByRole('combobox', { name: 'Currency' });
    currency.focus();
    fireEvent.keyDown(currency, { key: 'ArrowDown' });
    expect(currency).toHaveAttribute('aria-expanded', 'true');
    expect(currency).toHaveAttribute(
      'aria-activedescendant',
      expect.stringContaining('currency-option-usd'),
    );
    fireEvent.keyDown(currency, { key: 'ArrowDown' });
    fireEvent.keyDown(currency, { key: 'Enter' });
    expect(onCurrencyChange).toHaveBeenCalledWith('EUR');
    expect(currency).toHaveFocus();

    fireEvent.click(currency);
    fireEvent.keyDown(currency, { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: 'Currency' }))
      .not.toBeInTheDocument();
    expect(currency).toHaveFocus();
  });
});
