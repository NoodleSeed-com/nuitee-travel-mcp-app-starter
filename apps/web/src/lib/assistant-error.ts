export interface AssistantErrorPresentation {
  readonly title: string;
  readonly message: string;
  readonly canRetry: boolean;
}

interface StructuredErrorDetail {
  readonly code?: string;
  readonly serviceCode?: string;
  readonly status?: number;
  readonly retryable?: boolean;
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function structuredDetail(error: unknown): StructuredErrorDetail {
  const candidate = asRecord(error);
  const detail = asRecord(candidate?.detail);
  if (!detail) return {};
  return {
    ...(typeof detail.code === 'string' ? { code: detail.code } : {}),
    ...(typeof detail.serviceCode === 'string'
      ? { serviceCode: detail.serviceCode }
      : {}),
    ...(typeof detail.status === 'number' ? { status: detail.status } : {}),
    ...(typeof detail.retryable === 'boolean'
      ? { retryable: detail.retryable }
      : {}),
  };
}

export function presentAssistantError(
  error: unknown,
): AssistantErrorPresentation {
  const detail = structuredDetail(error);

  if (
    detail.code === 'setup_required'
    || detail.serviceCode === 'setup_required'
  ) {
    return {
      title: 'The travel assistant needs setup',
      message: 'Ask the site developer to finish the public assistant configuration.',
      canRetry: false,
    };
  }

  if (
    detail.status === 429
    || detail.serviceCode === 'daily_turn_budget_exhausted'
  ) {
    return {
      title: 'The travel assistant is unavailable right now',
      message: 'The public assistant has reached its daily limit. Please try again later.',
      canRetry: false,
    };
  }

  if (
    detail.code === 'session_expired'
    || detail.serviceCode === 'session_expired'
  ) {
    return {
      title: 'This guest session has expired',
      message: 'Start a new trip to continue.',
      canRetry: false,
    };
  }

  if (
    detail.retryable === true
    && typeof detail.status === 'number'
    && detail.status >= 500
    && detail.status < 600
  ) {
    return {
      title: 'The travel assistant hit a temporary problem',
      message: 'Try sending your message again.',
      canRetry: true,
    };
  }

  return {
    title: 'The travel assistant could not continue',
    message: 'Start a new trip or try again later.',
    canRetry: false,
  };
}
