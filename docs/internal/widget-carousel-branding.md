# Widget carousel and color refinement

Approved direction: blue and teal only, neutral card fills, selected buttons
blue, no WebGL or ambient animation. The normative contract is
[`docs/brand/wayfare-brand-guidelines.md`](../brand/wayfare-brand-guidelines.md),
including its dated widget-accent exception.

The shared presentation adds a short static blue-to-teal header detail and
teal capability glyphs. It does not recolor prices or imply confirmation.
Capabilities, stays, stay comparisons, protection concepts, trip selections,
and rewards panels use horizontal carousels. Existing flight and reward-flight
carousels retain their layouts and gain horizontal touch handlers. Expanded
fare details grow naturally instead of creating an inner vertical scrollbar.

Controls remain stationary and 44px, support keyboard navigation, and never
autoplay. Native-scroll carousels retain vertical gesture propagation and
content-driven heights. No API, tool schema, or data-model changes are required
for this presentation update; the separately pending tool-recovery fixes are
not part of this design change. Existing product-guide coverage remains valid:
tool intents, required inputs, fallback results, and capabilities are unchanged.

Verification: 331 unit/contract tests and 39 browser tests passed locally.
Browser coverage includes narrow viewports, neutral selection cards, horizontal
layout/navigation, rewards panels without nested carousels, expanded fare
details without vertical clipping, and synthetic flight swipe events. Local
Devtools screenshots were inspected for rewards and protection. A separate
read-only UI review found no significant issue. Physical-device gestures and
actual ChatGPT-host rendering are not established by these checks.
