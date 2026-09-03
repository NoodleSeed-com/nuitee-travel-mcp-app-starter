import { useRef, type ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons.js';
import type { StayMatch } from './stay-match.js';

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
  glyph,
  height = 152,
  children,
}: {
  readonly name: string;
  readonly imageUrl?: string;
  readonly glyph?: ReactNode;
  readonly height?: number;
  readonly children?: ReactNode;
}) {
  return (
    <div className="cc-photo-band" style={{ height: `${height}px` }}>
      {/* Decoration only. The band's meaning is carried by the hotel name
          beside it, so the gradient and photo are hidden — but children
          (score pin, compare control) must stay in the a11y tree. When
          there is no photo, a low-opacity category glyph is centred on the
          gradient so the band reads as a deliberate treatment rather than a
          broken image. */}
      <div
        aria-hidden="true"
        className="cc-photo-decor"
        style={{ background: gradientForName(name) }}
      >
        {imageUrl
          ? <img alt="" className="cc-photo-image" loading="lazy" src={imageUrl} />
          : glyph
            ? <span className="cc-photo-glyph">{glyph}</span>
            : null}
      </div>
      {children}
    </div>
  );
}

export function ScorePin({ score }: { readonly score?: number }) {
  if (score === undefined) return null;
  const rounded = Math.round(score * 10) / 10;
  return (
    <span className="cc-score-pin">
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
      <div aria-label={ariaLabel} className="cc-rail" ref={railRef} role="group" tabIndex={0}>
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

export function MatchRing({ score, size = 42 }: { readonly score: number; readonly size?: number }) {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  return (
    <span className="cc-ring-wrap">
      <svg className="cc-ring" height={size} role="img" viewBox={`0 0 ${size} ${size}`} width={size}>
        <title>{`Stay match ${score} out of 100`}</title>
        <circle className="cc-ring-track" cx={size / 2} cy={size / 2} fill="none" r={radius} strokeWidth="4" />
        <circle
          className="cc-ring-fill"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          strokeDasharray={`${filled.toFixed(1)} ${circumference.toFixed(1)}`}
          strokeWidth="4"
        />
        <text className="cc-ring-num" textAnchor="middle" x={size / 2} y={size / 2 + 4.5}>
          {score}
        </text>
      </svg>
      <span className="cc-ring-cap">match</span>
    </span>
  );
}

export function MatchDetail({ match, footnote }: { readonly match: StayMatch; readonly footnote?: string }) {
  return (
    <div className="cc-match-detail">
      <p className="cc-match-head">Stay match {match.score}</p>
      {match.lines.map((line) => (
        <p className="cc-match-line" key={line.key}>
          <span className={`cc-match-status cc-match-status-${line.status}`}>
            {line.status === 'ok' ? '✓' : '~'}
          </span>
          <span className="cc-match-label">{line.label}</span>
          <span className="cc-match-value">{line.detail}</span>
        </p>
      ))}
      {footnote ? <p className="cc-match-foot">{footnote}</p> : null}
    </div>
  );
}
