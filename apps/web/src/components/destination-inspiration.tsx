'use client';

import Image from 'next/image';
import {
  type JSX,
  useEffect,
  useRef,
  useState,
} from 'react';
import { landingDestinations } from '../lib/landing-content';

interface DestinationInspirationProps {
  readonly onStart: (prompt: string) => void;
}

/**
 * The five-window destination state that visually continues the three-window
 * hero. The buttons submit through the same assistant boundary as every other
 * landing entry point.
 */
export function DestinationInspiration({
  onStart,
}: Readonly<DestinationInspirationProps>): JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [loadedImages, setLoadedImages] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setRevealed(true);
      observer.disconnect();
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      aria-labelledby="places-to-start-title"
      className="destination-inspiration travel-landing__section"
      data-revealed={revealed ? 'true' : 'false'}
      id="places-to-start"
      ref={sectionRef}
    >
      <header className="travel-section-heading">
        <span>Five windows. One next step.</span>
        <h2 id="places-to-start-title">Places to start</h2>
      </header>
      <ul
        aria-label="Five destination windows"
        className="destination-inspiration__grid"
      >
        {landingDestinations.map((destination, index) => {
          const imageState = failedImages.has(destination.id)
            ? 'error'
            : loadedImages.has(destination.id) ? 'loaded' : 'loading';
          return (
            <li data-window-index={index} key={destination.id}>
              <button
                aria-label={`Plan a trip to ${destination.name}`}
                className="destination-card"
                data-image-state={imageState}
                onClick={() => onStart(destination.prompt)}
                type="button"
              >
                <span aria-hidden="true" className="destination-card__skeleton" />
                <Image
                  alt=""
                  className="destination-card__image"
                  fill
                  loading={index === 0 ? 'eager' : 'lazy'}
                  onError={() => {
                    setFailedImages((current) => (
                      new Set(current).add(destination.id)
                    ));
                  }}
                  onLoad={() => {
                    setLoadedImages((current) => (
                      new Set(current).add(destination.id)
                    ));
                  }}
                  sizes="(max-width: 767px) 78vw, (max-width: 1023px) 42vw, 22vw"
                  src={destination.imageSrc}
                  style={{ objectPosition: destination.imagePosition }}
                />
                <span aria-hidden="true" className="destination-card__scrim" />
                <span className="destination-card__copy">
                  <strong>{destination.name}</strong>
                  <span>{destination.descriptor}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
