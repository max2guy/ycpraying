# Notification and Season 2 Color Recovery

## Goal

Restore smartphone notifications for chat, prayer posts, replies, and member additions, and render the Season 2 label with the sampled color `#C5533C` at full opacity.

## Constraints

- Preserve existing database and authentication policies.
- Do not add Amen notifications or alter unrelated graph and Season 1 behavior.
- Preserve the existing `functions/package.json` dependency update.
- Avoid minimum instances unless a no-cost redeploy cannot provision an instance.

## Evidence

- All six Cloud Functions are deployed and ACTIVE on Node.js 20.
- `onNewPrayerEvent` and `onNewChatMessageS2` repeatedly report no available instance after the latest deployment.
- Deployed functions allow 3000 instances, so a configured zero-instance cap is not the cause.
- The label currently uses `#CC4E3C` at opacity `0.85`; the target is `#C5533C` at opacity `1`.

## Design

Keep the RTDB-triggered v1 architecture. Add compact operational logging to `sendPush()` for recipient count, multicast results, and error codes without token values. Redeploy only notification functions, then verify execution and FCM delivery in logs. Do not set minimum instances initially.

Change only the Season 2 SVG fill and opacity. Keep position and typography unchanged. Increment app, script query, and service-worker cache versions together.

## Verification

- JavaScript syntax checks for client, worker, and functions.
- Static regression checks for exact color, opacity, and logging.
- Targeted function deployment and fresh log verification.
- Deployed-page verification of script version and computed SVG color.

