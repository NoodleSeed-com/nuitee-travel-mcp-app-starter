import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { acknowledgeProtectionComparison, prepareSelectionStates, selectStoredFlight } from '../src/selection-state.js';

describe('empty selection-store boundary', () => {
  it('omits an empty store instead of sending an invalid business record', () => {
    expect(prepareSelectionStates({ flightState: {}, hotelState: {} })).toEqual({});
  });
  it('preserves populated records and does not turn malformed records into empty state', () => {
    const state = { updatedAt: '2030-04-01T12:00:00Z', records: [], activeSelectionId: 'sel_0123456789abcdef0123456789abcdef' };
    expect(prepareSelectionStates({ flightState: state, hotelState: {} })).toEqual({ flightState: state });
    expect(prepareSelectionStates({ hotelState: { records: 'broken' } })).toEqual({ hotelState: { records: 'broken' } });
  });
  it('permits trip-bound actions only after all three authoritative reads succeeded', () => {
    const reads = { flightReadOk: true, hotelReadOk: true, experienceReadOk: true };
    expect(prepareSelectionStates(reads).tripReadOk).toBe(true);
    for (const key of Object.keys(reads)) for (const value of [false, undefined, 'true', 1]) {
      expect(prepareSelectionStates({ ...reads, [key]: value }).tripReadOk).toBe(false);
    }
  });
});

describe('protection comparison persistence acknowledgment', () => {
  const proposal = { canSelect: true, message: 'You can add one fictional protection concept. You are not insured.', mayWrite: true,
    nextState: { comparison: { result: 'private server state' } } };
  it('enables selection only after a matching eligible proposal and an explicit successful write', () => {
    expect(acknowledgeProtectionComparison({ proposal, patchOk: true })).toEqual({ canSelect: true, message: proposal.message });
    for (const patchOk of [false, undefined, null, 'true', 1]) {
      const result = acknowledgeProtectionComparison({ proposal, patchOk });
      expect(result.canSelect).toBe(false);
      expect(result.message).toMatch(/browse.*compare again/i);
      expect(result).not.toHaveProperty('nextState');
    }
  });
  it('does not enable an ineligible or missing comparison even when a write is acknowledged', () => {
    for (const candidate of [undefined, {}, { canSelect: false }, { canSelect: 'true' }, { canSelect: 1 }]) {
      expect(acknowledgeProtectionComparison({ proposal: candidate, patchOk: true }).canSelect).toBe(false);
    }
    const ineligible = { canSelect: false, message: 'The comparison does not match your current trip.' };
    expect(acknowledgeProtectionComparison({ proposal: ineligible, patchOk: true })).toEqual(ineligible);
  });
  it('keeps the acknowledgment gate self-contained for serialized compute', () => {
    const run = runInNewContext(`(${acknowledgeProtectionComparison.toString()})`) as typeof acknowledgeProtectionComparison;
    for (const patchOk of [true, false, undefined]) expect(run({ proposal, patchOk })).toEqual(acknowledgeProtectionComparison({ proposal, patchOk }));
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
