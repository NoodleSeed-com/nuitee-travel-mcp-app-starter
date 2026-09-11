import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { businessConfig } from '../../src/lib/business-config';
import { previewToken } from '../../src/lib/business-preview';
import { storefront } from '../../src/lib/business-storefront';
import { BusinessPreview } from '../../src/components/business-preview';
import { TravelAssistantPage } from '../../src/components/travel-assistant-page';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Private studio preview', robots: { index: false, follow: false } };

export default async function StudioPreviewPage() {
  let config;
  try { config = businessConfig(process.env); } catch { config = null; }
  const requestHeaders = await headers();
  const allowedHost = config && requestHeaders.get('host') === new URL(config.storefrontOrigin).host;
  const validToken = config && allowedHost ? previewToken(requestHeaders.get('cookie'), config.previewCookie) : undefined;
  const snapshot = config && validToken ? await storefront(process.env, validToken) : null;
  const ready = snapshot && snapshot.releaseId && snapshot.runtime.status === 'ready';
  return <BusinessPreview portalOrigin={config?.portalOrigin || 'http://127.0.0.1:3103'} releaseId={ready ? snapshot.releaseId : undefined}>
    {ready ? <TravelAssistantPage key={snapshot.releaseId} businessMode brand={snapshot.brand} runtime={snapshot.runtime} /> : null}
  </BusinessPreview>;
}
