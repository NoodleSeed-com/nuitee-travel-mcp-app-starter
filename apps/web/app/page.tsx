import type { Metadata } from 'next';
import { cache } from 'react';
import { headers } from 'next/headers';
import { storefront } from '../src/lib/business-storefront';
import { resolveRequestCountry } from '../src/lib/request-country';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';
import { WayfareStructuredData } from '../src/components/wayfare-structured-data';
import { routeMetadata } from '../src/lib/seo-config';

const currentStorefront = cache(() => storefront());

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await currentStorefront();
  if (!resolved.businessMode || !resolved.brand) return routeMetadata.home;
  const { name, welcome } = resolved.brand;
  const title = `${name} — Travel assistant`;
  return {
    title: { absolute: title }, description: welcome, applicationName: name,
    alternates: { canonical: '/' }, robots: { index: false, follow: false },
    openGraph: { title, description: welcome, siteName: name, type: 'website', images: [] },
    twitter: { card: 'summary', title, description: welcome, images: [] },
  };
}

export default async function HomePage() {
  const resolved = await currentStorefront();
  const { runtime } = resolved;
  const initialCountry = await resolveRequestCountry(await headers(), {
    token: process.env.IPINFO_TOKEN,
  });

  return (
    <>
      {!resolved.businessMode ? <WayfareStructuredData /> : null}
      <TravelAssistantPage
        businessMode={resolved.businessMode}
        brand={'brand' in resolved ? resolved.brand : undefined}
        initialCountry={initialCountry}
        runtime={runtime}
      />
    </>
  );
}
