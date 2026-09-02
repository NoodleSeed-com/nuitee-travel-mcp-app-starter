'use client';

import { NoodleAppView } from '@noodleseed/assistant/react';
import type {
  AssistantClient,
  AssistantViewData,
} from '@noodleseed/assistant/client';
import { useMemo, useRef } from 'react';
import { isInlineTravelView } from '../lib/travel-view-policy';
import type { SupplementalToolResult } from '../lib/trip-projection';

interface TravelViewRegistryProps {
  readonly client: AssistantClient;
  readonly onAppToolResult?: (result: SupplementalToolResult) => void;
  readonly view: AssistantViewData;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canProjectAppTool(viewTool: string, appTool: string) {
  return (
    viewTool === 'search_flights'
    && (appTool === 'select_flight_offer' || appTool === 'verify_flight_offer')
  ) || (viewTool === 'search_hotels' && appTool === 'select_hotel');
}

export function TravelViewRegistry({
  client,
  onAppToolResult,
  view,
}: Readonly<TravelViewRegistryProps>) {
  const resultCallbackRef = useRef(onAppToolResult);
  resultCallbackRef.current = onAppToolResult;
  const bridgedClient = useMemo(() => new Proxy(client, {
    get(target, property) {
      if (property === 'requestApp') {
        return async (
          method: string,
          params: Readonly<Record<string, unknown>>,
        ) => {
          const appTool = params.name;
          let response: unknown;
          try {
            response = await target.requestApp(method, params);
          } catch (error) {
            if (
              method === 'tools/call'
              && appTool === 'verify_flight_offer'
              && canProjectAppTool(view.tool, appTool)
            ) {
              resultCallbackRef.current?.({
                tool: appTool,
                result: { status: 'error' },
              });
            }
            throw error;
          }
          const envelope = isRecord(response) ? response : undefined;
          if (
            method === 'tools/call'
            && typeof appTool === 'string'
            && canProjectAppTool(view.tool, appTool)
          ) {
            if (envelope?.isError === true && appTool === 'verify_flight_offer') {
              resultCallbackRef.current?.({
                tool: appTool,
                result: { status: 'error' },
              });
            } else if (
              envelope?.isError !== true
              && envelope?.structuredContent !== undefined
            ) {
              resultCallbackRef.current?.({
                tool: appTool,
                result: envelope.structuredContent,
              });
            }
          }
          return response;
        };
      }

      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function'
        ? value.bind(target) as unknown
        : value;
    },
  }) as AssistantClient, [client, view.tool]);

  if (!isInlineTravelView(view)) {
    return <p role="status">This travel view is unavailable.</p>;
  }

  return (
    <div
      className="travel-app-surface"
      data-testid="travel-app-surface"
      data-tool={view.tool}
      tabIndex={-1}
    >
      <NoodleAppView client={bridgedClient} theme="light" view={view} />
    </div>
  );
}
