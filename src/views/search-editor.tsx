import { useState, type FormEvent } from 'react';
import { Action, ActionBar, Field, Flow, Input, SegmentedControl, Select } from '../helpers.js';
import type { SearchContext } from '../flight-schemas.js';

type TripType = 'round_trip' | 'one_way';

export type SearchDraft = {
  readonly tripType: TripType;
  readonly origin: string;
  readonly destination: string;
  readonly departureDate: string;
  readonly returnDate: string;
  readonly adults: string;
  readonly children: string;
  readonly infants: string;
  readonly cabinClass: SearchContext['cabinClass'];
  readonly currency: string;
  readonly country: string;
};

function initialDraft(context?: SearchContext, placeLabels?: { readonly origin?: string; readonly destination?: string }): SearchDraft {
  return {
    tripType: context ? (context.returnDate ? 'round_trip' : 'one_way') : 'round_trip',
    origin: placeLabels?.origin ?? context?.origin ?? '',
    destination: placeLabels?.destination ?? context?.destination ?? '',
    departureDate: context?.departureDate ?? '',
    returnDate: context?.returnDate ?? '',
    adults: String(context?.adults ?? 1),
    children: String(context?.children ?? 0),
    infants: String(context?.infants ?? 0),
    cabinClass: context?.cabinClass ?? 'ECONOMY',
    currency: context?.currency ?? '',
    country: context?.country ?? '',
  };
}

export function searchPrompt(draft: SearchDraft): string {
  const trip = draft.tripType === 'round_trip' ? `returning ${draft.returnDate}` : 'one way';
  return [
    `Search flights from ${draft.origin.trim()} to ${draft.destination.trim()}, departing ${draft.departureDate}, ${trip}.`,
    `${draft.adults} adult(s), ${draft.children} child(ren), and ${draft.infants} infant(s), in ${draft.cabinClass.replaceAll('_', ' ').toLowerCase()}.`,
    `Use ${draft.currency.trim().toUpperCase()} currency and ${draft.country.trim().toUpperCase()} as the point-of-sale country.`,
    'Resolve unambiguous place names to IATA codes. If a place is ambiguous or child or infant ages are needed, ask me before calling search_flights.',
  ].join(' ');
}

export function SearchEditor({
  context,
  title,
  onSubmit,
  onBack,
  placeLabels,
}: {
  readonly context?: SearchContext;
  readonly title: string;
  readonly onSubmit?: (draft: SearchDraft) => void;
  readonly onBack?: () => void;
  readonly placeLabels?: { readonly origin?: string; readonly destination?: string };
}) {
  const [draft, setDraft] = useState(() => initialDraft(context, placeLabels));
  const update = <Key extends keyof SearchDraft>(key: Key, value: SearchDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const swapRoute = () => setDraft((current) => ({
    ...current,
    origin: current.destination,
    destination: current.origin,
  }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(draft);
  };

  return (
    <form className="cc-search-form" onSubmit={submit} aria-label={title}>
      <header className="cc-search-heading">
        <div>
          <h2>{title}</h2>
          <p>Use city or airport names. Cedar &amp; Cloud will clarify an ambiguous place before searching.</p>
        </div>
        {onBack ? <Action type="button" variant="quiet" onClick={onBack}>← Back</Action> : null}
      </header>

      <Flow variant="stack" density="comfortable">
        <div className="cc-trip-type">
          <Field label="Trip type" group>
            <SegmentedControl
              aria-label="Trip type"
              name="tripType"
              value={draft.tripType}
              onValueChange={(value) => update('tripType', value as TripType)}
              options={[
                { value: 'round_trip', label: 'Round trip' },
                { value: 'one_way', label: 'One way' },
              ]}
            />
          </Field>
        </div>

        <div className="cc-route-fields">
          <Field label="From" detail="City or airport name">
            <Input name="origin" autoComplete="off" value={draft.origin} placeholder="Toronto" required onChange={(event) => update('origin', event.currentTarget.value)} />
          </Field>
          <Action
            type="button"
            variant="quiet"
            className="cc-route-swap"
            aria-label="Swap origin and destination"
            onClick={swapRoute}
          >
            ⇄
          </Action>
          <Field label="To" detail="City or airport name">
            <Input name="destination" autoComplete="off" value={draft.destination} placeholder="Lisbon" required onChange={(event) => update('destination', event.currentTarget.value)} />
          </Field>
        </div>

        <div className={`cc-form-grid cc-form-grid-dates cc-trip-${draft.tripType}`}>
          <Field label="Departure">
            <Input name="departureDate" type="date" value={draft.departureDate} required onChange={(event) => update('departureDate', event.currentTarget.value)} />
          </Field>
          {draft.tripType === 'round_trip' ? (
            <Field label="Return">
              <Input name="returnDate" type="date" value={draft.returnDate} required onChange={(event) => update('returnDate', event.currentTarget.value)} />
            </Field>
          ) : null}
          <Field label="Cabin">
            <Select name="cabinClass" value={draft.cabinClass} onChange={(event) => update('cabinClass', event.currentTarget.value as SearchDraft['cabinClass'])} options={[
              { value: 'ECONOMY', label: 'Economy' },
              { value: 'PREMIUM_ECONOMY', label: 'Premium economy' },
              { value: 'BUSINESS', label: 'Business' },
              { value: 'FIRST', label: 'First' },
            ]} />
          </Field>
        </div>

        <div className="cc-form-grid cc-form-grid-travellers">
          <Field label="Adults">
            <Input name="adults" type="number" min="1" max="9" inputMode="numeric" value={draft.adults} required onChange={(event) => update('adults', event.currentTarget.value)} />
          </Field>
          <Field label="Children" detail="Ages 2–11">
            <Input name="children" type="number" min="0" max="8" inputMode="numeric" value={draft.children} required onChange={(event) => update('children', event.currentTarget.value)} />
          </Field>
          <Field label="Infants" detail="Under 2">
            <Input name="infants" type="number" min="0" max="9" inputMode="numeric" value={draft.infants} required onChange={(event) => update('infants', event.currentTarget.value)} />
          </Field>
          <Field label="Currency" detail="ISO code">
            <Input name="currency" maxLength={3} value={draft.currency} placeholder="CAD" required onChange={(event) => update('currency', event.currentTarget.value)} />
          </Field>
          <Field label="Country" detail="Point of sale">
            <Input name="country" maxLength={2} value={draft.country} placeholder="CA" required onChange={(event) => update('country', event.currentTarget.value)} />
          </Field>
        </div>

        {onSubmit ? (
          <ActionBar>
            <Action type="submit" variant="primary">Search flights</Action>
          </ActionBar>
        ) : (
          <p className="cc-form-fallback">Ask in the conversation to search these details. This host does not support starting a follow-up from the widget.</p>
        )}
      </Flow>
    </form>
  );
}
