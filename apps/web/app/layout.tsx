import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/host-grotesk';
import {
  SEO_DEFAULT_TITLE,
  SEO_DESCRIPTION,
  SEO_ORIGIN,
  SEO_ROBOTS,
  SEO_SITE_NAME,
  SEO_SOCIAL_IMAGE,
} from '../src/lib/seo-config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: SEO_ORIGIN,
  robots: SEO_ROBOTS,
  title: {
    default: SEO_DEFAULT_TITLE,
    template: '%s | Wayfare',
  },
  description: SEO_DESCRIPTION,
  applicationName: SEO_SITE_NAME,
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: SEO_DEFAULT_TITLE,
    description: SEO_DESCRIPTION,
    url: '/',
    siteName: SEO_SITE_NAME,
    locale: 'en_GB',
    type: 'website',
    images: [SEO_SOCIAL_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_DEFAULT_TITLE,
    description: SEO_DESCRIPTION,
    images: [SEO_SOCIAL_IMAGE.url],
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#FFFFFF',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
