import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { starterConfig } from '../../../starter.config';
import { DARK_THEME_TOKENS } from '../src/lib/travel-theme';
import './globals.css';

export const metadata: Metadata = {
  title: starterConfig.brand.name,
  description: starterConfig.brand.tagline,
};

const travelTheme = {
  '--travel-canvas-light': starterConfig.brand.canvas,
  '--travel-surface-light': starterConfig.brand.surface,
  '--travel-surface-dark': DARK_THEME_TOKENS.canvas,
  '--travel-surface-dark-raised': DARK_THEME_TOKENS.surface,
  '--travel-signal': starterConfig.brand.signal,
  '--travel-accent': starterConfig.brand.accent,
  '--travel-boundary-light': starterConfig.brand.boundary,
  '--travel-boundary-dark': DARK_THEME_TOKENS.boundary,
  '--travel-focus-dark': DARK_THEME_TOKENS.focus,
  '--travel-muted-light': starterConfig.brand.muted,
  '--travel-ink-light': starterConfig.brand.ink,
} as CSSProperties;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-theme="system" lang="en" style={travelTheme}>
      <body>{children}</body>
    </html>
  );
}
