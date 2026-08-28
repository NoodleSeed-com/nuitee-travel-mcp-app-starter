import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { landingDestinations, landingEditorialFeature } from '../src/lib/landing-content';

const publicRoot = join(import.meta.dirname, '..', 'public');

function jpegDimensions(bytes: Buffer) {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker && marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    offset += length + 2;
  }
  throw new Error('JPEG dimensions were not found');
}

describe('editorial landing imagery', () => {
  it('ships the colorful Wayfare hero as a 4K local JPEG', () => {
    const path = join(publicRoot, 'images/wayfare-coastline-hero-v1.jpg');
    const bytes = readFileSync(path);

    expect([...bytes.subarray(0, 2)]).toEqual([0xff, 0xd8]);
    expect(jpegDimensions(bytes)).toEqual({ width: 3840, height: 2160 });
    expect(statSync(path).size).toBeGreaterThan(500_000);
    expect(statSync(path).size).toBeLessThan(4_000_000);
  });

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
