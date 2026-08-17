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

  it('declares the grounded knowledge component and its live site scope', async () => {
    const manifest = (await app.toManifest()) as { server: { knowledge?: unknown[] } };
    // One declaration: controlled files plus the live public site, compiled later into the
    // generated `search_destinations` capability with citations.
    expect(manifest.server.knowledge).toHaveLength(1);
    const text = JSON.stringify(manifest);
    expect(text).toContain('knowledge/product.md');
    expect(text).toContain('https://getaways.acme.example');
  });
});
