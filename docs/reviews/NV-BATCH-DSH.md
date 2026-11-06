# NV Batch DSH — Content-Only Runtime Handoff

Status: **implemented by DSH, submitted for main-control review. NOT accepted here. No next task started.**

Scope: NV-001 content-only runtime, NV-002 Home/discovery/analysis/storyboard UI, NV-003 content delivery / attempt history / ZIP export, executed as one batch per `tasks/DSH_HANDOFF_DEMO_FAST_04.md`. Video production is intentionally deferred; no MP4, poster, renderer, player, render progress, or fake video download was created.

## 1. Inputs and frozen content

Author input read from:

`content-inbox/web-chatgpt-prepared/be3d777ab2e2/<slug>/1.0.0/`

Scenarios:

- A — `scn-scent-layering` / `scent-layering`
- B — `scn-luxury-gifting` / `luxury-gifting`
- C — `scn-oud-storytelling` / `oud-storytelling`

Verified after implementation:

- All 10 author JSON files per scenario are byte-identical to the published copies under `apps/web/public/content-scenarios/<slug>/1.0.0/`.
- `manifest.authoring.reviewStatus` remains `pending` for A/B/C.
- Video and poster assets remain `bytes:null`, `sha256:null`, `rightsStatus:"pending"` for A/B/C.
- The five real files per scenario (logo, two product images, EN VTT, AR VTT) were copied under `apps/web/public/scenario-media/<slug>/1.0.0/`.
- Package hashes:
  - A `e60a72b4509c1ca13bdb206bc885f95ee4c2421fbc4706cc115d2b6d9d9c2468`
  - B `e1896c38cda535ab0cb8233eaadc9c41f1fefcb4be2679be4ad74ea42aae77bb`
  - C `6349f26e104b26df43dcbc634ed14068806cf9dd83933335121a0e056fdcb183`
- Catalog: `apps/web/public/content-scenarios/catalog.json`, profile `content_only`, readiness `content_ready`, media status `deferred`, reviewRef `docs/CONTENT_ONLY_DELIVERY.md`.

## 2. Runtime changes

### Content profile and generated contracts

- `scripts/poc/generate-content-types.mjs` generates content-only types and a manifest; `--check` is clean (schema sha256 `61c5daa0c02467bb7ee7e7da5bf3ef42af3594bc942e48b8d1c745b09d6bfd9c`).
- Generated outputs:
  - `apps/web/demo/poc/generated/content-only.types.ts`
  - `apps/web/demo/poc/generated/content-only.manifest.json`
- `apps/web/demo/poc/domain/content-only.ts` adapts the immutable 10-file package into the existing domain package, keeps pending video/poster metadata but exposes no runnable video, and defines content-delivery state.
- `apps/web/demo/poc/domain/index.ts` exports the content-only domain.

### API / storage / replay

- `apps/web/demo/poc/api/types.ts` adds content-only profile, package view, content delivery view/inputs, and `CONFIRMATION_REQUIRED` / `STALE_VERSION` error codes.
- `apps/web/demo/poc/api/scenario-source.ts` loads the three published packages and real media; `get()` only returns content-ready packages.
- `apps/web/demo/poc/api/content-delivery.ts` builds real local script-pack files: script JSON, selected-version VTT, email TXT, README, with real byte sizes and SHA-256.
- `apps/web/demo/poc/downloads/zip.ts` is a deterministic store-only ZIP writer (CRC32 + UTF-8 names); no dependency was added.
- `apps/web/demo/poc/api/mock-api.ts`:
  - separates `profile:'content_only'`; create/start accepts `content_ready`;
  - confirms scripts while forcing `video:'stale'`, `activeVideoId:null`; `executeStage('video')` is rejected for content-only sessions;
  - exposes content replay only through the analysis prefix (16 events / 67000 ms for the current packages), computed from actual analysis checkpoints rather than hardcoded per scenario;
  - adds `getContentDelivery`, `saveContentDeliveryDraft`, `simulateContentDelivery`, `exportContentPack`;
  - confirmation is mandatory, failed attempts are explicitly `delivery_failed`, retry creates a new monotonic attempt, attempt snapshots are immutable, and history is read-only;
  - script save/select invalidates a pending content draft but preserves attempts;
  - reset clears content-delivery/replay/business data for that session only;
  - run-record export still works for corrupt sessions (fixed regression discovered during regression testing);
  - ZIP/run-record downloads for content-only sessions never expose a video/poster/delivery-video bundle.
- `apps/web/demo/poc/storage/types.ts` adds optional `profile` and `contentDelivery` with deep validation; no `any` bypass was used.

### UI

- `apps/web/components/poc/HomeDashboard.tsx`: three content-ready scenarios start from Home; labels “Content demo”, “Mock / Demo”, “Video deferred”; session Continue/Export/Reset remain functional; copy no longer claims author review is complete.
- `apps/web/components/poc/SessionFrameRouter.tsx`: selects the content workflow for content-only sessions, preserving the accepted preview/full-profile path.
- `apps/web/components/poc/ContentOnlyFrame.tsx`: content-only workflow:
  - discovery: five authored signals, two synthetic trend charts, evidence drawer, event timeline;
  - analysis: briefs, EN/AR preset and saved versions, editable title/hook/message/CTA/caption/hashtags, four timecoded shots, four subtitles, save-new-version, select, confirm, dirty-discard dialog, refresh persistence;
  - storyboard: four real product/logo images, timecodes, on-screen text, visual direction, subtitles, permanent “Video production deferred” marker, no player/download;
  - content delivery: editable subject/body/.invalid recipients, explicit confirmation dialog with actual attachment list, simulated success/failure/retry, attempt history, real ZIP export;
  - replay mode: discovery/analysis prefix only, paused on refresh, no edits/attempts during replay;
  - permanent Mock / Demo and Video deferred markers.
- `apps/web/components/poc/content.module.css`: content-specific layout.
- `apps/web/components/poc/browser-api.ts`: browser DB namespace `lavish-poc-content-v1`; page-relative virtual clock, not Unix `Date.now()`.

## 3. Verification

All commands were run from `D:\workspace\maison-intelligence`.

| Check | Command | Result |
| --- | --- | --- |
| Generated types | `node scripts/poc/generate-content-types.mjs --check` | exit 0, up to date |
| A/B/C content validation | `node scripts/poc/validate-content-only.mjs --dir content-inbox/.../<slug>/1.0.0 --report evidence/poc/content-only/<slug>.json` | all exit 0; L1–L4 pass; prefix 16; checkpoints pass; 5 real / 2 pending media; 0 errors |
| Typecheck | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 |
| POC unit suite | `npm run test:unit -- tests/poc/content-only.test.ts tests/poc/content-delivery.test.ts tests/poc/mock-api.test.ts tests/poc/replay.test.ts tests/poc/state-machine.test.ts tests/poc/storage.test.ts tests/poc/validation.test.ts tests/poc/media-validation.test.ts` | 8 files / 128 tests passed |
| Full browser suite | `npm run test:e2e` | 39 tests passed |

Content-specific tests added:

- `tests/poc/content-only.test.ts` — catalog/content load, confirm without fake video, 16-event replay prefix, content delivery ZIP, script invalidation.
- `tests/poc/content-delivery.test.ts` — mandatory confirmation, failure/retry, idempotent duplicate, immutable snapshots, failure-pack export, script invalidation, reset.
- `apps/web/tests/poc-content-only.spec.ts` — A end-to-end, all three scenarios start, dirty-script guard, AR/mobile overflow.
- `apps/web/tests/poc-content-delivery.spec.ts` — dedicated browser delivery: draft required, confirmation dialog, failure then success, two-attempt history, ZIP download, refresh persistence, script invalidation + reconfirm.

Updated accepted POC-008 test expectations only where the new contract changes Home from “awaiting” to content-ready start and real catalog titles; preview/framework assertions remain.

## 4. Browser evidence

Local test URL: `http://127.0.0.1:3100/` (Playwright-managed `next start`; the DSH Web GUI URL is separate).

Screenshots under `evidence/poc/content-only/`:

- `home-1440.png`
- `discovery-1440.png`
- `evidence-drawer-1440.png`
- `analysis-ar-1440.png`
- `analysis-confirmed-1440.png`
- `storyboard-1440.png`
- `delivery-1440.png`
- `delivery-confirm-1440.png`
- `delivery-1366.png`
- `delivery-invalidated-1440.png`
- `replay-1440.png`
- `analysis-ar-390.png`

Observed: Home starts A/B/C; 1440 storyboard uses real product/logo images; instruction/evidence mock labels are visible; no `<video>` element exists on storyboard; AR editor is LTR/RTL-safe and has no document overflow at 390; delivery page has no doc overflow at 1366; dialogs/drawer render and close correctly.

Downloads:

- `evidence/poc/content-only/e2e-content-delivery-pack.zip` — opened with `Expand-Archive`; contains `scent-layering-en-v1-script.json`, `scent-layering-en-subtitles.vtt`, `scent-layering-en-email.txt`, `README.txt`, `SIMULATED-DELIVERY.json`; no media files.
- `evidence/poc/content-only/e2e-content-pack.zip` — opened; AR script pack, four attachments + simulated record; no MP4/poster.
- `evidence/poc/content-only/e2e-home-run-record.json` — Home export; `kind:"run_record"`, `mode:"mock"`, session `profile:"content_only"`.

The ZIP script JSON includes `profile:"content_only"`, `mode:"mock"`, package hash, script version and `parentVersionId`/`source`; the VTT preserves the selected language text; `SIMULATED-DELIVERY.json` includes recipients, subject/body, attachment manifest, outcome, `noVideo:true`, `noRealEmail:true`.

## 5. Known limits / NOT_RUN

- Video and poster remain intentionally absent. No MP4/poster download, playback, rendering progress, or fake success exists.
- Author `reviewStatus` remains `pending`; this handoff is not author acceptance or main-control acceptance.
- Arabic copy still requires native Arabic/Lavish review.
- Content delivery is simulated only: no email service, SMTP, platform, LLM, renderer or external request; recipients use `.invalid`.
- ZIP export is local and deterministic; no real delivery receipt exists.
- Browser visual review was Chromium at 1440/1366/390. Firefox/WebKit and real-device review were **NOT_RUN**.
- Content-only sessions use the new `lavish-poc-content-v1` namespace. Pre-content POC sessions in the older namespace were not mutated or deleted, but this Home does not migrate or list them; they are not treated as content-ready.
- The UI seek slider is exercised through the shared POC-007 control tests; content replay integration tests cover play/pause/speed and the 16-event prefix. No separate full-length replay-at-end UI assertion is claimed.
- Old complete-profile/video scenario acceptance is unchanged; this batch only adds content-only behavior and does not mark any video workflow completed.
- No main-control acceptance or next task was started.

## 6. Main-control checklist

- [ ] Re-run `npm run typecheck`, `npm run build`, POC unit suite and `npm run test:e2e`.
- [ ] Re-run the three `validate-content-only.mjs` commands and compare hashes to the catalog.
- [ ] Verify Home starts A/B/C and no session exposes a fake video/poster.
- [ ] Verify EN/AR save/version/confirm, refresh, dirty guard.
- [ ] Verify storyboard real images and “video deferred” semantics.
- [ ] Verify delivery explicit confirmation, failure/retry, ZIP contents and history reset.
- [ ] Review screenshots and decide acceptance.

## 7. Acceptance statement

DSH submits this batch for review only. No status in this document implies acceptance, no content reviewStatus was changed, and no next task was started.
