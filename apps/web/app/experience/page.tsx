import type { Metadata } from 'next';
import { ImmersiveExplorePage } from '../../src/components/experience/immersive-explore-page';
import { resolvePublicAssistantRuntime } from '../../src/lib/assistant-config';
import { routeMetadata } from '../../src/lib/seo-config';

export const metadata: Metadata = {
  title: 'Wayfare experience',
  ...routeMetadata.experience,
};

export default function ExperiencePage() {
  return <ImmersiveExplorePage runtime={resolvePublicAssistantRuntime(process.env)} />;
}
