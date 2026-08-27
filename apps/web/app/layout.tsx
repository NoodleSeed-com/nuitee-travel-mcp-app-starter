import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { starterConfig } from '../../../starter.config';
import './globals.css';

export const metadata: Metadata = {
  title: starterConfig.brand.name,
  description: starterConfig.brand.tagline,
};

const travelTheme = {
  '--travel-canvas': starterConfig.brand.canvas,
  '--travel-surface': starterConfig.brand.surface,
  '--travel-signal': starterConfig.brand.signal,
  '--travel-accent': starterConfig.brand.accent,
  '--travel-boundary': starterConfig.brand.boundary,
  '--travel-muted': starterConfig.brand.muted,
  '--travel-ink': starterConfig.brand.ink,
} as CSSProperties;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" style={travelTheme}>
      <body>{children}</body>
    </html>
  );
}
