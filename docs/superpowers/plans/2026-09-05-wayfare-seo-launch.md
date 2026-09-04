# Wayfare SEO Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a complete, brand-compliant SEO and social-sharing foundation for `https://gowayfare.io`, then verify and register it with Google Search Console and Bing Webmaster Tools.

**Architecture:** One typed SEO module owns canonical URLs, route metadata, sitemap data, and JSON-LD input. Next.js metadata routes expose robots, sitemap, and manifest files; route-level metadata keeps conversational surfaces out of search; a host-aware Next redirect collapses `www` onto the apex domain. A deterministic local renderer builds the static social image from repository-owned imagery and the exact Wayfare assets before the user visually approves it.

**Tech Stack:** Next.js 16 App Router metadata APIs, React 19, TypeScript 7, Vitest, Testing Library, Playwright Chromium for local-only raster rendering, Fly.io, Google Search Console, Bing Webmaster Tools.

**Spec:** `docs/superpowers/specs/2026-09-05-wayfare-seo-launch-design.md`

## Global Constraints

- `docs/brand/wayfare-brand-guidelines.md` is the normative user-facing contract.
- The canonical production origin is exactly `https://gowayfare.io`.
- Search copy must not imply completed booking, ticketing, payment, redemption, insurance sale, or live hotel inventory.
- Wayfare remains light-only and uses Host Grotesk Variable, the exact Wayline geometry, and Selected Blue `#66CCFF`.
- Functional product icons remain Heroicons-only; the Wayline is a logo asset, not functional iconography.
- Do not commit Google, Bing, GoDaddy, embed, session, or other verification credentials.
- Do not add Playwright to hosted CI; its only new use is an explicit local asset-rendering command.
- Do not alter the assistant, MCP server, currency detection, legal substance, or CI architecture.
- Keep the known repository-wide Noodle CLI baseline failure separate; the scoped web baseline is 29 files and 242 passing tests.

---

### Task 1: Central SEO contract and crawl surfaces

**Files:**
- Create: `apps/web/src/lib/seo-config.ts`
- Create: `apps/web/app/robots.ts`
- Create: `apps/web/app/sitemap.ts`
- Create: `apps/web/app/manifest.ts`
- Create: `apps/web/test/seo-config.test.ts`

**Interfaces:**
- Produces: `SEO_ORIGIN`, `SEO_SITE_NAME`, `SEO_DEFAULT_TITLE`, `SEO_DESCRIPTION`, `SEO_SOCIAL_IMAGE`, `absoluteUrl(pathname)`, `routeMetadata`, and `sitemapEntries`.
- Consumed by: root and page metadata, JSON-LD, metadata routes, and later verification tests.

- [ ] **Step 1: Write failing tests for the typed SEO contract**

Create `apps/web/test/seo-config.test.ts` with focused assertions for the canonical origin, truthful copy, absolute URLs, route robots policy, and exactly three sitemap entries:

```ts
import { describe, expect, it } from 'vitest';
import {
  SEO_DEFAULT_TITLE,
  SEO_DESCRIPTION,
  SEO_ORIGIN,
  SEO_SOCIAL_IMAGE,
  absoluteUrl,
  routeMetadata,
  sitemapEntries,
} from '../src/lib/seo-config';

describe('Wayfare SEO contract', () => {
  it('uses the approved apex origin and claim-safe product copy', () => {
    expect(SEO_ORIGIN.href).toBe('https://gowayfare.io/');
    expect(SEO_DEFAULT_TITLE).toBe('Wayfare — Plan your trip in one conversation');
    expect(SEO_DESCRIPTION).toBe(
      'Plan your trip in one conversation. Search current flights and compare clearly labelled travel options with Wayfare.',
    );
    expect(`${SEO_DEFAULT_TITLE} ${SEO_DESCRIPTION}`).not.toMatch(
      /book now|issue tickets|take payment|redeem rewards|live hotels/i,
    );
  });

  it('creates apex-origin URLs and a single 1200 by 630 social image contract', () => {
    expect(absoluteUrl('/privacy')).toBe('https://gowayfare.io/privacy');
    expect(SEO_SOCIAL_IMAGE).toEqual({
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: 'Wayfare — One conversation. The whole journey.',
    });
  });

  it('indexes durable pages and excludes private or conversational routes', () => {
    expect(routeMetadata.home.robots).toEqual({ index: true, follow: true });
    expect(routeMetadata.developers.robots).toEqual({ index: false, follow: true });
    expect(routeMetadata.experience.robots).toEqual({ index: false, follow: false });
    expect(routeMetadata.chat.robots).toEqual({ index: false, follow: false });
    expect(sitemapEntries.map((entry) => entry.pathname)).toEqual([
      '/',
      '/privacy',
      '/terms',
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify the RED state**

Run:

```bash
env CI=true pnpm --filter @nuitee-travel-starter/web test -- seo-config.test.ts
```

Expected: FAIL because `../src/lib/seo-config` does not exist.

- [ ] **Step 3: Implement the central typed contract**

Create `apps/web/src/lib/seo-config.ts` with immutable constants and metadata records. Use this shape so later files import facts rather than repeat them:

```ts
import type { Metadata } from 'next';

export const SEO_ORIGIN = new URL('https://gowayfare.io');
export const SEO_SITE_NAME = 'Wayfare';
export const SEO_DEFAULT_TITLE = 'Wayfare — Plan your trip in one conversation';
export const SEO_DESCRIPTION =
  'Plan your trip in one conversation. Search current flights and compare clearly labelled travel options with Wayfare.';

export const SEO_SOCIAL_IMAGE = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: 'Wayfare — One conversation. The whole journey.',
} as const;

export function absoluteUrl(pathname: string) {
  return new URL(pathname, SEO_ORIGIN).href;
}

const indexable = { index: true, follow: true } as const;
const privatePreview = { index: false, follow: true } as const;
const conversational = { index: false, follow: false } as const;

export const routeMetadata = {
  home: { alternates: { canonical: '/' }, robots: indexable },
  privacy: { alternates: { canonical: '/privacy' }, robots: indexable },
  terms: { alternates: { canonical: '/terms' }, robots: indexable },
  developers: { alternates: { canonical: '/developers' }, robots: privatePreview },
  experience: { robots: conversational },
  chat: { robots: conversational },
} satisfies Record<string, Metadata>;

export const sitemapEntries = [
  { pathname: '/', lastModified: '2026-09-05', changeFrequency: 'weekly', priority: 1 },
  { pathname: '/privacy', lastModified: '2026-09-04', changeFrequency: 'yearly', priority: 0.3 },
  { pathname: '/terms', lastModified: '2026-09-04', changeFrequency: 'yearly', priority: 0.3 },
] as const;
```

- [ ] **Step 4: Add metadata routes from the shared contract**

Create `apps/web/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next';
import { absoluteUrl } from '../src/lib/seo-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/experience', '/experience/', '/experience/chat'],
    }],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
```

Create `apps/web/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';
import { absoluteUrl, sitemapEntries } from '../src/lib/seo-config';

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries.map((entry) => ({
    url: absoluteUrl(entry.pathname),
    lastModified: new Date(`${entry.lastModified}T00:00:00.000Z`),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
```

Create `apps/web/app/manifest.ts`:

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Wayfare',
    short_name: 'Wayfare',
    description: 'One conversation. The whole journey.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#FFFFFF',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
```

- [ ] **Step 5: Extend tests to cover route outputs and verify GREEN**

Add these imports and assertions to `seo-config.test.ts`:

```ts
import manifest from '../app/manifest';
import robots from '../app/robots';
import sitemap from '../app/sitemap';

it('publishes one crawl policy with the canonical sitemap', () => {
  expect(robots()).toEqual({
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/experience', '/experience/', '/experience/chat'],
    }],
    sitemap: 'https://gowayfare.io/sitemap.xml',
    host: 'https://gowayfare.io/',
  });
});

it('publishes only canonical indexable URLs in the sitemap', () => {
  expect(sitemap().map((entry) => entry.url)).toEqual([
    'https://gowayfare.io/',
    'https://gowayfare.io/privacy',
    'https://gowayfare.io/terms',
  ]);
});

it('publishes a light-only Wayfare manifest', () => {
  expect(manifest()).toMatchObject({
    name: 'Wayfare',
    short_name: 'Wayfare',
    start_url: '/',
    background_color: '#FFFFFF',
    theme_color: '#FFFFFF',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  });
});
```

Run the focused test again and expect PASS.

- [ ] **Step 6: Commit the crawl foundation**

```bash
git add apps/web/src/lib/seo-config.ts apps/web/app/robots.ts apps/web/app/sitemap.ts apps/web/app/manifest.ts apps/web/test/seo-config.test.ts
git commit -m "feat(web): add Wayfare SEO crawl foundation"
```

---

### Task 2: Route metadata, social cards, and indexing policy

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/developers/page.tsx`
- Modify: `apps/web/app/privacy/page.tsx`
- Modify: `apps/web/app/terms/page.tsx`
- Modify: `apps/web/app/experience/page.tsx`
- Modify: `apps/web/app/experience/chat/page.tsx`
- Create: `apps/web/test/seo-metadata.test.ts`

**Interfaces:**
- Consumes: constants and `routeMetadata` from `seo-config.ts`.
- Produces: Next.js `metadata` and `viewport` exports with deterministic inheritance and route overrides.

- [ ] **Step 1: Write failing metadata tests**

Create `apps/web/test/seo-metadata.test.ts`. Import metadata from the root layout and each page. Assert:

```ts
expect(rootMetadata.metadataBase?.href).toBe('https://gowayfare.io/');
expect(rootMetadata.title).toEqual({
  default: 'Wayfare — Plan your trip in one conversation',
  template: '%s | Wayfare',
});
expect(rootMetadata.openGraph).toMatchObject({
  siteName: 'Wayfare',
  locale: 'en_GB',
  type: 'website',
  images: [{
    url: '/opengraph-image.png',
    width: 1200,
    height: 630,
  }],
});
expect(rootMetadata.twitter).toMatchObject({
  card: 'summary_large_image',
  images: ['/opengraph-image.png'],
});
expect(homeMetadata.alternates).toEqual({ canonical: '/' });
expect(developerMetadata.robots).toEqual({ index: false, follow: true });
expect(experienceMetadata.robots).toEqual({ index: false, follow: false });
expect(chatMetadata.robots).toEqual({ index: false, follow: false });
```

Also assert privacy and terms keep their current descriptions while adding the correct canonical and index/follow values.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
env CI=true pnpm --filter @nuitee-travel-starter/web test -- seo-metadata.test.ts
```

Expected: FAIL because the complete root metadata, page exports, and indexing overrides do not exist.

- [ ] **Step 3: Implement global metadata and viewport**

Update `apps/web/app/layout.tsx` to import `Viewport` and the shared SEO constants. Export metadata with:

```ts
export const metadata: Metadata = {
  metadataBase: SEO_ORIGIN,
  title: { default: SEO_DEFAULT_TITLE, template: '%s | Wayfare' },
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
  formatDetection: { address: false, email: false, telephone: false },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#FFFFFF',
};
```

Keep Host Grotesk and the existing root markup unchanged.

- [ ] **Step 4: Add explicit route metadata**

Export `metadata` from the homepage:

```ts
import type { Metadata } from 'next';
import { routeMetadata } from '../src/lib/seo-config';

export const metadata: Metadata = routeMetadata.home;
```

Merge the privacy route's existing title and description with its canonical policy:

```ts
export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How the Wayfare demonstration experience handles information.',
  ...routeMetadata.privacy,
};
```

Merge the terms route the same way:

```ts
export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'Terms for using the Wayfare demonstration experience.',
  ...routeMetadata.terms,
};
```

Add developers metadata:

```ts
export const metadata: Metadata = {
  title: 'Developer preview',
  description: 'Integration notes for the private Wayfare partner preview.',
  ...routeMetadata.developers,
};
```

Add the two experimental exports:

```ts
export const metadata: Metadata = {
  title: 'Wayfare experience',
  ...routeMetadata.experience,
};
```

```ts
export const metadata: Metadata = {
  title: 'Wayfare conversation',
  ...routeMetadata.chat,
};
```

Use these route titles:

- Homepage: inherited default title.
- Developers: `Developer preview`.
- Privacy: existing `Privacy policy` under the root title template.
- Terms: existing `Terms of service` under the root title template.
- Experience: `Wayfare experience` with `noindex, nofollow`.
- Chat: `Wayfare conversation` with `noindex, nofollow`.

- [ ] **Step 5: Run metadata and existing page tests**

```bash
env CI=true pnpm --filter @nuitee-travel-starter/web test -- seo-metadata.test.ts home-page.test.tsx legal-pages.test.tsx developer-page.test.tsx
```

Expected: PASS without changing visible page content.

- [ ] **Step 6: Commit metadata and route policy**

```bash
git add apps/web/app apps/web/test/seo-metadata.test.ts
git commit -m "feat(web): publish canonical Wayfare metadata"
```

---

### Task 3: Truthful homepage structured data

**Files:**
- Create: `apps/web/src/lib/wayfare-structured-data.ts`
- Create: `apps/web/src/components/wayfare-structured-data.tsx`
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/test/structured-data.test.tsx`

**Interfaces:**
- Produces: `wayfareStructuredData` and `serializeStructuredData(value)`.
- Consumed by: `WayfareStructuredData` component on the homepage.

- [ ] **Step 1: Write a failing structured-data test**

Test the graph as data and the rendered script as markup:

```tsx
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WayfareStructuredData } from '../src/components/wayfare-structured-data';
import { wayfareStructuredData } from '../src/lib/wayfare-structured-data';

afterEach(cleanup);

describe('Wayfare structured data', () => {
  it('describes only the website and browser application', () => {
    expect(wayfareStructuredData['@graph'].map((node) => node['@type']))
      .toEqual(['WebSite', 'WebApplication']);
    const value = JSON.stringify(wayfareStructuredData);
    expect(value).toContain('https://gowayfare.io/');
    expect(value).not.toMatch(/AggregateRating|Offer|SearchAction|price|ratingValue/);
  });

  it('serializes executable angle brackets safely', () => {
    const { container } = render(<WayfareStructuredData />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(script?.textContent).not.toContain('<');
    expect(JSON.parse(script?.textContent ?? '{}')).toEqual(wayfareStructuredData);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
env CI=true pnpm --filter @nuitee-travel-starter/web test -- structured-data.test.tsx
```

Expected: FAIL because the structured-data modules do not exist.

- [ ] **Step 3: Implement the graph and safe serializer**

Create `wayfare-structured-data.ts` with this exact two-node graph and safe serializer:

```ts
import {
  SEO_DESCRIPTION,
  SEO_SITE_NAME,
  absoluteUrl,
} from './seo-config';

const publisher = {
  '@type': 'Brand',
  name: SEO_SITE_NAME,
  slogan: 'One conversation. The whole journey.',
  logo: {
    '@type': 'ImageObject',
    url: absoluteUrl('/icon.svg'),
    width: 64,
    height: 64,
  },
} as const;

export const wayfareStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${absoluteUrl('/')}#website`,
      url: absoluteUrl('/'),
      name: SEO_SITE_NAME,
      description: SEO_DESCRIPTION,
      inLanguage: 'en-GB',
      publisher,
    },
    {
      '@type': 'WebApplication',
      '@id': `${absoluteUrl('/')}#web-application`,
      url: absoluteUrl('/'),
      name: SEO_SITE_NAME,
      description: SEO_DESCRIPTION,
      applicationCategory: 'TravelApplication',
      operatingSystem: 'Web Browser',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      inLanguage: 'en-GB',
      publisher,
    },
  ],
} as const;

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
```

Do not add offers, prices, ratings, social accounts, or a search action.

- [ ] **Step 4: Render one server-safe script component**

Create the component:

```tsx
import {
  serializeStructuredData,
  wayfareStructuredData,
} from '../lib/wayfare-structured-data';

export function WayfareStructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeStructuredData(wayfareStructuredData),
      }}
    />
  );
}
```

Render it in `apps/web/app/page.tsx` next to `TravelAssistantPage` inside a fragment.

- [ ] **Step 5: Verify focused and homepage tests**

```bash
env CI=true pnpm --filter @nuitee-travel-starter/web test -- structured-data.test.tsx home-page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit structured data**

```bash
git add apps/web/src/lib/wayfare-structured-data.ts apps/web/src/components/wayfare-structured-data.tsx apps/web/app/page.tsx apps/web/test/structured-data.test.tsx
git commit -m "feat(web): add Wayfare structured data"
```

---

### Task 4: Branded static social preview

**Files:**
- Create: `apps/web/scripts/render-social-preview.mjs`
- Create: `apps/web/app/opengraph-image.png`
- Modify: `apps/web/package.json`
- Modify: `apps/web/test/landing-assets.test.ts`

**Interfaces:**
- Produces: repeatable `pnpm --filter @nuitee-travel-starter/web render:og` and the static 1200 by 630 PNG consumed by Next metadata.
- Consumes: existing Host Grotesk package, `@playwright/test`, `app/icon.svg`, and `public/images/wayfare-hybrid-hero-v2.jpg`.

- [ ] **Step 1: Add a failing raster-asset test**

Extend `landing-assets.test.ts` to read `app/opengraph-image.png`. Reuse its PNG header/dimension helper and assert:

```ts
expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
expect(pngDimensions(bytes)).toEqual({ width: 1200, height: 630 });
expect(statSync(path).size).toBeGreaterThan(100_000);
expect(statSync(path).size).toBeLessThan(2_000_000);
```

- [ ] **Step 2: Run the asset test and verify RED**

```bash
env CI=true pnpm --filter @nuitee-travel-starter/web test -- landing-assets.test.ts
```

Expected: FAIL with `ENOENT` for `app/opengraph-image.png`.

- [ ] **Step 3: Add the deterministic local renderer**

Create `render-social-preview.mjs` using `chromium` from `@playwright/test`:

```js
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, '..');
const outputPath = resolve(webRoot, 'app/opengraph-image.png');

const fontPath = require.resolve(
  '@fontsource-variable/host-grotesk/files/host-grotesk-latin-wght-normal.woff2',
);
const [font, hero, mark] = await Promise.all([
  readFile(fontPath),
  readFile(resolve(webRoot, 'public/images/wayfare-hybrid-hero-v2.jpg')),
  readFile(resolve(webRoot, 'app/icon.svg')),
]);

const dataUrl = (mime, bytes) => `data:${mime};base64,${bytes.toString('base64')}`;
const fontUrl = dataUrl('font/woff2', font);
const heroUrl = dataUrl('image/jpeg', hero);
const markUrl = dataUrl('image/svg+xml', mark);

const html = `<!doctype html>
<html lang="en">
  <head>
    <style>
      @font-face {
        font-family: 'Host Grotesk';
        src: url('${fontUrl}') format('woff2');
        font-style: normal;
        font-weight: 300 800;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
      body {
        background: #fff;
        color: #0d0d0d;
        font-family: 'Host Grotesk', sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      main {
        display: grid;
        grid-template-columns: 44% 56%;
        width: 100%;
        height: 100%;
        padding: 48px;
        gap: 36px;
      }
      .copy { display: flex; flex-direction: column; justify-content: space-between; }
      .brand { display: flex; align-items: center; gap: 16px; font-size: 30px; font-weight: 600; }
      .brand img { width: 58px; height: 58px; }
      .message { max-width: 455px; padding-bottom: 26px; }
      h1 { margin: 0; font-size: 64px; line-height: .98; letter-spacing: -.045em; font-weight: 560; }
      p { margin: 30px 0 0; color: #5d5d5d; font-size: 25px; line-height: 1.25; font-weight: 400; }
      .photo { width: 100%; height: 100%; object-fit: cover; object-position: 54% center; border-radius: 40px; }
    </style>
  </head>
  <body>
    <main>
      <section class="copy">
        <div class="brand"><img src="${markUrl}" alt=""><span>Wayfare</span></div>
        <div class="message">
          <h1>One conversation.<br>The whole journey.</h1>
          <p>Plan your trip in one conversation.</p>
        </div>
      </section>
      <img class="photo" src="${heroUrl}" alt="">
    </main>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outputPath, type: 'png' });
} finally {
  await browser.close();
}

console.log(`Rendered ${outputPath}`);
```

This reads the hero JPEG, light-blue icon SVG, and Host Grotesk WOFF2; converts each to a data URL; renders a 1200 by 630 HTML document; waits for `document.fonts.ready`; and captures the PNG.

The exact composition is:

- white `#FFFFFF` canvas with 44% copy column and 56% natural-colour image;
- 48px outer safe area;
- 58px light-blue Wayline icon followed by `Wayfare` at 30px/600;
- headline `One conversation. The whole journey.` at 64px/560 with no shadow;
- supporting line `Plan your trip in one conversation.` at 25px/400 in muted `#5D5D5D`;
- the existing jet-window hero image on the right, `object-fit: cover`, centered on the middle window, with 40px rounded left corners;
- no overlays, filters, artificial darkening, airline marks, or provider logos.

Add this script to `apps/web/package.json`:

```json
"render:og": "node scripts/render-social-preview.mjs"
```

- [ ] **Step 4: Render and verify the PNG**

```bash
pnpm --filter @nuitee-travel-starter/web render:og
env CI=true pnpm --filter @nuitee-travel-starter/web test -- landing-assets.test.ts seo-config.test.ts
```

Expected: both test files PASS and the raster is exactly 1200 by 630.

- [ ] **Step 5: Show the native-resolution image and pause for visual approval**

Open `apps/web/app/opengraph-image.png` in Codex and include it inline for the user. Do not commit the asset until the user approves the rendered result. If revision is requested, change only the named composition detail, rerender, and show it again.

- [ ] **Step 6: Commit the approved renderer and asset**

```bash
git add apps/web/scripts/render-social-preview.mjs apps/web/app/opengraph-image.png apps/web/package.json apps/web/test/landing-assets.test.ts
git commit -m "feat(web): add Wayfare social preview"
```

---

### Task 5: Canonical `www` redirect

**Files:**
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/test/next-config.test.ts`

**Interfaces:**
- Produces: a permanent host-conditioned redirect from every `www.gowayfare.io` path to the same path on `gowayfare.io`.

- [ ] **Step 1: Write the failing redirect test**

Extend `next-config.test.ts`:

```ts
it('permanently redirects the www host to the canonical apex origin', async () => {
  const config = (await import('../next.config')).default;
  const redirects = await (config.redirects as () => Promise<Array<{
    source: string;
    destination: string;
    permanent: boolean;
    has?: Array<{ type: string; value: string }>;
  }>>)();

  expect(redirects).toContainEqual({
    source: '/:path*',
    has: [{ type: 'host', value: 'www.gowayfare.io' }],
    destination: 'https://gowayfare.io/:path*',
    permanent: true,
  });
});
```

- [ ] **Step 2: Run and verify RED**

```bash
env CI=true pnpm --filter @nuitee-travel-starter/web test -- next-config.test.ts
```

Expected: FAIL because `redirects` is not configured.

- [ ] **Step 3: Implement the redirect without changing security headers**

Add to `nextConfig`:

```ts
async redirects() {
  return [{
    source: '/:path*',
    has: [{ type: 'host', value: 'www.gowayfare.io' }],
    destination: 'https://gowayfare.io/:path*',
    permanent: true,
  }];
},
```

- [ ] **Step 4: Verify redirect and header tests**

```bash
env CI=true pnpm --filter @nuitee-travel-starter/web test -- next-config.test.ts security-headers.test.ts
```

Expected: PASS, and the existing production CSP remains unchanged.

- [ ] **Step 5: Commit canonical-host behavior**

```bash
git add apps/web/next.config.ts apps/web/test/next-config.test.ts
git commit -m "fix(web): redirect www to canonical Wayfare domain"
```

---

### Task 6: Local integration and production-build verification

**Files:**
- Modify only if a test exposes a scoped defect in files from Tasks 1–5.

**Interfaces:**
- Produces: objective local proof before external Git or Fly mutations.

- [ ] **Step 1: Run the complete scoped web suite**

```bash
env CI=true pnpm --filter @nuitee-travel-starter/web test
```

Expected: all web test files pass.

- [ ] **Step 2: Run typecheck and production build**

```bash
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
```

Expected: both exit `0`; build output includes `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, and the static social image.

- [ ] **Step 3: Start the production server on an unused loopback port**

```bash
PORT=3110 pnpm --filter @nuitee-travel-starter/web start
```

From a second terminal, verify:

```bash
curl -s http://127.0.0.1:3110/robots.txt
curl -s http://127.0.0.1:3110/sitemap.xml
curl -s http://127.0.0.1:3110/manifest.webmanifest
curl -s http://127.0.0.1:3110/ | rg 'canonical|og:image|twitter:card|application/ld\+json'
curl -sI -H 'Host: www.gowayfare.io' http://127.0.0.1:3110/privacy
```

Expected: metadata endpoints return their correct formats, the homepage head contains all four signals, and the `www` request permanently redirects to `https://gowayfare.io/privacy`.

- [ ] **Step 4: Run repository policy checks that do not duplicate the known unrelated failure**

```bash
git diff --check origin/main...HEAD
env CI=true pnpm customize:check
env CI=true pnpm audit:history
env CI=true pnpm audit:licenses
```

Expected: all exit `0`. Record the separate root-suite baseline failure without modifying it in this branch.

- [ ] **Step 5: Review the final diff against the spec and brand checklist**

Confirm each specification section maps to a changed file or an external execution step. Confirm no credential, generated session, unsupported capability claim, new functional icon, or Playwright CI invocation entered the diff.

---

### Task 7: Focused pull request and Fly release proof

**Files:**
- No new files unless CI exposes a defect within the approved SEO scope.

**Interfaces:**
- Produces: reviewed Git history and an exact live Fly revision before webmaster submission.

- [ ] **Step 1: Rebase onto the latest `origin/main` without touching the dirty primary checkout**

```bash
git fetch origin main
git rebase origin/main
```

If the separate assistant-origin repair has merged, confirm its server-contract fix is present. Do not cherry-pick unrelated generated files into this branch.

- [ ] **Step 2: Re-run the scoped verification after rebase**

```bash
env CI=true pnpm ci:web
git diff --check origin/main...HEAD
```

Expected: web typecheck,  unit tests, and production build pass without Playwright.

- [ ] **Step 3: Push and open the focused PR**

```bash
git push -u origin 169/seo-launch-foundation
gh pr create --base main --head 169/seo-launch-foundation --title "feat: launch Wayfare SEO foundation" --body-file /tmp/wayfare-seo-pr.md
```

The PR body must list the canonical metadata, crawl routes, structured data, social image, `www` redirect, test evidence, the user-approved preview, and the known unrelated baseline issue.

- [ ] **Step 4: Monitor CI to a terminal result**

```bash
gh pr checks --watch
```

Expected: every required check passes. Diagnose any failure from its exact log; do not weaken gates or reintroduce Playwright to hosted CI.

- [ ] **Step 5: Merge through the repository's normal protected-review path**

Use the repository's standard merge method only after required review and green CI. Do not bypass branch protection or another person's required approval.

- [ ] **Step 6: Prove the exact merged revision is live**

Record the PR merge SHA and successful Fly deployment job. Confirm the live page or deployment metadata corresponds to that SHA before calling the SEO code deployed.

---

### Task 8: Production SEO verification

**Files:**
- No repository files.

**Interfaces:**
- Consumes: exact live Fly revision from Task 7.
- Produces: sanitized evidence that the deployed apex and redirecting `www` surfaces match the spec.

- [ ] **Step 1: Verify public crawl endpoints**

```bash
curl -sS -D /tmp/wayfare-robots.headers https://gowayfare.io/robots.txt -o /tmp/wayfare-robots.txt
curl -sS -D /tmp/wayfare-sitemap.headers https://gowayfare.io/sitemap.xml -o /tmp/wayfare-sitemap.xml
curl -sS -D /tmp/wayfare-manifest.headers https://gowayfare.io/manifest.webmanifest -o /tmp/wayfare-manifest.json
```

Confirm HTTP `200`, correct content types, the apex sitemap URL in robots, and only the three approved sitemap URLs.

- [ ] **Step 2: Verify rendered metadata and structured data**

Fetch `/`, `/privacy`, `/terms`, `/developers`, `/experience`, and `/experience/chat`. Parse—not visually guess—the title, description, canonical, robots, Open Graph, Twitter, and JSON-LD fields. Confirm no development or Fly hostname appears.

- [ ] **Step 3: Verify the social image**

Fetch `https://gowayfare.io/opengraph-image.png`, verify HTTP `200`, PNG content type, and 1200 by 630 dimensions. Open the live asset and compare it with the user-approved local raster.

- [ ] **Step 4: Verify canonical redirects**

```bash
curl -sSI https://www.gowayfare.io/
curl -sSI 'https://www.gowayfare.io/privacy?source=seo-check'
```

Expected: permanent redirects to the corresponding apex-origin URL with path and query preserved. Also confirm HTTP continues redirecting to HTTPS.

---

### Task 9: Google Search Console domain registration

**Files:**
- No repository files; verification values must remain outside Git and retained logs.

**Interfaces:**
- Produces: verified Domain property `gowayfare.io`, accepted sitemap submission, and homepage inspection request.

- [ ] **Step 1: Open Search Console in the currently signed-in browser**

Navigate to `https://search.google.com/search-console`. If sign-in or MFA is required, pause for the user to complete it. Select **Add property**, choose **Domain**, and enter exactly `gowayfare.io` without protocol or path.

- [ ] **Step 2: Add the DNS verification record**

Copy the Google-provided TXT record in memory only. Open the GoDaddy DNS manager for `gowayfare.io`; pause for the user if login, MFA, or account selection is required. Add a root TXT record with the exact Google value. Do not echo or save the value in terminal output, screenshots, project files, or messages.

- [ ] **Step 3: Verify ownership**

Return to Search Console and choose **Verify**. If DNS has not propagated, retain the record and retry after the UI's suggested delay; do not create duplicate TXT records.

- [ ] **Step 4: Submit the sitemap**

In the verified property, open **Sitemaps** and submit `https://gowayfare.io/sitemap.xml`. Record only whether the status is accepted or pending; do not call delayed processing a failure.

- [ ] **Step 5: Inspect and request indexing for the homepage**

Use URL Inspection for `https://gowayfare.io/`, run **Test live URL**, and request indexing only if the live test succeeds. Report the request as submitted, not indexed, until Google later confirms indexing.

---

### Task 10: Bing Webmaster Tools import and final handoff

**Files:**
- No repository files.

**Interfaces:**
- Consumes: verified Search Console property.
- Produces: imported Bing property, discoverable sitemap, and a clear evidence ledger.

- [ ] **Step 1: Import the Google property into Bing**

Open `https://www.bing.com/webmasters/`, authenticate if required, choose **Import from Google Search Console**, authorize the minimum requested Search Console access, and select only `gowayfare.io`.

- [ ] **Step 2: Confirm the sitemap**

Open Bing's Sitemaps view. Confirm `https://gowayfare.io/sitemap.xml` was imported or submit it once if absent. Do not add IndexNow for this three-page static launch.

- [ ] **Step 3: Produce the final evidence ledger**

Report separately:

- Git: branch, PR, merge SHA, and required-review state.
- CI: terminal check results.
- Fly: exact live revision and deployment job.
- Site: metadata, crawl endpoints, social image, and redirect results.
- Google: Domain property verified, sitemap submission state, and URL-inspection request state.
- Bing: import and sitemap state.
- Pending: crawler processing or any authentication boundary still requiring the user.

Do not claim rankings, traffic, impressions, indexed status, or SEO impact before the relevant webmaster report provides that evidence.
