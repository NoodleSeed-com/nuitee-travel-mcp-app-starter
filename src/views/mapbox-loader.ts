/** Mapbox GL is loaded from the CDN because widget iframes cannot rely on a bundled WebGL runtime. */
export const MAPBOX_GL_JS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
export const MAPBOX_GL_CSS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';

export interface MapboxBoundsLike {
  extend(lngLat: readonly [number, number]): void;
  isEmpty(): boolean;
}

export interface MapboxMapLike {
  addControl(control: unknown, position?: string): void;
  on(event: 'load' | 'error', handler: () => void): void;
  fitBounds(bounds: MapboxBoundsLike, options: Record<string, unknown>): void;
  flyTo(options: Record<string, unknown>): void;
  resize(): void;
  remove(): void;
}

export interface MapboxMarkerLike {
  setLngLat(lngLat: readonly [number, number]): MapboxMarkerLike;
  addTo(map: MapboxMapLike): MapboxMarkerLike;
  getElement(): HTMLElement;
  remove(): void;
}

export interface MapboxLike {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => MapboxMapLike;
  Marker: new (options: Record<string, unknown>) => MapboxMarkerLike;
  NavigationControl: new (options: Record<string, unknown>) => unknown;
  LngLatBounds: new () => MapboxBoundsLike;
}

declare global {
  interface Window {
    mapboxgl?: MapboxLike;
  }
}

let pending: Promise<MapboxLike> | null = null;

export function loadMapboxFromCdn(): Promise<MapboxLike> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Mapbox requires a browser window.'));
  if (window.mapboxgl) return Promise.resolve(window.mapboxgl);
  if (pending) return pending;

  pending = new Promise<MapboxLike>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Mapbox timed out.')), 8_000);
    const settleOk = () => {
      window.clearTimeout(timeout);
      if (window.mapboxgl) resolve(window.mapboxgl);
      else reject(new Error('Mapbox loaded without a browser API.'));
    };
    const settleFail = () => {
      window.clearTimeout(timeout);
      reject(new Error('Mapbox failed to load.'));
    };

    if (!document.querySelector(`link[href="${MAPBOX_GL_CSS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MAPBOX_GL_CSS_URL;
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MAPBOX_GL_JS_URL}"]`);
    if (existing) {
      existing.addEventListener('load', settleOk, { once: true });
      existing.addEventListener('error', settleFail, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = MAPBOX_GL_JS_URL;
    script.async = true;
    script.onload = settleOk;
    script.onerror = settleFail;
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    pending = null;
    throw error;
  });

  return pending;
}

const configuredToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();

/** A public, URL-restricted Mapbox `pk.` token; never log or persist it. */
export const MAPBOX_TOKEN = configuredToken ?? '';

/** Wayfare is light-only, including when the host reports a dark preference. */
export function mapboxStyleForTheme(_theme?: string | null): string {
  return 'mapbox://styles/mapbox/light-v11';
}
