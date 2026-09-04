import {
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
  MapIcon,
  PaperAirplaneIcon,
  StarIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import { WayfareLiquidIcon } from './wayfare-liquid-icon';

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

export function TravelCapabilities(): React.JSX.Element {
  return (
    <section
      aria-label="Wayfare capabilities"
      className="travel-capabilities travel-landing__section"
    >
      <ul className="travel-capabilities__grid">
        {capabilities.map(({ description, icon: Icon, title }) => (
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
        Live flight results come from the connected provider. The starter’s
        other capabilities use clearly labeled Wayfare demo data.
      </p>
    </section>
  );
}
