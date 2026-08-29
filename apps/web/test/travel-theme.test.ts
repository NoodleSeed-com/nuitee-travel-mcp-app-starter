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

function withoutFinePointerBlocks(css: string): string {
  const query = '@media (hover: hover) and (pointer: fine)';
  let remaining = css;
  let start = remaining.indexOf(query);
  while (start !== -1) {
    const open = remaining.indexOf('{', start);
    let depth = 1;
    let cursor = open + 1;
    while (depth > 0 && cursor < remaining.length) {
      if (remaining[cursor] === '{') depth += 1;
      if (remaining[cursor] === '}') depth -= 1;
      cursor += 1;
    }
    remaining = `${remaining.slice(0, start)}${remaining.slice(cursor)}`;
    start = remaining.indexOf(query);
  }
  return remaining;
}

describe('Wayfare premium travel theme', () => {
  it('keeps the approved checked-in colors and accessible contrast pairs', () => {
    expect(starterConfig.brand).toMatchObject({
      accent: '#2F70E8',
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
    expect(contrastRatio('#2F70E8', '#F7F8FA')).toBeGreaterThanOrEqual(3);
  });

  it('uses the approved raised token for surface backgrounds', async () => {
    const globals = await readFile(
      resolve(process.cwd(), 'app/globals.css'),
      'utf8',
    );

    expect(globals).not.toContain('var(--travel-surface)');
  });

  it('uses one contrast-preserving foreground token for primary interactions', async () => {
    const globals = await readFile(
      resolve(process.cwd(), 'app/globals.css'),
      'utf8',
    );
    const accent = globals.match(
      /--travel-blue:\s*(#[a-f\d]{6});/iu,
    )?.[1];
    const onAccent = globals.match(
      /--travel-on-accent:\s*(#[a-f\d]{6});/iu,
    )?.[1];
    const primaryInteraction = globals.match(
      /\.travel-interaction-card__actions > button:first-child\s*\{([^}]*)\}/u,
    )?.[1];

    expect(accent).toBeDefined();
    expect(accent).toBe(starterConfig.brand.accent.toLowerCase());
    expect(onAccent).toBe('#ffffff');
    expect(primaryInteraction).toContain('color: var(--travel-on-accent);');
    expect(contrastRatio(accent ?? '#ffffff', onAccent ?? '#ffffff'))
      .toBeGreaterThanOrEqual(4.5);
  });

  it('limits hover-only presentation to fine pointers without changing focus rules', async () => {
    const globals = await readFile(
      resolve(process.cwd(), 'app/globals.css'),
      'utf8',
    );
    const nonFinePointerCss = withoutFinePointerBlocks(globals);

    expect(nonFinePointerCss).not.toMatch(/:hover\s*[{,]/u);
    expect(globals).toContain(':focus-visible');
  });
});
