# S2 Radial Member Entry Design

**Goal:** Give Season 2 member nodes a distinctive fast radial group entrance while preserving Season 1 behavior.

## Behavior

- Apply only when the active season is `s2`.
- On initial S2 load or season switch, render the center node first.
- Hold member nodes at the center, then release them outward in stable order at 70 ms intervals.
- Each member travels quickly from the center and settles with the existing elastic radius animation.
- Reuse each member's existing link as a brief directional trail during release, then transition to the normal link appearance.
- After initial loading, a newly added S2 member uses the same center-to-outward entrance individually.
- Data updates and ordinary rerenders must not replay the entrance.

## Motion and State

- Mark only newly entered S2 member data for the entrance; the root node never uses it.
- Initialize the entering member at the current center-node position with a small deterministic angular offset.
- Release the fixed position after its stagger delay and apply a short outward velocity so the existing D3 forces settle the final layout naturally.
- Keep timers bounded to the entrance sequence and clear pending timers during a season switch.
- The normal simulation remains the sole owner of final node positions.

## Accessibility and Performance

- When `prefers-reduced-motion: reduce` is active, skip travel and show members with a short fade.
- Animate existing SVG position, radius, and opacity only; add no continuous particles, filters, or permanent animation loop.
- Preserve the existing touch-device performance rules.

## Scope

- Do not change S1 animation, member data, Firebase listeners, node styling, click/drag behavior, or notification logic.
- Keep the existing `N` badge behavior for newly added members.

## Verification

- Unit-test the S2-only entrance scheduling and stable 70 ms stagger calculation through a small pure helper.
- Test that reduced-motion disables travel.
- Run JavaScript syntax checks and existing regression tests.
- Browser-test S1 unchanged, S2 initial group entrance, and a newly added S2 member.
