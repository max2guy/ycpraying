# Android Notification Badge Design

**Goal:** Show only a rounded white cross in the Android status bar instead of a solid white circle.

## Asset

- Add `notification-badge.png` as a 96×96 transparent PNG.
- Match the rounded cross proportions from `notification-icon.svg`.
- Include only the opaque white cross silhouette.
- Exclude the pink circle, shadow, highlight, and sparkles.

## Wiring

- Keep `webpush.notification.icon` pointing to `notification-icon.svg` so expanded notifications retain the pink-circle artwork.
- Change only `webpush.notification.badge` to `notification-badge.png`.
- Do not change app UI, notification text, triggers, or token handling.

## Verification

- Verify the PNG dimensions and alpha channel.
- Verify corner pixels are transparent and the center cross is opaque white.
- Add a source regression test proving `icon` and `badge` use separate assets.
- Deploy the existing notification functions and publish the new static asset.
