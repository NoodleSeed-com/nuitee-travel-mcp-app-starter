import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/helpers.js', () => ({ Action: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
import { TripEstimate } from '../src/views/trip-estimate.js';

describe('approved trip estimate view', () => {
  it('labels source groups and the combined value without implying a payable total', () => {
    const html = renderToStaticMarkup(<TripEstimate data={{ flight: { searchPrice: { total: 1743.32, currency: 'EUR' } }, stay: { dataSource: 'live_nuitee', staySubtotal: { amount: 323.33, currency: 'EUR' } }, experiences: [{ totalPrice: { amountMinor: 9200, currency: 'EUR' } }] }} locale="en-IE" />);
    expect(html).toContain('Trip planning estimate');
    expect(html).toContain('€2,158.65');
    expect(html).toContain('Flight + stay search prices');
    expect(html).toContain('€2,066.65');
    expect(html).toContain('Fictional experience');
    expect(html).toContain('Includes fictional demo items');
    expect(html).toContain('View price breakdown');
    expect(html).toContain('aria-expanded="false"');
  });
  it.each([
    [{ flight: {}, experiences: [] }, 'Total incomplete'],
    [{ flight: { searchPrice: { total: 10, currency: 'CAD' } }, stay: { staySubtotal: { amount: 20, currency: 'EUR' } } }, 'Separate currencies'],
  ])('shows the truthful incomplete state', (data, message) => {
    const html = renderToStaticMarkup(<TripEstimate data={data} />);
    expect(html).toContain(message);
    expect(html).toContain('No combined total shown');
  });
  it('does not add an empty estimate card to a plan with no selections', () => {
    expect(renderToStaticMarkup(<TripEstimate data={{ experiences: [] }} />)).toBe('');
  });
  it('labels a fictional stay-only plan without inventing experience selections', () => {
    const html = renderToStaticMarkup(<TripEstimate data={{ stay: { dataSource: 'illustrative', staySubtotal: { amount: 50, currency: 'EUR' } }, experiences: [] }} />);
    expect(html).toContain('Fictional stay');
    expect(html).not.toContain('Fictional experience');
  });
});
