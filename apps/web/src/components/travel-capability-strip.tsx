import {
  ArrowUpRight,
  BadgeCheck,
  Hotel,
  PlaneTakeoff,
} from 'lucide-react';
import type React from 'react';
import { siteConfig } from '../lib/site-config';

const intents = [
  {
    label: 'Search flights',
    support: 'Compare current schedules and fares for your route.',
    icon: PlaneTakeoff,
    prompt: siteConfig.prompts[0],
  },
  {
    label: 'Compare stays',
    support: 'Explore stays around your destination and travel dates.',
    icon: Hotel,
    prompt: siteConfig.prompts[1],
  },
  {
    label: 'Explore rewards',
    support: 'See how rewards could complement the trip you are planning.',
    icon: BadgeCheck,
    prompt: siteConfig.prompts[2],
  },
] as const;

export function TravelCapabilityStrip({
  onStart,
}: Readonly<{ onStart: (prompt: string) => void }>): React.JSX.Element {
  return (
    <section
      aria-labelledby="travel-intents-title"
      className="travel-capabilities travel-landing__section"
    >
      <header className="travel-capabilities__heading">
        <span>Start anywhere</span>
        <h2 id="travel-intents-title">Start with flights, stays, or rewards</h2>
      </header>
      <ol aria-label="Start with flights, stays, or rewards">
        {intents.map(({ icon: Icon, label, prompt, support }) => (
          <li key={label}>
            <button aria-label={label} onClick={() => onStart(prompt)} type="button">
              <span className="travel-capabilities__icon">
                <Icon aria-hidden="true" strokeWidth={1.75} />
              </span>
              <span className="travel-capabilities__copy">
                <strong>{label}</strong>
                <span>{support}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="travel-capabilities__arrow" />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
