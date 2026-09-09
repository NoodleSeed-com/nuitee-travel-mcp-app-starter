/// <reference path="../../../src/vite-env.d.ts" />
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const host = vi.hoisted(() => ({
  select: vi.fn(),
  verify: vi.fn(),
  resetVerification: vi.fn(),
  navigate: vi.fn(),
  toolInfo: {} as Record<string, unknown>,
}));

vi.mock('../../../src/helpers.js', async () => {
  const ReactModule = await import('react');
  const passthrough = ({ children, title, subtitle, displayMode: _displayMode, ...props }: any) => ReactModule.createElement(
    'section',
    props,
    title ? ReactModule.createElement('h1', null, title) : null,
    subtitle ? ReactModule.createElement('p', null, subtitle) : null,
    children,
  );
  return {
    Action: ({ children, pending: _pending, pendingLabel: _pendingLabel, variant: _variant, ...props }: any) => ReactModule.createElement('button', props, children),
    ActionBar: ({ children }: any) => ReactModule.createElement('div', null, children),
    Feedback: ({ children, status }: any) => ReactModule.createElement('div', { 'data-status': status }, children),
    Flow: ({ children, variant: _variant, density: _density, ...props }: any) => ReactModule.createElement('div', props, children),
    Form: ({ children, ...props }: any) => ReactModule.createElement('form', props, children),
    Frame: passthrough,
    Region: passthrough,
    StatusBadge: ({ children, ...props }: any) => ReactModule.createElement('span', props, children),
    useAppFlow: () => ({ activeView: 'results', navigate: host.navigate, back: vi.fn() }),
    useBranding: () => ({}),
    useCallTool: (name: string) => name === 'select_flight_offer'
      ? { callToolAsync: host.select }
      : {
          callToolAsync: host.verify,
          data: undefined,
          isPending: false,
          reset: host.resetVerification,
          status: 'idle',
        },
    useLayout: () => ({ displayMode: 'inline', supports: {}, theme: 'light' }),
    useRequestDisplayMode: () => vi.fn(),
    useSendFollowUpMessage: () => vi.fn(),
    useToolInfo: () => host.toolInfo,
    useUpdateModelContext: () => vi.fn(),
    useViewState: <T,>(_key: string, initial: T) => ReactModule.useState(initial),
    useWidgetReady: () => true,
  };
});

import FlightResults from '../../../src/views/flight-results.js';

const selectionId = 'sel_0123456789abcdef0123456789abcdef';
const result = {
  status: 'success',
  message: 'One fictional flight found.',
  fallback: 'One fictional flight found.',
  retrievedAt: '2030-04-01T12:00:00Z',
  searchContext: {
    origin: 'QZX', destination: 'QZY', departureDate: '2030-04-20', adults: 1,
    children: 0, infants: 0, childrenAges: [], infantAges: [],
    cabinClass: 'ECONOMY', currency: 'CAD', country: 'CA',
  },
  itineraries: [{
    selectionId,
    route: { origin: 'QZX', destination: 'QZY' },
    carrier: { name: 'Cedar Skies', code: 'ZZ' },
    departureTime: '2030-04-20T09:00:00Z',
    arrivalTime: '2030-04-20T12:15:00Z',
    durationMinutes: 195,
    stops: 0,
    isCheapest: true,
    retrievedAt: '2030-04-01T12:00:00Z',
    price: { total: 284.5, currency: 'CAD' },
    baggage: { carryOn: true, checked: false, allowances: [] },
    fare: { family: 'Cloudlight Economy', mixedCabin: false },
    terms: { changeable: true, refundable: false, hasChangeFee: true, hasRefundFee: false },
    amenities: [],
    legs: [{
      direction: 'OUTBOUND',
      route: { origin: 'QZX', destination: 'QZY' },
      departureTime: '2030-04-20T09:00:00Z',
      arrivalTime: '2030-04-20T12:15:00Z',
      durationMinutes: 195,
      stops: 0,
    }],
    segments: [],
    messages: ['Fictional fixture fare; not live inventory.'],
  }],
} as const;

beforeEach(() => {
  host.select.mockReset();
  host.verify.mockReset();
  host.resetVerification.mockReset();
  host.navigate.mockReset();
  host.toolInfo = { structuredContent: result };
});

afterEach(cleanup);

describe('flight-results selection recovery', () => {
  it('retries a rejected selection write before explicit verification', async () => {
    host.select
      .mockRejectedValueOnce(new Error('selection write rejected'))
      .mockResolvedValueOnce({ structuredContent: { status: 'selected', selectionId } });
    host.verify.mockResolvedValue({ structuredContent: {} });

    render(<FlightResults />);
    fireEvent.click(screen.getByRole('button', { name: /^Select fare from/ }));
    await waitFor(() => expect(host.select).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /Verify current fare/ }));

    await waitFor(() => expect(host.select).toHaveBeenCalledTimes(2));
    expect(host.select).toHaveBeenNthCalledWith(2, { selectionId });
    expect(host.verify).toHaveBeenCalledWith({
      selectionId,
      selectionMode: 'explicit',
    });
  });
});
