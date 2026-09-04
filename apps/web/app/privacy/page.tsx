import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '../../src/components/legal-document';
import { routeMetadata } from '../../src/lib/seo-config';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How the Wayfare demonstration experience handles information.',
  ...routeMetadata.privacy,
};

const sections: readonly LegalSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <>
        <p>
          Wayfare is a guest-first travel demonstration. You can explore it
          without creating an account. The current experience does not create
          bookings, take payment, issue tickets, or collect passenger documents.
        </p>
        <p>
          This policy explains the information used when you visit Wayfare,
          describe a trip, compare results, or contact support.
        </p>
      </>
    ),
  },
  {
    id: 'information',
    title: 'Information we process',
    content: (
      <>
        <p>
          We process the trip details you choose to enter, such as routes,
          dates, passenger counts, cabin preferences, budgets, and requests for
          stays, rewards, or travel protection. Do not enter passport details,
          payment information, health information, or other sensitive data.
        </p>
        <p>
          The service also processes a selected currency, a coarse market
          country, short-lived guest-session information, and technical request
          data needed to operate and secure the experience.
        </p>
      </>
    ),
  },
  {
    id: 'location-defaults',
    title: 'How location defaults work',
    content: (
      <>
        <p>
          Wayfare does not request browser geolocation, precise coordinates, or
          access to your device location. You will not receive a location
          permission prompt from Wayfare.
        </p>
        <p>
          On supported deployments, the trusted hosting proxy supplies the
          request IP address to Wayfare&apos;s server. The server sends that address
          to IPinfo Lite solely to receive a two-letter country code. The browser
          receives only the derived country and currency default; the Wayfare
          application does not place the raw IP address in assistant context,
          cookies, local storage, or session storage.
        </p>
        <p>
          IP-derived country information can be wrong, particularly when you use
          a VPN or mobile network. You can always change the currency selector,
          and your explicit choice takes priority. When detection is unavailable,
          Wayfare falls back to your browser locale and then USD.
        </p>
      </>
    ),
  },
  {
    id: 'uses',
    title: 'How we use information',
    content: (
      <ul>
        <li>Provide and maintain the guest travel conversation.</li>
        <li>Search and compare the travel options you request.</li>
        <li>Choose a useful initial market and currency.</li>
        <li>Prevent abuse, diagnose failures, and protect the service.</li>
        <li>Respond when you ask for support.</li>
      </ul>
    ),
  },
  {
    id: 'providers',
    title: 'Service providers',
    content: (
      <>
        <p>
          Wayfare uses Fly.io for website hosting, Noodle Seed and its configured
          model providers for the embedded assistant, Nuitee for current flight
          searches, and IPinfo for coarse country detection when configured.
          Each provider receives only the information needed for its role and
          processes technical records under its own terms and policies.
        </p>
        <p>
          Hotels, loyalty, vouchers, experiences, and travel-protection views may
          contain clearly labelled illustrative data. Wayfare does not sell
          personal information or use trip prompts for advertising.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Storage and retention',
    content: (
      <>
        <p>
          The Wayfare website has no customer-account database and does not keep
          its own permanent conversation history. The active experience may use
          browser memory or session storage so a prompt and currency survive
          navigation during the same browser session.
        </p>
        <p>
          Infrastructure, assistant, model, and travel providers may retain
          limited operational records for security, reliability, and legal
          obligations. Retention periods are controlled by the relevant provider
          and deployment configuration.
        </p>
      </>
    ),
  },
  {
    id: 'basis-and-rights',
    title: 'Legal basis and your choices',
    content: (
      <>
        <p>
          Where data-protection law applies, information is processed to provide
          the service you request, for legitimate interests in operating and
          securing a low-impact demonstration, and with consent where the law
          requires it. Mandatory rights available in your location continue to
          apply.
        </p>
        <p>
          You can change the detected currency, start a new trip, clear the
          active conversation from Settings, avoid entering optional information,
          or stop using the service. To ask about access, correction, deletion,
          or another privacy right, use the <a href="/developers#support">Support page</a>.
        </p>
      </>
    ),
  },
  {
    id: 'security-and-transfers',
    title: 'Security and international processing',
    content: (
      <p>
        We use reasonable technical and organisational safeguards appropriate to
        a demonstration service. Providers may process information in countries
        other than your own, subject to their contractual and legal safeguards.
        No internet service can guarantee absolute security.
      </p>
    ),
  },
  {
    id: 'children-and-changes',
    title: 'Children and policy changes',
    content: (
      <>
        <p>
          Wayfare is not directed to children under 18, and we do not knowingly
          ask children for personal information.
        </p>
        <p>
          We may update this policy when the service or its providers change. The
          date at the top identifies the current version.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <p>
        Privacy questions and requests can be submitted through the
        {' '}<a href="/developers#support">Wayfare Support page</a>. Please do not
        include credentials, payment details, or sensitive travel documents.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      description="How Wayfare handles information across the website, guest assistant, and connected travel providers."
      sections={sections}
      title="Privacy policy"
    />
  );
}
