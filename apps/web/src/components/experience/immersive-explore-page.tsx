'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BedDouble,
  Compass,
  Hotel,
  Menu,
  PlaneTakeoff,
  ShieldCheck,
} from 'lucide-react';
import { type KeyboardEvent, useRef, useState } from 'react';
import type { PublicAssistantRuntime } from '../../lib/assistant-config';
import {
  saveExperienceCurrency,
  saveExperiencePrompt,
} from '../../lib/experience-prompt';
import { landingDestinations } from '../../lib/landing-content';
import { siteConfig } from '../../lib/site-config';
import {
  coreHeroModes,
  type CoreHeroMode,
} from '../../lib/travel-hero-content';
import { useTravelDefaults } from '../../hooks/use-travel-defaults';
import { TravelComposer } from '../travel-composer';
import { WayfareMark } from '../wayfare-mark';
import styles from './immersive-explore-page.module.css';

interface ImmersiveExplorePageProps {
  readonly runtime: PublicAssistantRuntime;
}

const modeIcons = {
  explore: Compass,
  flight: PlaneTakeoff,
  stay: Hotel,
  'flight-stay': BedDouble,
  insurance: ShieldCheck,
} as const;

function focusAdjacentTab(
  event: KeyboardEvent<HTMLButtonElement>,
  direction: -1 | 1,
) {
  const tabs = Array.from(
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    ) ?? [],
  );
  const currentIndex = tabs.indexOf(event.currentTarget);
  tabs.at((currentIndex + direction + tabs.length) % tabs.length)?.focus();
}

export function ImmersiveExplorePage({
  runtime,
}: Readonly<ImmersiveExplorePageProps>) {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<CoreHeroMode>('explore');
  const [loadedImages, setLoadedImages] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const defaults = useTravelDefaults();
  const { currency, setCurrency } = defaults;
  const activeMode = coreHeroModes.find((candidate) => candidate.id === mode)
    ?? coreHeroModes[0];
  const activeScene = activeMode.scenes[0];
  const imageState = failedImages.has(activeScene.imageSrc)
    ? 'error'
    : loadedImages.has(activeScene.imageSrc) ? 'loaded' : 'loading';
  const placeholder = mode === 'explore'
    ? `${defaults.origin?.city ?? 'Your departure'} ${activeScene.placeholder}`
    : activeScene.placeholder;

  function start(prompt: string) {
    if (runtime.status === 'setup-required') {
      setLaunchError(runtime.message);
      return;
    }
    if (!saveExperiencePrompt(window.sessionStorage, prompt)) return;
    saveExperienceCurrency(window.sessionStorage, currency);
    setLaunchError(null);
    router.push('/experience/chat');
  }

  return (
    <div
      className={styles.page}
      data-layout="full-bleed"
      data-testid="immersive-explore-page"
    >
      <a className="skip-link" href="#immersive-explore-main">Skip to content</a>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/experience">
          <WayfareMark />
          <span>{siteConfig.brand.name}</span>
        </Link>
        <nav
          aria-label="Alternative experience navigation"
          className={`${styles.navigation} ${menuOpen ? styles.navigationOpen : ''}`}
          id="immersive-explore-navigation"
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              inputRef.current?.focus();
            }}
            type="button"
          >
            Plan a trip
          </button>
          <Link href={siteConfig.website.developerPath} onClick={() => setMenuOpen(false)}>
            For developers
          </Link>
          <label className={styles.mobileCurrency}>
            <span>Currency</span>
            <select
              onChange={(event) => setCurrency(event.currentTarget.value as typeof currency)}
              value={currency}
            >
              {['USD', 'CAD', 'GBP', 'EUR'].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </nav>
        <select
          aria-label="Currency"
          className={styles.currency}
          onChange={(event) => setCurrency(event.currentTarget.value as typeof currency)}
          value={currency}
        >
          {['USD', 'CAD', 'GBP', 'EUR'].map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <button
          aria-controls="immersive-explore-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className={styles.menu}
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <Menu aria-hidden="true" />
        </button>
      </header>

      <main className={styles.main} id="immersive-explore-main" tabIndex={-1}>
        <section
          aria-labelledby="immersive-explore-title"
          className={styles.hero}
          data-image-state={imageState}
          data-mode={mode}
        >
          <Image
            alt=""
            className={styles.background}
            fill
            key={activeScene.imageSrc}
            onError={() => {
              setFailedImages((current) => new Set(current).add(activeScene.imageSrc));
            }}
            onLoad={() => {
              setLoadedImages((current) => new Set(current).add(activeScene.imageSrc));
            }}
            priority
            sizes="100vw"
            src={activeScene.imageSrc}
            style={{ objectPosition: activeScene.imagePosition }}
          />
          <span aria-hidden="true" className={styles.imageSkeleton} />
          <span aria-hidden="true" className={styles.veil} />

          <div
            aria-label="Choose a planning view"
            className={styles.modes}
            role="tablist"
          >
            {coreHeroModes.map((candidate) => {
              const Icon = modeIcons[candidate.id];
              const selected = candidate.id === mode;
              return (
                <button
                  aria-controls="immersive-explore-panel"
                  aria-selected={selected}
                  id={`immersive-explore-tab-${candidate.id}`}
                  key={candidate.id}
                  onClick={() => setMode(candidate.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft') {
                      event.preventDefault();
                      focusAdjacentTab(event, -1);
                    }
                    if (event.key === 'ArrowRight') {
                      event.preventDefault();
                      focusAdjacentTab(event, 1);
                    }
                  }}
                  role="tab"
                  tabIndex={selected ? 0 : -1}
                  type="button"
                >
                  <Icon aria-hidden="true" />
                  <span>{candidate.label}</span>
                </button>
              );
            })}
          </div>

          <div
            aria-labelledby={`immersive-explore-tab-${mode}`}
            className={styles.panel}
            id="immersive-explore-panel"
            role="tabpanel"
          >
            <div className={styles.heroCopy}>
              <p>{activeScene.eyebrow}</p>
              <h1 id="immersive-explore-title">{activeScene.heading}</h1>
              <p>{activeScene.support}</p>
            </div>

            <div className={styles.composer}>
              <TravelComposer
                formLabel={`Plan with ${activeMode.label}`}
                inputId="immersive-trip-prompt"
                inputRef={inputRef}
                onSubmit={start}
                placeholder={placeholder}
                submitLabel={`Submit ${activeMode.label} request`}
                variant="hero"
                visibleSubmitLabel="Plan a trip"
              />
            </div>

            <p className={styles.detail}>{activeScene.detail}</p>
          </div>

          {launchError ? (
            <p className={styles.error} role="alert">{launchError}</p>
          ) : null}
        </section>

        {mode === 'explore' ? (
          <section aria-label="Places to explore" className={styles.destinationTray}>
            {landingDestinations.slice(0, 3).map((destination) => (
              <button
                data-testid="immersive-destination-preview"
                key={destination.id}
                onClick={() => start(destination.prompt)}
                type="button"
              >
                <Image
                  alt=""
                  fill
                  sizes="(max-width: 767px) 78vw, 31vw"
                  src={destination.imageSrc}
                  style={{ objectPosition: destination.imagePosition }}
                />
                <span aria-hidden="true" className={styles.destinationScrim} />
                <span><strong>{destination.name}</strong>{destination.descriptor}</span>
              </button>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
