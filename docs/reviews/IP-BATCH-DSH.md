# IP-BATCH-DSH · Interactive Mock Product 整批实施汇总

日期：2026-11-05。执行者：dsh。范围：tasks/DSH_HANDOFF_DEMO_FAST_05.md + tasks/interactive/IP-001..IP-009。状态：**implemented，提交主控集中审查；不自行 accepted**。

## 结果概览

- 六主路由全部真实内容与操作：`/`、`/radar`、`/opportunities`、`/opportunities/[opportunityId]`、`/atelier`、`/library`、`/deliverables`；Sidebar 六项真实 Link + 高亮，无 Soon/disabled/空白占位；Home→Overview。
- 浏览/筛选/语言/版本预览只读，不 createSession/executeStage/selectScript/confirm/export；显式 Edit/Confirm 才 `beginCampaignEdit`；普通导出 `exportScriptPack` 与模拟邮件解耦；Activity 仅显式 Play/Step/等创建 `purpose=activity` 会话。
- 复用既有 MockApi/IndexedDB/状态机/版本/ZIP 与 FIX-NV-BATCH-01 修复；Opportunity=`analysis.id`、Campaign=`brief.id`；URL 优先、未知 ID 明确提示；旧导出快照保留。
- 真实浏览器 30 条产品 E2E + 18 条旧 shell/prototype 回归全绿；真实 ZIP 标准解压与 hash 核对通过；1440/1366/AR/390 终版截图齐全。

## 9 任务变更与证据

| Task | 变更摘要 | 报告 |
|---|---|---|
| IP-001 | `product-queries.ts` 实现全部只读 API；三包/三机会/15 信号/EN-AR/保存版本投影；组合筛选、未知 ID NOT_FOUND、只读无副作用 | docs/reviews/IP-001-DSH.md |
| IP-002 | `product-commands.ts`：beginCampaignEdit/openActivityReplay/exportScriptPack/getProductExport/markProductExportTriggered；DB v2 两 store；purpose；真实 ZIP 与 prepared/download_triggered | docs/reviews/IP-002-DSH.md |
| IP-003 | 六真实路由 + Sidebar/面包屑/高亮；Overview（三机会真图/推荐/EN-AR/Recent downloads/空态）；全局 Save/Discard/Cancel 脏稿保护；修 Overview H1 对比度 | docs/reviews/IP-003-DSH.md |
| IP-004 | Radar 15 信号、四来源+Topic+Campaign AND/URL 恢复/清除；证据 Drawer 全量；0–100 示意趋势；Agent Activity 二级抽屉 + 隔离回放；修复并发 revision 冲突 | docs/reviews/IP-004-DSH.md |
| IP-005 | Opportunities 列表 + 可解释详情（recommendation/rationale/insights/证据/假设/不确定性/完整 Brief/产品事实）；Open campaign 精确；未知 ID Not found | docs/reviews/IP-005-DSH.md |
| IP-006 | Atelier 默认结果预览 + Campaign/语言/版本只读预览；按需编辑 Save/Discard/Confirm；AR RTL；共享 ScriptPreview/StoryboardPreview；四镜头真实图 + 小 Logo | docs/reviews/IP-006-DSH.md |
| IP-007 | Library 全量筛选/URL/空态/预览/精确 Open in Atelier/真实导出；单行 meta 与真实 hook 摘录（主控反馈修正）；ZIP 标准解压核对 | docs/reviews/IP-007-DSH.md |
| IP-008 | Deliverables 三 Campaign EN/AR + 保存版本；真实 Download content pack、Details/重新下载原字节、失败 Retry；次级模拟邮件确认/脏稿/失败重试/attempt 导出 | docs/reviews/IP-008-DSH.md |
| IP-009 | 88 行矩阵展开 + 13 新增控件；interaction-audit.json；六页 1440/1366/AR/390 截图；真实点击路径；跨页/Back-Forward/只读快照；修复 390 Radar 溢出 | docs/reviews/IP-009-DSH.md |

## 命令与真实 exitcode

| 命令 | exitcode | 结果 | 证据 |
|---|---|---|---|
| `npm run typecheck` | 0 | 无错误 | evidence/product/ip-009/typecheck.log |
| `npm run test:unit -- tests/poc/product-read.test.ts tests/poc/product-commands.test.ts tests/poc/product-export.test.ts` | 0 | 20 passed | evidence/product/ip-009/unit.log |
| `npm run build` | 0 | Next 生产构建成功 | evidence/product/ip-009/build.log |
| `PLAYWRIGHT_PORT=3100 npm run test:e2e -- product-navigation/radar/opportunities/atelier/library/deliverables/cross-page` | 0 | 30 passed | evidence/product/ip-009/e2e.log |
| `PLAYWRIGHT_PORT=3100 npm run test:e2e -- shell.spec.ts poc-prototype.spec.ts` | 0 | 18 passed（旧断言按新导航适配后） | evidence/product/ip-009/legacy-e2e.log |

补充历史回归：`npm run test:unit -- tests/poc/storage.test.ts tests/poc/mock-api.test.ts` exitcode 0（32 tests，DB v2 适配后），见 evidence/product/ip-002/legacy-regression.log。

## 交互矩阵结果

- `evidence/product/interaction-audit.json`：scope=`interactive_mock_product`，buildRef 记录 BUILD_ID 与 3100 生产命令。
- **101 controls：pass 97 / fail 0 / not_run 0 / guarded 4**；unexpectedControls=[]；37 个证据路径逐一存在校验通过。
- guarded 均写明业务前提与恢复动作：MAIL-simulate、MAIL-failure（需先 Save draft）、AT-confirm（脏稿禁用，先 Save new version）、DEL-retry（仅真实错误后出现，重试同一下载动作）。
- 矩阵仅补实际新增控件 13 行（空态 Clear、Activity tabs、证据→Radar、Campaign/版本参数化按钮、Advanced 字段、编辑器关闭、Library drawer 打开/导出/空态清除、Deliverables 版本/预览），未删除任何失败/旧行。

## 真实 ZIP 标准解压核对

- `evidence/product/ip-007/library-export-audit.json`：AR 预置包 8 条目；script/VTT/storyboard/媒体/brief/README/EXPORT 齐全；附件 manifest bytes+sha256 全匹配；媒体 perla/logo SHA-256 与源包 `assets.json` 一致；无 MP4；4 cues/4 shots。
- `evidence/product/ip-008/zip-audit.json`：5 个真实下载包（B-AR preset、C-EN preset、Saved AR Draft、Saved AR Confirmed、Mail simulated attempt）标准 Expand-Archive 解压；draft/confirmed 内容与标题/字幕/时码/三张真实媒体一致；Draft 明确 `Draft / Not confirmed`；mail attempt 含 `SIMULATED-DELIVERY.json`、无 MP4、与普通 export 分离。
- IP-009 跨页与冷导出另存：`cross-page-A-confirmed.zip`、`cold-library-C-en.zip`、`cold-deliverables-B-ar.zip`（e2e 内校验保存字节 SHA 与 IndexedDB record 一致）。

## 视觉证据与 3–5 分钟路径

- 终版截图：`evidence/product/ip-009/01–36-*.png`（六页 1440 + 1366、Radar Drawer/Activity、Atelier Editor/AR/390、Library Drawer、Deliverables Details/Mail、Guard Dialog）。
- A 场景检查点：`evidence/product/ip-006/radar-A-1440.png`、`opportunity-A-1440.png`、`atelier-A-1440.png`（另有 1366/AR/390）。
- 点击路径：`evidence/product/click-path.md`（3–5 分钟逐步操作、结果与截图对应）；步骤观察：`evidence/product/ip-009/click-path-observations.json`、`control-audit-observations.json`。
- 主控反馈修正前后：Overview H1（`ip-003/smoke-overview.png` → `ip-009/01-overview-1440.png`）、Library 行（`ip-003/smoke-library.png` → `ip-009/19-library-1440.png`）；另修复 390 Radar 34px 溢出，修复后 overflow 全 0。

## 契约外必要适配（请主控确认）

1. DB version 1→2 后，两条旧测试中裸 `factory.open(dbName, 1)` 改为 version 2（`tests/poc/storage.test.ts:183`、`tests/poc/mock-api.test.ts:515`）；断言未删除/放宽。
2. `downloads/zip.ts` 保留 `/` 以支持规范要求的 `media/` 目录（仍剥离绝对路径与 `..`）；旧 content pack 文件名不变。
3. 旧 `shell.spec.ts` / `poc-prototype.spec.ts` 仅按新导航/首页入口适配（六真实链接、Overview 内容、/poc/preview 直达），核心断言保留并回归通过；两 spec 的证据根目录已改为 `EVIDENCE_ROOT` 可配置（默认 `evidence/product/ip-009/legacy`，不再写历史目录）。
4. 为避免把旧四步壳体嵌回，Atelier 编辑器复用既有命令/状态机语义并独立呈现，未重写状态机。

## IP-BATCH-FIX-01 · 证据覆盖事件与恢复（主控阻断项）

**事件**：IP-009 为回归旧断言运行 `shell.spec.ts` / `poc-prototype.spec.ts` 时，两 spec 原硬编码写入 `evidence/m1/shell/**` 与 `evidence/poc/prototype/**`，于 2026-11-05 18:25–18:26 覆盖了历史 M1/POC-008 证据。这是执行者流程错误。

**1) 覆盖后状态归档（不删除）**
- 当前两目录原样复制到 `evidence/product/ip-009/evidence-incident/overwritten/{m1-shell,poc-prototype}/`（23 files：m1-shell 8、poc-prototype 15）。
- `overwritten/archive-manifest.json` 记录每个归档文件的 bytes/sha256/mtime。

**2) `evidence/poc/prototype/` 已恢复**
- 从 `evidence/poc/reviews/POC-008/submitted/` 恢复 14 个同名 PNG；README.md 未改动（保留原内容）。
- `evidence/poc/prototype/restore-manifest.json` 记录 source/target/sha256/bytes；14/14 target 与 submitted 源 hash 完全一致。

**3) `evidence/m1/shell/` 不可恢复（如实记录，不重拍/不伪造）**
- 已搜全工作区：目录名 submitted/backup/archive/m1/shell、全部 `<20MB` zip 条目、任意位置 `shell-*.png` / `browser-report.json`；**未找到任何原始副本**（`deliverables/LAVISH_POC_PRODUCT_REVIEW_KIT.zip` 亦无 M1 shell 条目）。
- `evidence/product/ip-009/evidence-incident/evidence-loss.md` 逐文件列出被覆盖的 7 张截图 + browser-report.json（名称/当前 bytes/18:26 mtime/SHA-256），明确原图不可恢复；当前内容仅作为“覆盖后状态”归档，不冒充原始证据。

**4) 旧 spec 输出重定向**
- 两 spec 的 `EVIDENCE_DIR` 改为 `process.env.EVIDENCE_ROOT ? path.resolve(cwd, process.env.EVIDENCE_ROOT) : path.resolve(cwd,'evidence','product','ip-009','legacy')`；默认不再写历史目录。
- 重跑命令（exit 0，18 passed）：`$env:EVIDENCE_ROOT='evidence/product/ip-009/legacy'; $env:PLAYWRIGHT_PORT='3100'; npm run test:e2e -- apps/web/tests/shell.spec.ts apps/web/tests/poc-prototype.spec.ts`；日志 `evidence/product/ip-009/legacy-e2e-rerun.log`，输出 22 files 于新根。
- 重跑后不可变性：`evidence/product/ip-009/evidence-incident/rerun-immutability-check.json` 显示 `evidence/m1/shell` 8/8、`evidence/poc/prototype` 16/16 的 hash+mtime+bytes 全部未变；prototype 14 张仍与 submitted 一致。
- 注意：`poc-content-only` / `poc-content-delivery` / `theme` / `poc-components` 等旧 spec 仍写旧目录，本批未运行；在重定向/主控允许前不要运行它们。

## IP-BATCH-FIX-02 · 交互矩阵 DOM 对齐（主控阻断项，已完成）

- 按主控复核补齐/对齐 `data-control-id`：Global `NAV-*`（6）/`SHELL-*`（4）、Overview `OV-*`（5）、Radar `ACT-view-preset|mine`、Atelier `AT-campaign-{id}`/`AT-version-{id}-{session|preset}`（内层保留 generic）/`AT-advanced-field-{field}`/`AT-editor-close`、Library 行内 `LIB-atelier`/`LIB-export`、Deliverables `DEL-version`/`DEL-preview`、`GUARD-*`；移除矩阵外 `AT-version-list`。
- 新增 `apps/web/tests/product-matrix-dom.spec.ts`，在 44 个真实 UI 状态采集 222 个实际 DOM Control ID；证据 `evidence/product/ip-009/matrix-dom-audit.json`。
- 101 基础矩阵行结果：**found 100 / guarded 1（DEL-retry：仅真实导出错误后出现，未造假按钮）/ notFound 0 / unexpected 0**；矩阵总 119 行中的 18 条 AS 资产控件留待 AS-004/005 实现后由 AS-006 统一审计。
- `evidence/product/interaction-audit.json`：`domPresenceChecked=true`，每条 control 附 `dom.found/observedIds/stateEvidence/source`；旧截图不再充当 DOM 证据。
- 命令：typecheck exit 0；build exit 0（`ig2YZwK2WtBg11q8cPLVO`）；matrix-dom spec exit 0（1 passed）；受影响 E2E 7 spec exit 0（30 passed）；摘要 `evidence/product/ip-009/fix02-summary.json`。

## NOT_RUN / 已知限制

- 视频/MP4/poster/播放器仍 deferred；无真实邮件/外部平台/LLM/采集；所有 mock/simulated 明确标注。
- `DEL-retry` 无法在不伪造存储失败的情况下从 UI 触发（guarded，恢复路径已记录）。
- 未做多用户/后台队列/跨浏览器矩阵（规格明确不做）；旧 vitest 全量收集 Playwright/旧 evidence 探针的结构问题未在本批扩大处理。
- 证据事件已按 IP-BATCH-FIX-01 处理：POC-008 prototype 14 文件恢复并复验未变；m1/shell 原始 8 文件不可恢复，已如实记录并保留覆盖后归档。后续 legacy spec 一律使用 `EVIDENCE_ROOT` 或默认新根。
- 未自行 accepted；等待主控实际看图、试路径后决定。
