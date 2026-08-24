import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@noodleseed/assistant/react', () => ({
  NoodleAssistant: ({ sessionEndpoint, theme }: { sessionEndpoint: string; theme: string }) => (
    <div data-testid="noodle-assistant" data-endpoint={sessionEndpoint} data-theme={theme} />
  ),
}));

import { TravelSite, type HostViewState } from '../src/App.tsx';
import AssistantMount from '../src/AssistantMount.tsx';

function render(state: HostViewState) {
  return renderToStaticMarkup(
    <TravelSite
      state={state}
      onEnterDemo={() => undefined}
      onRetry={() => undefined}
      assistant={state.status === 'ready' ? <AssistantMount onError={() => undefined} /> : undefined}
    />,
  );
}

describe('Cedar & Cloud embedded assistant host', () => {
  it('mounts the supported Noodle Assistant after demo sign-in', () => {
    const html = render({ status: 'ready' });
    expect(html).toContain('data-testid="noodle-assistant"');
    expect(html).toContain('data-endpoint="/api/assistant/session"');
    expect(html).toContain('data-theme="auto"');
  });

  it.each([
    [{ status: 'loading' } as HostViewState, 'role="status"', 'Preparing your travel experience'],
    [{ status: 'signed_out', demoAvailable: true } as HostViewState, '<button', 'Enter demo'],
    [{ status: 'setup_required' } as HostViewState, 'role="status"', 'Assistant setup required'],
    [{ status: 'error', message: 'Unable to load the demo.' } as HostViewState, 'role="alert"', 'Unable to load the demo.'],
  ])('renders an accessible %s state', (state, roleMarkup, copy) => {
    const html = render(state);
    expect(html).toContain(roleMarkup);
    expect(html).toContain(copy);
  });

  it('states the sandbox and no-booking boundary', () => {
    const html = render({ status: 'signed_out', demoAvailable: true });
    expect(html).toContain('sandbox');
    expect(html).toContain('cannot complete bookings');
  });

  it('declares the 280px, overflow, focus, and reduced-motion layout safeguards', async () => {
    const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
    expect(css).toContain('min-width: 280px');
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
