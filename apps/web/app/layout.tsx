import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { starterConfig } from '../../../starter.config';
import './globals.css';

export const metadata: Metadata = {
  title: starterConfig.brand.name,
  description: starterConfig.brand.tagline,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
