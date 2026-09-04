'use client';

import Image from 'next/image';
import {
  type JSX,
  useEffect,
  useRef,
  useState,
} from 'react';
import { landingDestinations } from '../lib/landing-content';

/**
 * The five-window destination state that visually continues the three-window
 * hero without competing with the single conversation starting point.
 */
export function DestinationInspiration(): JSX.Element {
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
      aria-labelledby="travel-inspiration-title"
      className="destination-inspiration travel-landing__section"
      data-revealed={revealed ? 'true' : 'false'}
      id="places-to-start"
      ref={sectionRef}
    >
      <header className="travel-section-heading">
        <h2 id="travel-inspiration-title">Where the journey could take you</h2>
      </header>
      <ul
        aria-label="Destination inspiration"
        className="destination-inspiration__grid"
      >
        {landingDestinations.map((destination, index) => {
          const imageState = failedImages.has(destination.id)
            ? 'error'
            : loadedImages.has(destination.id) ? 'loaded' : 'loading';
          return (
            <li data-window-index={index} key={destination.id}>
              <article
                className="destination-card"
                data-image-state={imageState}
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
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
