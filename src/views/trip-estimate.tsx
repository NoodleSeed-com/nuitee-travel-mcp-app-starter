import { useId, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Action } from '../helpers.js';
import { tripPlanningEstimate, type TripEstimateItem } from '../trip-planning-estimate.js';
import './trip-estimate.css';

export function TripEstimate({ data, locale = 'en-CA', party }: { readonly data: unknown; readonly locale?: string; readonly party?: string }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const estimate = tripPlanningEstimate({ review: data });
  if (estimate.status === 'empty') return null;
  const complete = estimate.status === 'complete';
  const format = (amountMinor: number, currency: string, fractionDigits: number) => new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(amountMinor / 10 ** fractionDigits);
  const value = (item: TripEstimateItem) => item.amountMinor !== undefined && item.currency && item.fractionDigits !== undefined ? format(item.amountMinor, item.currency, item.fractionDigits) : item.amount !== undefined && item.currency ? `${item.currency} ${new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }).format(item.amount)}` : 'Unavailable';
  const total = (amount: number) => format(amount, estimate.currency!, estimate.fractionDigits!);
  const providers = estimate.items.filter(item => item.source === 'provider_search');
  const fictional = estimate.items.filter(item => item.source === 'fictional');
  const providerLabel = providers.length === 2 ? 'Flight + stay search prices' : providers[0]?.component === 'flight' ? 'Flight search price' : 'Stay search price';
  const fictionalLabel = `Fictional ${[fictional.some(item => item.component === 'stay') ? 'stay' : '', fictional.some(item => item.component === 'experience') ? 'experiences' : '', fictional.some(item => item.component === 'protection') ? 'protection' : ''].filter(Boolean).join(' + ')}`;
  return <section className="wf-estimate" aria-labelledby={`${id}-heading`}>
    <div className="wf-estimate-head">
      <div><h3 id={`${id}-heading`}>Trip planning estimate</h3><p>{complete ? `${party ? `For ${party} · all` : 'All'} selected items in ${estimate.currency}` : 'Keep every price in its original currency'}</p></div>
      <div className="wf-estimate-price" aria-live="polite"><strong>{complete ? total(estimate.totalMinor!) : estimate.status === 'mixed_currencies' ? 'Separate currencies' : 'Total incomplete'}</strong><span>{complete ? fictional.length ? 'Includes fictional demo items' : 'Provider search prices only' : 'No combined total shown'}</span></div>
    </div>
    {complete ? <div className="wf-estimate-sources">
      {providers.length ? <><span>{providerLabel}</span><strong>{total(estimate.providerSubtotalMinor!)}</strong></> : null}
      {fictional.length ? <><span>{fictionalLabel}</span><strong>{total(estimate.fictionalSubtotalMinor!)}</strong></> : null}
    </div> : <p className="wf-estimate-caution"><InformationCircleIcon className="cc-icon" aria-hidden="true" />{estimate.status === 'mixed_currencies' ? 'Your selections use different currencies. We will not invent an exchange rate or add them together.' : 'A selected price or its currency precision is unavailable. Known prices remain in the breakdown; missing prices are not treated as zero.'}</p>}
    <Action type="button" className="wf-estimate-toggle" aria-expanded={expanded} aria-controls={`${id}-breakdown`} onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide' : 'View'} price breakdown{expanded ? <ChevronUpIcon className="cc-icon" aria-hidden="true" /> : <ChevronDownIcon className="cc-icon" aria-hidden="true" />}</Action>
    {expanded ? <div className="wf-estimate-breakdown" id={`${id}-breakdown`}>
      <dl>
        {providers.map((item, index) => <div key={`provider-${index}`}><dt>{item.label}<small>Provider search price</small></dt><dd>{value(item)}</dd></div>)}
        {complete && providers.length ? <div className="wf-estimate-subtotal"><dt>Provider search subtotal</dt><dd>{total(estimate.providerSubtotalMinor!)}</dd></div> : null}
        {fictional.map((item, index) => <div key={`fictional-${index}`}><dt>{item.label}<small>Fictional {item.component} price</small></dt><dd>{value(item)}</dd></div>)}
        {!fictional.some(item => item.component === 'protection') ? <div><dt>Protection<small>Optional · nothing selected</small></dt><dd>Not included</dd></div> : null}
        <div><dt>Points applied<small>No redemption supported</small></dt><dd>None</dd></div>
      </dl>
      <p>Not a package quote or amount to pay. Flight and stay prices need their own checks. Unknown fees are not treated as included.</p>
    </div> : null}
  </section>;
}
