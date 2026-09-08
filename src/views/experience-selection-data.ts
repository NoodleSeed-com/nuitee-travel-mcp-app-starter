import type { DemoExperience, DemoExperienceSelection, DemoExperienceSearchInput } from '../demo-schemas.js';

export interface ExperiencePhotoSource { readonly url: string; readonly credit: string }
const photos: Readonly<Record<string, readonly [string, string]>> = {
  'Alfama Tastes & Tiles Walk': ['photo-1651237170873-0445e48bf802', 'Colin + Meg'],
  'Tagus Sunset Sailing Circle': ['photo-1681204620631-3c4c8d29b882', 'Abigail Prowse'],
  'Belém Makers Morning': ['photo-1585334954347-e50fe83cc6ce', 'gemmmm'],
  'Yanaka Food & Craft Walk': ['photo-1590582917892-a6e11d1b32bc', 'Michael Wu'],
  'Sumida Evening Waterways': ['photo-1692080355318-2ed92347877d', 'Taro Ohtani'],
  'Quiet Tea & Design Studio': ['photo-1545830017-e4c7878841d0', 'Emile Guillemot'],
};
export function experiencePhoto(experience: Pick<DemoExperience, 'title' | 'city'>): ExperiencePhotoSource {
  const [id, author] = photos[experience.title] ?? photos[experience.city === 'Lisbon' ? 'Alfama Tastes & Tiles Walk' : 'Quiet Tea & Design Studio']!;
  return { url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`, credit: `Photo: ${author} · Unsplash` };
}

export const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
export const text = (value: unknown, minimum: number, maximum: number): value is string =>
  typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum;
export const integer = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;
const currencies = new Set(['CAD', 'USD', 'EUR', 'GBP', 'JPY']);
const categories = new Set(['FOOD', 'CULTURE', 'WATER', 'DESIGN', 'FAMILY', 'EVENING', 'CRAFT', 'TEA']);
const isoDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export function isExperienceSearchContext(value: unknown): value is DemoExperienceSearchInput {
  const context = record(value);
  return Boolean(context && text(context.destination, 2, 100) && isoDate(context.startDate) && isoDate(context.endDate) &&
    String(context.startDate) < String(context.endDate) && Date.parse(String(context.endDate)) - Date.parse(String(context.startDate)) <= 30 * 86_400_000 &&
    integer(context.adults, 1, 8) && integer(context.children, 0, 6) && Number(context.adults) + Number(context.children) <= 8 && currencies.has(String(context.currency)) &&
    (context.experienceName === undefined || text(context.experienceName, 1, 100)) &&
    (context.accessibility === undefined || context.accessibility === 'ANY' || context.accessibility === 'STEP_FREE') &&
    (context.interests === undefined || Array.isArray(context.interests) && context.interests.length <= 4 && context.interests.every((item) => categories.has(String(item)))));
}
export function isExperience(value: unknown): value is DemoExperience {
  const experience = record(value), accessibility = record(experience?.accessibility), price = record(experience?.price);
  if (!experience || !accessibility || !price ||
    typeof experience.experienceId !== 'string' || !/^exp_[a-f0-9]{32}$/.test(experience.experienceId) ||
    experience.dataSource !== 'illustrative' || experience.source !== 'WAYFARE_DEMO' || experience.isFictional !== true ||
    !['Lisbon', 'Tokyo'].includes(String(experience.city)) || !['PT', 'JP'].includes(String(experience.countryCode)) ||
    !['Europe/Lisbon', 'Asia/Tokyo'].includes(String(experience.timeZone)) ||
    !text(experience.title, 2, 100) || !text(experience.operatorLabel, 2, 80) ||
    !text(experience.shortDescription, 20, 240) || !integer(experience.durationMinutes, 30, 720) ||
    !text(experience.meetingArea, 2, 100) || typeof accessibility.stepFree !== 'boolean' ||
    !text(accessibility.summary, 2, 160) || !text(experience.cancellationPolicy, 2, 180) ||
    !integer(price.amountMinor, 1, 100_000_000) || !currencies.has(String(price.currency)) ||
    !Array.isArray(experience.categories) || experience.categories.length < 1 || experience.categories.length > 4 ||
    !experience.categories.every((category) => categories.has(String(category))) ||
    !Array.isArray(experience.inclusions) || experience.inclusions.length < 1 || experience.inclusions.length > 5 ||
    !experience.inclusions.every((entry) => text(entry, 2, 100)) ||
    !Array.isArray(experience.restrictions) || experience.restrictions.length > 3 ||
    !experience.restrictions.every((entry) => text(entry, 2, 160)) ||
    !Array.isArray(experience.slots) || experience.slots.length < 1 || experience.slots.length > 4) return false;
  if (experience.city === 'Lisbon' ? experience.countryCode !== 'PT' || experience.timeZone !== 'Europe/Lisbon' : experience.countryCode !== 'JP' || experience.timeZone !== 'Asia/Tokyo') return false;
  return experience.slots.every((candidate) => {
    const slot = record(candidate);
    return slot && typeof slot.slotId === 'string' && /^slot_[a-f0-9]{32}$/.test(slot.slotId) &&
      typeof slot.startLocal === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(slot.startLocal) &&
      isoDate(slot.startLocal.slice(0, 10)) && Number.isFinite(Date.parse(`${slot.startLocal}Z`)) && slot.timeZone === experience.timeZone && integer(slot.remainingCapacity, 1, 20) && slot.isFictional === true;
  });
}
export function isExperienceTripSelection(value: unknown): value is DemoExperienceSelection {
  const selection = record(value), total = record(selection?.totalPrice), slot = record(selection?.slot);
  if (!selection || !total || !slot || typeof selection.selectionId !== 'string' || !/^esel_[a-f0-9]{32}$/.test(selection.selectionId) ||
    !isExperience(selection.experience) || !isExperienceSearchContext(selection.searchContext) ||
    typeof selection.addedAt !== 'string' || !Number.isFinite(Date.parse(selection.addedAt)) ||
    typeof selection.expiresAt !== 'string' || !Number.isFinite(Date.parse(selection.expiresAt)) ||
    Date.parse(selection.expiresAt) <= Date.parse(selection.addedAt) ||
    !integer(total.amountMinor, 1, 100_000_000) || total.currency !== selection.experience.price.currency ||
    total.currency !== selection.searchContext.currency || selection.searchContext.children !== 0 ||
    total.amountMinor !== selection.experience.price.amountMinor * selection.searchContext.adults) return false;
  const canonical = selection.experience.slots.find((candidate) => candidate.slotId === slot.slotId);
  return Boolean(canonical && canonical.startLocal === slot.startLocal && canonical.timeZone === slot.timeZone &&
    canonical.remainingCapacity === slot.remainingCapacity && canonical.isFictional === slot.isFictional &&
    canonical.startLocal.slice(0, 10) >= selection.searchContext.startDate && canonical.startLocal.slice(0, 10) < selection.searchContext.endDate);
}
/** A repeated search may issue new opaque refs while the same saved planning choice keeps its original price. */
export function matchesExperienceChoice(selection: DemoExperienceSelection, experience: DemoExperience, context: DemoExperienceSearchInput, slotId?: string): boolean {
  const requestedSlot = experience.slots.find((slot) => slotId ? slot.slotId === slotId : slot.startLocal === selection.slot.startLocal);
  return Boolean(requestedSlot && selection.experience.city === experience.city && selection.experience.title === experience.title &&
    selection.slot.startLocal === requestedSlot.startLocal && selection.slot.timeZone === requestedSlot.timeZone &&
    selection.searchContext.adults === context.adults && selection.searchContext.children === context.children);
}
export function durationLabel(minutes: number) {
  const hours = minutes / 60;
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
export function formatExperienceMoney(amountMinor: number, currency: string, locale = 'en-CA', compact = false) {
  const divisor = currency === 'JPY' ? 1 : 100;
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency, ...(compact ? { minimumFractionDigits: 0 } : {}), maximumFractionDigits: currency === 'JPY' ? 0 : 2 }).format(amountMinor / divisor); }
  catch { return `${currency} ${amountMinor / divisor}`; }
}
export function experienceDayLabel(date: string, locale = 'en-CA', weekday: 'long' | 'short' = 'long') {
  return new Intl.DateTimeFormat(locale, { weekday, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
export function experienceDateLabel(date: string, locale = 'en-CA') {
  const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).formatToParts(new Date(`${date}T12:00:00Z`));
  return `${parts.find((part) => part.type === 'day')?.value} ${parts.find((part) => part.type === 'month')?.value}`;
}
