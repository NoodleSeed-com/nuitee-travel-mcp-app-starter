import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/host-grotesk';
import { siteConfig } from '../src/lib/site-config';
import './globals.css';

export const metadata: Metadata = {
  title: siteConfig.brand.name,
  description: siteConfig.brand.tagline,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
