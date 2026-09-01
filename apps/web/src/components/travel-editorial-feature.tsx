'use client';

import type React from 'react';
import { landingEditorialFeature } from '../lib/landing-content';
import { FlightCatchersBrand } from './flight-catchers-brand';

interface TravelEditorialFeatureProps {
  readonly onStart: (prompt: string) => void;
}

export function TravelEditorialFeature({
  onStart,
}: Readonly<TravelEditorialFeatureProps>): React.JSX.Element {
  return (
    <section
      aria-labelledby="travel-editorial-title"
      className="travel-editorial travel-landing__section"
    >
      <FlightCatchersBrand className="travel-editorial__mark" variant="mark" />
      <div className="travel-editorial__copy">
        <h2 id="travel-editorial-title">
          {landingEditorialFeature.heading}
        </h2>
        <p>{landingEditorialFeature.support}</p>
        <button
          onClick={() => onStart(landingEditorialFeature.prompt)}
          type="button"
        >
          {landingEditorialFeature.action}
        </button>
      </div>
    </section>
  );
}
