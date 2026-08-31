import { starterConfig } from '../../../../starter.config';
import { WayfareMark } from '../../src/components/wayfare-mark';

const setupSteps = [
  {
    title: 'Install dependencies',
    command: 'pnpm install',
    detail: 'Installs the pinned website, Assistant SDK, MCP, and test dependencies.',
  },
  {
    title: 'Start the website',
    command: 'pnpm dev:web',
    detail: 'Opens the guest shell locally. It does not start an assistant session until the first message is submitted.',
  },
  {
    title: 'Validate the MCP',
    command: 'pnpm agent:check',
    detail: 'Runs the credential-free Noodle validation, smoke test, tool listing, and project checks.',
  },
  {
    title: 'Add the public embed ID',
    command: 'NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID',
    detail: 'Set this non-secret deployment coordinate only after an assistant-enabled deployment provides the real public embed ID.',
  },
] as const;

export default function DevelopersPage() {
  return (
    <main className="developer-page">
      <a className="skip-link" href="#developer-guide">
        Skip to guide
      </a>
      <div className="developer-page__frame">
        <header className="developer-page__header">
          <a className="travel-wordmark" href="/">
            <span className="travel-wordmark__mark" aria-hidden="true">
              <WayfareMark />
            </span>
            <span>{starterConfig.brand.name}</span>
          </a>
          <a className="developer-page__home" href="/">
            Back to travel assistant
          </a>
        </header>

        <article className="developer-guide" id="developer-guide">
          <header className="developer-guide__intro">
            <p className="developer-guide__eyebrow">Developer template</p>
            <h1>Guest-first setup</h1>
            <p>
              Run the primary Next.js experience without a website account,
              database, assistant client secret, or login screen.
            </p>
          </header>

          <ol className="developer-steps">
            {setupSteps.map((step, index) => (
              <li key={step.title}>
                <span className="developer-step__number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.detail}</p>
                  <pre><code>{step.command}</code></pre>
                </div>
              </li>
            ))}
          </ol>

          <section
            className="developer-guide__boundary"
            aria-labelledby="verify-boundary"
          >
            <p className="developer-guide__eyebrow">Capability boundary</p>
            <h2 id="verify-boundary">Verify Search → Select → Verify</h2>
            <p>
              Finish the smoke test at a verified fare. This template does not
              book, hold inventory, collect passenger details, take payment, or
              issue a ticket.
            </p>
          </section>

          <section
            className="developer-guide__oauth"
            aria-labelledby="optional-oauth"
          >
            <p className="developer-guide__eyebrow">Identity extension</p>
            <h2 id="optional-oauth">Optional OAuth</h2>
            <p>
              Keep the guest path for these travel capabilities. When you add a
              real identity-bound capability, follow <code>docs/oauth.md</code>
              to replace the public embed transport with a backend-authenticated
              Assistant session exchange.
            </p>
          </section>

          <section
            className="developer-guide__support"
            id="support"
            aria-labelledby="support-heading"
          >
            <p className="developer-guide__eyebrow">Repository help</p>
            <h2 id="support-heading">Support</h2>
            <p>
              Use the repository&apos;s SUPPORT.md policy and sanitized issue
              forms. Never include credentials, provider bodies, customer data,
              or private deployment URLs in a report.
            </p>
            <nav aria-label="Developer help">
              <a href={starterConfig.website.supportPath}>Support</a>
              {starterConfig.website.privacyUrl ? (
                <a href={starterConfig.website.privacyUrl}>Privacy</a>
              ) : null}
              {starterConfig.website.termsUrl ? (
                <a href={starterConfig.website.termsUrl}>Terms</a>
              ) : null}
            </nav>
          </section>
        </article>
      </div>
    </main>
  );
}
