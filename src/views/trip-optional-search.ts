import type { DemoInsuranceComparisonInput, DemoRewardFlightSearchInput, DemoTripReview } from '../demo-schemas.js';
import { isDemoLoyaltyOverview } from './loyalty-overview.js';

type SearchPlan<T> = { input?: T; note?: string; error?: string };
const calendarDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const boundedInteger = (value: unknown, minimum: number, maximum: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;

export function planTripPoints(review: DemoTripReview): SearchPlan<DemoRewardFlightSearchInput> {
  const c = review.planningContext;
  const adults = c?.adults === undefined ? 1 : c.adults;
  if ((c?.children !== undefined && c.children !== 0) || (c?.infants !== undefined && c.infants !== 0) || !boundedInteger(adults, 1, 8)) return { error: 'These points examples support one to eight adults only. Your selected travelers have not been changed.' };
  if (c?.currency && !['CAD', 'USD', 'EUR'].includes(c.currency)) return { error: 'Points examples currently support CAD, USD and EUR taxes. Your trip currency has not been changed.' };
  const hasSampleBalance = isDemoLoyaltyOverview(review.loyalty) && boundedInteger(review.loyalty.member.pointsBalance, 5_000, 1_000_000);
  const pointsBudget = hasSampleBalance ? review.loyalty.member.pointsBalance : 42_500;
  return { input: { origin: c?.origin ?? 'Toronto', ...(c?.destination ? { destination: c.destination } : {}),
    ...(calendarDate(c?.startDate) ? { departureDate: c.startDate } : {}), adults,
    cabinClass: 'ECONOMY', currency: (c?.currency ?? 'CAD') as 'CAD' | 'USD' | 'EUR', pointsBudget },
    note: [!c?.origin ? 'Toronto is the example starting point because no departure city is selected.' : '',
      c?.adults === undefined ? 'Showing an example for one adult, not a confirmed traveler count.' : '',
      !c?.currency ? 'Example taxes use CAD because no trip currency is selected.' : '',
      !hasSampleBalance ? 'Using a 42,500-point example budget because a usable sample profile balance is unavailable.' : ''].filter(Boolean).join(' ') || undefined };
}

export function planTripProtection(review: DemoTripReview): SearchPlan<DemoInsuranceComparisonInput> {
  const c = review.planningContext;
  const dates = c?.dateBasis === 'flight_departure' ? c.activityDates : undefined;
  const start = dates !== undefined ? dates?.startDate : c?.startDate;
  const end = dates !== undefined ? dates?.endDate : c?.endDate;
  if (!c?.destination || !calendarDate(start) || !calendarDate(end) || end <= start || c.adults === undefined || c.children === undefined) return { error: 'Add a destination, trip start and end dates, and adult and child traveler counts in the conversation to compare protection examples. Your trip is unchanged.' };
  if ((c.infants !== undefined && c.infants !== 0) || !boundedInteger(c.adults, 1, 8) || !boundedInteger(c.children, 0, 6) || c.adults + c.children > 8 || (Date.parse(end) - Date.parse(start)) / 86_400_000 > 90) return { error: 'This optional demo supports up to eight travelers, no infant pricing, and trips up to 90 days. Your dates and travelers have not been changed.' };
  if (!c.currency || !['CAD', 'USD', 'EUR', 'GBP'].includes(c.currency)) return { error: 'Protection examples require a trip currency of CAD, USD, EUR or GBP. Your currency has not been changed.' };
  return { input: { destination: c.destination, departureDate: start, returnDate: end, adults: c.adults, children: c.children, residenceCountry: 'CA', currency: c.currency as DemoInsuranceComparisonInput['currency'] },
    note: c.dateBasis === 'flight_departure' ? 'Using your flight-planning dates, not confirmed local arrival or coverage dates.' : 'Using your selected activity or stay window, which may not cover the whole journey.' };
}
