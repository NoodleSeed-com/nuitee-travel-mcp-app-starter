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
import { CheckIcon } from '@heroicons/react/20/solid';
import { Bars3Icon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useEffect, useId, useRef, useState } from 'react';
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

const CURRENCY_COUNTRIES = {
  AED: 'United Arab Emirates',
  AUD: 'Australia',
  CAD: 'Canada',
  EUR: 'European Union',
  GBP: 'United Kingdom',
  INR: 'India',
  JPY: 'Japan',
  PKR: 'Pakistan',
  QAR: 'Qatar',
  SAR: 'Saudi Arabia',
  SGD: 'Singapore',
  TRY: 'T\u00fcrkiye',
  USD: 'United States',
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
  const selectedCurrencyIndex = SUPPORTED_CURRENCIES.indexOf(currency);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [activeCurrencyIndex, setActiveCurrencyIndex] = useState(
    selectedCurrencyIndex,
  );
  const currencyControlRef = useRef<HTMLDivElement>(null);
  const currencyTriggerRef = useRef<HTMLButtonElement>(null);
  const currencyListboxId = `currency-listbox-${useId().replaceAll(':', '')}`;
  const selectedCurrencyDescriptionId = `${currencyListboxId}-description`;
  const CurrencyFlag = CURRENCY_FLAGS[currency];

  useEffect(() => {
    setActiveCurrencyIndex(selectedCurrencyIndex);
  }, [selectedCurrencyIndex]);

  useEffect(() => {
    if (!currencyOpen) return undefined;

    const dismissOnOutsidePointer = (event: PointerEvent) => {
      if (!currencyControlRef.current?.contains(event.target as Node)) {
        setCurrencyOpen(false);
      }
    };
    document.addEventListener('pointerdown', dismissOnOutsidePointer);
    return () => {
      document.removeEventListener('pointerdown', dismissOnOutsidePointer);
    };
  }, [currencyOpen]);

  const currencyOptionId = (supportedCurrency: SupportedCurrency) => (
    `${currencyListboxId}-currency-option-${supportedCurrency.toLowerCase()}`
  );

  const openCurrencyMenu = () => {
    setMenuOpen(false);
    setActiveCurrencyIndex(selectedCurrencyIndex);
    setCurrencyOpen(true);
  };

  const closeCurrencyMenu = (restoreFocus = false) => {
    setCurrencyOpen(false);
    if (restoreFocus) currencyTriggerRef.current?.focus();
  };

  const selectCurrency = (nextCurrency: SupportedCurrency) => {
    onCurrencyChange(nextCurrency);
    closeCurrencyMenu(true);
  };

  const handleCurrencyKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!currencyOpen) {
        openCurrencyMenu();
        return;
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveCurrencyIndex((currentIndex) => (
        (currentIndex + direction + SUPPORTED_CURRENCIES.length)
        % SUPPORTED_CURRENCIES.length
      ));
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (!currencyOpen) openCurrencyMenu();
      setActiveCurrencyIndex(
        event.key === 'Home' ? 0 : SUPPORTED_CURRENCIES.length - 1,
      );
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!currencyOpen) {
        openCurrencyMenu();
        return;
      }
      selectCurrency(SUPPORTED_CURRENCIES[activeCurrencyIndex]);
      return;
    }

    if (event.key === 'Escape' && currencyOpen) {
      event.preventDefault();
      closeCurrencyMenu(true);
    }
  };

  return (
    <header className={`travel-header travel-header--${mode}`}>
      <a className="travel-wordmark" href="/">
        <span aria-hidden="true" className="travel-wordmark__mark">
          <WayfareMark />
        </span>
        <span>{siteConfig.brand.name}</span>
      </a>
      <div
        className="travel-header__currency-control"
        ref={currencyControlRef}
      >
        <button
          aria-activedescendant={currencyOpen
            ? currencyOptionId(SUPPORTED_CURRENCIES[activeCurrencyIndex])
            : undefined}
          aria-controls={currencyListboxId}
          aria-describedby={selectedCurrencyDescriptionId}
          aria-expanded={currencyOpen}
          aria-haspopup="listbox"
          aria-label="Currency"
          className="travel-header__currency"
          data-value={currency}
          onClick={() => {
            if (currencyOpen) {
              closeCurrencyMenu();
            } else {
              openCurrencyMenu();
            }
          }}
          onKeyDown={handleCurrencyKeyDown}
          ref={currencyTriggerRef}
          role="combobox"
          type="button"
        >
          <span
            aria-hidden="true"
            className="travel-header__currency-flag"
            data-currency-flag={CURRENCY_FLAG_COUNTRIES[currency]}
          >
            <CurrencyFlag />
          </span>
          <span className="travel-header__currency-code">{currency}</span>
          <ChevronDownIcon
            aria-hidden="true"
            className="travel-header__currency-chevron"
            strokeWidth={2}
          />
        </button>
        <span
          className="travel-visually-hidden"
          id={selectedCurrencyDescriptionId}
        >
          {CURRENCY_COUNTRIES[currency]}
        </span>
        {currencyOpen ? (
          <ul
            aria-label="Currency"
            className="travel-header__currency-menu"
            id={currencyListboxId}
            role="listbox"
          >
            {SUPPORTED_CURRENCIES.map((supportedCurrency, index) => {
              const OptionFlag = CURRENCY_FLAGS[supportedCurrency];
              const selected = supportedCurrency === currency;
              return (
                <li
                  aria-label={`${supportedCurrency} ${CURRENCY_COUNTRIES[supportedCurrency]}`}
                  aria-selected={selected}
                  className="travel-header__currency-option"
                  data-active={index === activeCurrencyIndex}
                  id={currencyOptionId(supportedCurrency)}
                  key={supportedCurrency}
                  onClick={() => selectCurrency(supportedCurrency)}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveCurrencyIndex(index)}
                  role="option"
                >
                  <span
                    aria-hidden="true"
                    className="travel-header__currency-option-flag"
                    data-currency-option-flag={CURRENCY_FLAG_COUNTRIES[supportedCurrency]}
                  >
                    <OptionFlag />
                  </span>
                  <span className="travel-header__currency-option-code">
                    {supportedCurrency}
                  </span>
                  <span className="travel-header__currency-option-country">
                    {CURRENCY_COUNTRIES[supportedCurrency]}
                  </span>
                  {selected ? (
                    <CheckIcon
                      aria-hidden="true"
                      className="travel-header__currency-option-check"
                      data-selected-check="true"
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <button
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        aria-label="Open menu"
        className="travel-header__menu"
        onClick={() => {
          setCurrencyOpen(false);
          setMenuOpen(true);
        }}
        type="button"
      >
        <Bars3Icon aria-hidden="true" />
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
