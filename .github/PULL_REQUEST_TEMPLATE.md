## Outcome

Describe the user/developer impact and the smallest coherent scope.

## Evidence

- Contract or product source:
- Failing test added first:
- Commands run:
- Evidence not run (live provider, named host, deployment, browser):

## Review checklist

- [ ] The change stays within read-only flight/hotel discovery and clearly labeled illustrative capabilities; no booking or payment is introduced.
- [ ] Model-visible inputs expose no origin, URL, path, method, header, credential, or provider offer ID.
- [ ] Public output is bounded, normalized, and free of raw provider bodies and private identifiers.
- [ ] Ordinary tests and CI remain fully offline and credential-free.
- [ ] No credentials, provider bodies, customer data, or private URLs appear in this change, logs, screenshots, or issue links.
- [ ] Generated Agent Kit trees remain excluded from the public export; any deliberate distribution change passes the pinned-guidance audit.
- [ ] Documentation and the public-release checklist were updated when a contract or release claim changed.
- [ ] `pnpm ci:offline` passes, or the exact sanitized blocker is recorded above.

## Security/data impact

State whether the change affects credentials, network authority, state, CSP, remote assets, logging, or stored data. Write “None” only after checking.
