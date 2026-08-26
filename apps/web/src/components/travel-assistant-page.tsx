'use client';

import { useState } from 'react';
import type { PublicAssistantRuntime } from '../lib/assistant-config';
import { EMPTY_TRIP, type TripProjection } from '../lib/trip-projection';
import { SettingsSheet } from './settings-sheet';
import { TravelZeroState } from './travel-zero-state';
import { TripContextRail } from './trip-context-rail';

type PageMode = 'zero' | 'starting';

interface TravelAssistantPageProps {
  readonly runtime: PublicAssistantRuntime;
}

export function TravelAssistantPage({
  runtime,
}: Readonly<TravelAssistantPageProps>) {
  const [mode, setMode] = useState<PageMode>('zero');
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [projection, setProjection] = useState<TripProjection>(EMPTY_TRIP);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function reset() {
    setMode('zero');
    setInitialPrompt(null);
    setLaunchError(null);
    setProjection(EMPTY_TRIP);
  }

  function startConversation(prompt: string) {
    const normalized = prompt.trim();
    if (!normalized) return;
    if (runtime.status === 'setup-required') {
      setLaunchError(runtime.message);
      return;
    }
    setLaunchError(null);
    setInitialPrompt(normalized);
    setMode('starting');
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <main className="workspace-shell" id="main-content" tabIndex={-1}>
        <TripContextRail
          projection={projection}
          onNewTrip={reset}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {mode === 'zero' ? (
          <TravelZeroState launchError={launchError} onStart={startConversation} />
        ) : (
          <section className="travel-canvas" aria-label="Starting conversation">
            <div className="travel-starting" role="status">
              <span>Starting your trip</span>
              <small>{initialPrompt}</small>
            </div>
          </section>
        )}
      </main>
      <SettingsSheet
        open={settingsOpen}
        onClearConversation={reset}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
