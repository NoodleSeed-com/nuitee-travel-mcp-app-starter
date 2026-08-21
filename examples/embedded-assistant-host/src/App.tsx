import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';

const AssistantMount = lazy(() => import('./AssistantMount.tsx'));

export type HostViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'signed_out'; readonly demoAvailable: boolean }
  | { readonly status: 'setup_required' }
  | { readonly status: 'ready' }
  | { readonly status: 'error'; readonly message: string };

interface HostStatusResponse {
  readonly authenticated: boolean;
  readonly demoAvailable: boolean;
  readonly assistant: 'ready' | 'setup_required';
}

async function loadStatus(): Promise<HostViewState> {
  const response = await fetch('/api/host/status', {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error('status_unavailable');
  const status = await response.json() as HostStatusResponse;
  if (!status.authenticated) {
    return { status: 'signed_out', demoAvailable: status.demoAvailable };
  }
  return status.assistant === 'ready' ? { status: 'ready' } : { status: 'setup_required' };
}

export function TravelSite(props: {
  readonly state: HostViewState;
  readonly onEnterDemo: () => void;
  readonly onRetry: () => void;
  readonly onAssistantError?: () => void;
  readonly assistant?: ReactNode;
}) {
  const { state } = props;
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Cedar and Cloud Travel home">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>Cedar &amp; Cloud Travel</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#flights">Flights</a>
          <a href="#travel-note">Travel note</a>
          <a href="#about">About</a>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Thoughtful journeys, conversationally planned</p>
            <h1 id="hero-title">Where would you like to go next?</h1>
            <p className="hero-intro">
              Compare current flights and verify the fare with one travel assistant—right here,
              or from your preferred MCP host.
            </p>
            <a className="primary-link" href="#flights">Search flights with our travel assistant</a>
          </div>
          <div className="route-card" aria-label="Example travel route">
            <span>Toronto</span>
            <span className="route-line" aria-hidden="true"><i /></span>
            <span>Lisbon</span>
            <strong>One integration · two surfaces</strong>
          </div>
        </section>

        <section className="assistant-entry" id="flights" aria-labelledby="assistant-title">
          <div>
            <p className="eyebrow">Flights available</p>
            <h2 id="assistant-title">Search flights with our travel assistant</h2>
            <p>Ask naturally for a one-way or round-trip search, compare options, then verify the fare.</p>
          </div>

          <div className="assistant-state">
            {state.status === 'loading' ? (
              <div className="status-card" role="status" aria-live="polite">
                <span className="status-dot" aria-hidden="true" />
                <div><strong>Preparing your travel experience</strong><p>Checking local demo access…</p></div>
              </div>
            ) : null}

            {state.status === 'signed_out' ? (
              <div className="status-card">
                <div>
                  <strong>{state.demoAvailable ? 'Try the local demonstration' : 'Sign-in integration required'}</strong>
                  <p>{state.demoAvailable
                    ? 'Enter a short-lived local demo session. This is not a production identity.'
                    : 'Connect this sample to your website authentication before enabling sessions.'}</p>
                </div>
                {state.demoAvailable ? (
                  <button type="button" onClick={props.onEnterDemo}>Enter demo</button>
                ) : null}
              </div>
            ) : null}

            {state.status === 'setup_required' ? (
              <div className="status-card" role="status" aria-live="polite">
                <div>
                  <strong>Assistant setup required</strong>
                  <p>The site is ready. A deployment-bound assistant client is required for conversation.</p>
                </div>
              </div>
            ) : null}

            {state.status === 'error' ? (
              <div className="status-card error-card" role="alert">
                <div><strong>We could not load the assistant</strong><p>{state.message}</p></div>
                <button type="button" onClick={props.onRetry}>Try again</button>
              </div>
            ) : null}

            {state.status === 'ready' ? (
              <div className="assistant-ready" role="status" aria-live="polite">
                <span className="status-dot" aria-hidden="true" />
                <p>The travel assistant is ready in the bottom-right corner.</p>
                {props.assistant ?? (
                  <Suspense fallback={<span className="assistant-bundle-status">Loading assistant…</span>}>
                    <AssistantMount onError={props.onAssistantError ?? (() => undefined)} />
                  </Suspense>
                )}
              </div>
            ) : null}
          </div>
        </section>

        <section className="travel-note" id="travel-note" aria-labelledby="travel-note-title">
          <p className="eyebrow">Travel note</p>
          <h2 id="travel-note-title">Fresh fares deserve a final check.</h2>
          <p>Search prices can change. Cedar &amp; Cloud verifies a selected fare before any next step.</p>
        </section>
      </main>

      <footer id="about">
        <p><strong>Cedar &amp; Cloud Travel</strong> is a fictional demonstration brand.</p>
        <p>This experience uses a sandbox and cannot complete bookings.</p>
      </footer>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<HostViewState>({ status: 'loading' });

  const refresh = useCallback(() => {
    setState({ status: 'loading' });
    void loadStatus()
      .then(setState)
      .catch(() => setState({ status: 'error', message: 'Unable to load the demo.' }));
  }, []);

  useEffect(refresh, [refresh]);

  const enterDemo = useCallback(() => {
    setState({ status: 'loading' });
    void fetch('/api/demo/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
      .then((response) => {
        if (!response.ok) throw new Error('login_failed');
        return loadStatus();
      })
      .then(setState)
      .catch(() => setState({ status: 'error', message: 'Unable to enter the local demo.' }));
  }, []);

  return (
    <TravelSite
      state={state}
      onEnterDemo={enterDemo}
      onRetry={refresh}
      onAssistantError={() => setState({
        status: 'error',
        message: 'The assistant session ended before it was ready. Please try again.',
      })}
    />
  );
}
