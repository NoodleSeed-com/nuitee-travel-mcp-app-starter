import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';
import { BusinessPreview } from '../src/components/business-preview';
import type { BusinessBrand } from '../src/lib/business-brand';

const sdk = vi.hoisted(() => ({ useNoodleAssistant: vi.fn() }));
vi.mock('@noodleseed/assistant/react/client', () => ({ useNoodleAssistant: sdk.useNoodleAssistant }));
const brand: BusinessBrand = { name: 'North Star Travel', initials: 'NS', welcome: 'Find your next good place.', currency: 'CAD', language: 'French', capabilities: { flights: true, hotels: false, experiences: false, cars: false, checkout: false } };
const runtime = { status: 'ready' as const, embedId: 'pub_brand_fixture', serviceUrl: 'http://127.0.0.1:3105' };
let send: ReturnType<typeof vi.fn>;
beforeEach(() => {
  send = vi.fn().mockResolvedValue(undefined);
  sdk.useNoodleAssistant.mockReset().mockReturnValue({ messages: [], status: 'ready', client: { sendMessage: send, subscribe: () => () => {}, abort: vi.fn(), resetSession: vi.fn() } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); history.replaceState(null, '', '/'); });

describe('released business presentation', () => {
  it('offers only enabled travel domains and labels remaining illustrative planning features', () => {
    render(<TravelAssistantPage brand={brand} businessMode runtime={runtime} />);
    const capabilities = screen.getByRole('region', { name: 'North Star Travel capabilities' });
    expect(within(capabilities).getByText('Flights')).toBeInTheDocument();
    expect(within(capabilities).queryByText('Hotels')).not.toBeInTheDocument();
    expect(within(capabilities).queryByText('Experiences')).not.toBeInTheDocument();
    expect(within(capabilities).queryByText('Cars')).not.toBeInTheDocument();
    expect(within(capabilities).queryByText('Vouchers')).not.toBeInTheDocument();
    expect(within(capabilities).queryByText('Booking & trip care')).not.toBeInTheDocument();
    expect(within(capabilities).getByText('Trip review')).toBeInTheDocument();
    expect(within(capabilities).getByText(/No booking, payment/)).toBeInTheDocument();
  });
  it('uses released identity/welcome/currency and keeps explicit traveler input unchanged', async () => {
    render(<TravelAssistantPage brand={brand} businessMode runtime={runtime} />);
    expect(screen.getByRole('heading', { name: brand.welcome })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'North Star Travel home' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveAttribute('data-value', 'CAD');
    expect(document.title).toContain('North Star Travel');
    expect(sdk.useNoodleAssistant).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('combobox', { name: 'Currency' }));
    fireEvent.click(screen.getByRole('option', { name: 'EUR European Union' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Ask the travel assistant' }), { target: { value: 'Please reply in English and compare flights in GBP.' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Plan a trip' }));
    await waitFor(() => expect(send).toHaveBeenCalledWith('Please reply in English and compare flights in GBP.'));
    const options = sdk.useNoodleAssistant.mock.lastCall![0];
    expect(options.clientContext()).toMatchObject({ locale: 'fr' });
    expect(options.pageContext()).toMatchObject({ travelCurrency: 'EUR', travelLanguage: 'French' });
    expect(screen.getByText('North Star Travel travel assistant')).toBeInTheDocument();
  });
  it('keeps an unpublished business disabled even if a user submits a form event', () => {
    render(<TravelAssistantPage businessMode runtime={{ status: 'setup-required', message: 'This business has not launched yet.' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('not launched');
    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Wayfare capabilities' })).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole('form', { name: 'Plan a trip' }));
    expect(sdk.useNoodleAssistant).not.toHaveBeenCalled();
  });
  it('mounts private previews with the exclusive official SDK sessionEndpoint transport', async () => {
    render(<TravelAssistantPage brand={brand} runtime={{ status: 'ready', sessionEndpoint: '/api/business/preview/session', serviceUrl: 'http://127.0.0.1:3106' }} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Ask the travel assistant' }), { target: { value: 'Plan a trip to Lisbon.' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Plan a trip' }));
    await waitFor(() => expect(send).toHaveBeenCalledOnce());
    const options = sdk.useNoodleAssistant.mock.lastCall![0];
    expect(options.sessionEndpoint).toBe('/api/business/preview/session');
    expect(options).not.toHaveProperty('embedId');
    expect(options).not.toHaveProperty('serviceUrl');
  });
  it('removes a ticket fragment before exchange and withholds old preview content on refusal', async () => {
    history.replaceState(null, '', '/studio-preview#ticket=synthetic_fragment_ticket_for_test');
    const fetch = vi.fn(async () => {
      expect(location.hash).toBe('');
      return new Response('{}', { status: 401 });
    });
    vi.stubGlobal('fetch', fetch);
    render(<BusinessPreview portalOrigin="http://127.0.0.1:3103" releaseId="old-release"><p>Old preview content</p></BusinessPreview>);
    await screen.findByRole('alert');
    expect(fetch).toHaveBeenCalledOnce();
    expect(screen.queryByText('Old preview content')).not.toBeInTheDocument();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
