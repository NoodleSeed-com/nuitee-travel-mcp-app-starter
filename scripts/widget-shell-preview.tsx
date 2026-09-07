import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { AssistantClient, AssistantViewData } from '@noodleseed/assistant/client';
import { TravelViewRegistry } from '../apps/web/src/components/travel-view-registry';
import noodleStyles from '@noodleseed/one/react/styles.css?raw';
import travelStyles from '../src/views/travel.css?raw';

// Visual-only fixture: use the real host and widget markup without starting a
// hosted assistant session or making provider requests.
const client = {
  appSandboxUrl: () => undefined,
  sendMessage: async () => {},
  updateModelContext: () => {},
  requestApp: async () => ({}),
} as unknown as AssistantClient;

function widgetDocument(state: string) {
  const origin = window.location.origin;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${noodleStyles}\n${travelStyles}
    html,body{margin:0;padding:0;background:transparent}
    .nsr-frame-inline{max-width:none}
  </style></head><body><div id="widget-root" data-state="${state}"></div><script type="module">
    import RefreshRuntime from '${origin}/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    await import('${origin}/scripts/widget-shell-frame.tsx');
  </script><script>
    const send = (message) => parent.postMessage({jsonrpc:'2.0',...message}, '*');
    const resize = () => send({method:'ui/notifications/size-changed', params:{height:document.body.scrollHeight}});
    addEventListener('message', event => {
      if(event.source !== parent || event.data?.id !== 1) return;
      send({method:'ui/notifications/initialized',params:{}});
      resize();
      new ResizeObserver(resize).observe(document.body);
    });
    send({id:1,method:'ui/initialize',params:{appInfo:{name:'Wayfare local visual preview',version:'1.0.0'},appCapabilities:{},protocolVersion:'2025-11-21'}});
  </script></body></html>`;
}

const states = ['Error', 'Results', 'Loading', 'Invalid search', 'Retry fails'] as const;
function Preview() {
  const [state, setState] = useState<typeof states[number]>('Error');
  const view: AssistantViewData = {
    id: `preview-${state}`,
    tool: 'search_flights',
    resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
    title: 'Flight results',
    html: widgetDocument(state),
    result: {},
  };
  return <>
    <style>{`
      body{margin:0;background:#fff;color:#14213d;font:16px system-ui,sans-serif}
      main{max-width:1280px;margin:32px auto;padding:0 20px}
      header{margin-bottom:32px}h1{font-size:24px}p{color:#5d5d5d;line-height:1.5}
      nav{display:flex;flex-wrap:wrap;gap:8px}button{padding:12px 20px;border:1px solid #ddd;border-radius:10px;background:white;font:inherit;cursor:pointer}
      button[aria-pressed=true]{background:#14213d;color:white}
      .travel-app-surface{min-width:0;width:100%}
    `}</style>
    <main>
      <header><h1>Wayfare widget styling preview</h1>
        <p>Interactive local fixtures using the actual chat host and flight widget. Errors are intentional. Wait 60 seconds to retry: Error recovers to sample results; Retry fails demonstrates another temporary failure. No provider requests are made.</p>
        <nav aria-label="Preview state">{states.map(name => <button key={name} aria-pressed={state === name} onClick={() => setState(name)}>{name}</button>)}</nav>
      </header>
      <TravelViewRegistry client={client} view={view} />
    </main>
  </>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
