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

describe('light Neutral travel theme', () => {
  it.each([
    ['primary text', starterConfig.brand.ink, starterConfig.brand.canvas, 4.5],
    ['secondary text', starterConfig.brand.muted, starterConfig.brand.canvas, 4.5],
    ['focus indicator', starterConfig.brand.accent, starterConfig.brand.canvas, 3],
    ['portable dark accent', starterConfig.brand.accent, starterConfig.brand.surfaceDark, 3],
    ['action label', starterConfig.brand.canvas, starterConfig.brand.signal, 4.5],
  ])('%s keeps accessible contrast', (_label, foreground, background, minimum) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(minimum);
  });
});
