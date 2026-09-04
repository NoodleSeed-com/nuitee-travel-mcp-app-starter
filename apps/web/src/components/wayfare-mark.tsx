import { useId } from 'react';

interface WayfareMarkProps {
  readonly className?: string;
  readonly staticGradient?: boolean;
}

export function WayfareMark({
  className,
  staticGradient = false,
}: Readonly<WayfareMarkProps>) {
  const gradientId = `wayfare-gradient-${useId().replaceAll(':', '')}`;
  const paint = staticGradient ? `url(#${gradientId})` : 'currentColor';

  return (
    <svg
      aria-hidden="true"
      className={className}
      data-wayfare-gradient={staticGradient ? 'static' : undefined}
      data-wayfare-mark="true"
      fill="none"
      viewBox="0 0 64 64"
    >
      {staticGradient ? (
        <defs>
          <linearGradient id={gradientId} x1="4" x2="60" y1="14" y2="48">
            <stop className="wayfare-gradient-stop wayfare-gradient-stop--start" offset="0%" />
            <stop className="wayfare-gradient-stop wayfare-gradient-stop--middle" offset="50%" />
            <stop className="wayfare-gradient-stop wayfare-gradient-stop--end" offset="100%" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d="M7 18C14 18 15.5 46 24 46C32.5 46 31 22 39 22C47 22 46 42 53 42C57.5 42 58.5 35.5 59 30"
        stroke={paint}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <circle cx="7" cy="18" fill={paint} r="4.2" />
      <circle cx="59" cy="30" fill={paint} r="4.2" />
    </svg>
  );
}
