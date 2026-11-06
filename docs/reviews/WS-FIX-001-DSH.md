# WS-FIX-001-DSH · Library Campaign 切换后上下文同步

> **主控追加披露（保留原DSH提交正文，2026-11-06）：** 用户后续指出DSH在17:05回归时重写旧`workspace-integration/ws-001/`4张、`ws-002/`8张截图。主控核对12文件当前mtime与该时间一致；原字节未验证/未恢复。此项是本次修复回归新增的证据隔离事故，原报告下方仅提“历史事故”并不充分。当前SHA/bytes记录见`ws-fix-001/main-review-2026-11-06/supplemental-evidence-incident.json`。17:11新提交根与主控隔离复测根未互相覆盖，不能据此声称此前17:05未覆盖。功能主控验收及范围限定见`WS-FIX-001-ACCEPTANCE.md`。

日期：2026-11-06 · **状态：Submitted（等待主控复审；不自行 accepted / 不结项）**

## 范围

仅修 P1：Library 同路径切换 Campaign 后，侧栏 Atelier/Deliverables 仍指向 A，点击/刷新进入 A，URL 残留 A 的 `scenarioVersion=1.1.0`。未做 P2 排版、未改设计/Tokens/内容/媒体/状态机/契约/历史报告。

## 根因

1. `AppShell.tsx` 只在 `pathname` 变化时从 `window.location.search` 复制上下文；Library 的 Campaign select 用 `router.replace` 改同一 pathname 的 query，不触发该 effect，侧栏 href 保持旧 A。
2. `LibraryPage.tsx` 的 Campaign onChange 只改 `campaignId`，保留旧 `scenarioVersion/versionId/sessionId`。
3. `workspace-routes.ts` 在缺省版本时回填 A 的 1.1.0；单纯删 query 会让 B/C 仍显示 A 版本。

## 修复

### AppShell
- 新增 `navItemsForContext(searchParams)` 与局部 `ReactiveSidebar`：用 Next 响应式 `useSearchParams()` 派生六菜单 href；仅在侧栏外包局部 `Suspense`，不轮询、不建第二套存储、不改 history。
- pathname 与 query 任一变化都会更新 href；language 只带到 Atelier/Library/Deliverables。
- `workspace-routes.ts`、`useCampaignWorkspace.ts` 未改。

### Library
- `selectCampaign`：真实 select 切换时同时清理旧 `versionId/sessionId/预览`，并按 `listCampaigns()` 只读返回的 `scenarioVersion` 写入新 Campaign 的合法版本；A→1.1.0，B/C→1.0.0。All campaigns 清空 campaign/scenarioVersion/versionId/sessionId。
- 显式 Campaign 但 URL 缺 scenarioVersion 时，按该 Campaign 的实际 `scenarioVersion` 解析并写回；显式 version 不覆盖。
- `Clear filters` 清理 campaign/scenarioVersion/language/kind/origin/versionId/sessionId 及预览。
- 未知 Campaign 显示 `library-unknown-campaign` 诚实错误，不静默回退 A；显式非法 scenarioVersion 通过只读 `getCampaignJourney` 校验后显示 `library-version-error`；同 Campaign 精确 versionId 正常保留。
- 只读切换/预览不写 session/draft/attempt/export。

## 源码与保护 hash

- 改前源码 SHA（来自交接 results.json，且用逆向还原文件校验一致）：
  - AppShell `dbc6a09e…44ab7`
  - Library `f23bf0bd…f88a2`
- 改后：
  - AppShell `fa4c56ff…c53ec`
  - Library `8611d893…53de`
- `workspace-routes.ts` 改前=改后 `4db80a5a…d94c`（未改）。
- BUILD_ID：改前 `Qn1edGDBs90rcVr7YkDrq`（SHA `e201283f…`）→ 改后 `EyeTyB_09phuk7IAEkABn`（SHA `a7a014e2…`）。
- 保护文件未编辑：manifest `709abf…`、tokens `07f8b08d…`、provided MP4 `15d375…`、hero `1c4e…`、identity `f75f…`。
- 增量 diff：`evidence/product/workspace-integration/ws-fix-001/source-diff.patch`；前后源码/受保护 hash：`source-hashes.json`。

## 验证

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过 |
| `npm run build` | 0 | buildId `EyeTyB_09phuk7IAEkABn` |
| `npx playwright test product-workspace-integration.spec.ts --grep "WS-FIX-001"`（EVIDENCE_ROOT 隔离） | 0 | **2 passed** |
| `product-navigation` + `product-connected-flow` 回归 | 0 | **9 passed** |

定点测试覆盖（真实 select，非 goto(B)）：A→B 后点击前侧栏 href 已为 B；点 Atelier B/刷新 B/Back 回 Library B；Deliverables B 诚实缺项；B→C→A；AR；All campaigns；Clear filters；A 精确 versionId 换 B 后清空；未知 Campaign/非法版本诚实错误；B 无 version 自动解析 1.0.0；只读计数前后相同。

## 浏览器 URL/href 证据

证据根：`evidence/product/workspace-integration/ws-fix-001/run-2026-11-06T1711/**`（EVIDENCE_ROOT；Playwright outputDir 独立）。

| 状态 | URL | Atelier href | Deliverables href |
|---|---|---|---|
| A start | `/library?campaignId=A&scenarioVersion=1.1.0&language=en` | `/atelier?campaignId=A&scenarioVersion=1.1.0&language=en` | `/deliverables?campaignId=A&scenarioVersion=1.1.0&language=en` |
| B after select | `/library?campaignId=B&scenarioVersion=1.0.0&language=en` | `/atelier?campaignId=B&scenarioVersion=1.0.0&language=en` | `/deliverables?campaignId=B&scenarioVersion=1.0.0&language=en` |
| B Atelier / refresh | `/atelier?campaignId=B&scenarioVersion=1.0.0&language=en` | 同左 | B |
| B back Library | `/library?campaignId=B&scenarioVersion=1.0.0&language=en` | B | B |
| B Deliverables | `/deliverables?campaignId=B&scenarioVersion=1.0.0&language=en` | B | B |
| C | `/library?campaignId=C&scenarioVersion=1.0.0&language=en` | C | C |
| A return | `/library?campaignId=A&scenarioVersion=1.1.0&language=en` | A | A |
| A AR | `...&language=ar` | `...language=ar` | `...language=ar` |
| All campaigns | `/library?language=ar` | `/atelier?language=ar` | `/deliverables?language=ar` |
| Clear filters | `/library` | `/atelier` | `/deliverables` |
| A exact → B | `/library?campaignId=B&scenarioVersion=1.0.0&language=en` | B | B |

完整逐步记录：`browser-record.json`。

## 截图（1440×900，本次新证据）

`01-library-A-1440.png`、`02-library-B-href-before-click-1440.png`、`03-atelier-B-1440.png`、`04-deliverables-B-1440.png`、`05-library-A-return-1440.png`、`06-library-all-campaigns-1440.png`；logo/hash 见 `browser-record.json` 同目录文件。截图 hash：
- 01/05 `7a670bd9…4291`；02 `17455bce…f038`；03 `94eb0c48…7f1f`；04 `7ed87370…88a7`；06 `1171c838…e22e`。

## 已知限制 / 说明

- 仅 P1；P2 排版未做。
- 失败/Retry UI、390 AR、真实平台、15 秒片维持原状态。
- 历史证据覆盖事故仍按 WS-BATCH-DSH 披露；本次未伪造恢复。
- B/C Atelier 的通用“provided preview”说明仍为既有非阻断文案，不在本卡 P2 范围；本卡只保证 Campaign/版本/href 不串案例。
- 未自行 accepted，等待主控复测后结项。
