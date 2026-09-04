import { describe, expect, it } from 'vitest';
import { MAPBOX_GL_JS_URL, mapboxStyleForTheme } from '../src/views/mapbox-loader.js';

describe('Mapbox widget loader', () => {
  it('uses the approved light Mapbox style for every Wayfare presentation', () => {
    expect(mapboxStyleForTheme('light')).toContain('light');
    expect(mapboxStyleForTheme('dark')).toContain('light');
    expect(mapboxStyleForTheme(undefined)).toContain('light');
  });

  it('pins an exact Mapbox CDN version', () => {
    expect(MAPBOX_GL_JS_URL).toMatch(
      /^https:\/\/api\.mapbox\.com\/mapbox-gl-js\/v\d+\.\d+\.\d+\//,
    );
  });
});
