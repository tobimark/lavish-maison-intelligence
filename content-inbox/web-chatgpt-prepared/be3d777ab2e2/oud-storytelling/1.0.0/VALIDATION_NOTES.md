# VALIDATION NOTES — scn-oud-storytelling

Authoring UTC: 2026-11-05T05:31:20Z

## Completed checks (authoring environment)
- Ten JSON objects emitted and manifest nine file hashes calculated from actual UTF-8 bytes.
- Original user-allowed Logo/product files copied byte-identically; file sizes, hashes and image dimensions checked.
- EN and AR VTT authored from the exact four script subtitle lines and their timestamps.
- Static JSON Schema validation and independent reference/event/time checks are reported by the included offline validator; see `VALIDATION_REPORT.json` generated after authoring.

## Deliberate draft-only Schema exceptions
- `assets.json` `/data/assets/5` and `/data/assets/6` are missing video/poster: `bytes:null`, `sha256:null`, `rightsStatus:"pending"` intentionally fail the frozen runnable asset Schema (expects non-null positive size, 64-hex hash, rightsStatus `approved_for_demo`).
- `video.json` frameRate=30 and 1080×1920/15000ms denote TARGET metadata until actual media is supplied.
- The planned `video.available` and `delivery.simulated` events belong only to a future complete Mock replay timeline. Their presence in a draft is NOT evidence of MP4 delivery, successful video validation or actual external email.

## Not run / not claimed
- No Codex project `validate-scenario --replay`, no identical TypeScript reducer, no L3 projected-checkpoint comparator.
- No Playwright/browser media test, ffprobe, video decode or delivery service call; media L5 cannot pass.
- Not reviewed by Astra or PO, not accepted or ready, not placed in runtime scenarios/catalog.
- No external platforms or model/video/email APIs contacted during Mock content authoring.
