# Internal documentation

> **Internal-only:** Do not publish this directory with the public template.

This directory records private Noodle Seed investigations, dated evidence, and
implementation decisions that are useful while the repository remains private.
It must never contain API keys, authorization headers, raw provider payloads,
customer records, booking identifiers, payment secrets, or other credentials.

When the user says **"this is valuable"**, add only the named finding here with:

- the date and source;
- whether the evidence is documented, locally observed, hosted, or production;
- the sanitized finding and its confidence;
- the product or engineering implication; and
- the first unproven layer or next action.

Adding a finding to this directory does not authorize a commit, push, pull
request, deployment, provider mutation, or publication.

## Current internal package

- [Nuitee API investigation](./nuitee-api-investigation.md) — sanitized access
  matrix, topology, Experiences/Loyalty/Vouchers models, and contract risks.
- [Wayfare conversational product specification](./wayfare-conversational-product-spec.md)
  — approved product scope, live/fictional boundary, end-to-end journey, and
  safety constraints.
- [Wayfare canonical domain model](./wayfare-domain-model.md) — provider-neutral
  entities, invariants, lifecycle, pricing, and adapter mappings.
- [Wayfare Noodle Seed build guide](./wayfare-noodle-seed-build-guide.md) —
  proposed MCP capability contracts, effects, errors, implementation slices,
  and verification requirements for the coding agent.
- [Wayfare removable demo data catalog](./wayfare-demo-data-catalog.md) — fixture
  packaging, member/rewards/payment policy, twelve-city experience catalog,
  and replacement instructions.
- [Wayfare agent behavior and acceptance](./wayfare-agent-behavior-and-acceptance.md)
  — future TypeScript `agentGuide` workflows, confirmation language, recovery
  behavior, and end-to-end acceptance journeys.

The public-safe, normative [Wayfare brand guidelines](../brand/wayfare-brand-guidelines.md)
sit outside this removable internal package so agents and template adopters can
rely on one stable implementation contract.

The Wayfare documents describe a target design and do not establish that the
current runtime implements it. Runtime source, validation, local smoke, hosted
inspection, and deployed behavior are separate evidence layers.

## Public-release removal gate

The repository was confirmed `PRIVATE` on GitHub on 2026-09-03. Before changing
visibility, creating a public template, publishing a public fork, or exporting a
release:

1. Remove `docs/internal/` from the public release tree.
2. Confirm no internal document, credential, private identifier, or raw provider
   data exists in any commit that will become public.
3. Prefer a clean public export or a new public repository built from the
   approved release tree. Deleting this directory only from the latest commit is
   insufficient because older Git history would remain readable.
4. Re-run the repository's public-release and secret-history audits against the
   exact public candidate.
