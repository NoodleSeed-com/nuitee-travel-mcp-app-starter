import '@fontsource-variable/inter';
import '@noodleseed/one/react/styles.css';
import type { CSSProperties } from 'react';
import { Feedback, Flow, Frame, Region, StatusBadge, useBranding, useLayout, useSendFollowUpMessage, useToolInfo, useWidgetReady } from '../helpers.js';
import type { DemoHomeOutput } from '../demo-schemas.js';
import type { HomeOutput } from '../flight-schemas.js';
import { starterConfig } from '../starter-config.js';
import { BedIcon, CarIcon, CompassIcon, PlaneIcon, StarIcon } from './icons.js';
import { SearchEditor, searchPrompt, type SearchDraft } from './search-editor.js';
import './travel.css';

type HomeState = 'loading' | 'error' | 'malformed';
type TravelHomeOutput = HomeOutput | DemoHomeOutput;

const domainIcons = {
  Flights: PlaneIcon,
  Stays: BedIcon,
  Loyalty: StarIcon,
  'Ground travel': CarIcon,
  Experiences: CompassIcon,
} as const;

export function isHome(value: unknown): value is TravelHomeOutput {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<TravelHomeOutput>;
  const expanded = Array.isArray(candidate.domains) && candidate.domains.some(
    (domain) => domain?.availability === 'illustrative',
  );
  const expected = expanded
    ? [
        ['Flights', 'available'],
        ['Stays', 'illustrative'],
        ['Loyalty', 'illustrative'],
        ['Ground travel', 'coming_soon'],
        ['Experiences', 'coming_soon'],
      ] as const
    : [
        ['Flights', 'available'],
        ['Stays', 'coming_soon'],
        ['Loyalty', 'coming_soon'],
        ['Ground travel', 'coming_soon'],
        ['Experiences', 'coming_soon'],
      ] as const;
  return candidate.status === 'ready' &&
    candidate.brand === starterConfig.brand.name &&
    typeof candidate.message === 'string' && candidate.message.length <= 300 &&
    typeof candidate.fallback === 'string' && candidate.fallback.length <= 700 &&
    Array.isArray(candidate.domains) && candidate.domains.length === expected.length && candidate.domains.every((domain, index) =>
      domain !== null && typeof domain === 'object' && domain.name === expected[index][0] && domain.availability === expected[index][1]) &&
    (!expanded || ('disclosure' in candidate && typeof candidate.disclosure === 'string' && candidate.disclosure.length <= 320));
}

export function TravelHomeView({
  data,
  state,
  theme,
  onSearchPrompt,
  onDemoPrompt,
  brandStyle,
}: {
  readonly data?: TravelHomeOutput;
  readonly state?: HomeState;
  readonly theme: 'light' | 'dark';
  readonly onSearchPrompt?: (draft: SearchDraft) => void;
  readonly onDemoPrompt?: (prompt: string) => void;
  readonly brandStyle?: CSSProperties;
}) {
  const frameClassName = theme === 'dark' ? 'cc-app cc-theme-dark' : 'cc-app';
  const demo = data !== undefined && 'disclosure' in data;

  if (state === 'loading') {
    return (
      <Frame className={frameClassName} style={brandStyle} displayMode="auto" title={starterConfig.brand.name}>
        <Feedback status="loading">Opening your travel starting point…</Feedback>
      </Frame>
    );
  }
  if (state === 'error') {
    return (
      <Frame className={frameClassName} style={brandStyle} displayMode="auto" title={starterConfig.brand.name}>
        <Feedback status="error">The travel starter could not open. Try again.</Feedback>
      </Frame>
    );
  }
  if (state === 'malformed' || !data) {
    return (
      <Frame className={frameClassName} style={brandStyle} displayMode="auto" title={starterConfig.brand.name}>
        <Feedback status="error">The travel starter result was incomplete.</Feedback>
      </Frame>
    );
  }

  return (
    <Frame
      className={frameClassName}
      style={brandStyle}
      displayMode="auto"
      title={demo ? 'Plan your travel' : 'Flight search'}
      subtitle={demo ? 'Flights, illustrative stays, and rewards' : 'One-way or round trip'}
      data-llm={data.fallback}
    >
      <Flow variant="stack" density="comfortable">
        <section className="cc-home-intro" aria-label="Flight availability">
          <StatusBadge className="cc-availability-badge" tone="success"><PlaneIcon />{demo ? 'Current flights' : 'Flights available'}</StatusBadge>
          <p>{data.message}</p>
          {demo ? <p className="cc-demo-disclosure">{data.disclosure}</p> : null}
        </section>

        <SearchEditor title="Trip details" onSubmit={onSearchPrompt} />

        <Region
          title="Travel capabilities"
          description={demo ? 'One conversation, with the source of every result kept visible.' : 'Only Flights is connected in version one.'}
        >
          <ul className="cc-domain-grid" aria-label="Travel capability availability">
            {data.domains.map((domain) => {
              const DomainIcon = domainIcons[domain.name];
              return (
              <li className={domain.availability !== 'coming_soon' ? 'cc-domain cc-domain-available' : 'cc-domain'} key={domain.name}>
                <span className="cc-domain-icon"><DomainIcon /></span>
                <span className="cc-domain-name">{domain.name}</span>
                <span className="cc-domain-status">
                  {'label' in domain ? domain.label : domain.availability === 'available' ? 'Available' : 'Coming soon'}
                </span>
                {domain.availability === 'illustrative' && onDemoPrompt ? (
                  <button
                    className="cc-domain-action"
                    onClick={() => onDemoPrompt(domain.name === 'Stays'
                      ? 'Show me hotels and ask only for the destination or dates you still need.'
                      : 'Show my illustrative rewards.')}
                    type="button"
                  >
                    {domain.name === 'Stays' ? 'Compare stays' : 'View rewards'}
                  </button>
                ) : null}
              </li>
              );
            })}
          </ul>
        </Region>

      </Flow>
    </Frame>
  );
}

export default function TravelHome() {
  const ready = useWidgetReady();
  const layout = useLayout();
  const branding = useBranding();
  const sendFollowUp = useSendFollowUpMessage();
  const toolInfo = useToolInfo('open_travel_starter');
  const pending = !ready || Object.keys(toolInfo).length === 0;
  const data = isHome(toolInfo.structuredContent) ? toolInfo.structuredContent : undefined;
  return (
    <TravelHomeView
      data={data}
      state={pending ? 'loading' : toolInfo.isError ? 'error' : data ? undefined : 'malformed'}
      theme={layout.theme === 'dark' ? 'dark' : 'light'}
      onSearchPrompt={ready && layout.supports?.followUpMessage ? (draft) => {
        void sendFollowUp({ prompt: searchPrompt(draft) });
      } : undefined}
      onDemoPrompt={ready && layout.supports?.followUpMessage ? (prompt) => {
        void sendFollowUp({ prompt });
      } : undefined}
      brandStyle={{
        '--cc-accent': branding.theme?.[layout.theme]?.accent ?? branding.accent ?? '#1E6049',
        '--cc-focus': branding.theme?.[layout.theme]?.focus ?? '#0B6B52',
      } as CSSProperties}
    />
  );
}
