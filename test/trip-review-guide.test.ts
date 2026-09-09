import { expect, it } from 'vitest';
import app from '../src/demo-embedded-server.js';

it('guides source-aware estimates and non-transactional points/protection choices', async () => {
  const manifest = await app.toManifest() as any;
  const guide = JSON.stringify(manifest.server.agentGuide);
  expect(guide).toContain('returned planningEstimate');
  expect(guide).toContain('not a package quote or amount to pay');
  expect(guide).toContain('does not mean the selected cash fare is eligible');
  expect(guide).toContain('only after the app confirms its caller-scoped planning-state update');
  expect(guide).toContain('The traveler is not insured by adding it');
});
