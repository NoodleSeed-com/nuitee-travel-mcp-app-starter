import { describe, expect, it } from 'vitest';
import { presentAssistantError } from '../src/lib/assistant-error';

describe('assistant error presentation', () => {
  it('does not offer retry for a public budget refusal', () => {
    expect(presentAssistantError({
      name: 'AssistantClientError',
      message: 'budget exhausted at https://private.example.com',
      detail: {
        code: 'session_exchange_failed',
        serviceCode: 'daily_turn_budget_exhausted',
        status: 429,
        retryable: false,
      },
    })).toEqual({
      title: 'The travel assistant is unavailable right now',
      message: 'The public assistant has reached its daily limit. Please try again later.',
      canRetry: false,
    });
  });

  it('asks for a fresh trip after an expired guest session', () => {
    expect(presentAssistantError({
      name: 'AssistantClientError',
      message: 'token abc123 expired',
      detail: {
        code: 'session_expired',
        status: 401,
        retryable: false,
      },
    })).toEqual({
      title: 'This guest session has expired',
      message: 'Start a new trip to continue.',
      canRetry: false,
    });
  });

  it('offers retry only for a client-reported retryable service failure', () => {
    expect(presentAssistantError({
      name: 'AssistantClientError',
      message: 'proxy leaked a raw response body',
      detail: {
        code: 'turn_failed',
        status: 503,
        retryable: true,
      },
    })).toEqual({
      title: 'The travel assistant hit a temporary problem',
      message: 'Try sending your message again.',
      canRetry: true,
    });
    expect(presentAssistantError({
      name: 'AssistantClientError',
      message: 'service claimed a permanent failure',
      detail: {
        code: 'turn_failed',
        status: 503,
        retryable: false,
      },
    }).canRetry).toBe(false);
  });

  it('presents setup-required without echoing configuration details', () => {
    expect(presentAssistantError({
      name: 'AssistantClientError',
      message: 'missing NEXT_PUBLIC_SECRET at https://private.example.com',
      detail: {
        code: 'setup_required',
        retryable: false,
      },
    })).toEqual({
      title: 'The travel assistant needs setup',
      message: 'Ask the site developer to finish the public assistant configuration.',
      canRetry: false,
    });
  });

  it('fails closed for unknown terminal errors without reflecting raw data', () => {
    const presentation = presentAssistantError({
      name: 'Error',
      message: 'NUITEE_API_KEY=secret https://api.example.com/search_flights',
      stack: 'private stack',
    });

    expect(presentation).toEqual({
      title: 'The travel assistant could not continue',
      message: 'Start a new trip or try again later.',
      canRetry: false,
    });
    expect(JSON.stringify(presentation)).not.toMatch(
      /NUITEE|secret|https?:|search_flights|stack/i,
    );
  });
});
