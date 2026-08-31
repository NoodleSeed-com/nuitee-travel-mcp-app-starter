# Airport catalog provenance

Wayfare resolves an optional browser location entirely on the client against a bundled airport catalog. It does not fetch airport or geolocation data at runtime.

## Source snapshot

- Source: [OurAirports Data](https://ourairports.com/data/)
- License: [public-domain dedication](https://github.com/davidmegginson/ourairports-data/blob/main/LICENSE)
- Retrieved: `2026-08-31`
- Source file: `airports.csv`
- Source SHA-256: `e56b20ecaa187ef954f3cce670a5559147ad071ff962915fdd72fb885f826da4`

OurAirports publishes the data without a warranty. Wayfare treats the catalog only as a convenient departure default, never as an operational, regulatory, safety, identity, or authorization source.

## Generation rules

`scripts/generate-airport-catalog.mjs` keeps rows that satisfy all of these rules:

- `type` is `large_airport`;
- `scheduled_service=yes`;
- IATA and ISO country codes are valid and present;
- latitude and longitude are finite and within valid geographic ranges.

The generated application data contains only IATA code, passenger-facing city label, ISO country code, latitude, and longitude. It is sorted by IATA code for deterministic output.

The upstream ISB municipality is recorded as Attock. The generator applies one reviewed passenger-facing label override, `ISB` → `Islamabad`, so the interface names the city travelers recognize. No coordinate or airport-code override is applied.

## Regeneration

Download `https://ourairports.com/data/airports.csv` to a temporary path, calculate its SHA-256, visually review material schema changes, then run:

```sh
node scripts/generate-airport-catalog.mjs \
  --input /temporary/path/airports.csv \
  --output apps/web/src/data/airports.generated.ts \
  --snapshot YYYY-MM-DD \
  --sha256 64-lowercase-hex-characters
```

Update this document with the new retrieval date and hash. Run the focused resolver and repository-readiness tests before committing. Never commit the source CSV or add a runtime request to OurAirports.
