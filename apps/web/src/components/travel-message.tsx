'use client';

import type {
  AssistantClient,
  AssistantConfirmationData,
  AssistantInteractionResponse,
  AssistantUIMessage,
} from '@noodleseed/assistant/client';
import { useRef, useState } from 'react';
import {
  parseTravelInputSchema,
  type TravelInputField,
} from '../lib/input-request';
import { TravelMarkdown } from './travel-markdown';
import { TravelViewRegistry } from './travel-view-registry';

type MessagePart = AssistantUIMessage['parts'][number];

interface TravelMessageProps {
  readonly client: AssistantClient;
  readonly message: AssistantUIMessage;
}

const MAX_VISIBLE_ARGUMENTS = 6;
const MAX_ARGUMENT_LENGTH = 120;
const MAX_CONFIRMATION_TITLE_LENGTH = 80;
const MAX_CONFIRMATION_DESCRIPTION_LENGTH = 240;
const MAX_INPUT_VALUE_LENGTH = 50;
const UNSAFE_DISPLAY_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu;
const UNSAFE_INPUT_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;

function reviewArgumentLabel(key: string): string | undefined {
  switch (key) {
    case 'origin':
      return 'Origin';
    case 'destination':
      return 'Destination';
    case 'departureDate':
      return 'Departure date';
    case 'returnDate':
      return 'Return date';
    case 'adults':
      return 'Adults';
    case 'children':
      return 'Children';
    case 'infants':
      return 'Infants';
    case 'cabinClass':
      return 'Cabin class';
    default:
      return undefined;
  }
}

function boundedDisplayString(
  value: string,
  maximumLength: number,
): string | undefined {
  const normalized = value
    .replace(UNSAFE_DISPLAY_CHARACTERS, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (!normalized) return undefined;

  const characters = Array.from(normalized);
  if (characters.length <= maximumLength) return normalized;
  return `${characters.slice(0, maximumLength - 1).join('').trimEnd()}…`;
}

function safeArguments(
  value: AssistantConfirmationData['arguments'],
): readonly [label: string, value: string][] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];

  const visible: [string, string][] = [];
  for (const [key, candidate] of Object.entries(value)) {
    if (visible.length >= MAX_VISIBLE_ARGUMENTS) break;
    const label = reviewArgumentLabel(key);
    if (!label) continue;
    if (
      typeof candidate !== 'string'
      && typeof candidate !== 'number'
      && typeof candidate !== 'boolean'
    ) {
      continue;
    }
    if (typeof candidate === 'number' && !Number.isFinite(candidate)) continue;
    const rendered = boundedDisplayString(
      String(candidate),
      MAX_ARGUMENT_LENGTH,
    );
    if (rendered) visible.push([label, rendered]);
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

function useSingleInteractionResponse(client: AssistantClient, id: string) {
  const submittedIdRef = useRef<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  function submit(response: AssistantInteractionResponse) {
    if (submittedIdRef.current === id) return;
    submittedIdRef.current = id;
    setSubmittedId(id);
    void respondSafely(client, id, response);
  }

  return {
    locked: submittedId === id,
    submit,
  };
}

function isBoundedInputValue(value: string): boolean {
  return (
    value.length > 0
    && Array.from(value).length <= MAX_INPUT_VALUE_LENGTH
    && !UNSAFE_INPUT_CHARACTERS.test(value)
  );
}

function acceptedInputValues(
  fields: readonly TravelInputField[],
  values: Readonly<Record<string, string>>,
): Record<string, string | number> | null {
  const content: Record<string, string | number> = {};

  for (const field of fields) {
    const value = values[field.name]?.trim() ?? '';
    if (!value) {
      if (field.required) return null;
      continue;
    }
    if (!isBoundedInputValue(value)) return null;

    if (field.kind === 'integer') {
      const number = Number(value);
      if (!Number.isInteger(number) || number < field.minimum || number > field.maximum) {
        return null;
      }
      content[field.name] = number;
      continue;
    }
    if (field.kind === 'select' && !field.options.includes(value)) return null;
    if (field.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
    content[field.name] = value;
  }

  return content;
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
  const { locked, submit } = useSingleInteractionResponse(
    client,
    confirmation.id,
  );
  const title = boundedDisplayString(
    confirmation.title ?? '',
    MAX_CONFIRMATION_TITLE_LENGTH,
  ) ?? 'Confirm this action?';
  const description = boundedDisplayString(
    confirmation.description ?? '',
    MAX_CONFIRMATION_DESCRIPTION_LENGTH,
  );

  return (
    <section
      aria-busy={locked || undefined}
      aria-label="Confirmation request"
      className="travel-confirmation travel-interaction-card"
    >
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
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
        <div className="travel-interaction-card__actions">
          <button
            disabled={locked}
            onClick={() => {
              submit({ action: 'accept' });
            }}
            type="button"
          >
            Confirm
          </button>
          <button
            disabled={locked}
            onClick={() => {
              submit({ action: 'decline' });
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

function InputRequestPart({
  client,
  inputRequest,
}: Readonly<{
  client: AssistantClient;
  inputRequest: Extract<MessagePart, { type: 'data-input-request' }>['data'];
}>) {
  const { locked, submit } = useSingleInteractionResponse(
    client,
    inputRequest.id,
  );
  const fields = parseTravelInputSchema(inputRequest.requestedSchema);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isInvalid, setIsInvalid] = useState(false);
  const message = boundedDisplayString(inputRequest.message, 120)
    ?? 'Complete your trip details.';

  if (fields && inputRequest.status === 'pending') {
    return (
      <section
        aria-busy={locked || undefined}
        aria-label="Input request"
        className="travel-input-request travel-interaction-card"
      >
        <h3>{message}</h3>
        <form
          aria-label="Complete trip details"
          onSubmit={(event) => {
            event.preventDefault();
            const content = acceptedInputValues(fields, values);
            if (!content) {
              setIsInvalid(true);
              return;
            }
            submit({ action: 'accept', content });
          }}
        >
          <fieldset disabled={locked}>
            {fields.map((field) => (
              <label className="travel-input-request__field" key={field.name}>
                <span>{field.label}</span>
                {field.kind === 'select' ? (
                  <select
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setValues((current) => ({
                        ...current,
                        [field.name]: value,
                      }));
                    }}
                    required={field.required}
                    value={values[field.name] ?? ''}
                  >
                    <option value="">Select {field.label}</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    max={field.kind === 'integer' ? field.maximum : undefined}
                    maxLength={field.kind === 'integer' ? undefined : MAX_INPUT_VALUE_LENGTH}
                    min={field.kind === 'integer' ? field.minimum : undefined}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setValues((current) => ({
                        ...current,
                        [field.name]: value,
                      }));
                    }}
                    required={field.required}
                    type={field.kind === 'integer' ? 'number' : field.kind}
                    value={values[field.name] ?? ''}
                  />
                )}
              </label>
            ))}
            {isInvalid ? (
              <p className="travel-input-request__error" role="status">
                Complete the required trip details.
              </p>
            ) : null}
            <div className="travel-input-request__actions travel-interaction-card__actions">
              <button type="submit">Continue</button>
              <button
                onClick={() => {
                  submit({ action: 'cancel' });
                }}
                type="button"
              >
                Cancel request
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    );
  }

  return (
    <section
      aria-busy={locked || undefined}
      aria-label="Input request"
      className="travel-input-request travel-interaction-card"
    >
      <p>This travel template cannot collect the requested form.</p>
      {inputRequest.status === 'pending' ? (
        <button
          disabled={locked}
          onClick={() => {
            submit({ action: 'cancel' });
          }}
          type="button"
        >
          Cancel request
        </button>
      ) : (
        <p role="status">This input request is {inputRequest.status}.</p>
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
}: Readonly<{
  client: AssistantClient;
  part: MessagePart;
}>) {
  switch (part.type) {
    case 'text':
      return <TravelMarkdown>{part.text}</TravelMarkdown>;
    case 'data-view':
      return <TravelViewRegistry client={client} view={part.data} />;
    case 'data-confirmation':
      return <ConfirmationPart client={client} confirmation={part.data} />;
    case 'data-input-request':
      return <InputRequestPart client={client} inputRequest={part.data} />;
    case 'data-tool-result':
      return null;
    default:
      return <p role="status">This message content is unavailable.</p>;
  }
}

export function TravelMessage({
  client,
  message,
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
        />
      ))}
    </article>
  );
}
