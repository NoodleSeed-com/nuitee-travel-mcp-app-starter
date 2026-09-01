import type React from 'react';
import { siteConfig } from '../lib/site-config';

export function TravelFooter(): React.JSX.Element {
  return (
    <footer className="travel-footer travel-landing__section">
      <div className="travel-footer__brand">
        <p>{siteConfig.brand.name}</p>
        <span>{siteConfig.brand.tagline}</span>
      </div>
      <nav aria-label="Travel footer">
        <a href={siteConfig.website.developerPath}>For developers</a>
        <a href={siteConfig.website.supportPath}>Support</a>
        {siteConfig.website.privacyUrl ? (
          <a href={siteConfig.website.privacyUrl}>Privacy</a>
        ) : (
          <span className="travel-footer__unconfigured">
            <span>Privacy</span>
            <small>Not configured</small>
          </span>
        )}
        {siteConfig.website.termsUrl ? (
          <a href={siteConfig.website.termsUrl}>Terms</a>
        ) : (
          <span className="travel-footer__unconfigured">
            <span>Terms</span>
            <small>Not configured</small>
          </span>
        )}
      </nav>
      <div className="travel-footer__session">
        <p>Guest session</p>
        <span>No account is required to plan a trip.</span>
      </div>
      <p className="travel-footer__attribution">
        Built on Noodle Seed · Powered by Nuitee
      </p>
    </footer>
  );
}
