import { useEffect, useRef, useState } from 'react';
import { Action } from '../helpers.js';
import type { GatewayError } from '../flight-runtime.js';
import { PlaneIcon } from './icons.js';

const RETRY_DELAY_MS = 60_000;

/** A user-initiated retry; the timer never makes requests on its own. */
export function FlightSearchRecovery({ error, onRetry, onEdit }: {
  readonly error?: GatewayError;
  readonly onRetry?: () => Promise<void>;
  readonly onEdit?: () => void;
}) {
  const needsEdit = error && ['invalid_search', 'invalid_request'].includes(error.code);
  const canRetry = Boolean(onRetry && (!error || error.retryable));
  const [deadline, setDeadline] = useState(() => Date.now() + RETRY_DELAY_MS);
  const [seconds, setSeconds] = useState(60);
  const [status, setStatus] = useState<'waiting' | 'sending' | 'sent'>('waiting');
  const [retryFailed, setRetryFailed] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!canRetry || status !== 'waiting') return;
    const update = () => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [canRetry, deadline, status]);

  async function retry() {
    if (!canRetry || !onRetry || inFlight.current || Date.now() < deadline) return;
    inFlight.current = true;
    setStatus('sending');
    setRetryFailed(false);
    try {
      await onRetry();
      setStatus('sent');
    } catch {
      setRetryFailed(true);
      setDeadline(Date.now() + RETRY_DELAY_MS);
      setSeconds(60);
      setStatus('waiting');
      inFlight.current = false;
    }
  }

  return <section className="cc-search-recovery" aria-label="Flight search update">
    <span className="cc-search-recovery-icon" aria-hidden="true"><PlaneIcon /></span>
    <div className="cc-search-recovery-copy">
      <h2>{needsEdit ? 'Let’s check your search details' : 'We couldn’t load your flight options'}</h2>
      <p>{needsEdit
        ? 'Review your airports, dates, and travelers, then search again.'
        : canRetry
          ? 'Give it a moment, then try the same search again. You can also continue in the conversation.'
          : 'Please try again later, or continue planning in the conversation.'}</p>
      <p className="cc-search-recovery-status" role="status">
        {status === 'sent' ? 'Search requested. New results will appear in the conversation.'
          : status === 'sending' ? 'Requesting a fresh search…'
            : retryFailed ? 'The retry didn’t go through. Please wait a moment before trying again.' : null}
      </p>
    </div>
    <div className="cc-search-recovery-actions">
      {canRetry ? <Action
        disabled={seconds > 0 || status !== 'waiting'}
        onClick={() => { void retry(); }}
      >{status === 'sent' ? 'Search requested' : status === 'sending' ? 'Retrying…' : seconds > 0 ? `Try again in ${seconds}s` : 'Try again'}</Action> : null}
      {needsEdit && onEdit ? <Action onClick={onEdit}>Edit search</Action> : null}
    </div>
  </section>;
}
