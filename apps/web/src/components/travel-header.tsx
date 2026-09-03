'use client';

import {
  AE,
  AU,
  CA,
  EU,
  GB,
  IN,
  JP,
  PK,
  QA,
  SA,
  SG,
  TR,
  US,
} from 'country-flag-icons/react/3x2';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { siteConfig } from '../lib/site-config';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../lib/travel-defaults';
import { TravelNavigationDialog } from './travel-navigation-dialog';
import { WayfareMark } from './wayfare-mark';

const CURRENCY_FLAGS = {
  AED: AE,
  AUD: AU,
  CAD: CA,
  EUR: EU,
  GBP: GB,
  INR: IN,
  JPY: JP,
  PKR: PK,
  QAR: QA,
  SAR: SA,
  SGD: SG,
  TRY: TR,
  USD: US,
} satisfies Record<SupportedCurrency, typeof US>;

const CURRENCY_FLAG_COUNTRIES = {
  AED: 'AE',
  AUD: 'AU',
  CAD: 'CA',
  EUR: 'EU',
  GBP: 'GB',
  INR: 'IN',
  JPY: 'JP',
  PKR: 'PK',
  QAR: 'QA',
  SAR: 'SA',
  SGD: 'SG',
  TRY: 'TR',
  USD: 'US',
} as const satisfies Record<SupportedCurrency, string>;

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
  const CurrencyFlag = CURRENCY_FLAGS[currency];
  const directAction = mode === 'hero'
    ? { label: 'Plan a trip', onClick: onPlanTrip }
    : { label: 'New trip', onClick: onNewTrip };

  return (
    <header className={`travel-header travel-header--${mode}`}>
      <a className="travel-wordmark" href="/">
        <span aria-hidden="true" className="travel-wordmark__mark">
          <WayfareMark />
        </span>
        <span>{siteConfig.brand.name}</span>
      </a>
      <nav aria-label="Primary navigation" className="travel-header__actions">
        <button type="button" onClick={directAction.onClick}>{directAction.label}</button>
        <a href={siteConfig.website.developerPath}>For developers</a>
      </nav>
      <div className="travel-header__currency-control">
        <span
          aria-hidden="true"
          className="travel-header__currency-flag"
          data-currency-flag={CURRENCY_FLAG_COUNTRIES[currency]}
        >
          <CurrencyFlag />
        </span>
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
        <ChevronDown
          aria-hidden="true"
          className="travel-header__currency-chevron"
          strokeWidth={2}
        />
      </div>
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
