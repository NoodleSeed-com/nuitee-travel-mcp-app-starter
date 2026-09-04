import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { resolvePublicAssistantRuntime } from '../src/lib/assistant-config';
import { resolveRequestCountry } from '../src/lib/request-country';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';
import { WayfareStructuredData } from '../src/components/wayfare-structured-data';
import { routeMetadata } from '../src/lib/seo-config';

export const metadata: Metadata = routeMetadata.home;

export default async function HomePage() {
  const runtime = resolvePublicAssistantRuntime(process.env);
  const initialCountry = await resolveRequestCountry(await headers(), {
    token: process.env.IPINFO_TOKEN,
  });

  return (
    <>
      <WayfareStructuredData />
      <TravelAssistantPage
        initialCountry={initialCountry}
        runtime={runtime}
      />
    </>
  );
}
