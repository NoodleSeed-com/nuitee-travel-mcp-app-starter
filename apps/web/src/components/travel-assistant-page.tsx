'use client';

import { useRef, useState } from 'react';
import type { PublicAssistantRuntime } from '../lib/assistant-config';
import { EMPTY_TRIP, type TripProjection } from '../lib/trip-projection';
import { SettingsSheet } from './settings-sheet';
import { TravelConversation } from './travel-conversation';
import { TravelHeader } from './travel-header';
import { TravelZeroState } from './travel-zero-state';
import { TripBrief } from './trip-brief';

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
  const heroInputRef = useRef<HTMLTextAreaElement>(null);

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
      {mode === 'zero' || !initialPrompt || runtime.status !== 'ready' ? (
        <div className="travel-workspace">
          <a className="skip-link" href="#travel-canvas">
            Skip to content
          </a>
          <TravelHeader
            mode="hero"
            onNewTrip={reset}
            onOpenSettings={() => setSettingsOpen(true)}
          />
          <main id="travel-canvas" tabIndex={-1}>
            <TravelZeroState
              inputRef={heroInputRef}
              launchError={launchError}
              onStart={startConversation}
            />
          </main>
        </div>
      ) : (
        <div className="travel-workspace" inert={settingsOpen || undefined}>
          <a className="skip-link" href="#travel-canvas">
            Skip to content
          </a>
          <TravelHeader
            mode="conversation"
            onNewTrip={reset}
            onOpenSettings={() => setSettingsOpen(true)}
          />
          <main className="conversation-workspace" id="travel-canvas" tabIndex={-1}>
            <TravelConversation
              initialPrompt={initialPrompt}
              onProjectionChange={setProjection}
              onReset={reset}
              runtime={runtime}
            />
            <TripBrief projection={projection} />
          </main>
        </div>
      )}
      <SettingsSheet
        open={settingsOpen}
        onClearConversation={reset}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
