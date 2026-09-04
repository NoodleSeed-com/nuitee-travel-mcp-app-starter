'use client';

import type React from 'react';
import { landingEditorialFeature } from '../lib/landing-content';
import { WayfareLiquidMark } from './wayfare-liquid-mark';

export function TravelEditorialFeature(): React.JSX.Element {
  return (
    <section
      aria-labelledby="travel-editorial-title"
      className="travel-editorial travel-landing__section"
    >
      <WayfareLiquidMark className="travel-editorial__mark" />
      <div className="travel-editorial__copy">
        <h2 id="travel-editorial-title">
          {landingEditorialFeature.heading}
        </h2>
        <p>{landingEditorialFeature.support}</p>
      </div>
    </section>
  );
}
