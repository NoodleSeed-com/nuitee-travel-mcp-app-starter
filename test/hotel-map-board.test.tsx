import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DemoHotel } from '../src/demo-schemas.js';
import { FallbackMap, MapBoard, mappableHotels } from '../src/views/hotel-map-board.js';

function stay(index: number, name: string, lat?: number, lng?: number): DemoHotel {
  return {
    selectionId: `hsel_${index.toString(16).padStart(32, '0')}`,
    dataSource: 'illustrative',
    name,
    city: 'Lisbon',
    countryCode: 'PT',
    neighborhood: 'Baixa concept district',
    description: 'An illustrative stay for a bounded comparison.',
    roomName: 'Wayfare preview room',
    category: 4,
    amenities: ['Wi-Fi'],
    nights: 6,
    rooms: 1,
    nightlyPrice: { amount: 286, currency: 'CAD' },
    staySubtotal: { amount: 1_716, currency: 'CAD' },
    taxesAndFeesIncluded: false,
    policySummary: 'Illustrative flexible terms.',
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
  };
}

const mapped = [
  stay(1, 'Tagus Lantern Hotel', 38.7107, -9.1365),
  stay(2, 'Alfama Cloud House', 38.7117, -9.13),
  stay(3, 'Juniper Quay Lisbon', 38.705, -9.145),
];

describe('hotel map filtering', () => {
  it('keeps only stays carrying both coordinates', () => {
    expect(mappableHotels([...mapped, stay(4, 'No map stay')]).map((hotel) => hotel.name))
      .toEqual(mapped.map((hotel) => hotel.name));
  });
});

describe('fallback hotel map', () => {
  it('renders one keyboard-reachable price button per mapped stay', () => {
    const html = renderToStaticMarkup(
      <FallbackMap hotels={mapped} locale="en-CA" onSelect={() => {}} />,
    );
    expect(html.match(/class="cc-map-pin"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Show Tagus Lantern Hotel on the map"');
  });

  it('normalizes coordinates inside the visible map area', () => {
    const html = renderToStaticMarkup(
      <FallbackMap hotels={mapped} locale="en-CA" onSelect={() => {}} />,
    );
    const percentages = [...html.matchAll(/(?:left|top):([\d.]+)%/g)]
      .map((match) => Number(match[1]));
    expect(percentages.length).toBeGreaterThan(0);
    for (const percentage of percentages) {
      expect(percentage).toBeGreaterThanOrEqual(12);
      expect(percentage).toBeLessThanOrEqual(88);
    }
  });

  it('centers a single stay instead of producing an invalid position', () => {
    const html = renderToStaticMarkup(
      <FallbackMap hotels={[mapped[0]!]} locale="en-CA" onSelect={() => {}} />,
    );
    expect(html).toContain('left:50%');
    expect(html).toContain('top:50%');
    expect(html).not.toContain('NaN');
  });

  it('marks only the selected price button', () => {
    const html = renderToStaticMarkup(
      <FallbackMap
        hotels={mapped}
        locale="en-CA"
        onSelect={() => {}}
        selectedId={mapped[1]!.selectionId}
      />,
    );
    expect(html.match(/data-active="true"/g)).toHaveLength(1);
  });
});

describe('hotel map board', () => {
  it('keeps a non-map rail and names stays without coordinates', () => {
    const html = renderToStaticMarkup(
      <MapBoard
        hotels={[...mapped, stay(4, 'No map stay')]}
        locale="en-CA"
        onSelect={() => {}}
        theme="light"
      />,
    );
    expect(html).toContain('aria-label="Map hotel choices"');
    expect(html).toContain('1 stay without a map location');
    expect(html).toContain('No map stay');
  });
});
