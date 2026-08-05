# Acme Getaways — top-of-funnel discovery → handoff

A Noodle MCP App for **Acme Getaways**, a fictional travel brand. It is the flagship for the
**top-of-funnel discovery → handoff** pattern: discovery and configuration happen inside ChatGPT; the
booking/transaction happens off-app on Acme's own site, reached through a signed, attributable handoff
deep link. It pairs a `tool` discovery carousel with a model-visible `create_handoff` tool and
server-level `handoff.allowedDomains`.

Capability slots: top-of-funnel funnel discipline, discovery carousel widget, `create_handoff` deep-link
handoff with attribution, `handoff.allowedDomains`, and a worked **design-first** artifact (the UX spec +
wireframe below). It shows the "design the experience, then build it" flow the `noodle-seed` skill's
`references/experience-design.md` teaches.

## Design spec (write this before the code)

- **Funnel boundary** — Discover and shortlist a getaway in ChatGPT. Booking, payment, and the account
  live on `acme.example`, reached only after the handoff. No payment or per-user auth in chat.
- **Personas** — the undecided browser ("somewhere warm in June?"), the near-decided planner (has a vibe
  and month, wants options and a fast handoff).
- **Top-3 prioritized user flows**
  1. **Discover** — "warm beach trip in June for 2" → `discover_getaways` renders the carousel.
  2. **Shortlist** — pick a destination in the widget → `shortlist_getaway` (widget-only) records it.
  3. **Handoff** — "Continue on Acme" → `create_handoff` emits the deep link → opens off-app.
- **Tools** — `discover_getaways` (model-visible, renders the widget), `create_handoff` (model-visible,
  emits the deep link), `shortlist_getaway` (widget-only helper, hidden from the model).
- **Widgets + display modes** — `DiscoveryCarousel` as an inline card that expands to fullscreen for
  browsing. No picture-in-picture (nothing is live/ongoing).
- **Grounding sources** — the destination catalog in `src/server.ts` is Acme's own data; the widget never
  invents a place, price, or best-month.
- **Handoff domains** — `https://book.acme.example`, `https://acme.example` (the server
  `handoff.allowedDomains`; the deep link carries `dest`, `month`, `pax`, and `src=chatgpt` for
  attribution).

## Wireframe (one screen, then the off-app destination)

The carousel screen is in-app (solid frame); the booking screen is off-app (dashed frame) and reached
only after the handoff — it is Acme's own page, never wireframed as if it were in chat.

```html
<div class="phone">                                  <!-- in-app: solid frame -->
  <div class="chatgpt-header">ChatGPT · Acme Getaways</div>
  <div class="msg user">somewhere warm in June, 2 of us</div>
  <div class="tool-call">discover_getaways { vibe: "beach", month: "June", travelers: 2 }</div>
  <div class="wcard">
    <div class="wcard-head">DiscoveryCarousel</div>   <!-- component name = code + spec -->
    <div class="wcard-body">
      <div class="dest">Coral Bay · from $890 · best May–Sep  [Shortlist]</div>
      <div class="dest">Harbor City · from $980 · best Sep–Nov [Shortlist]</div>
      <a class="cta">Continue on Acme · Coral Bay</a>   <!-- one primary action -->
    </div>
  </div>
</div>
<div class="phone offapp">                            <!-- off-app: dashed frame -->
  <div class="browser-header">book.acme.example/plan?dest=coral_bay&month=June&pax=2&src=chatgpt</div>
  <div class="offapp-body">Acme booking — payment & account live here.</div>
</div>
```

## Local author loop

```sh
noodle validate
noodle test
noodle dev
```

In another terminal:

```sh
noodle tools list
noodle tools call discover_getaways --args '{"vibe":"beach","month":"June","travelers":2}'
noodle tools call create_handoff --args '{"destination":"coral_bay","destinationName":"Coral Bay","month":"June","travelers":2}'
noodle check --target chatgpt
```

## Deploy

```sh
noodle link --org demo --app acme-discovery
noodle deploy --access owner-only
noodle open
```

This example has no connector secrets and does not include tokens, caller-key mechanisms, or
`.env.noodle` values. All destinations, prices, and URLs are fictional.
