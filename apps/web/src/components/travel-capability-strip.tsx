import { BadgeCheck, ListFilter, Search } from 'lucide-react';
import type React from 'react';

const stages = [
  {
    label: 'Search current flights',
    support: 'See current schedules and fares from Nuitee.',
    icon: Search,
  },
  {
    label: 'Compare the trip',
    support: 'Review flights alongside clearly labeled illustrative stays.',
    icon: ListFilter,
  },
  {
    label: 'Review rewards',
    support: 'Preview illustrative benefits, then verify the live fare.',
    icon: BadgeCheck,
  },
] as const;

export function TravelCapabilityStrip(): React.JSX.Element {
  return (
    <section className="travel-capabilities travel-landing__section">
      <ol aria-label="How Flight Catchers plans a trip">
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
