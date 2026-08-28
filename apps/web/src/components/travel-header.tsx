import { starterConfig } from '../../../../starter.config';

interface TravelHeaderProps {
  readonly mode: 'hero' | 'conversation';
  readonly onNewTrip: () => void;
  readonly onOpenSettings: () => void;
}

export function TravelHeader({
  mode,
  onNewTrip,
  onOpenSettings,
}: Readonly<TravelHeaderProps>) {
  return (
    <header className={`travel-header travel-header--${mode}`}>
      <a className="travel-wordmark" href="/">
        <span aria-hidden="true" className="travel-wordmark__mark">
          {starterConfig.brand.mark}
        </span>
        <span>{starterConfig.brand.name}</span>
      </a>
      <nav aria-label="Primary navigation">
        {mode === 'conversation' ? (
          <button type="button" onClick={onNewTrip}>New trip</button>
        ) : null}
        <a href={starterConfig.website.developerPath}>For developers</a>
        <button type="button" onClick={onOpenSettings}>Settings</button>
      </nav>
      {mode === 'conversation' ? (
        <span className="guest-session">Guest trip</span>
      ) : null}
    </header>
  );
}
