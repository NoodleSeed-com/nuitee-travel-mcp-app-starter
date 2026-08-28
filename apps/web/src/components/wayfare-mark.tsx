interface WayfareMarkProps {
  readonly className?: string;
}

export function WayfareMark({ className }: Readonly<WayfareMarkProps>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-wayfare-mark="true"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M3.25 6.5L7.6 17.25L12 9L16.4 17.25L20.25 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="20.25" cy="8" fill="currentColor" r="1.35" />
    </svg>
  );
}
