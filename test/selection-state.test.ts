import { describe, expect, it } from 'vitest';
import { prepareSelectionStates, selectStoredFlight } from '../src/selection-state.js';

describe('empty selection-store boundary', () => {
  it('omits an empty store instead of sending an invalid business record', () => {
    expect(prepareSelectionStates({ flightState: {}, hotelState: {} })).toEqual({});
  });
  it('preserves populated records and does not turn malformed records into empty state', () => {
    const state = { updatedAt: '2030-04-01T12:00:00Z', records: [], activeSelectionId: 'sel_0123456789abcdef0123456789abcdef' };
    expect(prepareSelectionStates({ flightState: state, hotelState: {} })).toEqual({ flightState: state });
    expect(prepareSelectionStates({ hotelState: { records: 'broken' } })).toEqual({ hotelState: { records: 'broken' } });
  });
});

describe('flight selection boundary', () => {
  const selectionId = 'sel_0123456789abcdef0123456789abcdef';
  it('returns unavailable for a fresh store or an ID outside the current search', () => {
    expect(selectStoredFlight({ state: {}, selectionId })).toMatchObject({ status: 'unavailable' });
    expect(selectStoredFlight({ state: { records: [{ selectionId: 'different' }] }, selectionId })).toMatchObject({ status: 'unavailable' });
  });
  it('acknowledges only a selection present in server-owned records', () => {
    expect(selectStoredFlight({ state: { records: [{ selectionId }] }, selectionId })).toMatchObject({ status: 'selected', selectionId });
  });
});
