# IP-009 · 全站点击矩阵、跨页一致性与产品视觉验收 · DSH 实施报告

日期：2026-11-05。状态：implemented，等待主控集中 review；不自行 accepted。

## 范围

- 六主路由冷启动 + 任意顺序导航；只读快照对比；A 编辑/确认→Library→Deliverables 跨页同版本/会话；B/C 冷导出；Activity 隔离；dirty guard；刷新/Back/Forward；真实 ZIP 标准解压核对。
- 88 行矩阵逐行审计并补 13 行实际新增控件，生成 `evidence/product/interaction-audit.json`。
- 1440×900、1366×768、AR、390 窄屏真实截图；3–5 分钟真实点击路径 `evidence/product/click-path.md`。

## 矩阵与审计结果

- 矩阵实际控制：101（88 模板 + 13 新增真实控件：空态 Clear、Activity 两个 tab、证据→Radar、Campaign/版本参数化按钮、Advanced 字段、编辑器关闭、Library drawer 打开/导出/空态清除、Deliverables 版本/预览）。
- `evidence/product/interaction-audit.json`：**pass 97 / fail 0 / not_run 0 / guarded 4**。
- guarded 仅 4 个，均有明确业务前提与恢复动作：
  1. `MAIL-simulate` / 2. `MAIL-failure`：需先保存 delivery draft revision；dirty 时禁用；恢复=Save draft。实测保存后成功/失败/重试均产生独立 attempt。
  3. `AT-confirm`：脏稿时禁用，需先 Save new version；恢复后显式本地确认生效。
  4. `DEL-retry`：仅真实导出错误后出现，无法在不伪造失败的情况下触发；同一 Download 动作可重试且无假成功。
- 无 unexpectedControls、无缺失证据路径（审计生成时逐一校验 37 个证据文件存在）。

## 命令与 exitcode（真实，生产构建 `http://127.0.0.1:3100`）

| 命令 | exitcode | 结果 / 证据 |
|---|---|---|
| `npm run typecheck` | 0 | evidence/product/ip-009/typecheck.log |
| `npm run test:unit -- tests/poc/product-read.test.ts tests/poc/product-commands.test.ts tests/poc/product-export.test.ts` | 0 | 20 tests passed · unit.log |
| `npm run build` | 0 | build.log（BUILD_ID 见 interaction-audit.json） |
| `PLAYWRIGHT_PORT=3100 npm run test:e2e -- product-navigation/radar/opportunities/atelier/library/deliverables/cross-page` | 0 | 30 tests passed · e2e.log |
| `PLAYWRIGHT_PORT=3100 npm run test:e2e -- shell.spec.ts poc-prototype.spec.ts`（旧测试适配后回归） | 0 | 18 tests passed · legacy-e2e.log |

## 覆盖证据（摘要）

- 只读 sweep：`product-cross-page.spec.ts` 前后 sessions/exports 相等；冷启动全站 sessions=0/exports=0。
- A 跨页：Atelier 保存/确认 → Library 精确版本/session → Deliverables Confirmed current 导出；刷新/Back/Forward 后 URL 与内容一致；`evidence/product/ip-009/cross-page-A-confirmed.zip`。
- B/C 冷导出：`cold-library-C-en.zip`、`cold-deliverables-B-ar.zip`，无 session/确认/邮件。
- Activity：`purpose=activity` 会话单独出现，工作 session revision/workflow 不变。
- 真实 ZIP：`evidence/product/ip-007/library-export-audit.json`、`evidence/product/ip-008/zip-audit.json`（标准 Expand-Archive 解压、版本/正文/时码/图片/hash/附件 manifest 全核对；无 MP4）。
- 终版截图：`evidence/product/ip-009/01–36-*.png`（Overview/Radar/Opportunities/详情/Atelier EN+AR/Library/Deliverables/关键 Drawer/1440/1366/390）。

## 主控反馈修正（保留前后对照）

1. Overview 深色 hero H1 深字深底 → 改 `var(--on-dark)`（实测 rgb(248,246,240) on #191917，约 15:1）；CTA/正文层级复查。前：`evidence/product/ip-003/smoke-overview.png`；后：`evidence/product/ip-009/01-overview-1440.png`。
2. Library 竖排徽章/标题重复 → 合并单行 meta（类型/语言/来源/确认/导出数）、摘录改真实 hook、去除重复 Campaign 名。前：`evidence/product/ip-003/smoke-library.png`；后：`evidence/product/ip-009/19-library-1440.png`。
3. IP-009 发现并修复：390 窄屏 Radar 34px 横向溢出（长 topic tag nowrap + 工具栏 min-width）。修复后 1440/1366/390 overflow 全 0（`click-path-observations.json`）。

## 视觉/产品清晰度结论（测试全绿之外的单独判断）

- 六页首屏均可在不读技术元数据的情况下说出：当前对象、推荐/理由、已有成果、下一步操作；无 Soon/空白路由/假视频/假发送。
- A 场景 Radar→机会→Atelier→Library→Deliverables 同一 Campaign/版本/会话关联清晰；1440/1366/AR/390 无溢出；AR 内容 RTL、Latin 隔离。
- Atelier 默认是可读结果预览而非长表单；编辑按需；Library 行不再以内部 ID 为主体；Deliverables 主下载与次级模拟邮件关注度分离。
- 仍存在的产品层面提示：视频继续 deferred（界面明确标注，不提供假播放器）；详情 breadcrumb 末级为通用 “Strategy detail”；不阻断本轮验收。

## IP-BATCH-FIX-01 · 旧证据覆盖事件与修复（主控阻断项，已完成）

- **事件**：IP-009 回归运行 `shell.spec.ts` / `poc-prototype.spec.ts` 时覆盖了 `evidence/m1/shell/**` 与 `evidence/poc/prototype/**` 的历史证据（18:25–18:26）。
- **归档**：覆盖后状态原样归档到 `evidence/product/ip-009/evidence-incident/overwritten/{m1-shell,poc-prototype}/`（23 files，含 archive-manifest.json bytes/sha256/mtime），未删除任何文件。
- **POC-008 恢复**：`evidence/poc/prototype/` 从 `evidence/poc/reviews/POC-008/submitted/` 恢复 14 个同名 PNG（README 未动）；`restore-manifest.json` 记录 source/target/sha256，14/14 hash 与 submitted 一致。
- **M1 shell 不可恢复**：全工作区搜索 submitted/backup/archive、zip 条目与同名文件均无原始副本；`evidence-incident/evidence-loss.md` 逐文件列出 7 图 + browser-report.json 的当前大小/18:26 mtime/hash 并注明不可恢复；未重拍/未伪造。
- **重定向与复验**：两 spec 证据根改为 `EVIDENCE_ROOT` 可配置（默认 `evidence/product/ip-009/legacy`）。重跑 `EVIDENCE_ROOT=evidence/product/ip-009/legacy` + 3100：exit 0、18 passed（`evidence/product/ip-009/legacy-e2e-rerun.log`，新根 22 files）；`rerun-immutability-check.json` 证明 `evidence/m1/shell` 8/8、`evidence/poc/prototype` 16/16 hash+mtime+bytes 重跑后未变，prototype 保持 submitted 哈希。
- 后续：`poc-content-only` / `poc-content-delivery` / `theme` / `poc-components` 等仍写旧目录的 spec 在主控允许/重定向前不运行。

## IP-BATCH-FIX-02 · 矩阵 data-control-id 对齐与 DOM 审计（已完成）

- 主控复核指出的 Global/Overview 缺失与条件 ID 不一致已修复：NAV-*、SHELL-*、OV-*、ACT-view-preset/mine、AT-campaign-{id}/version/advanced-field/editor-close、LIB-atelier/export（行内通用）、DEL-version/DEL-preview、GUARD-* 均落到真实 `[data-control-id]`；矩阵外 `AT-version-list` 已移除。
- 新增 `apps/web/tests/product-matrix-dom.spec.ts`：打开六路由、Radar 15 信号抽屉、Activity、三机会详情、三 Campaign/编辑器/Advanced、Library 预览/空态、Deliverables 下载/Details、邮件 gate/draft/confirmation/record/failure/retry、dirty guard 等 **44 个真实状态**，采集 **222 个实际 data-control-id**。
- `evidence/product/ip-009/matrix-dom-audit.json`：矩阵实际 119 行（101 基础 + 18 条 AS 新增），本任务审计 **101 基础行：found 100 / guarded 1（DEL-retry，真实错误才出现）/ notFound 0 / unexpected 0**；AS-003..006 完成后由 AS-006 审计剩余 18 行。
- `evidence/product/interaction-audit.json` 已加 `domPresenceChecked: true`、`domAudit` 摘要与逐控件 `dom`（found/observedIds/stateEvidence/source），不以旧截图替代 DOM 证据。
- 验证：`npm run typecheck` exit 0；`npm run build` exit 0（buildId `ig2YZwK2WtBg11q8cPLVO`）；matrix-dom spec exit 0（1 passed）；受影响产品 E2E 7 spec exit 0（30 passed）。摘要见 `evidence/product/ip-009/fix02-summary.json`。

## 已知限制 / NOT_RUN

- 无真实视频/MP4/poster/播放器、无真实邮件/外部平台/LLM；均为标注的 Mock/Simulated。
- `DEL-retry` 无法在不伪造存储失败的情况下从 UI 触发（guarded，已记录恢复路径）；其余 guarded 项均已实测恢复后行为。
- 旧 vitest 全量 `npm run test:unit` 仍会收集 `apps/web/tests/*.spec.ts` 与 evidence 旧探针（历史结构问题，非本批引入）；本批按任务指定文件运行，结果见上表。
- 证据事件已修复（见上节）；`evidence/m1/shell` 原始 8 文件不可恢复为唯一剩余损失，已如实记录。
