import type React from 'react';
import { siteConfig } from '../lib/site-config';
import { WayfareMark } from './wayfare-mark';

export function TravelFooter(): React.JSX.Element {
  return (
    <footer className="travel-footer travel-landing__section">
      <div className="travel-footer__brand">
        <a aria-label="Wayfare home" className="travel-footer__lockup" href="/">
          <span aria-hidden="true" className="travel-footer__mark">
            <WayfareMark />
          </span>
          <span>{siteConfig.brand.name}</span>
        </a>
        <p>{siteConfig.brand.tagline}</p>
      </div>
      <nav aria-label="Travel footer">
        <a href={siteConfig.website.developerPath}>For developers</a>
        <a href={siteConfig.website.supportPath}>Support</a>
        {siteConfig.website.privacyUrl ? <a href={siteConfig.website.privacyUrl}>Privacy</a> : null}
        {siteConfig.website.termsUrl ? <a href={siteConfig.website.termsUrl}>Terms</a> : null}
      </nav>
      <p className="travel-footer__meta">© {new Date().getFullYear()} Wayfare</p>
    </footer>
  );
}
