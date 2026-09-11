'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function BusinessPreview({ children, portalOrigin, releaseId }: {
  readonly children?: ReactNode;
  readonly portalOrigin: string;
  readonly releaseId?: string;
}) {
  const started = useRef(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(location.hash.slice(1));
    let ticket = fragment.get('ticket');
    // Fragments never go to the server. Remove even invalid ones before exchange.
    if (location.hash) history.replaceState(null, '', location.pathname);
    if (!ticket) { setChecking(false); return; }
    if (!/^[A-Za-z0-9_-]{20,256}$/.test(ticket)) {
      ticket = null; setError('This preview link is invalid. Open a new preview from your studio.'); setChecking(false); return;
    }
    void fetch('/api/business/preview/exchange', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }), signal: AbortSignal.timeout(12_000),
    }).then(response => {
      if (!response.ok) throw new Error('exchange failed');
      location.replace('/studio-preview');
    }).catch(() => {
      setError('This preview link has expired or could not connect. Open a new preview from your studio.');
      setChecking(false);
    }).finally(() => { ticket = null; });
  }, []);
  const ready = !checking && !error && Boolean(releaseId);
  return <>
    <aside className="business-preview-banner" aria-label="Private preview">
      <span>Private preview{ready ? ` · version ${releaseId!.slice(-8)}` : ''}. Your published traveler is unchanged.</span>
      <a href={portalOrigin} rel="noreferrer">Return to your studio</a>
    </aside>
    {ready ? children : <main className="business-preview-status">
      <h1>{checking ? 'Opening your private preview' : 'Open this preview from your studio'}</h1>
      <p role={error ? 'alert' : 'status'}>{error || (checking ? 'Checking this preview session…' : 'Sign in to your business portal and create a new private preview. This link does not grant public access.')}</p>
    </main>}
  </>;
}
