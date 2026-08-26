import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { starterConfig } from '../../../starter.config';
import './globals.css';

export const metadata: Metadata = {
  title: starterConfig.brand.name,
  description: starterConfig.brand.tagline,
};

const travelTheme = {
  '--travel-canvas-light': starterConfig.brand.canvas,
  '--travel-surface-light': starterConfig.brand.surface,
  '--travel-surface-dark': starterConfig.brand.surfaceDark,
  '--travel-signal': starterConfig.brand.signal,
  '--travel-accent': starterConfig.brand.accent,
  '--travel-boundary-light': starterConfig.brand.boundary,
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
