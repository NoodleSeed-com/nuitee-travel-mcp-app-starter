import type { ReactNode } from 'react';
import { siteConfig } from '../lib/site-config';
import { WayfareMark } from './wayfare-mark';

export interface LegalSection {
  readonly id: string;
  readonly title: string;
  readonly content: ReactNode;
}

interface LegalDocumentProps {
  readonly description: string;
  readonly sections: readonly LegalSection[];
  readonly title: string;
}

export function LegalDocument({
  description,
  sections,
  title,
}: Readonly<LegalDocumentProps>) {
  const alternateTitle = title === 'Privacy policy'
    ? 'Terms of service'
    : 'Privacy policy';
  const alternateHref = title === 'Privacy policy' ? '/terms' : '/privacy';

  return (
    <main className="legal-page">
      <a className="skip-link" href="#legal-document">Skip to document</a>
      <div className="legal-page__frame">
        <header className="legal-page__header">
          <a aria-label="Wayfare home" className="travel-wordmark" href="/">
            <span aria-hidden="true" className="travel-wordmark__mark">
              <WayfareMark />
            </span>
            <span>{siteConfig.brand.name}</span>
          </a>
          <nav aria-label="Legal navigation">
            <a href={alternateHref}>{alternateTitle}</a>
            <a className="legal-page__home" href="/">Back to Wayfare</a>
          </nav>
        </header>

        <article id="legal-document" className="legal-document">
          <header className="legal-document__intro">
            <p className="legal-document__date">Last updated 4 September 2026</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>

          <nav aria-label={`Sections in ${title}`} className="legal-document__index">
            <p>On this page</p>
            <ol>
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="legal-document__content">
            {sections.map((section) => (
              <section id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.content}
              </section>
            ))}
          </div>
        </article>

        <footer className="legal-page__footer">
          <span>© {new Date().getFullYear()} Wayfare</span>
          <a href={siteConfig.website.supportPath}>Support</a>
          <a href={alternateHref}>{alternateTitle}</a>
        </footer>
      </div>
    </main>
  );
}
