import '@noodleseed/one/react/styles.css';
import { Feedback, Flow, Frame, Region, useLayout, useToolInfo } from '../helpers.js';
import type { HomeOutput } from '../flight-schemas.js';
import './travel.css';

type HomeState = 'loading' | 'error' | 'malformed';

export function isHome(value: unknown): value is HomeOutput {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<HomeOutput>;
  const expected = [
    ['Flights', 'available'],
    ['Stays', 'coming_soon'],
    ['Loyalty', 'coming_soon'],
    ['Ground travel', 'coming_soon'],
    ['Experiences', 'coming_soon'],
  ] as const;
  return candidate.status === 'ready' &&
    candidate.brand === 'Cedar & Cloud Travel' &&
    typeof candidate.message === 'string' && candidate.message.length <= 300 &&
    typeof candidate.fallback === 'string' && candidate.fallback.length <= 500 &&
    Array.isArray(candidate.domains) && candidate.domains.length === expected.length && candidate.domains.every((domain, index) =>
      domain !== null && typeof domain === 'object' && domain.name === expected[index][0] && domain.availability === expected[index][1]);
}

export function TravelHomeView({
  data,
  state,
  theme,
}: {
  readonly data?: HomeOutput;
  readonly state?: HomeState;
  readonly theme: 'light' | 'dark';
}) {
  if (state === 'loading') {
    return (
      <Frame className={theme === 'dark' ? 'cc-theme-dark' : ''} displayMode="auto" title="Cedar & Cloud Travel">
        <Feedback status="loading">Opening your travel starting point…</Feedback>
      </Frame>
    );
  }
  if (state === 'error') {
    return (
      <Frame className={theme === 'dark' ? 'cc-theme-dark' : ''} displayMode="auto" title="Cedar & Cloud Travel">
        <Feedback status="error">The travel starter could not open. Try again.</Feedback>
      </Frame>
    );
  }
  if (state === 'malformed' || !data) {
    return (
      <Frame className={theme === 'dark' ? 'cc-theme-dark' : ''} displayMode="auto" title="Cedar & Cloud Travel">
        <Feedback status="error">The travel starter result was incomplete.</Feedback>
      </Frame>
    );
  }

  return (
    <Frame
      className={`cc-app ${theme === 'dark' ? 'cc-theme-dark' : ''}`}
      displayMode="auto"
      title={data.brand}
      subtitle="Flights-first conversational travel"
      data-llm={data.fallback}
    >
      <Flow variant="stack" density="comfortable">
        <section className="cc-hero" aria-labelledby="cc-home-heading">
          <div className="cc-mark" aria-hidden="true"><span>C</span><span>C</span></div>
          <div>
            <p className="cc-eyebrow">CEDAR &amp; CLOUD</p>
            <h2 id="cc-home-heading">Start with the journey.</h2>
            <p>{data.message}</p>
          </div>
        </section>

        <Region title="Travel capabilities" description="Only Flights is connected in version one.">
          <ul className="cc-domain-grid" aria-label="Travel capability availability">
            {data.domains.map((domain) => (
              <li className={domain.availability === 'available' ? 'cc-domain cc-domain-available' : 'cc-domain'} key={domain.name}>
                <span className="cc-domain-name">{domain.name}</span>
                <span className="cc-domain-status">
                  {domain.availability === 'available' ? 'Available' : 'Coming soon'}
                </span>
              </li>
            ))}
          </ul>
        </Region>

        <aside className="cc-invitation" aria-label="Example conversational request">
          <span aria-hidden="true">✦</span>
          <p>Try saying: “Find a round trip from Sydney, Nova Scotia to Halifax in September for two adults, priced in CAD from Canada.”</p>
        </aside>
      </Flow>
    </Frame>
  );
}

export default function TravelHome() {
  const layout = useLayout();
  const toolInfo = useToolInfo('open_travel_starter');
  const pending = Object.keys(toolInfo).length === 0;
  const data = isHome(toolInfo.structuredContent) ? toolInfo.structuredContent : undefined;
  return (
    <TravelHomeView
      data={data}
      state={pending ? 'loading' : toolInfo.isError ? 'error' : data ? undefined : 'malformed'}
      theme={layout.theme === 'dark' ? 'dark' : 'light'}
    />
  );
}
