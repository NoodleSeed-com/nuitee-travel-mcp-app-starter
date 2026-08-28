import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { landingDestinations, landingEditorialFeature } from '../src/lib/landing-content';

const publicRoot = join(import.meta.dirname, '..', 'public');

describe('editorial landing imagery', () => {
  it.each([
    ...landingDestinations.map(({ imageSrc }) => imageSrc),
    landingEditorialFeature.imageSrc,
  ])('%s is a local optimized JPEG', (imageSrc) => {
    const path = join(publicRoot, imageSrc);
    const bytes = readFileSync(path);
    expect([...bytes.subarray(0, 2)]).toEqual([0xff, 0xd8]);
    expect(statSync(path).size).toBeGreaterThan(100_000);
    expect(statSync(path).size).toBeLessThan(1_500_000);
  });
});
