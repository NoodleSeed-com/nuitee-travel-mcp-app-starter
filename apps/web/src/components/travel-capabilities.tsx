'use client';

import {
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
  MapIcon,
  PaperAirplaneIcon,
  StarIcon,
  TicketIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { WayfareLiquidIcon } from './wayfare-liquid-icon';
import { useBusinessBrand } from './business-brand';

const capabilities = [
  {
    description: 'Search and compare one-way or return fares.',
    icon: PaperAirplaneIcon,
    title: 'Flights',
  },
  {
    description: 'Find stays, rooms, rates, and cancellation terms.',
    icon: BuildingOffice2Icon,
    title: 'Hotels',
  },
  {
    description: 'Add curated activities around your itinerary.',
    icon: MapIcon,
    title: 'Experiences',
  },
  {
    description: 'Review points and preview redemptions.',
    icon: StarIcon,
    title: 'Loyalty',
  },
  {
    description: 'Find and apply eligible trip value.',
    icon: TicketIcon,
    title: 'Vouchers',
  },
  {
    description: 'Review, confirm, change, or cancel conversationally.',
    icon: ClipboardDocumentCheckIcon,
    title: 'Booking & trip care',
  },
] as const;

export function TravelCapabilities({ disabled = false }: { readonly disabled?: boolean }): React.JSX.Element | null {
  const brand = useBusinessBrand();
  if (disabled) return null;
  const visible = brand ? [
    ...(brand.capabilities.flights ? [capabilities[0]] : []),
    ...(brand.capabilities.hotels ? [capabilities[1]] : []),
    ...(brand.capabilities.experiences ? [{ ...capabilities[2], description: 'Explore fictional activity ideas around your itinerary.' }] : []),
    ...(brand.capabilities.cars ? [{ title: 'Cars', icon: TruckIcon, description: 'Explore fictional rental-car ideas for your plan.' }] : []),
    { ...capabilities[3], description: 'Explore illustrative rewards; no account access or redemption.' },
    { ...capabilities[5], title: 'Trip review', description: 'Review selected planning choices. Nothing is booked or paid.' },
  ] : capabilities;
  const providerSearches = brand ? [brand.capabilities.flights && 'Flight', brand.capabilities.hotels && 'Hotel'].filter(Boolean).join(' and ').toLowerCase() : '';
  return (
    <section
      aria-label={`${brand?.name || 'Wayfare'} capabilities`}
      className="travel-capabilities travel-landing__section"
    >
      <ul className="travel-capabilities__grid">
        {visible.map(({ description, icon: Icon, title }) => (
          <li key={title}>
            <span className="travel-capabilities__icon">
              <WayfareLiquidIcon icon={Icon} />
            </span>
            <div className="travel-capabilities__copy">
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="travel-capabilities__note">
        {brand
          ? `${providerSearches ? `${providerSearches[0].toUpperCase()}${providerSearches.slice(1)} searches use the connected provider. ` : ''}Other travel examples are illustrative. No booking, payment, reservation or redemption is available.`
          : <>Live flight results come from the connected provider. The starter’s
            other capabilities use clearly labeled Wayfare demo data.</>}
      </p>
    </section>
  );
}
