import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DemoHotel } from '../demo-schemas.js';
import { gradientForName } from './card-primitives.js';
import {
  MAPBOX_TOKEN,
  loadMapboxFromCdn,
  mapboxStyleForTheme,
  type MapboxMapLike,
  type MapboxMarkerLike,
} from './mapbox-loader.js';

export type LocatedHotel = DemoHotel & { readonly lat: number; readonly lng: number };

export function mappableHotels(hotels: readonly DemoHotel[]): LocatedHotel[] {
  return hotels.filter(
    (hotel): hotel is LocatedHotel => typeof hotel.lat === 'number' && typeof hotel.lng === 'number',
  );
}

function money(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export function FallbackMap({
  hotels,
  selectedId,
  onSelect,
  locale,
}: {
  readonly hotels: readonly LocatedHotel[];
  readonly selectedId?: string;
  readonly onSelect: (selectionId: string) => void;
  readonly locale: string;
}) {
  const lats = hotels.map((hotel) => hotel.lat);
  const lngs = hotels.map((hotel) => hotel.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const position = (hotel: LocatedHotel) => ({
    left: maxLng === minLng
      ? '50%'
      : `${(12 + ((hotel.lng - minLng) / (maxLng - minLng)) * 76).toFixed(2)}%`,
    top: maxLat === minLat
      ? '50%'
      : `${(12 + ((maxLat - hotel.lat) / (maxLat - minLat)) * 76).toFixed(2)}%`,
  });

  return (
    <div className="cc-fallback-map" role="img" aria-label="Hotel locations">
      <div aria-hidden="true" className="cc-fallback-grid" />
      {hotels.map((hotel) => (
        <button
          aria-label={`Show ${hotel.name} on the map`}
          className="cc-map-pin"
          data-active={hotel.selectionId === selectedId ? 'true' : 'false'}
          key={hotel.selectionId}
          onClick={() => onSelect(hotel.selectionId)}
          style={position(hotel)}
          type="button"
        >
          {money(hotel.staySubtotal.amount, hotel.staySubtotal.currency, locale)}
        </button>
      ))}
    </div>
  );
}

function markerElement(
  hotel: LocatedHotel,
  active: boolean,
  locale: string,
  onSelect: () => void,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'cc-map-marker';
  wrapper.dataset.active = active ? 'true' : 'false';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cc-map-marker-inner';
  button.textContent = money(hotel.staySubtotal.amount, hotel.staySubtotal.currency, locale);
  button.setAttribute('aria-label', `Show ${hotel.name} on the map`);
  button.addEventListener('click', onSelect);
  wrapper.appendChild(button);
  return wrapper;
}

function MapCanvas({
  hotels,
  selectedId,
  onSelect,
  locale,
}: {
  readonly hotels: readonly LocatedHotel[];
  readonly selectedId?: string;
  readonly onSelect: (selectionId: string) => void;
  readonly locale: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMapLike | null>(null);
  const markersRef = useRef(new globalThis.Map<string, MapboxMarkerLike>());
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const geoKey = useMemo(
    () => hotels.map((hotel) => `${hotel.selectionId}:${hotel.lat},${hotel.lng}`).join('|'),
    [hotels],
  );
  const canUseMapbox = MAPBOX_TOKEN.startsWith('pk.') && hotels.length > 0 && status !== 'failed';

  useEffect(() => setStatus('idle'), [geoKey]);

  useEffect(() => {
    if (!canUseMapbox || !containerRef.current) return undefined;
    let cancelled = false;
    let loadTimeout: number | undefined;
    let resizeObserver: ResizeObserver | undefined;
    setStatus('loading');

    void loadMapboxFromCdn().then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: mapboxStyleForTheme('light'),
        center: [hotels[0]!.lng, hotels[0]!.lat],
        zoom: 11,
        projection: 'mercator',
        attributionControl: true,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      loadTimeout = window.setTimeout(() => {
        if (!cancelled) setStatus('failed');
      }, 9_000);

      map.on('load', () => {
        if (cancelled) return;
        if (loadTimeout !== undefined) window.clearTimeout(loadTimeout);
        const bounds = new mapboxgl.LngLatBounds();
        for (const hotel of hotels) {
          const coordinates: readonly [number, number] = [hotel.lng, hotel.lat];
          bounds.extend(coordinates);
          const marker = new mapboxgl.Marker({
            element: markerElement(
              hotel,
              hotel.selectionId === selectedId,
              locale,
              () => onSelect(hotel.selectionId),
            ),
            anchor: 'bottom',
          }).setLngLat(coordinates).addTo(map);
          markersRef.current.set(hotel.selectionId, marker);
        }
        if (hotels.length > 1 && !bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 54, maxZoom: 13.5, duration: 0 });
        }
        map.resize();
        window.requestAnimationFrame(() => map.resize());
        window.setTimeout(() => map.resize(), 250);
        setStatus('ready');
      });

      map.on('error', () => {
        if (loadTimeout !== undefined) window.clearTimeout(loadTimeout);
        if (!cancelled) setStatus('failed');
      });

      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(containerRef.current);
      }
    }).catch(() => {
      if (!cancelled) setStatus('failed');
    });

    return () => {
      cancelled = true;
      if (loadTimeout !== undefined) window.clearTimeout(loadTimeout);
      resizeObserver?.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [canUseMapbox, geoKey, hotels, locale, onSelect, selectedId]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      marker.getElement().dataset.active = id === selectedId ? 'true' : 'false';
    });
    const selected = hotels.find((hotel) => hotel.selectionId === selectedId);
    if (mapRef.current && selected) {
      mapRef.current.flyTo({
        center: [selected.lng, selected.lat],
        zoom: 13,
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450,
      });
    }
  }, [hotels, selectedId]);

  if (!canUseMapbox) {
    return (
      <FallbackMap hotels={hotels} locale={locale} onSelect={onSelect} selectedId={selectedId} />
    );
  }

  return (
    <>
      {status !== 'ready' ? (
        <FallbackMap hotels={hotels} locale={locale} onSelect={onSelect} selectedId={selectedId} />
      ) : null}
      <div
        aria-label="Interactive hotel map"
        className={`cc-map-canvas${status === 'ready' ? ' cc-map-canvas-ready' : ''}`}
        ref={containerRef}
        role="region"
      />
    </>
  );
}

export function MapBoard({
  hotels,
  locale,
  theme: _theme,
  selectedId,
  onSelect,
  children,
}: {
  readonly hotels: readonly DemoHotel[];
  readonly locale: string;
  readonly theme: 'light' | 'dark';
  readonly selectedId?: string;
  readonly onSelect: (selectionId: string) => void;
  readonly children?: (hotel: DemoHotel) => ReactNode;
}) {
  const located = mappableHotels(hotels);
  const selected = located.find((hotel) => hotel.selectionId === selectedId);
  const unmapped = hotels.filter((hotel) => !located.includes(hotel));

  return (
    <section className="cc-map-wrap" aria-label="Hotel map">
      <div className="cc-map-layout">
        <div className="cc-map-board">
          <MapCanvas
            hotels={located}
            locale={locale}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        </div>
        {selected && children ? <aside className="cc-map-detail">{children(selected)}</aside> : null}
      </div>

      <div className="cc-chip-rail-wrap">
        <p className="cc-chip-rail-cap">Select a stay to preview its details</p>
        <div className="cc-map-choice-rail" role="group" aria-label="Map hotel choices">
          {located.map((hotel) => (
            <button
              aria-pressed={hotel.selectionId === selectedId}
              className="cc-map-choice"
              key={hotel.selectionId}
              onClick={() => onSelect(hotel.selectionId)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="cc-map-choice-thumb"
                style={{ background: gradientForName(hotel.name) }}
              />
              <span className="cc-map-choice-copy">
                <strong>{hotel.name}</strong>
                <span>{money(hotel.staySubtotal.amount, hotel.staySubtotal.currency, locale)} total</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {unmapped.length > 0 ? (
        <p className="cc-map-note">
          {unmapped.length} stay{unmapped.length === 1 ? '' : 's'} without a map location:{' '}
          {unmapped.map((hotel) => hotel.name).join(', ')}. See the list view.
        </p>
      ) : null}
    </section>
  );
}
