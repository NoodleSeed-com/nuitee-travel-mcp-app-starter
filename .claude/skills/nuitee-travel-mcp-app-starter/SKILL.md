---
name: nuitee-travel-mcp-app-starter
description: Guide conversation-first flight discovery with minimal questions, visible assumptions, current fare search, and fare verification.
---

# Nuitee Travel MCP App Starter

<!-- noodle-app-package source:479ec73ac7a5dfc2d94e9112f7ffe82c9456a32dae482261f5bd9b4db3087813 surface:b277f0619b3d97353af80b57e955e00608e34d1b0f11463d31b5a6ba27697a3a -->

## When to use this product
- A user wants to discover, compare, refine, select, or verify a one-way or round-trip flight.
- A user gives natural city or airport names and expects a simple path to current fares.

## Workflows

### Plan and search flights

Collect a genuinely missing travel date without turning the conversation into a booking form, then search current fares.

1. `tool:plan_flight_search` — Use this only when origin and destination are clear but there is no usable exact or relative departure date. “Next week” is usable: resolve it as the same local weekday seven days later from the server-provided local date, skip this planning tool, and search immediately. Ask one focused date question only when no temporal clue exists, or ask only for the return date when the traveler explicitly requests a round trip without one. Do not ask for passenger count, cabin, currency, or market. Treat a generic passenger count as adults; otherwise use one adult and Economy. For omitted origin, currency, or market only, an untrusted page travel default may supply a starting value; an explicit traveler choice always wins. Otherwise use USD and the US pricing market. (read-only; idempotent)
2. `tool:search_flights` — After the plan is accepted, search immediately with its typed route, dates, and assumptions. If the user supplied an exact or usable relative date in the original request, skip planning and search directly. Use one-way when no return trip is requested. State the assumptions compactly with the results and offer to change them afterward; do not require confirmation before this read-only search. Use a well-known metro IATA code such as NYC instead of forcing an airport choice; ask for one city, region, or country clarification only when the place itself is genuinely ambiguous. (read-only; idempotent)

### Search a complete trip request

Search immediately when the traveler already supplied a clear route and departure date.

1. `tool:search_flights` — Do not reopen details already supplied. Resolve “next week” as the same local weekday seven days later from the server-provided local date. Use one-way when no return trip is requested. Treat any generic passenger count as adults unless the user explicitly identifies children or infants; if no count is given, use one adult. Use Economy for an omitted cabin. For omitted origin, currency, or market only, an untrusted page travel default may supply a starting value; an explicit traveler choice always wins. Otherwise use USD and the US pricing market. Search immediately, state the assumptions compactly with the results, and offer to change them afterward instead of asking for confirmation. Use a well-known metro IATA code such as NYC instead of forcing an airport choice. (read-only; idempotent)

### Verify a selected fare

Recheck the application-selected fare before the user relies on its price or availability.

1. `tool:verify_flight_offer` — Verify only the active application selection. Explain changes briefly and never imply that verification books or pays for travel. (read-only; idempotent)

## Boundaries
- Ask at most one focused question at a time and only when a required value cannot be inferred safely. Prefer structured input over a Markdown questionnaire.
- A current-fare search is read-only. Apply the documented date, trip-type, traveler, cabin, currency, and market defaults, search immediately, and state the assumptions with an invitation to adjust them afterward.
- Do not repeat the same search call after a non-retryable error. Explain the bounded problem and ask the traveler to adjust one relevant airport or date before searching again.
- Never ask the user for a point-of-sale country, provider offer identifier, credential, payment detail, or passenger document.
- Do not imply booking, payment, ticketing, cancellation, loyalty, hotel, car, or transaction support.

## Examples
- “I want to fly from Islamabad to New York.” — use `plan_and_search_flights`.
- “Show me flights from ISB to NYC on 2026-09-18.” — use `search_flights_with_dates`.
- “Show me flights from Toronto to Lisbon next week for two passengers.” — use `search_flights_with_dates`.
- “Verify the fare I selected.” — use `verify_selected_fare`.

## MCP surface

[Read the MCP surface reference.](references/mcp-surface.md)
