import type { DemoExperienceSearchOutput, DemoExperienceSelection, DemoTripReview } from '../demo-schemas.js';
import { isExperienceSearchContext } from './experience-selection-data.js';
import { tripPlanningEstimate } from '../trip-planning-estimate.js';

export type TripExperienceSearchPlan = {
  readonly input?: DemoExperienceSearchOutput['searchContext'];
  readonly dateBasis?: 'flight_date_suggestion' | 'trip_dates_suggestion' | 'stay' | 'experience_search' | 'car_rental';
  readonly note?: string;
  readonly error?: string;
};

/** A browsing default is not a confirmed arrival or a selected activity slot. */
export function planTripExperienceSearch(review: DemoTripReview): TripExperienceSearchPlan {
  const context = review.planningContext;
  if (!context?.destination || !context.startDate || !context.adults) return { error: 'Please tell the conversation your destination, activity dates and who is joining so we can show relevant experience ideas.' };
  if ((context.infants ?? 0) > 0) return { error: 'The experience demo does not support infant pricing yet. Continue in the conversation to discuss suitable ideas; your trip is unchanged.' };
  // An optional model-supplied window is useful for browsing, but does not
  // independently prove the traveler confirmed local arrival/activity dates.
  const flightBased = context.dateBasis === 'flight_departure';
  const activityDates = flightBased ? context.activityDates : undefined;
  const startDate = activityDates?.startDate ?? context.startDate;
  const date = new Date(`${startDate}T12:00:00Z`);
  const nextDay = Number.isFinite(date.valueOf()) ? new Date(date.valueOf() + 86_400_000).toISOString().slice(0, 10) : '';
  const endDate = activityDates?.endDate ?? (flightBased ? nextDay : context.endDate);
  const input = { destination: context.destination, startDate, endDate,
    adults: context.adults, children: context.children ?? 0, currency: context.currency,
    accessibility: 'ANY' as const };
  if (!isExperienceSearchContext(input)) return { error: 'The current dates, party or currency are not supported by the experience demo. Adjust them in the conversation; your trip is unchanged.' };
  const usesFlightDay = flightBased && startDate === context.startDate && endDate === nextDay;
  return { input, dateBasis: flightBased ? usesFlightDay ? 'flight_date_suggestion' : 'trip_dates_suggestion' : context.dateBasis as 'stay' | 'experience_search' | 'car_rental',
    note: flightBased
      ? `${usesFlightDay ? 'Using your flight date' : 'Using your trip-planning dates'} as a starting point. Arrival timing has not been checked. You can change the date in chat.`
      : context.dateBasis==='car_rental' ? 'Using your car-rental browsing dates. You can change them in chat.' : 'Using your activity or stay dates. You can change them in chat.' };
}

export function tripPlanningSnapshot(review: DemoTripReview, added?: DemoExperienceSelection) {
  const experiences = added ? [...review.experiences.filter(item => item.selectionId !== added.selectionId), added] : review.experiences;
  // A new component invalidates the prior protection-to-trip binding. Only a
  // fresh authoritative review may include that protection in another estimate.
  const protection = added && !review.experiences.some(item => item.selectionId === added.selectionId) ? undefined : review.protection;
  return { flightSelectionId: review.flight?.selectionId ?? null, staySelectionId: review.stay?.selectionId ?? null,
    car: review.car ? {selectionId:review.car.selectionId,name:review.car.car.name,dates:review.car.searchContext,totalPrice:review.car.totalPrice,expiresAt:review.car.expiresAt} : null,
    experiences: experiences.map(s => ({ selectionId: s.selectionId, title: s.experience.title, startLocal: s.slot.startLocal, timeZone: s.slot.timeZone, adults: s.searchContext.adults })),
    missing: review.missing.filter(item => item !== 'experiences' || !experiences.length), context: review.planningContext ?? null,
    protection: protection ? { comparisonId: protection.comparisonId, planId: protection.plan.planId, name: protection.plan.name, illustrativePrice: protection.plan.illustrativePrice, expiresAt: protection.expiresAt } : null,
    planningEstimate: tripPlanningEstimate({ review: { ...review, experiences, protection } }) };
}
