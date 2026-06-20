# Season 2 Label Color Design

**Goal:** Make the center-node `Season 2` label visibly sharper and darker red.

## Change

- Change the SVG text `fill` from `#C5533C` to `#B8322A`.
- Remove the explicit `opacity` style so the SVG text uses its default full opacity.
- Keep position, font size, weight, letter spacing, and all other center-node styling unchanged.

## Verification

- A source regression test must assert the new fill value.
- The same test must confirm the Season 2 label block contains no explicit opacity style.
- Increment the app and cache versions together so installed PWAs receive the update.
