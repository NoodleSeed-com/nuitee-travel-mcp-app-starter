'use client';

import { starterConfig } from '../../../../starter.config';
import { RouteAssistantMark } from './route-assistant-mark';
import { TravelComposer } from './travel-composer';

interface TravelZeroStateProps {
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

export function TravelZeroState({
  launchError = null,
  onStart,
}: Readonly<TravelZeroStateProps>) {
  return (
    <section
      className="travel-canvas"
      aria-labelledby="travel-home-title"
      id="travel-canvas"
      tabIndex={-1}
    >
      <div className="travel-zero-state">
        <RouteAssistantMark />
        <p className="assistant-identity">
          {starterConfig.brand.assistantName}
        </p>
        <h1 id="travel-home-title">Where would you like to go?</h1>
        <p className="travel-zero-state__description">
          Search, compare, select, and verify flights through conversation.
        </p>
        <TravelComposer onSubmit={onStart} />
        <ul className="starter-prompts" aria-label="Suggested trips">
          {starterConfig.prompts.map((prompt) => (
            <li key={prompt}>
              <button type="button" onClick={() => onStart(prompt)}>
                {prompt}
              </button>
            </li>
          ))}
        </ul>
        {launchError ? (
          <p className="travel-zero-state__error" role="alert">
            {launchError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
