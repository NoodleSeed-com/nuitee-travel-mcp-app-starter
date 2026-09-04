import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '../../src/components/legal-document';
import { routeMetadata } from '../../src/lib/seo-config';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'Terms for using the Wayfare demonstration experience.',
  ...routeMetadata.terms,
};

const sections: readonly LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of these terms',
    content: (
      <p>
        By using Wayfare, you agree to these Terms and the
        {' '}<a href="/privacy">Privacy policy</a>. If you do not agree, do not use
        the service. You must be at least 18 years old and able to enter a binding
        agreement where you live.
      </p>
    ),
  },
  {
    id: 'demonstration',
    title: 'Demonstration service',
    content: (
      <>
        <p>
          Wayfare is a guest-first demonstration of conversational travel
          discovery. It can search current flight information through a connected
          provider and can show clearly labelled illustrative previews for other
          travel capabilities.
        </p>
        <p>
          The service may change, pause, or stop without notice. Guest sessions
          are temporary, and Wayfare does not promise that conversation history or
          selections will remain available.
        </p>
      </>
    ),
  },
  {
    id: 'no-booking',
    title: 'No booking relationship',
    content: (
      <p>
        Wayfare does not book, hold inventory, issue tickets, take payment,
        redeem rewards, sell insurance, or confirm a trip. Search results and
        verified fares are informational snapshots. A booking exists only when a
        separate authorised provider expressly confirms it under that provider&apos;s
        terms.
      </p>
    ),
  },
  {
    id: 'results',
    title: 'Travel information and provider terms',
    content: (
      <p>
        Prices, schedules, availability, baggage, cancellation terms, and other
        travel details can change at any time. You are responsible for reviewing
        the final provider offer, traveller names, dates, visa and entry rules,
        health requirements, and all provider conditions before taking action.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    content: (
      <>
        <p>You must not:</p>
        <ul>
          <li>Use Wayfare unlawfully, deceptively, or to harm another person.</li>
          <li>Probe, overload, scrape, reverse engineer, or bypass service limits.</li>
          <li>Submit malware, credentials, payment details, or sensitive documents.</li>
          <li>Misrepresent demonstration output as a confirmed booking or official advice.</li>
          <li>Interfere with the website, assistant, providers, or other users.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'content',
    title: 'Your content',
    content: (
      <p>
        You keep ownership of the content you submit. You give Wayfare and its
        service providers permission to process that content only as needed to
        operate, secure, and improve the requested experience. You are responsible
        for having the right to provide the information you submit.
      </p>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Wayfare materials',
    content: (
      <p>
        The Wayfare name, interface, visual system, software, and documentation
        are protected by applicable intellectual-property laws. These Terms give
        you a limited, revocable, non-transferable right to use the service for
        its intended demonstration purpose and no ownership rights.
      </p>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-party services',
    content: (
      <p>
        Wayfare relies on third-party hosting, assistant, model, location, and
        travel providers. Their services and any links they supply are governed by
        their own terms and privacy policies. Wayfare is not responsible for a
        third party&apos;s independent acts, availability, or content.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    content: (
      <p>
        To the fullest extent permitted by law, Wayfare is provided “as is” and
        “as available,” without warranties that results will be complete,
        accurate, uninterrupted, or suitable for a particular trip. Wayfare does
        not provide legal, immigration, medical, financial, or insurance advice.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limits of liability',
    content: (
      <p>
        To the fullest extent permitted by law, Wayfare and its contributors will
        not be liable for indirect, incidental, special, consequential, or lost-
        opportunity damages arising from the service or reliance on its output.
        Nothing in these Terms excludes liability that applicable law does not
        allow us to exclude.
      </p>
    ),
  },
  {
    id: 'suspension',
    title: 'Suspension and changes',
    content: (
      <p>
        We may restrict or end access when necessary to protect Wayfare, its
        providers, or other users, or when these Terms are violated. We may update
        these Terms as the demonstration changes. Continued use after an update
        means you accept the revised Terms where permitted by law.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <p>
        Questions about these Terms can be submitted through the
        {' '}<a href="/developers#support">Wayfare Support page</a>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      description="The conditions for using Wayfare’s guest travel demonstration and connected provider results."
      sections={sections}
      title="Terms of service"
    />
  );
}
