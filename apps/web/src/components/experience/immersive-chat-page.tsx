'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  BedDouble,
  Home,
  Menu,
  PlaneTakeoff,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PublicAssistantRuntime } from '../../lib/assistant-config';
import {
  clearExperiencePrompt,
  readExperiencePrompt,
  takeExperienceCurrency,
} from '../../lib/experience-prompt';
import { siteConfig } from '../../lib/site-config';
import { useTravelDefaults } from '../../hooks/use-travel-defaults';
import { TravelComposer } from '../travel-composer';
import { TravelConversation } from '../travel-conversation';
import { WayfareMark } from '../wayfare-mark';
import styles from './immersive-chat-page.module.css';

interface ImmersiveChatPageProps {
  readonly runtime: PublicAssistantRuntime;
}

const startingIntents = [
  {
    label: 'Find a flight',
    icon: PlaneTakeoff,
    prompt: siteConfig.prompts[0],
    support: 'Compare current schedules and fares.',
  },
  {
    label: 'Compare stays',
    icon: BedDouble,
    prompt: siteConfig.prompts[1],
    support: 'Explore available stay previews.',
  },
  {
    label: 'Review rewards',
    icon: BadgeCheck,
    prompt: siteConfig.prompts[2],
    support: 'See how rewards complement the trip.',
  },
  {
    label: 'Compare protection',
    icon: ShieldCheck,
    prompt: siteConfig.prompts[3],
    support: 'Compare illustrative protection concepts.',
  },
] as const;

export function ImmersiveChatPage({
  runtime,
}: Readonly<ImmersiveChatPageProps>) {
  const [hydrated, setHydrated] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [promptRequest, setPromptRequest] = useState<{
    readonly id: number;
    readonly prompt: string;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const defaults = useTravelDefaults();

  useEffect(() => {
    const selectedCurrency = takeExperienceCurrency(window.sessionStorage);
    if (selectedCurrency) defaults.setCurrency(selectedCurrency);
    setInitialPrompt(readExperiencePrompt(window.sessionStorage));
    setHydrated(true);
  }, [defaults.setCurrency]);

  function start(prompt: string) {
    if (runtime.status !== 'ready') return;
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) return;
    setMenuOpen(false);
    if (initialPrompt) {
      setPromptRequest((current) => ({
        id: (current?.id ?? 0) + 1,
        prompt: normalizedPrompt,
      }));
      return;
    }
    setInitialPrompt(normalizedPrompt);
  }

  function reset() {
    clearExperiencePrompt(window.sessionStorage);
    setInitialPrompt(null);
    setPromptRequest(null);
    setMenuOpen(false);
    queueMicrotask(() => inputRef.current?.focus());
  }

  return (
    <div
      className={styles.page}
      data-layout="custom-chat"
      data-testid="immersive-chat-page"
    >
      <a className="skip-link" href="#immersive-chat-main">Skip to content</a>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/experience">
          <WayfareMark />
          <span>Wayfare</span>
        </Link>
        <nav
          aria-label="Trip navigation"
          className={menuOpen ? styles.navigationOpen : undefined}
          id="immersive-chat-navigation"
        >
          <Link href="/experience" onClick={() => setMenuOpen(false)}>
            <Home aria-hidden="true" />Home
          </Link>
          <button onClick={reset} type="button"><PlaneTakeoff aria-hidden="true" />Trips</button>
          <button onClick={() => start(siteConfig.prompts[2])} type="button">
            <BadgeCheck aria-hidden="true" />Rewards
          </button>
          <Link href={siteConfig.website.supportPath} onClick={() => setMenuOpen(false)}>
            Support
          </Link>
        </nav>
        <button
          aria-controls="immersive-chat-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className={styles.menu}
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <Menu aria-hidden="true" />
        </button>
      </header>

      <div aria-hidden="true" className={styles.destinationBanner} />

      <main className={styles.main} id="immersive-chat-main" tabIndex={-1}>
        {!hydrated ? (
          <section aria-busy="true" className={styles.pageLoading}>
            <span aria-hidden="true" />
            <p aria-live="polite" role="status">Preparing your travel workspace</p>
          </section>
        ) : runtime.status === 'setup-required' ? (
          <section className={styles.setupState} role="alert">
            <h1>Assistant setup required</h1>
            <p>{runtime.message}</p>
            <Link href="/experience">Return to Explore</Link>
          </section>
        ) : initialPrompt ? (
          <TravelConversation
            appearance="immersive"
            className={styles.conversation}
            defaults={defaults}
            initialPrompt={initialPrompt}
            onInitialPromptAccepted={() => {
              clearExperiencePrompt(window.sessionStorage);
            }}
            onNewTrip={reset}
            promptRequest={promptRequest}
            runtime={runtime}
          />
        ) : (
          <section className={styles.emptyState}>
            <p>Wayfare travel assistant</p>
            <h1>Where should we take you?</h1>
            <p>Start with a flight, stay, rewards review, or illustrative travel protection.</p>
            <div className={styles.emptyComposer}>
              <TravelComposer
                formLabel="Start a trip"
                inputRef={inputRef}
                onSubmit={start}
                placeholder="Ask Wayfare to plan your trip…"
                submitLabel="Start trip"
                variant="conversation"
              />
            </div>
            <ul aria-label="Suggested trip starting points" className={styles.intents}>
              {startingIntents.map(({ icon: Icon, label, prompt, support }) => (
                <li key={label}>
                  <button
                    aria-label={label}
                    onClick={() => start(prompt)}
                    type="button"
                  >
                    <Icon aria-hidden="true" />
                    <span><strong>{label}</strong><small>{support}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
