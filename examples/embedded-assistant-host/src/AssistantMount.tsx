import { NoodleAssistant } from '@noodleseed/assistant/react';

export default function AssistantMount(props: { readonly onError: () => void }) {
  return (
    <NoodleAssistant
      sessionEndpoint="/api/assistant/session"
      theme="auto"
      open
      onError={props.onError}
    />
  );
}
