import type React from 'react';
import { starterConfig } from '../../../../starter.config';

export function TravelFooter(): React.JSX.Element {
  return (
    <footer className="travel-footer travel-landing__section" role="contentinfo">
      <div className="travel-footer__brand">
        <p>{starterConfig.brand.name}</p>
        <span>{starterConfig.brand.tagline}</span>
      </div>
      <nav aria-label="Travel footer">
        <a href={starterConfig.website.developerPath}>For developers</a>
        <a href={starterConfig.website.supportPath}>Support</a>
        {starterConfig.website.privacyUrl ? (
          <a href={starterConfig.website.privacyUrl}>Privacy</a>
        ) : (
          <span className="travel-footer__unconfigured">
            <span>Privacy</span>
            <small>Not configured</small>
          </span>
        )}
        {starterConfig.website.termsUrl ? (
          <a href={starterConfig.website.termsUrl}>Terms</a>
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
