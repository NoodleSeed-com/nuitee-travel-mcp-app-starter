'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef } from 'react';
import { siteConfig } from '../lib/site-config';

interface TravelNavigationDialogProps {
  readonly mode: 'hero' | 'conversation';
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onNewTrip: () => void;
  readonly onOpenSettings: () => void;
  readonly onPlanTrip: () => void;
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
].join(', ');

export function TravelNavigationDialog({
  mode,
  open,
  onClose,
  onNewTrip,
  onOpenSettings,
  onPlanTrip,
}: Readonly<TravelNavigationDialogProps>) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef(true);

  function closeNativeDialog() {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function dismiss(callback?: () => void) {
    if (callback) restoreFocusRef.current = false;
    closeNativeDialog();
    onClose();
    callback?.();
  }

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    restoreFocusRef.current = true;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    closeRef.current?.focus();

    return () => {
      closeNativeDialog();
      if (restoreFocusRef.current) previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  const primaryAction = mode === 'hero'
    ? { label: 'Plan a trip', onClick: onPlanTrip }
    : { label: 'New trip', onClick: onNewTrip };

  return (
    <dialog
      aria-labelledby="travel-menu-title"
      className="travel-navigation-dialog"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          dismiss();
          return;
        }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
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
      <header className="travel-navigation-dialog__header">
        <h2 id="travel-menu-title">Travel menu</h2>
        <button
          aria-label="Close menu"
          className="travel-navigation-dialog__close"
          onClick={() => dismiss()}
          ref={closeRef}
          type="button"
        >
          <XMarkIcon aria-hidden="true" />
        </button>
      </header>
      <nav aria-label="Travel menu links" className="travel-navigation-dialog__links">
        <button
          className="travel-navigation-dialog__primary"
          onClick={() => dismiss(primaryAction.onClick)}
          type="button"
        >
          {primaryAction.label}
        </button>
        <div className="travel-navigation-dialog__menu-list">
          <a href={siteConfig.website.developerPath}>For developers</a>
          <button onClick={() => dismiss(onOpenSettings)} type="button">Settings</button>
          <a href={siteConfig.website.supportPath}>Support</a>
        </div>
      </nav>
      <div
        aria-label="Legal availability"
        className="travel-navigation-dialog__legal"
        role="group"
      >
        <span className="travel-navigation-dialog__legal-label">Legal</span>
        {siteConfig.website.privacyUrl ? (
          <a href={siteConfig.website.privacyUrl}>Privacy</a>
        ) : (
          <span className="travel-navigation-dialog__unconfigured">
            <span>Privacy</span>
            <small>Not configured</small>
          </span>
        )}
        {siteConfig.website.termsUrl ? (
          <a href={siteConfig.website.termsUrl}>Terms</a>
        ) : (
          <span className="travel-navigation-dialog__unconfigured">
            <span>Terms</span>
            <small>Not configured</small>
          </span>
        )}
      </div>
    </dialog>
  );
}
