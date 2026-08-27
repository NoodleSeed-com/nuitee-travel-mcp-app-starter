'use client';

import type {
  AssistantClient,
  AssistantConfirmationData,
  AssistantInteractionResponse,
  AssistantUIMessage,
} from '@noodleseed/assistant/client';
import { TravelMarkdown } from './travel-markdown';
import { TravelViewRegistry } from './travel-view-registry';

type MessagePart = AssistantUIMessage['parts'][number];

interface TravelMessageProps {
  readonly client: AssistantClient;
  readonly message: AssistantUIMessage;
  readonly theme?: 'light' | 'dark';
}

const SENSITIVE_ARGUMENT_KEY = /(?:auth|booking|card|cookie|credential|cvc|cvv|key|passport|password|payment|provider|reservation|secret|session|token)|(?:^|[_-])id$|Id$/i;
const MAX_VISIBLE_ARGUMENTS = 6;
const MAX_ARGUMENT_LENGTH = 120;

function argumentLabel(key: string) {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return words ? `${words[0]?.toUpperCase()}${words.slice(1)}` : '';
}

function safeArguments(
  value: AssistantConfirmationData['arguments'],
): readonly [label: string, value: string][] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];

  const visible: [string, string][] = [];
  for (const [key, candidate] of Object.entries(value)) {
    if (visible.length >= MAX_VISIBLE_ARGUMENTS) break;
    if (!key || key.length > 48 || SENSITIVE_ARGUMENT_KEY.test(key)) continue;
    if (
      typeof candidate !== 'string'
      && typeof candidate !== 'number'
      && typeof candidate !== 'boolean'
    ) {
      continue;
    }
    if (typeof candidate === 'number' && !Number.isFinite(candidate)) continue;
    const rendered = String(candidate);
    if (!rendered || rendered.length > MAX_ARGUMENT_LENGTH) continue;
    const label = argumentLabel(key);
    if (label) visible.push([label, rendered]);
  }
  return visible;
}

async function respondSafely(
  client: AssistantClient,
  id: string,
  response: AssistantInteractionResponse,
) {
  try {
    await client.respond(id, response);
  } catch {
    // The hook projects structured failures; never expose transport details here.
  }
}

function ConfirmationPart({
  client,
  confirmation,
}: Readonly<{
  client: AssistantClient;
  confirmation: AssistantConfirmationData;
}>) {
  const argumentsToReview = safeArguments(confirmation.arguments);
  const pending = confirmation.status === 'pending';

  return (
    <section aria-label="Confirmation request" className="travel-confirmation">
      <h3>{confirmation.title ?? 'Confirm this action?'}</h3>
      {confirmation.description ? <p>{confirmation.description}</p> : null}
      {argumentsToReview.length > 0 ? (
        <dl>
          {argumentsToReview.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {pending ? (
        <div>
          <button
            onClick={() => {
              void respondSafely(client, confirmation.id, { action: 'accept' });
            }}
            type="button"
          >
            Confirm
          </button>
          <button
            onClick={() => {
              void respondSafely(client, confirmation.id, { action: 'decline' });
            }}
            type="button"
          >
            Don&apos;t proceed
          </button>
        </div>
      ) : (
        <p role="status">This confirmation is {confirmation.status}.</p>
      )}
    </section>
  );
}

function messagePartKey(
  messageId: string,
  part: MessagePart,
  index: number,
) {
  if (part.type === 'data-view') {
    return `${part.data.id}:${part.data.resourceUri}`;
  }
  return `${messageId}:${index}`;
}

function TravelMessagePart({
  client,
  part,
  theme,
}: Readonly<{
  client: AssistantClient;
  part: MessagePart;
  theme: 'light' | 'dark';
}>) {
  switch (part.type) {
    case 'text':
      return <TravelMarkdown>{part.text}</TravelMarkdown>;
    case 'data-view':
      return (
        <TravelViewRegistry client={client} theme={theme} view={part.data} />
      );
    case 'data-confirmation':
      return <ConfirmationPart client={client} confirmation={part.data} />;
    case 'data-input-request':
      return (
        <section aria-label="Input request" className="travel-input-request">
          <p>This travel template cannot collect the requested form.</p>
          {part.data.status === 'pending' ? (
            <button
              onClick={() => {
                void respondSafely(client, part.data.id, { action: 'cancel' });
              }}
              type="button"
            >
              Cancel request
            </button>
          ) : (
            <p role="status">This input request is {part.data.status}.</p>
          )}
        </section>
      );
    case 'data-tool-result':
      return null;
    default:
      return <p role="status">This message content is unavailable.</p>;
  }
}

export function TravelMessage({
  client,
  message,
  theme = 'light',
}: Readonly<TravelMessageProps>) {
  return (
    <article
      aria-label={message.role === 'user' ? 'Traveler message' : 'Assistant message'}
      className={`travel-message travel-message--${message.role}`}
    >
      {message.parts.map((part, index) => (
        <TravelMessagePart
          client={client}
          key={messagePartKey(message.id, part, index)}
          part={part}
          theme={theme}
        />
      ))}
    </article>
  );
}
