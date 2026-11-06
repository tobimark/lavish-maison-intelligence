# FIX-NV-BATCH-01 · DSH 修复提交

Status: **修复完成并提交主控复查；未自行 accepted，未启动下一任务。**
Scope: only the two reproduced NV-batch defects plus the small type-boundary cleanup requested in `tasks/poc/fixes/FIX-NV-BATCH-01.md`. No customer JSON, public Schema, generated types, Tokens, DESIGN_SYSTEM or original evidence was changed. Video remains deferred.

## 1. Reproduced defects mapped to fixes

### R1 — saved delivery snapshot vs current unsaved form

Main-review reproduction: saving subject `[SIMULATED] MAIN SAVED SUBJECT`, then changing the visible subject/recipient without saving, left both simulate buttons enabled; the dialog showed the new address while the recorded attempt and ZIP used the old saved draft.

Implemented:

- Added explicit React `deliveryDirty` state alongside the existing ref.
- Any subject, body, recipient-name or recipient-email change marks the draft dirty.
- Both `Confirm simulated delivery` and `Simulate failure` are disabled while dirty; a visible hint says the saved revision must be saved first.
- Confirmation dialog now renders only the saved draft’s revision, subject, recipients, body and attachment manifest — never the live form.
- `Discard changes` restores the saved draft/default form, clears dirty state and refreshes the server snapshot.
- Changed recipient to a normal address is rejected by the existing API; the old `.invalid` draft cannot be confirmed because dirty state blocks it until explicitly discarded or saved.
- After save, controls bind to the same saved `draftRevision` that is sent to `simulateContentDelivery` and shown in the dialog.

### R2 — discarded script content resurrected on save

Main-review reproduction: edit title, click `Discard edits` (visible title restored), then `Save new version` saved the discarded title because `draftContentRef` still held the old value.

Implemented:

- `restoreActiveScriptDraft()` now restores React state and `draftContentRef` from the selected saved script version in one place.
- `Discard edits` uses that function.
- `Discard and leave` restores state/ref before navigating; no dirty=false with old command input.
- Dirty version switching now carries the intended script ID in pending navigation; after discard it selects that version instead of merely reloading the current one.
- Save/confirm continue reading the selected ID and restored content; visible form and submitted content share the same snapshot.

### Type-boundary cleanup

- `apps/web/demo/poc/domain/content-only.ts`: removed `as unknown as Asset[]`; `isRealAsset` is now a real type predicate and the filtered result is assigned to `Asset[]`.
- `apps/web/demo/poc/api/scenario-source.ts`: removed `files as unknown as ContentPackageInput`. Added an exported `isContentPackageInput` structural boundary guard that checks:
  - all ten file roots, matching `schemaVersion`/`scenarioId`/`scenarioVersion`, `data` on the nine bundles;
  - required arrays/objects and manifest entry IDs;
  - pending assets can only be `video`/`poster` with both `bytes`/`sha256` null and `rightsStatus:"pending"`;
  - at least one real received logo asset.
  The loader throws before adaptation/render when the shape fails. This is documented as a client input guard, not a replacement for the build-time Schema/semantic validator.
- Corrected the misleading comment: video planning metadata is retained; the API rejects video execution for content-only sessions.

## 2. Files changed

- `apps/web/components/poc/ContentOnlyFrame.tsx`
- `apps/web/demo/poc/domain/content-only.ts`
- `apps/web/demo/poc/api/scenario-source.ts`
- `apps/web/tests/poc-content-only.spec.ts`
- `apps/web/tests/poc-content-delivery.spec.ts`
- `tests/poc/content-only.test.ts`
- `docs/reviews/FIX-NV-BATCH-01-DSH.md` (this report)
- `evidence/poc/fix-nv-batch-01/**` (new evidence only)

No `content.module.css` change was needed; no public contract, generated type, token or author content was touched. Original DSH/main-review evidence was preserved; browser output now goes to the new FIX evidence directory.

## 3. Verification

Executed from `D:\workspace\maison-intelligence`:

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run test:unit -- tests/poc/content-only.test.ts tests/poc/content-delivery.test.ts` | exit 0; 2 files, 9 tests passed (includes missing-logo/illegal-pending input guard, R1/R2 API paths) |
| `npm run build` | exit 0 |
| `npm run test:e2e -- poc-content-only.spec.ts poc-content-delivery.spec.ts` | exit 0; 7 tests passed |

New browser assertions cover:

- Saved subject/body/recipients → unsaved subject + recipient changes → both simulate buttons disabled, dirty hint visible, no dialog; normal address rejected; `Discard changes` restores saved values; save v2 → dialog shows saved v2 subject/changed recipient; cancel creates no attempt; failure then success attempts use saved v2; ZIP contains v2 values.
- Discard title/shot/subtitle → visible values restored → Save → reload → restored values remain (no discarded content).
- Discard-and-leave then return → saved values; dirty version switch → discard dialog → AR version selected, save/reload keeps AR original, not discarded EN title.
- Type guard accepts all three published packages and rejects a missing real logo or an illegal pending product image.

### ZIP / attempt evidence

- `evidence/poc/fix-nv-batch-01/e2e-content-delivery-pack.zip`
- Opened with `Expand-Archive`; files:
  - `scent-layering-en-v1-script.json`
  - `scent-layering-en-subtitles.vtt`
  - `scent-layering-en-email.txt`
  - `README.txt`
  - `SIMULATED-DELIVERY.json`
- `SIMULATED-DELIVERY.json` attempt: subject `[SIMULATED · CONTENT ONLY] Browser delivery saved v2`; recipients `changed-recipient@lavish-demo.invalid`, `creative-ops@lavish-demo.invalid`; `outcome:"simulated_delivered"`; `noVideo:true`; `noRealEmail:true`; four attachments. No MP4/poster.

## 4. Browser evidence

New evidence only under `evidence/poc/fix-nv-batch-01/`:

- `delivery-unsaved-1440.png` — unsaved changes, dirty hint, both simulate buttons disabled.
- `delivery-confirm-saved-1440.png` — confirmation dialog showing saved revision 2, saved subject, changed valid recipient and attachment list.
- `delivery-fixed-1440.png`, `delivery-1366.png` — saved state, layout no horizontal overflow.
- `script-discarded-1440.png` — original title/shot/subtitle restored after `Discard edits`.
- `e2e-content-delivery-pack.zip`, `e2e-content-pack.zip`, `e2e-home-run-record.json`.
- `source-hashes.json` — SHA-256 of changed source/test/report files.

Screenshots wait for fonts and animation stabilization; 1440 and 1366 states were checked. Old `evidence/poc/content-only/**` and `evidence/poc/nv-main-review/**` were not overwritten.

## 5. NOT_RUN / limitations

- I did **not** rerun the full 128-unit/39-browser suites, per the task’s “affected content tests once” instruction; the 7 focused content browser tests and 9 focused unit tests passed.
- I did not use `recheck.cjs` exit 0 as proof; its old evidence remains read-only.
- The original video/poster/media and L5 are unaffected and still deferred; no video work was attempted.
- Firefox/WebKit and mobile beyond the existing 390 check were NOT_RUN.
- Main-control recheck/acceptance is pending. This report does not claim accepted status or next-task authorization.
