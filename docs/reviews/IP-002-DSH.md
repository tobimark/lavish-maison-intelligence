# IP-002 · 显式编辑上下文与独立内容包导出 · DSH 实施报告

日期：2026-11-05。状态：implemented，等待主控集中 review；不自行 accepted。

## 变更

- 新增 `apps/web/demo/poc/api/product-commands.ts`：
  - `beginCampaignEdit`：只在显式 Edit/Confirm 调用。验证 Campaign/version 归属；saved 版本用 owner session，preset 优先 `workspaceLinks` 绑定、其次同包有效 content session（updatedAt desc/id asc、排除 activity）、再 `createSession`（稳定 creationKey，防重复工作稿）。缺 discovery/analysis 时用既有 `executeStage` 装载，再按需 `selectScript`；不自动 confirm、不创建视频/交付。createSession receipt 重放后重新 `getSession` 取最新 revision。
  - `openActivityReplay`：仅显式 Play/Step/Restart 调用；创建独立 `purpose='activity'` 会话，按 creationKey 幂等复用；返回 analysis 前缀 lastSequence。
  - `exportScriptPack` / `getProductExport` / `markProductExportTriggered`：普通导出仅解析精确 preset/saved 版本，不 createSession/confirm/simulate delivery；生成并持久化真实 ZIP（`brief.json`、`script.json`、`subtitles-<lang>.vtt`、`storyboard.html`、`media/**` 真实图片、`README.txt`、`EXPORT.json`）；record 状态 `prepared`，下载后幂等改 `download_triggered`；重新下载返回原 bytes/hash。
- `mock-api.ts`：`createSession` 改为委托内部 `createSessionForPurpose`（公共签名/行为不变，默认 editing）；新增 5 个写命令 + 读方法委托；`createMockApi` 返回 `ProductMockApi`。
- 存储：`workspaceLinks`（key `campaignId@packageHash`）与 `productExports`（key exportId，保存 record+原始下载字节）；Memory 与 IndexedDB（DB 2）实现；旧 store/记录保留。
- Activity 会话与工作稿/导出隔离：`getCampaign` 的 workingSession/versions 排除 purpose=activity。

## 验证（真实 exitcode）

| 命令 | exitcode | 证据 |
|---|---|---|
| `npm run typecheck` | 0 | evidence/product/ip-002/typecheck.log |
| `npm run test:unit -- tests/poc/product-commands.test.ts tests/poc/product-export.test.ts tests/poc/content-delivery.test.ts` | 0（15 tests） | evidence/product/ip-002/unit-product-commands-export.log |
| `npm run test:unit -- tests/poc/storage.test.ts tests/poc/mock-api.test.ts` | 0（32 tests，回归） | evidence/product/ip-002/legacy-regression.log |

覆盖：首次编辑建 1 个真实工作会话且不确认/不导出；重复点击不新增会话/不增 revision；切换 AR 版本后派生保存；saved 版本 owner session + 精确确认；activity 会话仅在显式打开时创建、回放不影响工作稿、不进 Library；preset B 直接导出无 session/confirm/邮件；真实 ZIP 结构/附件 hash/真实媒体 hash；AR 与 saved 版本语言/标题/确认状态；旧导出 bytes 不变；未知/跨 Campaign/假 session 引用 NOT_FOUND；存储失败不假成功。

## 已知限制 / NOT_RUN

- 无完整 UI（编辑 Drawer/Export 按钮在 IP-006/IP-008）；浏览器下载触发与真实解压在 IP-008/IP-009 验证。
- 真实 ZIP 已由单测解析校验结构/附件/hash；标准解压工具核对在 IP-008 证据补齐。
- `npm run test:unit` 全量会同时收集 `apps/web/tests/*.spec.ts`（Playwright）与 evidence 旧探针，属既有结构问题，本批按任务指定文件运行；详情见 IP-BATCH-DSH。
