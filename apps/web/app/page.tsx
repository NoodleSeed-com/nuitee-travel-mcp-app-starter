import { resolvePublicAssistantRuntime } from '../src/lib/assistant-config';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';

export default function HomePage() {
  const runtime = resolvePublicAssistantRuntime(process.env);

  return <TravelAssistantPage runtime={runtime} />;
}
