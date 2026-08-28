# Product preview provenance

The PNG files in this directory are deterministic Chromium captures of the
repository's actual React surfaces. They use only fictional fixtures, reserved
or reviewed test identifiers, and the Cedar & Cloud Travel sample brand. They
contain no live inventory, provider offer identifiers, customer data,
deployment URLs, host conversation chrome, or third-party carrier images.

Regenerate the fixture-backed flight-results App preview from the repository
root with:

```sh
pnpm docs:previews
```

Recapture `travel-home.png` as the actual credential-free website zero state:

```sh
pnpm --filter @nuitee-travel-starter/web exec next dev --hostname 127.0.0.1 --port 3001
pnpm --filter @nuitee-travel-starter/web exec playwright screenshot --viewport-size=1280,800 http://127.0.0.1:3001/ ../../docs/images/travel-home.png
```

Run the second command from `apps/web/` only after the local server is ready,
then stop that server. The zero state opens no Assistant session; do not submit
a prompt for this capture. Review every changed image before committing it.
The fixture-backed App capture suite disables network access through the shared
browser-test setup.
