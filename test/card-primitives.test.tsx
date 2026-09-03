import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  Badge,
  PhotoBand,
  Price,
  Rail,
  ScorePin,
  gradientForName,
} from '../src/views/card-primitives.js';

describe('gradientForName', () => {
  it('is deterministic for the same name', () => {
    expect(gradientForName('Tagus Lantern Hotel')).toBe(gradientForName('Tagus Lantern Hotel'));
  });

  it('differs between hotels', () => {
    expect(gradientForName('Tagus Lantern Hotel')).not.toBe(gradientForName('Alfama Cloud House'));
  });

  it('produces a css linear-gradient', () => {
    expect(gradientForName('Rainlight Vancouver')).toMatch(/^linear-gradient\(/);
  });
});

describe('ScorePin', () => {
  it('renders nothing when no score is supplied', () => {
    expect(renderToStaticMarkup(<ScorePin />)).toBe('');
  });

  it('renders the score with a text alternative when supplied', () => {
    const html = renderToStaticMarkup(<ScorePin score={8.9} />);
    expect(html).toContain('8.9');
    expect(html).toContain('Guest rating 8.9 out of 10');
  });
});

describe('PhotoBand', () => {
  it('paints the deterministic gradient when no image is available', () => {
    const html = renderToStaticMarkup(<PhotoBand name="Tagus Lantern Hotel" />);
    expect(html).toContain('linear-gradient(');
    expect(html).not.toContain('<img');
  });

  it('renders the image when one is supplied, keeping the gradient beneath', () => {
    const html = renderToStaticMarkup(
      <PhotoBand name="Tagus Lantern Hotel" imageUrl="https://snaphotelapi.com/a.jpg" />,
    );
    expect(html).toContain('<img');
    expect(html).toContain('https://snaphotelapi.com/a.jpg');
    expect(html).toContain('linear-gradient(');
  });

  it('is decoration, so it is hidden from assistive technology', () => {
    expect(renderToStaticMarkup(<PhotoBand name="X" />)).toContain('aria-hidden="true"');
  });

  it('keeps children out of the aria-hidden decorative layer', () => {
    const html = renderToStaticMarkup(
      <PhotoBand name="Tagus Lantern Hotel">
        <button type="button">Compare</button>
      </PhotoBand>,
    );
    // The decor layer is hidden; the button must NOT be inside it.
    const decorStart = html.indexOf('cc-photo-decor');
    const decorEnd = html.indexOf('</div>', decorStart);
    const buttonAt = html.indexOf('<button');
    expect(decorStart).toBeGreaterThan(-1);
    expect(buttonAt).toBeGreaterThan(decorEnd);
  });
});

describe('Price', () => {
  it('shows total and per-night in the given currency', () => {
    const html = renderToStaticMarkup(
      <Price total={1716} perNight={286} currency="CAD" locale="en-CA" />,
    );
    expect(html).toContain('1,716');
    expect(html).toContain('286');
  });
});

describe('Rail', () => {
  it('labels the scroll region and renders both arrows', () => {
    const html = renderToStaticMarkup(<Rail ariaLabel="Stays"><div>card</div></Rail>);
    expect(html).toContain('aria-label="Stays"');
    expect(html).toContain('cc-rail-arrow-prev');
    expect(html).toContain('cc-rail-arrow-next');
  });
});

describe('Badge', () => {
  it('applies the tone modifier class', () => {
    expect(renderToStaticMarkup(<Badge tone="good">Flexible</Badge>)).toContain('cc-badge-good');
  });
});
