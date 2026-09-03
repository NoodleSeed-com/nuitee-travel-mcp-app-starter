import { useRef, type ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons.js';

/**
 * Deterministic gradient for a hotel with no photograph.
 *
 * Main has no hotel imagery, so this is the band every card shows there. It
 * must look like a deliberate treatment rather than a failed image load, and
 * it must be stable — the same hotel looks the same across renders and turns.
 * The ramp runs from the brand navy through to a warm sand, staying inside the
 * widget palette.
 */
export function gradientForName(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  const angle = 120 + (hash % 90);
  const lift = 6 + ((hash >> 8) % 14);
  const warmHue = 28 + ((hash >> 16) % 18);
  const warmLight = 58 + ((hash >> 4) % 10);
  return `linear-gradient(${angle}deg, hsl(219 51% ${14 + lift}%) 0%, hsl(213 34% ${30 + lift}%) 46%, hsl(${warmHue} 34% ${warmLight}%) 100%)`;
}

export function PhotoBand({
  name,
  imageUrl,
  height = 152,
  children,
}: {
  readonly name: string;
  readonly imageUrl?: string;
  readonly height?: number;
  readonly children?: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className="cc-photo-band"
      style={{ background: gradientForName(name), height: `${height}px` }}
    >
      {imageUrl ? <img alt="" className="cc-photo-image" loading="lazy" src={imageUrl} /> : null}
      {children}
    </div>
  );
}

export function ScorePin({ score, small = false }: { readonly score?: number; readonly small?: boolean }) {
  if (score === undefined) return null;
  const rounded = Math.round(score * 10) / 10;
  return (
    <span className={`cc-score-pin${small ? ' cc-score-pin-sm' : ''}`}>
      <span aria-hidden="true">{rounded.toFixed(1)}</span>
      <span className="cc-visually-hidden">Guest rating {rounded.toFixed(1)} out of 10</span>
    </span>
  );
}

export function Badge({
  tone = 'brand',
  children,
}: {
  readonly tone?: 'brand' | 'good' | 'muted';
  readonly children: ReactNode;
}) {
  return <span className={`cc-badge cc-badge-${tone}`}>{children}</span>;
}

export function Price({
  total,
  perNight,
  currency,
  locale,
}: {
  readonly total: number;
  readonly perNight: number;
  readonly currency: string;
  readonly locale: string;
}) {
  const format = (amount: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${Math.round(amount)}`;
    }
  };
  return (
    <p className="cc-price">
      <strong>{format(total)}</strong>
      <span> total · {format(perNight)}/night</span>
    </p>
  );
}

export function Rail({ ariaLabel, children }: { readonly ariaLabel: string; readonly children: ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => {
    const element = railRef.current;
    if (!element) return;
    element.scrollBy({
      left: direction * Math.min(element.clientWidth * 0.9, 320),
      behavior: 'smooth',
    });
  };
  return (
    <div className="cc-rail-outer">
      <div aria-label={ariaLabel} className="cc-rail" ref={railRef} tabIndex={0}>
        {children}
      </div>
      <button
        aria-label="Scroll left"
        className="cc-rail-arrow cc-rail-arrow-prev"
        onClick={() => scroll(-1)}
        type="button"
      >
        <ChevronLeftIcon />
      </button>
      <button
        aria-label="Scroll right"
        className="cc-rail-arrow cc-rail-arrow-next"
        onClick={() => scroll(1)}
        type="button"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
