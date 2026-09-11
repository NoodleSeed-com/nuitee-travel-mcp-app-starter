'use client';

import { useEffect, useRef, useState } from 'react';
import { BusinessBrandContext } from './business-brand';
import type { BusinessBrand } from '../lib/business-brand';
import type { PublicAssistantRuntime } from '../lib/assistant-config';
import { useTravelDefaults } from '../hooks/use-travel-defaults';
import { SettingsSheet } from './settings-sheet';
import { TravelConversation } from './travel-conversation';
import { TravelFooter } from './travel-footer';
import { TravelHeader } from './travel-header';
import { TravelZeroState } from './travel-zero-state';

type PageMode = 'zero' | 'starting';

interface TravelAssistantPageProps {
  readonly brand?: BusinessBrand;
  readonly businessMode?: boolean;
  readonly initialCountry?: string;
  readonly runtime: PublicAssistantRuntime;
}

export function TravelAssistantPage({
  initialCountry,
  runtime,
  brand,
  businessMode = false,
}: Readonly<TravelAssistantPageProps>) {
  const [mode, setMode] = useState<PageMode>('zero');
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const heroInputRef = useRef<HTMLTextAreaElement>(null);
  const { setCurrency, ...defaults } = useTravelDefaults({
    country: initialCountry,
    businessCurrency: brand?.currency,
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (brand) document.title = `${brand.name} — Travel planning`;
  }, [brand]);

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
    <BusinessBrandContext value={brand}>
      {mode === 'zero' || !initialPrompt || runtime.status !== 'ready' ? (
        <div
          className="travel-workspace"
          data-business-brand={brand ? 'true' : undefined}
          data-app-ready={hydrated ? 'true' : undefined}
        >
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
              disabled={businessMode && runtime.status !== 'ready'}
              launchError={launchError || (businessMode && runtime.status !== 'ready' ? runtime.message : null)}
              onStart={startConversation}
            />
          </main>
          <TravelFooter />
        </div>
      ) : (
        <div
          className="travel-workspace"
          data-business-brand={brand ? 'true' : undefined}
          data-app-ready={hydrated ? 'true' : undefined}
          inert={settingsOpen || undefined}
        >
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
            <TravelConversation
              defaults={defaults}
              initialPrompt={initialPrompt}
              runtime={runtime}
            />
          </main>
        </div>
      )}
      <SettingsSheet
        open={settingsOpen}
        onClearConversation={reset}
        onClose={() => setSettingsOpen(false)}
      />
    </BusinessBrandContext>
  );
}
