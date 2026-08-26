import { describe, expect, it } from 'vitest';
import { DARK_THEME_TOKENS } from '../src/lib/travel-theme';

type Rgb = readonly [number, number, number];

function rgb(hex: string): Rgb {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map((value) => (
    Number.parseInt(value, 16)
  ));
  if (!channels || channels.length !== 3) throw new Error(`Invalid color: ${hex}`);
  return channels as unknown as Rgb;
}

function mix(foreground: string, background: string, opacity: number): string {
  const front = rgb(foreground);
  const back = rgb(background);
  return `#${front.map((channel, index) => (
    Math.round((channel * opacity) + (back[index] * (1 - opacity)))
      .toString(16)
      .padStart(2, '0')
  )).join('')}`;
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

describe('dark travel theme', () => {
  const rail = mix(DARK_THEME_TOKENS.surface, DARK_THEME_TOKENS.canvas, 0.82);

  it.each([
    ['boundary against canvas', DARK_THEME_TOKENS.boundary, DARK_THEME_TOKENS.canvas],
    ['boundary against rail', DARK_THEME_TOKENS.boundary, rail],
    ['focus against canvas', DARK_THEME_TOKENS.focus, DARK_THEME_TOKENS.canvas],
    ['focus against rail', DARK_THEME_TOKENS.focus, rail],
  ])('%s meets 3:1 non-text contrast', (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(3);
  });
});
