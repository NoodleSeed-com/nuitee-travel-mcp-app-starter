'use client';

import { NoodleAppView } from '@noodleseed/assistant/react';
import type {
  AssistantClient,
  AssistantViewData,
} from '@noodleseed/assistant/client';
import { isInlineTravelView } from '../lib/travel-view-policy';
import { useEffect, useRef } from 'react';

// The SDK currently exposes only its mount as a CSS part. Keep this small
// compatibility override inside its open shadow root; ordinary page CSS cannot
// reach the host card. The iframe and its accessible title remain intact.
const inlineAppStyles = `
  .noodle-app-card:not([data-fullscreen]) {
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    margin: 0;
    padding: 0;
    gap: 0;
  }
  .noodle-app-card:not([data-fullscreen]) > .noodle-app-title {
    display: none;
  }
`;

interface TravelViewRegistryProps {
  readonly client: AssistantClient;
  readonly view: AssistantViewData;
}

export function TravelViewRegistry({
  client,
  view,
}: Readonly<TravelViewRegistryProps>) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const inline = isInlineTravelView(view);

  useEffect(() => {
    if (!inline) return;
    let disposed = false;
    let style: HTMLStyleElement | undefined;
    void customElements.whenDefined('noodle-app-view').then(() => {
      if (disposed) return;
      const root = surfaceRef.current?.querySelector('noodle-app-view')?.shadowRoot;
      if (!root) return;
      style = document.createElement('style');
      style.dataset.wayfareInline = '';
      style.textContent = inlineAppStyles;
      root.append(style);
    });
    return () => {
      disposed = true;
      style?.remove();
    };
  }, [inline]);

  if (!inline) {
    return <p role="status">This travel view is unavailable.</p>;
  }

  return (
    <div ref={surfaceRef} className="travel-app-surface" data-testid="travel-app-surface">
      <NoodleAppView client={client} theme="light" view={view} />
    </div>
  );
}
