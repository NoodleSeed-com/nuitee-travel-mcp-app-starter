/** Read the current caller-scoped search snapshot, without searching or selecting. */
export function openStoredHotel(input: Record<string, unknown>): Record<string, unknown> {
  const record = (value: unknown): Record<string, unknown> | undefined =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  const words = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(word => word && word !== 'and');
  const unavailable = () => ({ status: 'unavailable', message: 'The previous hotel results are no longer available to reopen. Search stays again using your trip dates, then choose a returned hotel. Nothing was selected or reserved.' });
  const state = record(input.hotelState);
  const snapshot = record(state?.searchResult);
  if (input.readOk !== true || !state || !snapshot || typeof snapshot.searchId !== 'string' || state.searchId !== snapshot.searchId ||
      !['success', 'partial'].includes(String(snapshot.status)) || !Array.isArray(snapshot.hotels) ||
      !snapshot.hotels.length || snapshot.hotels.length > 10 || !Array.isArray(state.records)) return unavailable();
  const records = state.records.map(record);
  const hotels = snapshot.hotels.map(record);
  if (hotels.some(hotel => !hotel || typeof hotel.name !== 'string' || !records.some(entry =>
    entry && entry.searchId === snapshot.searchId && entry.selectionId === hotel.selectionId))) return unavailable();
  const requested = typeof input.hotelName === 'string' ? words(input.hotelName) : [];
  const matches = hotels.filter(hotel => requested.length > 0 && requested.every(word => words(String(hotel!.name)).includes(word)));
  if (!matches.length) return { status: 'not_found', message: 'That hotel is not in the current returned results. This does not mean it is unavailable. Ask for a fresh stay search or choose another returned hotel. Nothing was selected or reserved.' };
  const message = matches.length === 1
    ? `${matches[0]!.name} is open. Use Choose this stay to add it to your plan. Nothing was selected or reserved by opening these details.`
    : `${matches.length} returned hotels match that name. Choose the intended hotel from the cards; nothing was selected or reserved.`;
  return {
    status: 'ready', message,
    result: {
      status: 'success', dataSource: snapshot.dataSource, searchId: snapshot.searchId,
      searchContext: snapshot.searchContext, hotels: matches,
      disclosure: snapshot.dataSource === 'live_nuitee'
        ? 'Previously returned Nuitee hotel rates. Prices and availability have not been refreshed and require verification before booking; no room is held or reserved.'
        : snapshot.disclosure,
      message, fallback: message,
    },
    ...(matches.length === 1 ? { focusedSelectionId: matches[0]!.selectionId } : {}),
    ...(matches.some(hotel => hotel!.selectionId === state.activeSelectionId) ? { selectedSelectionId: state.activeSelectionId } : {}),
  };
}
