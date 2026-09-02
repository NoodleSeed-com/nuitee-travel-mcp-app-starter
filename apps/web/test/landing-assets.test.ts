import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicRoot = join(import.meta.dirname, '..', 'public');

const expectedMasters = [
  '/images/immersive/wayfare-explore-windows-v2.png',
  '/images/immersive/wayfare-cockpit-v2.png',
  '/images/immersive/wayfare-insurance-v1.png',
  '/images/immersive/wayfare-stay-v1.png',
  '/images/immersive/wayfare-flight-stay-v1.png',
  '/images/destinations/rome-editorial-v2.jpg',
  '/images/destinations/london-editorial-v2.jpg',
  '/images/destinations/istanbul-editorial-v2.jpg',
  '/images/destinations/lisbon-editorial-v1.png',
  '/images/destinations/banff-editorial-v1.png',
] as const;

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

function pngDimensions(bytes: Buffer) {
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

describe('editorial landing imagery', () => {
  it.each(expectedMasters)('%s is a high-resolution local image master', (src) => {
    const path = join(publicRoot, src);
    const bytes = readFileSync(path);
    const isPng = [...bytes.subarray(0, 8)].join(',') === '137,80,78,71,13,10,26,10';
    const dimensions = isPng ? pngDimensions(bytes) : jpegDimensions(bytes);
    if (!isPng) expect([...bytes.subarray(0, 2)]).toEqual([0xff, 0xd8]);
    expect(Math.max(dimensions.width, dimensions.height)).toBeGreaterThanOrEqual(1536);
    expect(Math.min(dimensions.width, dimensions.height)).toBeGreaterThanOrEqual(900);
    expect(statSync(path).size).toBeGreaterThan(500_000);
    expect(statSync(path).size).toBeLessThan(4_000_000);
  });
});
