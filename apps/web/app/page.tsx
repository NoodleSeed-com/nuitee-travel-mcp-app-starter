import { headers } from 'next/headers';
import { resolvePublicAssistantRuntime } from '../src/lib/assistant-config';
import { resolveRequestCountry } from '../src/lib/request-country';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';

export default async function HomePage() {
  const runtime = resolvePublicAssistantRuntime(process.env);
  const initialCountry = await resolveRequestCountry(await headers(), {
    token: process.env.IPINFO_TOKEN,
  });

  return (
    <TravelAssistantPage
      initialCountry={initialCountry}
      runtime={runtime}
    />
  );
}
