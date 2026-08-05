import { annotations, server, tool, z } from '@noodleseed/one';

// Acme Getaways is a fictional travel brand. This app is deliberately top-of-funnel: discovery and
// configuration happen inside ChatGPT; the booking/transaction happens off-app on Acme's own site,
// reached through a signed, attributable handoff deep link. Destinations are the partner's own
// catalog (grounding) — the app never invents a place, price, or best-month.
//
// Authoring note: a tool `fulfil` is *recorded*, not run as live JS. Inputs flow through as
// `${input.x}` substitutions when placed directly into an output string; do not transform them
// (no URL-encoding, arithmetic, or filtering on an input value — those break substitution). The
// curated catalog below is static data the runtime returns verbatim.

const catalog = [
  {
    id: 'coral_bay',
    name: 'Coral Bay',
    region: 'Adriatic coast',
    vibe: 'beach',
    priceFrom: 890,
    bestMonths: 'May–Sep',
    why: 'Calm swimming coves and a walkable old town — easy for a relaxed first trip.',
  },
  {
    id: 'monte_alto',
    name: 'Monte Alto',
    region: 'Northern Alps',
    vibe: 'mountains',
    priceFrom: 1120,
    bestMonths: 'Dec–Mar',
    why: 'Ski-in village with beginner slopes and long groomed runs.',
  },
  {
    id: 'old_quarter',
    name: 'Old Quarter',
    region: 'Central Europe',
    vibe: 'culture',
    priceFrom: 640,
    bestMonths: 'Apr–Oct',
    why: 'Dense museum district and food halls, all reachable on foot.',
  },
  {
    id: 'harbor_city',
    name: 'Harbor City',
    region: 'Pacific rim',
    vibe: 'city',
    priceFrom: 980,
    bestMonths: 'Sep–Nov',
    why: 'Waterfront nightlife and day-trip islands a short ferry away.',
  },
] as const;

// A closed set of URL-safe month values. A `fulfil` cannot url-encode an input (recording would break
// substitution), so the deep link carries `month` only if it is already safe — the model maps natural
// phrasing ("early June") onto one of these when it fills the tool.
const monthEnum = z
  .enum([
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ])
  .default('June');

// The catalog ids are already url-safe slugs. Constrain the handoff `destination` to this closed set so
// only a real, url-safe id can reach the deep link.
const destinationId = z.enum(['coral_bay', 'monte_alto', 'old_quarter', 'harbor_city']);

const discoverInput = z.object({
  vibe: z.enum(['beach', 'mountains', 'culture', 'city']).default('beach'),
  month: monthEnum,
  travelers: z.number().int().min(1).default(2),
});

// Tool annotations for host planners: reads are read-only, the handoff opens an external link, and
// shortlisting is a local non-destructive write.
const readOnly = annotations.readOnly();
const openLink = annotations.openAction();
const localWrite = annotations.localAction({ destructive: false, confirm: false });

const destinationOutput = z.object({
  id: z.string(),
  name: z.string(),
  region: z.string(),
  vibe: z.string(),
  priceFrom: z.number(),
  bestMonths: z.string(),
  why: z.string(),
});

export default server(
  'acme_discovery',
  {
    title: 'Acme Getaways',
    version: '1.0.0',
    branding: {
      name: 'Acme Getaways',
      accent: '#0EA5A4',
      surface: '#F0FDFA',
      surfaceDark: '#0B1B1B',
      radius: 'lg',
      density: 'comfortable',
    },
    // The only external destinations the app links out to — the compiler derives ChatGPT's
    // redirect_domains from this so the handoff opens without a safe-link warning.
    handoff: {
      allowedDomains: ['https://book.acme.example', 'https://acme.example'],
    },
  },
  [
    tool('discover_getaways', {
      title: 'Discover getaways',
      description:
        'Suggest Acme Getaways destinations for a vibe and month and render a discovery carousel.',
      annotations: readOnly,
      input: discoverInput,
      output: z.object({
        status: z.string(),
        vibe: z.string(),
        month: z.string(),
        travelers: z.number(),
        // Bounded list: the curated catalog is fixed and small, and the declared ceiling tells the
        // model and host the payload cannot grow. `noodle check` reports `tool_design_output_bounds`.
        options: z.array(destinationOutput).max(20),
      }),
      // The carousel presents Acme's curated catalog; the model narrates which fit the stated vibe.
      // (A tool cannot filter on an input value — that is connector/flow work — so all are returned.)
      fulfil: ({ input }) => ({
        status: `Acme Getaways for a ${input.vibe} trip in ${input.month}, ${input.travelers} traveler(s).`,
        vibe: input.vibe,
        month: input.month,
        travelers: input.travelers,
        options: catalog,
      }),
      viewTitle: 'Discover getaways',
      // ChatGPT host status copy (openai/toolInvocation/*) — required for widget-opening tools.
      invoking: 'Finding getaways…',
      invoked: 'Getaways ready',
      domain: 'https://getaways.acme.example',
      view: {
        component: 'discovery-carousel',
        entry: './views/discovery-carousel.tsx',
      },
      viewDescription:
        'A top-of-funnel discovery carousel: pick a destination, then hand off to Acme to book.',
      csp: {
        connectDomains: ['https://acme.example'],
        resourceDomains: ['https://acme.example'],
        frameDomains: ['https://acme.example'],
      },
    }),
    tool('create_handoff', {
      title: 'Create booking handoff',
      description:
        'Create the Acme booking deep link for a chosen destination, carrying the configured trip. ' +
        'Pass the destination id (url-safe slug, e.g. "coral_bay") and its display name.',
      annotations: openLink,
      input: z.object({
        destination: destinationId,
        destinationName: z.string().min(1),
        month: monthEnum,
        travelers: z.number().int().min(1).default(2),
      }),
      output: z.object({
        status: z.string(),
        destination: z.string(),
        summary: z.string(),
        handoffUrl: z.string(),
      }),
      // Inline the inputs directly so they substitute at runtime; every value is already url-safe
      // (id slug, month enum, integer), and `src=chatgpt` is the attribution the partner measures
      // ChatGPT-sourced conversions on.
      fulfil: ({ input }) => ({
        status: `Ready to continue on Acme for ${input.destinationName}.`,
        destination: input.destination,
        summary: `${input.destinationName} · ${input.month} · ${input.travelers} traveler(s)`,
        handoffUrl: `https://book.acme.example/plan?dest=${input.destination}&month=${input.month}&pax=${input.travelers}&src=chatgpt`,
      }),
    }),
    tool('shortlist_getaway', {
      visibility: ['app'],
      description: 'Record the traveler’s shortlisted destination from the discovery widget.',
      annotations: localWrite,
      input: z.object({
        destination: z.string(),
        note: z.string().default(''),
      }),
      output: z.object({
        status: z.string(),
        destination: z.string(),
        note: z.string(),
      }),
      fulfil: ({ input }) => ({
        status: `Shortlisted ${input.destination}.`,
        destination: input.destination,
        note: input.note,
      }),
    }),
  ],
);
