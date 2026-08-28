import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { starterConfig } from '../../../starter.config';

type Rgb = readonly [number, number, number];

function rgb(hex: string): Rgb {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map((value) => (
    Number.parseInt(value, 16)
  ));
  if (!channels || channels.length !== 3) throw new Error(`Invalid color: ${hex}`);
  return channels as unknown as Rgb;
}

function luminance(hex: string): number {
  const [red, green, blue] = rgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
}

describe('Wayfare premium travel theme', () => {
  it('keeps the approved checked-in colors and accessible contrast pairs', () => {
    expect(starterConfig.brand).toMatchObject({
      accent: '#3478F6',
      signal: '#0B1F33',
      canvas: '#F7F8FA',
      surface: '#FFFFFF',
      surfaceDark: '#0B1F33',
      ink: '#0B1F33',
      muted: '#526173',
      boundary: '#D8DEE7',
    });

    expect(contrastRatio('#0B1F33', '#F7F8FA')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#526173', '#F7F8FA')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#3478F6', '#F7F8FA')).toBeGreaterThanOrEqual(3);
  });

  it('uses the approved raised token for surface backgrounds', async () => {
    const globals = await readFile(
      resolve(process.cwd(), 'app/globals.css'),
      'utf8',
    );

    expect(globals).not.toContain('var(--travel-surface)');
  });
});
