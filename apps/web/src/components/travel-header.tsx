'use client';

import { useState } from 'react';
import { siteConfig } from '../lib/site-config';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../lib/travel-defaults';
import { TravelNavigationDialog } from './travel-navigation-dialog';
import { FlightCatchersBrand } from './flight-catchers-brand';

interface TravelHeaderProps {
  readonly currency: SupportedCurrency;
  readonly mode: 'hero' | 'conversation';
  readonly onCurrencyChange: (currency: SupportedCurrency) => void;
  readonly onNewTrip: () => void;
  readonly onOpenSettings: () => void;
  readonly onPlanTrip: () => void;
}

export function TravelHeader({
  currency,
  mode,
  onCurrencyChange,
  onNewTrip,
  onOpenSettings,
  onPlanTrip,
}: Readonly<TravelHeaderProps>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const directAction = mode === 'hero'
    ? { label: 'Plan a trip', onClick: onPlanTrip }
    : { label: 'New trip', onClick: onNewTrip };

  return (
    <header className={`travel-header travel-header--${mode}`}>
      <a className="travel-wordmark" href="/">
        <FlightCatchersBrand className="travel-wordmark__logo" priority />
      </a>
      <nav aria-label="Primary navigation" className="travel-header__actions">
        <button type="button" onClick={directAction.onClick}>{directAction.label}</button>
        <a href={siteConfig.website.developerPath}>For developers</a>
      </nav>
      <select
        aria-label="Currency"
        className="travel-header__currency"
        onChange={(event) => {
          onCurrencyChange(event.currentTarget.value as SupportedCurrency);
        }}
        value={currency}
      >
        {SUPPORTED_CURRENCIES.map((supportedCurrency) => (
          <option key={supportedCurrency} value={supportedCurrency}>
            {supportedCurrency}
          </option>
        ))}
      </select>
      <button
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        aria-label="Open menu"
        className="travel-header__menu"
        onClick={() => setMenuOpen(true)}
        type="button"
      >
        <span aria-hidden="true" className="travel-header__menu-icon" />
      </button>
      <TravelNavigationDialog
        mode={mode}
        onClose={() => setMenuOpen(false)}
        onNewTrip={onNewTrip}
        onOpenSettings={onOpenSettings}
        onPlanTrip={onPlanTrip}
        open={menuOpen}
      />
    </header>
  );
}
