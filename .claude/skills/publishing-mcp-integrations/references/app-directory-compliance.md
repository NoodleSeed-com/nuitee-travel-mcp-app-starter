# App directory compliance (pre-submission)

Use this shared checklist against the built integration before preparing a directory submission. It
covers evidence common to app and connector directories without assuming a particular host, review
portal, client framework, or vendor policy.

## Contents

- Validation evidence
- Capability and interaction quality
- Safety, privacy, and data handling
- Reliability and accessibility
- Directory-specific delta

## Validation evidence

A clean local validation result proves only the checks that actually ran. Record server validation,
behavior tests, protocol conformance, production reachability, and interactive rendering as separate
evidence levels. Never treat metadata readiness as proof of host rendering or directory acceptance.

## Capability and interaction quality

1. **User value** — each exposed capability solves a concrete user job and cites built behavior rather
   than an aspiration.
2. **Grounded capability** — knowledge, actions, and presentation come from authoritative application
   data or bounded operations instead of invented state.
3. **Atomic interfaces** — every action has a focused purpose, explicit input and output schemas, honest
   effect annotations, and useful failure output.
4. **Helpful UI only** — every interactive surface earns its place and preserves a useful text or
   structured fallback when rendering is unavailable.
5. **Meaningful completion** — the user can complete the promised task within the declared boundary,
   with any external handoff clearly identified.

## Safety, privacy, and data handling

- Minimize model-visible and UI-visible data; remove secrets, internal identifiers, unnecessary personal
  data, and continuation credentials from results and logs.
- Document authentication, authorization scopes, retention, deletion, subprocessors, and external
  handoffs accurately in the public privacy and support material.
- Make mutations explicit, bounded, and confirmation-aware. Never imply that a read or preparation
  request authorizes a write.
- For regulated or consequential workflows, show source provenance, uncertainty, cautions, and the
  boundary between information and a professional decision.

## Reliability and accessibility

- Exercise representative positive, negative, empty, loading, error, and recovery cases against the
  production-shaped endpoint.
- Preserve keyboard access, readable contrast, responsive layout, concise status feedback, and graceful
  degradation when an interactive surface is unsupported.
- State latency, availability, rate-limit, and support expectations using observed evidence rather than
  unverified claims.

## Directory-specific delta

After the shared checklist passes, read the selected directory’s current official documentation and add
only its verified requirements. Keep directory-specific metadata, screenshots, test accounts, policy
statements, and review procedures in that submission evidence—not in this shared skill reference. Mark
unknown or untested requirements explicitly, and never reuse another directory’s checklist as a proxy.