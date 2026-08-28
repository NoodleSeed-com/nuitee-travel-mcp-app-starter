import type React from 'react';

const capabilities = [
  ['Search live flights', 'Use current availability from Nuitee.'],
  ['Compare your options', 'Review schedules, stops, baggage, and price.'],
  ['Verify the fare', 'Check availability and price before you leave.'],
] as const;

export function TravelCapabilityStrip(): React.JSX.Element {
  return (
    <section className="travel-capabilities travel-landing__section">
      <ol aria-label="How the travel assistant works">
        {capabilities.map(([title, support]) => (
          <li key={title}>
            <strong>{title}</strong>
            <span>{support}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
