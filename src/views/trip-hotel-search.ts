import type { DemoHotelSearchOutput, DemoTripReview } from '../demo-schemas.js';

export type TripHotelSearchPlan = {
  readonly input?: DemoHotelSearchOutput['searchContext'];
  readonly note?: string;
  readonly error?: string;
};

/** Reuse known dates for browsing without claiming a confirmed hotel stay. */
export function planTripHotelSearch(review: DemoTripReview): TripHotelSearchPlan {
  const context = review.planningContext;
  const missing = { error: 'Tell the conversation the destination, check-in and check-out dates, and who is staying so we can find relevant stays.' };
  if (!context?.destination) return missing;
  const adults = context.adults ?? 1;
  const window = context.dateBasis === 'flight_departure' ? context.activityDates : undefined;
  const checkInDate = window?.startDate ?? context.startDate;
  const knownCheckOut = window?.endDate ?? context.endDate;
  const validDate = (value: string | undefined): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value);
  if (!validDate(checkInDate)) return missing;
  const checkOutDate = knownCheckOut ?? new Date(Date.parse(`${checkInDate}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  if (!validDate(checkOutDate) || checkOutDate <= checkInDate
    || (Date.parse(checkOutDate) - Date.parse(checkInDate)) / 86_400_000 > 30) return missing;
  if (!/^[A-Z]{3}$/.test(context.destination) && !context.countryCode) return missing;
  if (!Number.isInteger(adults) || adults < 1 || adults > 8
    || (context.children ?? 0) !== 0 || (context.infants ?? 0) !== 0) {
    return { error: 'Confirm the room allocation and any children’s ages in the conversation before searching stays.' };
  }
  const currency = context.currency ?? 'CAD';
  if (currency !== 'CAD' && currency !== 'USD' && currency !== 'EUR') {
    return { error: 'Choose CAD, USD or EUR in the conversation for the hotel search.' };
  }
  const location = context.propertyName ?? context.meetingArea;
  return {
    input: { destination: context.destination, ...(context.countryCode ? { countryCode: context.countryCode } : {}),
      checkInDate, checkOutDate, adults, children: 0, rooms: 1, currency },
    note: `${context.dateBasis === 'flight_departure'
      ? `Using your ${window ? 'trip-planning' : 'flight'} dates as a starting point. Arrival timing has not been checked.`
      : 'Using your activity or stay dates as a starting point.'}${knownCheckOut ? '' : ' Starting with a 1-night stay because no length was specified.'} Searching for ${adults} ${adults === 1 ? 'adult' : 'adults'}, 1 room. Change dates, guests or rooms in chat. ${location ? `Distance from ${location}` : 'Distance from your airport'} has not been checked; these are destination-wide results.`,
  };
}
