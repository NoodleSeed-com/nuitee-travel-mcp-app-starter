import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FlightResultsView } from '../src/views/flight-results';
import { search } from './widget-preview-page';

const container = document.getElementById('widget-root')!;
const initial = container.dataset.state!;

function InteractiveFlightPreview() {
  const [state, setState] = useState(initial);
  const [view, setView] = useState<'results' | 'search'>('results');
  const [selected, setSelected] = useState<string>();
  const [notice, setNotice] = useState('');
  const invalid = state === 'Invalid search';
  const result = invalid ? {
    ...search, status: 'error' as const, itineraries: [],
    error: { code: 'invalid_request' as const, message: 'Invalid request', retryable: false },
  } : search;

  async function retry() {
    if (initial === 'Retry fails') throw new Error('Local simulated retry failure');
    setState('Loading');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setState('Results');
  }

  return <>
    {notice ? <p role="status">{notice}</p> : null}
    <FlightResultsView
      result={result}
      state={state === 'Loading' ? 'loading' : state === 'Error' || state === 'Retry fails' ? 'malformed' : undefined}
      displayMode="inline"
      view={view}
      selectedSelectionId={selected}
      onSelect={setSelected}
      onRetry={retry}
      onEdit={() => setView('search')}
      onBack={() => setView('results')}
      onSearchPrompt={() => { setView('results'); void retry(); }}
      onVerify={() => setNotice('This is a local visual fixture; no fare verification or booking was made.')}
    />
  </>;
}

createRoot(container).render(<InteractiveFlightPreview />);
