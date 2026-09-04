# Hotel conversation milestone

Approved design: compact decision cards, with hotels as the first review
checkpoint before applying the pattern to other widgets. This implements
the existing plan without changing its travel provider contracts.

## Contract

- Traveler benefit: inspect a short photo-led stay shortlist, see price basis
  and cancellation terms, choose one stay, and continue the conversation.
- Three initial results; Show more progressively reveals the existing bounded
  result set. No invented ranking, rating, imagery, or location.
- Each shortlist item has one View stay action. The next focused view shows
  returned room details, dates, description, amenities, price and terms, with
  Choose this stay and Back to stays. No nested detail tabs or card flipping.
- Explore stays is optional. A map renders only after the host actually grants
  fullscreen. Hosts without fullscreen retain a textual location/terms
  comparison and a return path; no oversized inline map.
- Preserve hotel exploration in widget state, scoped to the returned search
  ID. Publish only selected/inspected/comparison identifiers and concise facts
  to model context. Existing tool structured output remains the text fallback.
- Retain the existing product guide: the workflow is guided because hotel,
  flight, and trip review ordering and no-booking boundaries matter. No guide
  installation, tool additions, or schema changes are needed for this slice.
- Loading, partial, empty, malformed, tool error, selection pending, selected,
  and failed selection states remain explicit. No optimistic success; require
  the helper response to acknowledge the requested identifier.
- Follow [Wayfare's brand contract](../brand/wayfare-brand-guidelines.md),
  including its approved ChatGPT typography/theme exception. This first slice
  adapts hotels only; other widget styling is a later reviewable slice.

## Data boundary

No schemas, API connectors, gateway operations, provider models, server state
records are changed. The new HotelJourneyState is local UI
presentation state, not a provider/business model. Existing live hotel and
flight paths remain available; illustrative loyalty/rewards/protection paths
have not been converted into real integrations. Missing real provider
contracts must be supplied before that work can be claimed complete.

## Review and evidence

New browser journey tests replace the obsolete match-score/list-map-tab
interaction tests. Contract validation tests are retained. Review in local
Noodle Devtools before applying the pattern to other widgets. Actual ChatGPT
host testing, dedicated widget-domain setup,
Mapbox lifecycle repair, and the remaining tool audit findings are separate
evidence/work items—not implied by the visual redesign.

Source guidance: [OpenAI inline card guidance](https://developers.openai.com/plugins/concepts/ui-guidelines#inline-card).

### Verification on 2026-09-05

- `pnpm test`: 324 unit tests passed.
- `pnpm test:browser`: 36 browser tests passed, including persisted inspection,
  mismatched selection acknowledgments, 320px layout, and dark map controls.
- `noodle validate`, `noodle test`, and generic `noodle check`, all targeting
  `src/demo-preview-server.ts`: passed. These are local preview checks, not
  real-provider or ChatGPT-host proof.
- Noodle Devtools at `http://127.0.0.1:54164/`: shortlist and detail rendered;
  data explicitly labeled illustrative, absent photos shown as absent.
- The initial live call stopped with `connector_secret_unresolved`. The user
  identified the existing main-checkout `.env.local`: its `NUITEE_LITE_API_KEY`
  was bound as `NUITEE_API_KEY` using Noodle's managed, ignored local secret
  store. No key values were printed or committed; no hosted settings changed.
- Read-only live calls through `src/demo-live-server.ts`: `search_flights`
  returned 10 current options for YYZ–LIS on 2026-10-18; `search_hotels`
  returned 10 current Lisbon stays for 2026-10-18 through 2026-10-21. The
  first hotel call returned `provider_error`; the bounded retry succeeded.
  A separate hotel API probe also returned HTTP 200 and populated results.
  This proves the two search paths, not every helper or ancillary integration.
- Live Noodle Devtools at `http://127.0.0.1:54165/` rendered the redesigned
  three-card shortlist from actual MCP hotel results, including returned
  prices/cancellation terms and qualified unknown-tax wording. No replacement
  photos were fabricated when the normalized output omitted them.
- Separate scoped review found two presentation regressions, both repaired:
  unknown live tax inclusion now requires review, and dark map controls have
  contrasting backgrounds/text. Back to stays also requests inline mode.
