import {
  ArrowLeftIcon as HeroArrowLeftIcon,
  ArrowsRightLeftIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  CheckCircleIcon as HeroCheckCircleIcon,
  CheckIcon as HeroCheckIcon,
  ChevronLeftIcon as HeroChevronLeftIcon,
  ChevronRightIcon as HeroChevronRightIcon,
  ClockIcon as HeroClockIcon,
  ExclamationCircleIcon as HeroExclamationCircleIcon,
  MagnifyingGlassIcon,
  ListBulletIcon,
  MapIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  PlusIcon as HeroPlusIcon,
  StarIcon as HeroStarIcon,
  TagIcon as HeroTagIcon,
  TruckIcon,
  XMarkIcon as HeroXMarkIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function wayfareIcon(Icon: ComponentType<IconProps>) {
  return function WayfareIcon({ className, ...props }: IconProps) {
    return (
      <Icon
        aria-hidden="true"
        className={['cc-icon', className].filter(Boolean).join(' ')}
        focusable="false"
        {...props}
      />
    );
  };
}

export const ArrowLeftIcon = wayfareIcon(HeroArrowLeftIcon);
export const SwapIcon = wayfareIcon(ArrowsRightLeftIcon);
export const SearchIcon = wayfareIcon(MagnifyingGlassIcon);
export const PlaneIcon = wayfareIcon(PaperAirplaneIcon);
export const ClockIcon = wayfareIcon(HeroClockIcon);
export const RouteIcon = wayfareIcon(MapPinIcon);
export const CarryOnIcon = wayfareIcon(BriefcaseIcon);
export const TagIcon = wayfareIcon(HeroTagIcon);
export const CheckIcon = wayfareIcon(HeroCheckIcon);
export const CheckCircleIcon = wayfareIcon(HeroCheckCircleIcon);
export const ExclamationCircleIcon = wayfareIcon(HeroExclamationCircleIcon);
export const BedIcon = wayfareIcon(BuildingOffice2Icon);
export const StarIcon = wayfareIcon(HeroStarIcon);
export const CarIcon = wayfareIcon(TruckIcon);
export const CompassIcon = wayfareIcon(MapIcon);
export const ListIcon = wayfareIcon(ListBulletIcon);
export const PlusIcon = wayfareIcon(HeroPlusIcon);
export const ChevronLeftIcon = wayfareIcon(HeroChevronLeftIcon);
export const ChevronRightIcon = wayfareIcon(HeroChevronRightIcon);
export const XMarkIcon = wayfareIcon(HeroXMarkIcon);
