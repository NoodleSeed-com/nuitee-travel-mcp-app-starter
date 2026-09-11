'use client';

import { createContext, useContext } from 'react';
import type { BusinessBrand } from '../lib/business-brand';
import { WayfareMark } from './wayfare-mark';

export const BusinessBrandContext = createContext<BusinessBrand | undefined>(undefined);
export const useBusinessBrand = () => useContext(BusinessBrandContext);

export function BusinessMark() {
  const brand = useBusinessBrand();
  return brand && brand.name !== 'Wayfare'
    ? <span className="business-initials" aria-hidden="true">{brand.initials}</span>
    : <WayfareMark />;
}
