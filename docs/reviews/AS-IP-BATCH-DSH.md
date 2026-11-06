# AS-IP BATCH · DSH 提交

Status: **FINAL for FAST_06 review — AS-001..006 implemented and verified; NOT accepted; awaiting main-control review.** SERENITY A 1.1.0 content was received, normalized, published and bound on 2026-11-05/06; the sections below marked “历史” describe the earlier pre-content partial state and are retained for traceability, then the final update supersedes them.

> **Final update (2026-11-06):** A 1.1.0 is published/bound; Brief/Atelier/Library show SERENITY 1.1.0 objects and real provided assets; A campaign pack includes hero/identity/original MP4 with `noVideo=false`; B 1.0.0 remains `noVideo=true`; full product suite 57 passed, legacy 18 passed, matrix 119 rows audited (108 found / 1 guarded / 10 NOT_RUN / 0 missing). See the final section at the end of this file and `docs/reviews/AS-003-DSH.md`, `AS-004-DSH.md`, `AS-005-DSH.md`, `AS-006-DSH.md`. FLOW batch code is present but outside FAST_06 scope and unmodified.


## 1. Delivered

### AS-001 · provided files published and verified

- The three original files are byte-identical under `apps/web/public/provided-assets/scent-layering/1.0.0/` and exposed by the published sidecar `apps/web/public/presentation-assets/scent-layering.json`.
- Existing validator/tests confirm:
  - hero 2560×1440 PNG, 2,513,070 B
  - identity 2000×2000 PNG, 538,290 B
  - MP4 720×960, 3:4, 10.08 s, 24 fps, H.264/yuv420p + AAC, 1,315,394 B
  - SHA-256 `15d3756a0e93f591fc767998d84911ed425e3394554272f62120d61f0e31e10e`
- Static sidecar remains `contentStatus:"awaiting_serenity_content"`; no fake `bound` state.

### AS-002 · provided assets through the MockApi facade

- `browser-api` now constructs the same MockApi with the published sidecar source; pages do not fetch asset JSON or hard-code media paths.
- Existing `getProvidedAssets` / `getProvidedAssetDownload` behaviour is now reachable by UI. Downloads are checked against actual bytes and sidecar SHA-256 before returning a Blob.
- Same asset ID/URL/role is returned on Overview and Deliverables through the shared preview component.

### AS-004 · Results-first asset surface

- New reusable `ProvidedAssetShowcase`:
  - real SERENITY hero, white-background identity and supplied MP4;
  - persistent badges `Provided demo asset · Not generated live in this POC` and `Campaign content pending`;
  - native `controls`, `playsInline`, `preload="metadata"`, no autoplay;
  - real download buttons for hero, identity and original MP4;
  - 3:4 video contain, responsive 1440/1366/390.
- Overview starts with the provided product/asset concept; the old OUD/PERLA campaigns remain clearly separate historical prepared content.
- New `/campaigns/[campaignId]/brief` secondary route; Opportunity links to it and it links back to Atelier.
- Atelier does **not** display the pending SERENITY assets above the old OUD/PERLA campaign, avoiding the forbidden “replace old package images” implication. Its supplied-video preview remains pending AS-003 binding.

### AS-005 · bilingual pack and original video download

- New `exportCampaignPack` on the existing MockApi/store facade:
  - explicit EN/AR checkbox selection in Deliverables;
  - ZIP contains `en/` and `ar/` brief, exact selected script JSON, matching VTT, static storyboard and referenced real images, plus README/EXPORT;
  - record kind `provided_asset_campaign_pack`, `includedVersions`, provided asset set/IDs and actual `noVideo`;
  - persisted in the same `productExports` store with a discriminated record, old exports remain compatible;
  - provided assets/MP4 are included **only** when the sidecar is `bound`; with the current awaiting sidecar the pack truthfully has `noVideo:true`.
- Original MP4 download is independent of the old video workflow/email and returns exact original bytes.
- History re-download returns the stored archive bytes, not a rebuild.

### AS-006 / IP-009 audit

- `product-matrix-dom.spec.ts`: 101 base controls, 100 found, 1 guarded (`DEL-retry`), 0 missing, 0 unexpected; refreshed `evidence/product/ip-009/matrix-dom-audit.json`.
- New `product-as-audit.spec.ts`: records AS control presence; 10 available AS controls found, 0 missing; 8 AS rows explicitly NOT_RUN because they require the missing SERENITY 1.1.0 content or are native media controls recorded separately.
- Existing product suite plus provided-asset tests: **34 passed**.
- Media observed in real Chromium: `videoWidth=720`, `videoHeight=960`, `duration≈10.08`, `controls=true`, initially paused; play advanced currentTime, pause worked, seek to 7.56 s passed, replay/play again advanced; downloaded MP4 byte count/hash matched source.
- Actual screenshots: `evidence/product/assets/as-004/overview-provided-assets-1440.png`, `-1366.png`, `-390.png`, `campaign-brief-1440.png`, `deliverables-provided-assets-1440.png`, `deliverables-provided-assets-1366.png`.
- Actual downloaded files: `provided-final-preview.mp4`, `bilingual-campaign-pack.zip`.

## 2. Commands / exits

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 (12 static + 3 dynamic routes incl. `/campaigns/[campaignId]/brief`) |
| `npm run test:unit -- tests/poc/provided-assets.test.ts tests/poc/product-asset-export.test.ts tests/poc/product-read.test.ts tests/poc/product-commands.test.ts tests/poc/product-export.test.ts` | exit 0; 5 files, 31 tests passed |
| `npm run test:e2e -- product-atelier.spec.ts product-cross-page.spec.ts product-deliverables.spec.ts product-library.spec.ts product-navigation.spec.ts product-opportunities.spec.ts product-radar.spec.ts product-provided-assets.spec.ts product-matrix-dom.spec.ts` | exit 0; 34 tests passed |
| `npm run test:e2e -- product-as-audit.spec.ts` | exit 0; 1 AS DOM audit test passed |
| `npm run test:e2e -- product-as-audit.spec.ts` | exit 0; 1 AS DOM audit test passed |

## 3. ZIP audit

`evidence/product/assets/as-004/bilingual-campaign-pack.zip` opened with `Expand-Archive`:

- 17 content attachments + `EXPORT.json`
- `en/script.json`, `en/subtitles-en.vtt`, `en/storyboard.html`, `en/media/...`
- `ar/script.json`, `ar/subtitles-ar.vtt`, `ar/storyboard.html`, `ar/media/...`
- `noVideo:true`; no MP4/poster in the pack because SERENITY content is not bound.
- `includedVersions` exactly `scn-scent-layering.script.en-v1` and `scn-scent-layering.script.ar-v1`.

Separate provided MP4 download: 1,315,394 bytes and SHA-256 exactly matches source/receipt.

## 4. Blocked / NOT_RUN

- **AS-003** is not implemented: no SERENITY A 1.1.0 package in `content-inbox`/`scenarios`; sidecar remains awaiting. No old OUD/PERLA content was relabelled and no Serenity scripts/Brief were invented.
- Therefore:
  - provided assets are not included in any campaign pack;
  - Atelier does not yet show the supplied video inside the new Serenity campaign;
  - Library does not expose AS video/hero categories for the new campaign;
  - `AS-SHOT-{shotId}`, `AS-VIDEO-PLAY/SEEK/REPLAY/AUDIO/ERROR` are NOT_RUN as campaign-bound controls (native video itself was exercised on Overview);
  - `AS-LIB-TYPE-{type}`, `AS-HANDOFF-EXPAND` remain NOT_RUN.
- No audio listening/authorization review of the AAC track; source remains user-provided internal demo only.
- Firefox/WebKit and full AR asset surface are NOT_RUN; AR content remains the existing campaign scripts.
- No main-control acceptance is claimed.

## 5. Files changed (Net)

- `apps/web/components/product/shared/ProvidedAssets.tsx`, `provided.module.css`
- `apps/web/components/product/Overview.tsx`
- `apps/web/components/product/deliverables/DeliverablesPage.tsx`
- `apps/web/components/product/opportunities/OpportunityDetailPage.tsx`
- `apps/web/components/product/brief/CampaignBriefPage.tsx`
- `apps/web/app/campaigns/[campaignId]/brief/page.tsx`
- `apps/web/components/poc/browser-api.ts`
- `apps/web/demo/poc/api/mock-api.ts`, `product-commands.ts`
- `apps/web/demo/poc/storage/types.ts`, `memory.ts`, `indexeddb.ts`
- tests: `apps/web/tests/product-provided-assets.spec.ts`, `product-as-audit.spec.ts`; `tests/poc/product-asset-export.test.ts`
- evidence: `evidence/product/assets/as-004/**`, `evidence/product/as-006/interaction-audit.json`, refreshed `evidence/product/ip-009/matrix-dom-audit.json`

No public Schema, Tokens, author JSON, original provided bytes or dependencies were changed.

**Evidence-path disclosure:** the existing product regression specs still write some screenshots/archives to fixed `evidence/product/ip-*` paths. Running the required product suite therefore may have refreshed those generated files (no files were deleted or fabricated; content is regenerated from the current implementation). This batch's new evidence is written separately under `evidence/product/assets/as-004/**`, `evidence/product/as-006/**`, and `evidence/product/ip-009/matrix-dom-audit.json`.

## 6. Acceptance statement

This is a review submission for the non-blocked AS/IP work. It does not claim the SERENITY case is complete, does not call old OUD/PERLA assets SERENITY, and does not start AS-003 or any next task.

---

## 2026-11-06 · FINAL UPDATE（AS-003..006 完成，旧历史段落保留）

### 内容与绑定

- 主控接收副本十 JSON/媒体已原字节发布：`scenarios/scent-layering/1.1.0/**`、`apps/web/public/content-scenarios/scent-layering/1.1.0/**`、`apps/web/public/scenario-media/scent-layering/1.1.0/**`；逐文件 bytes/SHA 与接收 manifest 一致；`validate-content-only` L1-L4 pass，5 real/2 pending。
- catalog A 1.1.0 `content_ready`，packageHash `709abfdeb11f28a316ca6709c751f21cbcabdcb7cf30e4756418d9d8f46f854d`；version-index default 1.1.0，旧 1.0.0 historical/explicitOnly；默认查询已确认返回 SERENITY 1.1.0 后才将 design/public sidecar 置 `bound`（两副本 SHA 一致）。
- 旧 1.0.0 目录/session/导出保留历史，不重标 SERENITY。

### 页面/导出

- Brief：SERENITY 1.1.0 Brief/analysis、identity 2000×2000（仅 identity）、Hero 2560×1440 完整 16:9，无旧 OUD/PERLA 产品字段。
- Atelier：EN/AR v2、四镜头、identity、Provided 视频（720×960/10.08s/3:4 contain/native controls/不 autoplay/无 VTT）；编辑不更新视频。
- Library：12 脚本/分镜 + Provided SERENITY 三类；筛选/预览/Open in Atelier 真实可用，无 session 写入。
- Deliverables：A 1.1.0 双语包 10,736,354B、21 files、`noVideo=false`、includedVersions en-v2/ar-v2@1.1.0、providedAssetSetId=provided.scent-layering.serenity-v1；包内 hero/identity/MP4 bytes/SHA 与 receipt 一致；B 1.0.0 包 `noVideo=true`；独立 MP4 1,315,394B SHA `15d375…31e10e`。标准 Expand-Archive + 附件逐项核对通过。

### 验证命令（最终）

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过 |
| `npm run build` | 0 | buildId `otW8-a5y66W0hdP0409Ee` |
| 全量 product-*（13 specs，含 connected-flow） | 0 | **57 passed / 0 failed** |
| legacy `shell.spec.ts` + `poc-prototype.spec.ts`（EVIDENCE_ROOT） | 0 | **18 passed / 0 failed** |
| AS-005 `product-asset-downloads.spec.ts` | 0 | 3 passed |
| AS-005 unit `product-asset-export.test.ts` | 0 | 2 passed |

### 119 行矩阵（DOM/click）

`evidence/product/ip-009/matrix-dom-audit.json`：47 个真实状态、246 个实际 data-control-id；**found 108 / guarded 1（DEL-retry）/ NOT_RUN 10 / notFound 0 / unexpected 0**。NOT_RUN 原因：FLOW 替换的旧首页 CTA 2 个；静态分镜 AS-SHOT；原生视频控件 5 个；单 select 的 AS-LIB-TYPE；次级邮件 AS-HANDOFF-EXPAND。FLOW 控件 14 个单独记录为 out-of-scope，未纳入/未修改。

### 视觉/媒体

- 1440/1366 + AR/390 截图：`evidence/product/assets/as-006/01..15-*.png`；click path `click-path-observations.json`；视频真实 play/pause/seek 7.56s/replay，390 溢出 0。
- Brief/Atelier 面板截图见 `evidence/product/assets/as-004/**`；首页/Journey 构图由 FLOW 批次基线保留（另一批次，不在本批通过范围）。

### 最终 NOT_RUN/限制

- 15 秒核心成片/poster 仍 pending（未伪造）；提供片独立且不挂 15s VTT；AR 待母语/品牌审稿。
- 10 条矩阵 NOT_RUN 如实保留；FLOW journey/connected-flow 未纳入本批验收、未改动。
- 无真实后端/邮件/平台/LLM；无多用户/队列/跨浏览器矩阵。
- 不自行 accepted；等待主控实际看图、试主路径、打开真实 ZIP/MP4 后决定。
