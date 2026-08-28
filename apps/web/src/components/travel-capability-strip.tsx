import { BadgeCheck, ListFilter, Search } from 'lucide-react';
import type React from 'react';

const stages = [
  {
    label: 'Search live flights',
    support: 'See current schedules and availability.',
    icon: Search,
  },
  {
    label: 'Compare options',
    support: 'Review stops, timing, baggage, and price.',
    icon: ListFilter,
  },
  {
    label: 'Verify the fare',
    support: 'Recheck availability and price before you leave.',
    icon: BadgeCheck,
  },
] as const;

export function TravelCapabilityStrip(): React.JSX.Element {
  return (
    <section className="travel-capabilities travel-landing__section">
      <ol aria-label="How Wayfare plans flights">
        {stages.map(({ icon: Icon, label, support }) => (
          <li key={label}>
            <Icon aria-hidden="true" strokeWidth={1.75} />
            <div>
              <strong>{label}</strong>
              <span>{support}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
