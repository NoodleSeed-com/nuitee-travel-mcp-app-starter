import '@noodleseed/one/react/styles.css';
import type { CSSProperties } from 'react';
import { Feedback, Flow, Frame, Region, StatusBadge, useBranding, useLayout, useSendFollowUpMessage, useToolInfo } from '../helpers.js';
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
      title="Flight search"
      subtitle="One-way or round trip"
      data-llm={data.fallback}
    >
      <Flow variant="stack" density="comfortable">
        <section className="cc-home-intro" aria-label="Flight availability">
          <StatusBadge tone="success">Flights available</StatusBadge>
          <p>{data.message}</p>
        </section>

        <SearchEditor title="Trip details" onSubmit={onSearchPrompt} />

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
        '--cc-focus': branding.theme?.[layout.theme]?.focus ?? '#0B6B52',
      } as CSSProperties}
    />
  );
}
