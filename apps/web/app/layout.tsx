import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import '@fontsource-variable/inter';
import { siteConfig } from '../src/lib/site-config';
import './globals.css';

export const metadata: Metadata = {
  title: siteConfig.brand.name,
  description: siteConfig.brand.tagline,
};

const travelTheme = {
  '--travel-canvas': siteConfig.brand.canvas,
  '--travel-surface': siteConfig.brand.surface,
  '--travel-signal': siteConfig.brand.signal,
  '--travel-accent': siteConfig.brand.accent,
  '--travel-boundary': siteConfig.brand.boundary,
  '--travel-muted': siteConfig.brand.muted,
  '--travel-ink': siteConfig.brand.ink,
} as CSSProperties;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" style={travelTheme}>
      <body>{children}</body>
    </html>
  );
}
