import { describe, expect, it } from 'vitest';
import app from '../src/server.js';

describe('acme-discovery example', () => {
  it('exports a Noodle server definition', () => {
    expect(typeof app.toManifest).toBe('function');
  });

  it('declares the off-app handoff domain the deep link lands on', async () => {
    // Top-of-funnel: the only external target is Acme's booking site, declared once at the server.
    const manifest = await app.toManifest();
    expect(JSON.stringify(manifest)).toContain('https://book.acme.example');
  });

  it('exposes the discovery tool and the handoff tool', async () => {
    const manifest = await app.toManifest();
    const text = JSON.stringify(manifest);
    // The discovery tool renders the carousel; the handoff tool emits the deep link; the widget-only
    // helper records a shortlist.
    expect(text).toContain('discover_getaways');
    expect(text).toContain('create_handoff');
    expect(text).toContain('shortlist_getaway');
  });
});
