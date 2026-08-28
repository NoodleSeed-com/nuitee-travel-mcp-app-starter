'use client';

import { useState } from 'react';
import { starterConfig } from '../../../../starter.config';
import { TravelNavigationDialog } from './travel-navigation-dialog';
import { WayfareMark } from './wayfare-mark';

interface TravelHeaderProps {
  readonly mode: 'hero' | 'conversation';
  readonly onNewTrip: () => void;
  readonly onOpenSettings: () => void;
  readonly onPlanTrip: () => void;
}

export function TravelHeader({
  mode,
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
        <span aria-hidden="true" className="travel-wordmark__mark">
          <WayfareMark />
        </span>
        <span>{starterConfig.brand.name}</span>
      </a>
      <nav aria-label="Primary navigation" className="travel-header__actions">
        <button type="button" onClick={directAction.onClick}>{directAction.label}</button>
        <a href={starterConfig.website.developerPath}>For developers</a>
      </nav>
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
