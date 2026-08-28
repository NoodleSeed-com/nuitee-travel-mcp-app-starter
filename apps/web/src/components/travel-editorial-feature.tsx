'use client';

import Image from 'next/image';
import type React from 'react';
import { landingEditorialFeature } from '../lib/landing-content';

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
      <div className="travel-editorial__image">
        <Image
          alt=""
          fill
          sizes="(max-width: 700px) 100vw, 65vw"
          src={landingEditorialFeature.imageSrc}
          style={{ objectPosition: landingEditorialFeature.imagePosition }}
        />
      </div>
      <div className="travel-editorial__copy">
        <p className="travel-editorial__eyebrow">
          {landingEditorialFeature.eyebrow}
        </p>
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
