# Nuitee Travel MCP App Starter MCP surface

Authentication: not required.

## Tools

| Tool | Description | Behavior | Visibility |
| --- | --- | --- | --- |
| `open_travel_starter` | Open the Wayfare home experience. Flights are available; all other displayed travel domains are noninteractive coming-soon information. | read-only; idempotent | model and app |
| `plan_flight_search` | Use only when a clear route has no usable exact or relative departure date. Collects the missing travel dates as structured input and returns visible default assumptions without contacting Nuitee. | read-only; idempotent | model and app |
| `search_flights` | Users may ask with city or airport names and relative dates. Resolve only clear places to IATA codes, ask about ambiguous places, and treat “next week” as the same local weekday seven days later. Search becomes available after the owner configures NUITEE\_API\_KEY and Flights access. | read-only; idempotent | model and app |
| `select_flight_offer` | Remember the fare selected inside the flight-results widget for a later verification turn. | read-only; idempotent | app only |
| `verify_flight_offer` | Verify a fare selected from the current application search. For “verify again”, re-verify the active fare. Accepts only application-issued opaque selection identifiers, never provider offer identifiers. | read-only; idempotent | model and app |

## Resources

| Resource | Description |
| --- | --- |

## Prompts

| Prompt | Description | Arguments |
| --- | --- | --- |

## Widgets

| Widget | Description | Opening tool |
| --- | --- | --- |
| `open_travel_starter_widget` | Wayfare | Open with `open_travel_starter`. |
| `search_flights_widget` | Flight results | Open with `search_flights`. |
