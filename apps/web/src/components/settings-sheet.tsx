'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { starterConfig } from '../../../../starter.config';

type ThemeChoice = 'system' | 'light' | 'dark';

interface SettingsSheetProps {
  readonly open: boolean;
  readonly onClearConversation: () => void;
  readonly onClose: () => void;
}

const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

function themeLabel(theme: ThemeChoice) {
  return `${theme[0]?.toUpperCase()}${theme.slice(1)}`;
}

export function SettingsSheet({
  open,
  onClearConversation,
  onClose,
}: Readonly<SettingsSheetProps>) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState<ThemeChoice>('system');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previousFocus?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="settings-sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="settings-title"
        aria-modal="true"
        className="settings-sheet"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        }}
        role="dialog"
      >
        <header className="settings-sheet__header">
          <div>
            <p className="settings-sheet__eyebrow">Travel workspace</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button
            aria-label="Close settings"
            className="settings-sheet__close"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <fieldset className="theme-choice">
          <legend>Theme</legend>
          <div className="theme-choice__options">
            {THEME_CHOICES.map((choice) => (
              <label key={choice}>
                <input
                  checked={theme === choice}
                  name="theme"
                  onChange={() => setTheme(choice)}
                  type="radio"
                  value={choice}
                />
                <span>{themeLabel(choice)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <section
          className="settings-sheet__links"
          aria-labelledby="settings-help-title"
        >
          <h3 id="settings-help-title">Help &amp; privacy</h3>
          <a href={starterConfig.website.supportPath}>Support</a>
          {starterConfig.website.privacyUrl ? (
            <a href={starterConfig.website.privacyUrl}>Privacy</a>
          ) : (
            <span className="settings-sheet__unconfigured">
              <span>Privacy</span>
              <small>Not configured</small>
            </span>
          )}
        </section>

        <button
          className="settings-sheet__clear"
          onClick={() => {
            onClearConversation();
            onClose();
          }}
          type="button"
        >
          Clear conversation
        </button>
      </section>
    </div>
  );
}
