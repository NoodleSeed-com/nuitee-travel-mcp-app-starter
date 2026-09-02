import { ImmersiveChatPage } from '../../../src/components/experience/immersive-chat-page';
import { resolvePublicAssistantRuntime } from '../../../src/lib/assistant-config';

export default function ExperienceChatPage() {
  return <ImmersiveChatPage runtime={resolvePublicAssistantRuntime(process.env)} />;
}
