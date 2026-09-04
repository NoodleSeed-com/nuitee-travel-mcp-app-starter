import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { WayfareStructuredData } from '../src/components/wayfare-structured-data';
import {
  serializeStructuredData,
  wayfareStructuredData,
} from '../src/lib/wayfare-structured-data';

afterEach(cleanup);

describe('Wayfare structured data', () => {
  it('describes only the website and browser application', () => {
    expect(wayfareStructuredData['@graph'].map((node) => node['@type']))
      .toEqual(['WebSite', 'WebApplication']);
    const value = JSON.stringify(wayfareStructuredData);
    expect(value).toContain('https://gowayfare.io/');
    expect(value).not.toMatch(
      /AggregateRating|Offer|SearchAction|price|ratingValue|book now/i,
    );
  });

  it('renders parseable JSON-LD on the homepage', () => {
    const { container } = render(<WayfareStructuredData />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).not.toBeNull();
    expect(JSON.parse(script?.textContent ?? '{}')).toEqual(wayfareStructuredData);
  });

  it('escapes executable angle brackets during serialization', () => {
    const serialized = serializeStructuredData({ value: '</script><script>' });

    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual({ value: '</script><script>' });
  });
});
