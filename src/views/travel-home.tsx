import '@noodleseed/one/react/styles.css';
import type { CSSProperties } from 'react';
import { Feedback, Flow, Frame, Region, useBranding, useLayout, useSendFollowUpMessage, useToolInfo } from '../helpers.js';
import type { HomeOutput } from '../flight-schemas.js';
import { SearchEditor, searchPrompt, type SearchDraft } from './search-editor.js';
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
  onSearchPrompt,
  brandStyle,
}: {
  readonly data?: HomeOutput;
  readonly state?: HomeState;
  readonly theme: 'light' | 'dark';
  readonly onSearchPrompt?: (draft: SearchDraft) => void;
  readonly brandStyle?: CSSProperties;
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
      style={brandStyle}
      displayMode="auto"
      title={data.brand}
      subtitle="Flights-first conversational travel"
      data-llm={data.fallback}
    >
      <Flow variant="stack" density="comfortable">
        <section className="cc-hero" aria-labelledby="cc-home-heading">
          <div className="cc-hero-copy">
            <div className="cc-mark" aria-hidden="true"><span>C</span><span>C</span></div>
            <p className="cc-eyebrow">CEDAR &amp; CLOUD</p>
            <h2 id="cc-home-heading">Go somewhere worth remembering.</h2>
            <p>{data.message}</p>
          </div>
          <svg className="cc-hero-art" viewBox="0 0 360 220" role="img" aria-label="An original Cedar and Cloud illustration of a quiet landscape beneath a flight path">
            <path className="cc-art-cloud" d="M62 82c4-23 24-39 48-34 11-24 48-27 63-5 25-8 52 8 55 34 18 1 31 14 31 31H50c0-14 4-21 12-26Z" />
            <path className="cc-art-route" d="M52 50c74-35 164-22 253 31" />
            <path className="cc-art-plane" d="m297 76 18-10-7 19-5-6-13 5Z" />
            <path className="cc-art-hill" d="M0 184c58-54 110-65 165-31 46-50 115-47 195 20v47H0Z" />
            <path className="cc-art-cedar" d="M102 116 78 160h16l-24 35h65l-24-35h16Z" />
          </svg>
        </section>

        <SearchEditor title="Where would you like to go?" onSubmit={onSearchPrompt} />

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
  const branding = useBranding();
  const sendFollowUp = useSendFollowUpMessage();
  const toolInfo = useToolInfo('open_travel_starter');
  const pending = Object.keys(toolInfo).length === 0;
  const data = isHome(toolInfo.structuredContent) ? toolInfo.structuredContent : undefined;
  return (
    <TravelHomeView
      data={data}
      state={pending ? 'loading' : toolInfo.isError ? 'error' : data ? undefined : 'malformed'}
      theme={layout.theme === 'dark' ? 'dark' : 'light'}
      onSearchPrompt={layout.supports?.followUpMessage ? (draft) => {
        void sendFollowUp({ prompt: searchPrompt(draft) });
      } : undefined}
      brandStyle={{
        '--cc-accent': branding.theme?.[layout.theme]?.accent ?? branding.accent ?? '#1E6049',
        '--cc-surface': branding.theme?.[layout.theme]?.surface ?? (layout.theme === 'dark' ? branding.surfaceDark : branding.surface) ?? (layout.theme === 'dark' ? '#17211C' : '#FFFFFF'),
        '--cc-text': branding.theme?.[layout.theme]?.text ?? (layout.theme === 'dark' ? '#F4F7F5' : '#17221E'),
        '--cc-muted': branding.theme?.[layout.theme]?.textMuted ?? (layout.theme === 'dark' ? '#B4C0BA' : '#50615A'),
        '--cc-border': branding.theme?.[layout.theme]?.border ?? (layout.theme === 'dark' ? '#3A4941' : '#D7DDD9'),
        '--cc-focus': branding.theme?.[layout.theme]?.focus ?? '#0B6B52',
      } as CSSProperties}
    />
  );
}
