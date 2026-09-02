import { ImmersiveExplorePage } from '../../src/components/experience/immersive-explore-page';
import { resolvePublicAssistantRuntime } from '../../src/lib/assistant-config';

export default function ExperiencePage() {
  return <ImmersiveExplorePage runtime={resolvePublicAssistantRuntime(process.env)} />;
}
