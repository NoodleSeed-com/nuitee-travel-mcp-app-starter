import type { ReactNode, SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

function Icon({ children, className, ...props }: IconProps & { readonly children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={`cc-icon${className ? ` ${className}` : ''}`}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ArrowLeftIcon = (props: IconProps) => <Icon {...props}><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></Icon>;
export const SwapIcon = (props: IconProps) => <Icon {...props}><path d="m7 7-3 3 3 3" /><path d="M4 10h12a4 4 0 0 1 4 4" /><path d="m17 17 3-3-3-3" /></Icon>;
export const SearchIcon = (props: IconProps) => <Icon {...props}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></Icon>;
export const PlaneIcon = (props: IconProps) => <Icon {...props}><path d="M3 11.5 21 4l-7.5 18-2.2-7.3L3 11.5Z" /><path d="m11.3 14.7 3.8-3.8" /></Icon>;
export const ClockIcon = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>;
export const RouteIcon = (props: IconProps) => <Icon {...props}><circle cx="5" cy="17" r="2" /><circle cx="19" cy="7" r="2" /><path d="M7 17h3a3 3 0 0 0 3-3v-4a3 3 0 0 1 3-3h1" /></Icon>;
export const CarryOnIcon = (props: IconProps) => <Icon {...props}><rect x="5" y="7" width="14" height="12" rx="2" /><path d="M9 7V5h6v2M8 11v4m8-4v4" /></Icon>;
export const CheckedBagIcon = (props: IconProps) => <Icon {...props}><rect x="6" y="6" width="12" height="14" rx="2" /><path d="M9 6V4h6v2M9 10v6m6-6v6M9 20v1m6-1v1" /></Icon>;
export const TagIcon = (props: IconProps) => <Icon {...props}><path d="M4 5h7l9 9-6 6-9-9V5Z" /><circle cx="8.5" cy="8.5" r="1" /></Icon>;
export const CheckIcon = (props: IconProps) => <Icon {...props}><path d="m5 12 4 4L19 6" /></Icon>;
export const BedIcon = (props: IconProps) => <Icon {...props}><path d="M4 18V7m16 11v-6a3 3 0 0 0-3-3H9v9m-5-4h16M7 9V7h4v2" /></Icon>;
export const StarIcon = (props: IconProps) => <Icon {...props}><path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6-4.3-4.2 6-.9L12 3Z" /></Icon>;
export const CarIcon = (props: IconProps) => <Icon {...props}><path d="m5 11 2-5h10l2 5" /><path d="M4 11h16v7H4zM7 18v2m10-2v2" /><circle cx="7.5" cy="14.5" r="1" /><circle cx="16.5" cy="14.5" r="1" /></Icon>;
export const CompassIcon = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></Icon>;
export const MapPinIcon = (props: IconProps) => <Icon {...props}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></Icon>;
export const ListIcon = (props: IconProps) => <Icon {...props}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></Icon>;
export const PlusIcon = (props: IconProps) => <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>;
export const ChevronLeftIcon = (props: IconProps) => <Icon {...props}><path d="m14 6-6 6 6 6" /></Icon>;
export const ChevronRightIcon = (props: IconProps) => <Icon {...props}><path d="m10 6 6 6-6 6" /></Icon>;
