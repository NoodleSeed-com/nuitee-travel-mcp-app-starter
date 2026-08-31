# Product preview provenance

The PNG files in this directory are current deterministic Chromium captures of
the repository's actual React surfaces. They use only fictional fixtures,
reserved or reviewed test identifiers, and the Wayfare sample brand. They
contain no live inventory, provider offer identifiers, customer data,
deployment URLs, host conversation chrome, or third-party carrier images.

| File | Stable current-product contract | Dimensions | SHA-256 |
| --- | --- | --- | --- |
| `travel-home.png` | `Where will you go next?` with the shared Wayfare route mark | `1280 × 800` | `9e6e31d7b74d7a449cef73eab8cd366b839be0c8f4df772880fa8c6cbaca3c7e` |
| `flight-results.png` | `Current flight options`, `Lowest fare`, and `Verify current fare` | `720 × 1978` | `bb7151301c9c9657787b2a40f823a4e28e2444a9c39494c9c48efd3e10b0a81d` |

Both current files were visually inspected at original detail after recapture.
They contain no browser issue markers, developer overlays, secrets, private
data, live/provider claims, or fabricated MCP/provider results. The results App
uses only the repository's network-blocked fictional fixture.

Regenerate the fixture-backed flight-results App preview from the repository
root with:

```sh
pnpm docs:previews
```

Recapture `travel-home.png` as the actual credential-free website zero state:

```sh
pnpm --filter @nuitee-travel-starter/web exec next dev --hostname 127.0.0.1 --port 3001
CI=true pnpm --dir apps/web exec playwright screenshot --viewport-size=1280,800 http://127.0.0.1:3001/ ../../docs/images/travel-home.png
```

Run both commands from the repository root, and run the second only after the
local server is ready. Then stop that server. The zero state opens no Assistant
session; do not submit a prompt for this capture. Review every changed image at
original detail, update the dimensions and SHA-256 table above, and add each new
exact Git blob/path pair to `security/reviewed-binary-blobs.txt` before committing.
The fixture-backed App capture suite disables network access through the shared
browser-test setup.
