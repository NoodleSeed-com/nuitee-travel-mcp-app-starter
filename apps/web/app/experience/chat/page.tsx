import type { Metadata } from 'next';
import { ImmersiveChatPage } from '../../../src/components/experience/immersive-chat-page';
import { resolvePublicAssistantRuntime } from '../../../src/lib/assistant-config';
import { routeMetadata } from '../../../src/lib/seo-config';

export const metadata: Metadata = {
  title: 'Wayfare conversation',
  ...routeMetadata.chat,
};

export default function ExperienceChatPage() {
  return <ImmersiveChatPage runtime={resolvePublicAssistantRuntime(process.env)} />;
}
