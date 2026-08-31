'use client';

import { useRef, useState } from 'react';
import type { PublicAssistantRuntime } from '../lib/assistant-config';
import { useTravelDefaults } from '../hooks/use-travel-defaults';
import { SettingsSheet } from './settings-sheet';
import { TravelConversation } from './travel-conversation';
import { TravelFooter } from './travel-footer';
import { TravelHeader } from './travel-header';
import { TravelZeroState } from './travel-zero-state';

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const heroInputRef = useRef<HTMLTextAreaElement>(null);
  const { setCurrency, ...defaults } = useTravelDefaults();

  function reset() {
    setMode('zero');
    setInitialPrompt(null);
    setLaunchError(null);
  }

  function focusPlanTrip() {
    heroInputRef.current?.focus();
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
            currency={defaults.currency}
            mode="hero"
            onCurrencyChange={setCurrency}
            onNewTrip={reset}
            onOpenSettings={() => setSettingsOpen(true)}
            onPlanTrip={focusPlanTrip}
          />
          <main id="travel-canvas" tabIndex={-1}>
            <TravelZeroState
              defaults={defaults}
              inputRef={heroInputRef}
              launchError={launchError}
              onStart={startConversation}
            />
          </main>
          <TravelFooter />
        </div>
      ) : (
        <div className="travel-workspace" inert={settingsOpen || undefined}>
          <a className="skip-link" href="#travel-canvas">
            Skip to content
          </a>
          <TravelHeader
            currency={defaults.currency}
            mode="conversation"
            onCurrencyChange={setCurrency}
            onNewTrip={reset}
            onOpenSettings={() => setSettingsOpen(true)}
            onPlanTrip={reset}
          />
          <main className="conversation-workspace" id="travel-canvas" tabIndex={-1}>
            <TravelConversation initialPrompt={initialPrompt} runtime={runtime} />
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
