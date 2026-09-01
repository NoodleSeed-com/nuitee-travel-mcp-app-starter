import Image from 'next/image';
import { Send } from 'lucide-react';

import { siteConfig } from '../lib/site-config';

interface FlightCatchersBrandProps {
  readonly className?: string;
  readonly priority?: boolean;
  readonly variant?: 'logo' | 'mark';
}

export function FlightCatchersBrand({
  className,
  priority = false,
  variant = 'logo',
}: Readonly<FlightCatchersBrandProps>) {
  if (variant === 'mark') {
    return (
      <Send
        aria-hidden="true"
        className={className}
        data-flight-catchers-mark="true"
        strokeWidth={1.75}
      />
    );
  }

  return (
    <Image
      alt={siteConfig.brand.name}
      className={className}
      data-flight-catchers-logo="true"
      height={887}
      priority={priority}
      src={siteConfig.brand.logoPath}
      width={1774}
    />
  );
}
