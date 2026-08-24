# Product preview provenance

The PNG files in this directory are deterministic Chromium captures of the
repository's actual React widgets. They use only fictional fixtures, reserved
or reviewed test identifiers, and the Cedar & Cloud Travel sample brand. They
contain no live inventory, provider offer identifiers, customer data,
deployment URLs, host conversation chrome, or third-party carrier images.

Regenerate them from the repository root with:

```sh
pnpm docs:previews
```

Review every changed image before committing it. The capture suite disables
network access through the shared browser-test setup.
