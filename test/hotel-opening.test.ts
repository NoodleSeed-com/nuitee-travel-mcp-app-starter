import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { searchSyntheticHotels } from '../src/demo-fixtures.js';
import { openStoredHotel } from '../src/hotel-opening.js';
import { openHotelOutputSchema } from '../src/demo-schemas.js';

const result = searchSyntheticHotels({ destination: 'Lisbon', checkInDate: '2030-04-20', checkOutDate: '2030-04-23', adults: 2, children: 0, rooms: 1, currency: 'CAD' });
const hotels = Array.from({ length: 6 }, (_, index) => ({ ...result.hotels[0]!, name: index === 5 ? 'Hotel Mundial' : `Other Stay ${index}`, selectionId: `hsel_${String(index).padStart(32, '0')}` }));
const state = { searchId: result.searchId, updatedAt: '2030-04-01T12:00:00Z', searchResult: { ...result, hotels }, records: hotels.map(hotel => ({ selectionId: hotel.selectionId, searchId: result.searchId, providerOfferId: 'private-provider-reference' })) };
const open = (hotelName: string, hotelState: unknown = state, readOk = true) => openHotelOutputSchema.parse(openStoredHotel({ hotelName, hotelState, readOk }));

describe('reopening a returned hotel', () => {
  it('opens a hotel beyond the first three without a new search or selecting it', () => {
    const before = structuredClone(state);
    const opened = open('Hotel Mundial');
    expect(opened.status).toBe('ready');
    expect(opened.focusedSelectionId).toBe(hotels[5]!.selectionId);
    expect(opened.result!.hotels).toEqual([hotels[5]]);
    expect(opened.result!.searchContext).toEqual(result.searchContext);
    expect(opened.selectedSelectionId).toBeUndefined();
    expect(JSON.stringify(opened)).not.toContain('private-provider-reference');
    expect(state).toEqual(before);
  });
  it('keeps duplicate and similar names ambiguous instead of choosing the first', () => {
    const duplicate = { ...hotels[4]!, name: 'Hotel Mundial' };
    for (const name of ['Hotel Mundial', 'Hotel Mundial Riverside']) {
      const opened = open('Mundial', { ...state, searchResult: { ...state.searchResult, hotels: [hotels[5], { ...duplicate, name }] } });
      expect(opened.status).toBe('ready');
      expect(opened.result!.hotels).toHaveLength(2);
      expect(opened.focusedSelectionId).toBeUndefined();
    }
  });
  it('matches case and accents but never substitutes another hotel for a missing name', () => {
    expect(open('  HÔTEL mundial ').focusedSelectionId).toBe(hotels[5]!.selectionId);
    for (const name of ['Unknown hotel', '*', ' ']) {
      expect(open(name)).toMatchObject({ status: 'not_found' });
      expect(open(name).result).toBeUndefined();
    }
  });
  it('fails safely for missing, old-session, failed-read, or mismatched state', () => {
    for (const hotelState of [null, {}, { ...state, searchResult: undefined }, { ...state, searchId: 'hsearch_ffffffffffffffffffffffffffffffff' }, { ...state, records: [] }]) {
      expect(open('Mundial', hotelState).status).toBe('unavailable');
    }
    expect(open('Mundial', state, false).status).toBe('unavailable');
    expect(openStoredHotel({ hotelName: 'Mundial', readOk: true }).status).toBe('unavailable');
  });
  it('reports an existing selection only if it is among the returned matches', () => {
    expect(open('Mundial', { ...state, activeSelectionId: hotels[5]!.selectionId }).selectedSelectionId).toBe(hotels[5]!.selectionId);
    expect(open('Mundial', { ...state, activeSelectionId: hotels[0]!.selectionId }).selectedSelectionId).toBeUndefined();
  });
  it('runs as an isolated compute function with no dependencies', () => {
    const isolated = runInNewContext(`(${openStoredHotel.toString()})`, Object.create(null)) as typeof openStoredHotel;
    expect(openHotelOutputSchema.parse(isolated({ hotelName: 'Mundial', hotelState: state, readOk: true }))).toEqual(open('Mundial'));
  });
});
