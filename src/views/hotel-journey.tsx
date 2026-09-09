import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { DemoHotel, DemoHotelSearchOutput } from '../demo-schemas.js';
import { Action, Feedback, Frame } from '../helpers.js';
import { BedIcon, CheckIcon } from './icons.js';
import { MapBoard } from './hotel-map-board.js';
import './hotel-journey.css';
import { CardCarousel } from './card-carousel.js';

export interface HotelJourneyState {
  readonly searchId: string;
  readonly screen: 'shortlist' | 'detail' | 'explore';
  readonly detailId?: string;
  readonly mapId?: string;
  readonly compareIds: readonly string[];
  readonly shown: number;
}

export function initialHotelJourney(searchId: string): HotelJourneyState {
  return { searchId, screen: 'shortlist', compareIds: [], shown: 3 };
}

function money(hotel: DemoHotel, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: hotel.staySubtotal.currency }).format(hotel.staySubtotal.amount);
}

function HotelPhoto({ hotel }: { readonly hotel: DemoHotel }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const failed = Boolean(hotel.imageUrl && hotel.imageUrl === failedUrl);
  return <div className="cc-stay-photo">
    {hotel.imageUrl && !failed
      ? <img key={hotel.imageUrl} alt={hotel.name} src={hotel.imageUrl} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(hotel.imageUrl)} />
      : <span><BedIcon /><small>{failed ? 'Photo unavailable' : 'Photo not provided'}</small></span>}
  </div>;
}

function StayPrice({ hotel, locale }: { readonly hotel: DemoHotel; readonly locale: string }) {
  return <div className="cc-stay-price">
    <strong>{money(hotel, locale)}</strong>
    <span>for {hotel.nights} night{hotel.nights === 1 ? '' : 's'}, {hotel.rooms} room{hotel.rooms === 1 ? '' : 's'}</span>
    <small>{hotel.taxesAndFeesIncluded ? 'Shown taxes and fees included' : hotel.dataSource === 'live_nuitee' ? 'Tax and fee inclusion requires review' : 'Taxes and fees not included in shown subtotal'}</small>
  </div>;
}

export function HotelJourney({ result, state, displayMode, theme = 'light', appearance = 'wayfare', locale = 'en-CA', selectedSelectionId, pendingSelectionId, selectionError, onAdd, onReview, onExpand, onReturn, experience, onExperienceChange }: {
  readonly result?: DemoHotelSearchOutput;
  readonly state?: 'loading' | 'error' | 'malformed';
  readonly displayMode: string;
  readonly theme?: 'light' | 'dark';
  readonly appearance?: 'wayfare' | 'host';
  readonly locale?: string;
  readonly selectedSelectionId?: string;
  readonly pendingSelectionId?: string;
  readonly selectionError?: string;
  readonly onAdd?: (selectionId: string) => void;
  readonly onReview?: () => void;
  readonly onExpand?: () => void;
  readonly onReturn?: () => void;
  readonly experience?: HotelJourneyState;
  readonly onExperienceChange?: (next: HotelJourneyState) => void;
}) {
  const searchId = result?.searchId ?? '';
  const [local, setLocal] = useState(() => initialHotelJourney(searchId));
  const candidate = experience ?? local;
  const current = candidate.searchId === searchId ? candidate : initialHotelJourney(searchId);
  const change = (patch: Partial<HotelJourneyState>) => {
    const next = { ...current, ...patch };
    setLocal(next);
    onExperienceChange?.(next);
  };
  const heading = useRef<HTMLHeadingElement>(null);
  const lastScreen = useRef(current.screen);
  useEffect(() => {
    // Do not steal focus on initial render or on a result update.
    if (lastScreen.current !== current.screen) heading.current?.focus({ preventScroll: true });
    lastScreen.current = current.screen;
  }, [current.screen]);
  const className = `cc-app cc-hotel-results cc-hotel-journey${appearance === 'host' ? ' cc-host-styled' : ''}`;
  const wrapper = (content: ReactNode, title = 'Stays') => <Frame className={className} data-theme={appearance === 'host' ? theme : 'light'} displayMode="auto" title={title}>{content}</Frame>;

  if (state === 'loading') return wrapper(<div className="cc-stay-loading" role="status" aria-busy="true"><p>Finding stays…</p><div className="cc-stay-skeletons" aria-hidden="true">{[0, 1, 2].map(index => <div className="cc-stay-skeleton" key={index}><div className="cc-stay-skeleton-photo" /><div className="cc-stay-skeleton-body"><span /><span /><span /><span /></div></div>)}</div></div>);
  if (state || !result) return wrapper(<Feedback status="error">{state === 'error' ? 'The hotel search could not load. Try again; nothing was selected.' : 'The hotel result was incomplete and could not be shown safely. Try the search again.'}</Feedback>);
  if (result.status === 'error') return wrapper(<Feedback status="error">{result.error?.message ?? result.message} No room was held or reserved.</Feedback>);
  if (result.status === 'empty') return wrapper(<p>{result.message} Try different dates or a nearby destination.</p>, 'No stays found');

  const hotels = result.hotels;
  const detail = hotels.find(hotel => hotel.selectionId === current.detailId);
  const selected = hotels.find(hotel => hotel.selectionId === selectedSelectionId);
  const compareIds = current.compareIds.filter(id => hotels.some(hotel => hotel.selectionId === id));
  const compared = compareIds.map(id => hotels.find(hotel => hotel.selectionId === id)!);
  const back = <Action type="button" variant="quiet" onClick={() => { change({ screen: 'shortlist' }); onReturn?.(); }}>Back to stays</Action>;
  const disclosure = <p className="cc-stay-source">{result.disclosure}</p>;
  const select = (hotel: DemoHotel) => <Action type="button" variant={selectedSelectionId === hotel.selectionId ? 'secondary' : 'primary'}
    className={selectedSelectionId === hotel.selectionId ? 'cc-selection-action-selected' : undefined}
    aria-pressed={selectedSelectionId === hotel.selectionId}
    disabled={!onAdd || Boolean(pendingSelectionId) || selectedSelectionId === hotel.selectionId}
    pending={pendingSelectionId === hotel.selectionId} pendingLabel="Selecting…" onClick={() => onAdd?.(hotel.selectionId)}>
    {selectedSelectionId === hotel.selectionId ? <><CheckIcon />Selected</> : 'Choose this stay'}
  </Action>;
  const feedback = <>
    {selectionError ? <Feedback status="error">{selectionError}</Feedback> : null}
    {selected ? <div className="cc-stay-selected-note">
      <div role="status"><strong><CheckIcon />Stay added to your trip</strong><p>{selected.name} · Not reserved</p><small>Nothing was booked, held, or paid.</small></div>
      {onReview ? <Action type="button" variant="primary" data-trip-review-trigger disabled={Boolean(pendingSelectionId)} onClick={onReview}>Review my trip</Action> : null}
    </div> : null}
  </>;

  if (current.screen === 'detail' && detail) return wrapper(<>
    {disclosure}
    <article className="cc-stay-detail">
      <HotelPhoto key={detail.selectionId} hotel={detail} />
      <div className="cc-stay-detail-body">
        <h2 ref={heading} tabIndex={-1}>{detail.name}</h2>
        <p>{detail.neighborhood}, {detail.city}</p>
        <StayPrice hotel={detail} locale={locale} />
        <p className="cc-stay-policy">{detail.policySummary}</p>
        <dl><dt>Room</dt><dd>{detail.roomName}</dd><dt>Dates</dt><dd>{result.searchContext.checkInDate} to {result.searchContext.checkOutDate}</dd></dl>
        <p>{detail.description}</p>
        {detail.amenities.length ? <ul aria-label="Returned amenities">{detail.amenities.map(amenity => <li key={amenity}>{amenity}</li>)}</ul> : <p>Amenities not provided.</p>}
        {detail.reviewScore !== undefined ? <p>Guest rating: {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(detail.reviewScore)}/10{detail.reviewCount !== undefined ? ` from ${new Intl.NumberFormat(locale).format(detail.reviewCount)} reviews` : ''}</p> : null}
        <div className="cc-stay-actions">{select(detail)}{back}</div>
      </div>
    </article>{feedback}
  </>, 'Your stay option');

  if (current.screen === 'explore') return wrapper(<>
    <h2 ref={heading} tabIndex={-1}>Explore stays</h2>{disclosure}
    {displayMode === 'fullscreen' ? <MapBoard hotels={hotels} locale={locale} theme={appearance === 'host' ? theme : 'light'} selectedId={current.mapId} onSelect={id => change({ mapId: id })}>
      {hotel => <div className="cc-stay-map-summary"><h3>{hotel.name}</h3><StayPrice hotel={hotel} locale={locale} /><Action type="button" onClick={() => change({ screen: 'detail', detailId: hotel.selectionId })}>View stay</Action></div>}
    </MapBoard> : <p>Map exploration needs an expanded view. You can still compare stays here.</p>}
    <fieldset className="cc-stay-compare-picker"><legend>Choose two stays to compare</legend>
      {hotels.map(hotel => <label key={hotel.selectionId}><input type="checkbox" checked={compareIds.includes(hotel.selectionId)} disabled={compareIds.length === 2 && !compareIds.includes(hotel.selectionId)} onChange={() => change({ compareIds: compareIds.includes(hotel.selectionId) ? compareIds.filter(id => id !== hotel.selectionId) : [...compareIds, hotel.selectionId] })} /><span>{hotel.name}</span></label>)}
    </fieldset>
    {compared.length === 2 ? <CardCarousel className="cc-stay-comparison" label="Stay comparison" itemName="compared stay">{compared.map(hotel => <article key={hotel.selectionId}><h3>{hotel.name}</h3><StayPrice hotel={hotel} locale={locale} /><p>{hotel.neighborhood}</p><p>{hotel.policySummary}</p><Action type="button" onClick={() => change({ screen: 'detail', detailId: hotel.selectionId })}>View stay: {hotel.name}</Action></article>)}</CardCarousel> : <p>Choose {2 - compared.length} more {compared.length ? 'stay' : 'stays'} to see prices and terms together.</p>}
    {back}
  </>, 'Compare location and terms');

  return wrapper(<>
    <h2 className="cc-stay-context" ref={heading} tabIndex={-1}>{result.searchContext.destination}</h2>
    <p className="cc-stay-dates">{result.searchContext.checkInDate} to {result.searchContext.checkOutDate} · {result.searchContext.adults + result.searchContext.children} guests</p>
    {disclosure}
    {result.status === 'partial' ? <Feedback status="partial">{result.message}</Feedback> : null}
    <CardCarousel className="cc-stay-shortlist" label="Stays" itemName="stay">
      {hotels.slice(0, current.shown).map(hotel => <article className="cc-stay-card" key={hotel.selectionId}>
        <HotelPhoto hotel={hotel} />
        <div className="cc-stay-card-body"><h3>{hotel.name}</h3><p>{hotel.neighborhood}</p><StayPrice hotel={hotel} locale={locale} /><p className="cc-stay-policy">{hotel.policySummary}</p>
          <Action type="button" variant="primary" aria-label={`${selectedSelectionId === hotel.selectionId ? 'View selected stay' : 'View stay'}: ${hotel.name}`} className={selectedSelectionId === hotel.selectionId ? 'cc-selection-action-selected' : undefined} onClick={() => change({ screen: 'detail', detailId: hotel.selectionId })}>{selectedSelectionId === hotel.selectionId ? <><CheckIcon />Selected · View stay</> : 'View stay'}</Action>
        </div>
      </article>)}
    </CardCarousel>
    <div className="cc-stay-actions cc-stay-more">
      {current.shown < hotels.length ? <Action type="button" variant="quiet" onClick={() => change({ shown: Math.min(current.shown + 3, hotels.length) })}>Show {Math.min(3, hotels.length - current.shown)} more {hotels.length - current.shown === 1 ? 'stay' : 'stays'}</Action> : null}
      <Action type="button" variant="quiet" onClick={() => { change({ screen: 'explore' }); onExpand?.(); }}>Explore stays</Action>
    </div>{feedback}
  </>, 'Stays for your trip');
}
