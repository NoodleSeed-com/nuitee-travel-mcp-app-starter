'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { starterConfig } from '../../../../starter.config';

interface SettingsSheetProps {
  readonly open: boolean;
  readonly onClearConversation: () => void;
  readonly onClose: () => void;
}

export function SettingsSheet({
  open,
  onClearConversation,
  onClose,
}: Readonly<SettingsSheetProps>) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    closeRef.current?.focus();
    return () => {
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      aria-labelledby="settings-title"
      className="settings-sheet"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          return;
        }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
          ),
        );
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      ref={dialogRef}
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
        {starterConfig.website.termsUrl ? (
          <a href={starterConfig.website.termsUrl}>Terms</a>
        ) : (
          <span className="settings-sheet__unconfigured">
            <span>Terms</span>
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
    </dialog>
  );
}
