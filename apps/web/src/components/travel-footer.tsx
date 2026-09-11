'use client';

import type React from 'react';
import { siteConfig } from '../lib/site-config';
import { BusinessMark, useBusinessBrand } from './business-brand';

export function TravelFooter(): React.JSX.Element {
  const brand = useBusinessBrand();
  return (
    <footer className="travel-footer travel-landing__section">
      <div className="travel-footer__brand">
        <a aria-label={`${brand?.name || 'Wayfare'} home`} className="travel-footer__lockup" href="/">
          <span aria-hidden="true" className="travel-footer__mark">
            <BusinessMark />
          </span>
          <span>{brand?.name || siteConfig.brand.name}</span>
        </a>
        <p>{siteConfig.brand.tagline}</p>
      </div>
      <nav aria-label="Travel footer">
        <a href={siteConfig.website.developerPath}>For developers</a>
        <a href={siteConfig.website.supportPath}>Support</a>
        {siteConfig.website.privacyUrl ? <a href={siteConfig.website.privacyUrl}>Privacy</a> : null}
        {siteConfig.website.termsUrl ? <a href={siteConfig.website.termsUrl}>Terms</a> : null}
      </nav>
      <p className="travel-footer__meta">© {new Date().getFullYear()} {brand?.name || 'Wayfare'}</p>
    </footer>
  );
}
