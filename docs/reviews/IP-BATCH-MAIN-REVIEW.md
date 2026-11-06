# IP-BATCH-MAIN-REVIEW · Interactive Mock Product 批次主控审查

日期：2026-11-05。范围：tasks/DSH_HANDOFF_DEMO_FAST_05.md + tasks/interactive/IP-001..IP-009（含 IP-BATCH-FIX-01、部分 IP-BATCH-FIX-02）。执行者：dsh（DSH）。审查者：主控（lead）。

## 结论（先看）

**FAST_05 实现完成、功能链路经主控实际验证通过；但不单独 accepted。** 两个原因：

1. **交互矩阵 DOM 证据未完成（FIX-02 部分完成）**：矩阵 101 行中 Global/Overview 的常显控件原本缺 `data-control-id`，FIX-02 已补齐 NAV×6、SHELL×4、OV×8 并经主控在 dev/prod 实测；但条件控件（抽屉/编辑器/邮件/guard 等）与 `matrix-dom-audit.json` 尚未自动验证，`interaction-audit.json` 尚未补 DOM 证据。
2. **FAST_06 并行接管范围**：另一主控会话于 18:43–18:54 建立 FAST_06（Results First + SERENITY 真实资产，tasks/DSH_HANDOFF_DEMO_FAST_06.md、AS-001..006），明确把 IP-001..009 与 AS 合并为同一批并统一提交 AS-IP-BATCH-DSH。因此本批以“实现基座移交 FAST_06 合并验收”处理，避免重复 accepted。

当前工作区可构建可演示（`npm run typecheck` / `npm run build` exit 0，dev 3000 与 prod 3100 均可打开六工作区）；AS/SERENITY 能力尚未实现。

## 主控实际验证（真实执行）

| 检查 | 结果 | 说明 |
|---|---|---|
| `npm run typecheck` | 0 | FAST_06 契约重组后（18:56 product-contract 恢复 6548B、provided-asset 独立）复跑通过 |
| `npm run build` | 0 | 12 routes；恢复 `.next/BUILD_ID`（DSH 失败的旧构建曾清掉） |
| 单元测试（product-read/commands/export + storage/mock-api/content-delivery） | 56 passed | 6 files；Lead 独立复跑 |
| 产品 E2E（7 spec） | **30/30 passed** | Lead 在 DSH 停止写入后独立复跑，1.7m；此前一次 29/30 的 `download.saveAs canceled` 已确认是 DSH 同时跑 legacy spec 的资源竞争，单独复跑该 spec 4/4 通过 |
| 旧 shell/prototype 回归（EVIDENCE_ROOT 重定向后） | 18 passed | DSH 执行；重跑后旧目录 hash/mtime 未变（immutability JSON） |
| 六路由 DOM `data-control-id` | NAV 6 / SHELL 4 / OV 8 + 各页 | Lead 在 dev 3000 与 prod 3100 实测一致 |
| 只读/跨页/真实 ZIP | pass | 见 DSH e2e.log、cross-page/A confirmed ZIP、zip 审计与 Lead 内容级 revalidation |
| 视觉 | 通过（1440/1366/AR/390） | Lead 实际查看六页与关键 Drawer/Editor/Mail/Guard 截图；Overview H1、Library meta/hook、390 Radar 溢出已修 |

## 主控发现与处理

### F1 证据覆盖事件（已处理，残留 1 项不可恢复）

- DSH 回归旧断言时运行 `shell.spec.ts` / `poc-prototype.spec.ts`，两者硬编码写入 `evidence/m1/shell/**` 与 `evidence/poc/prototype/**`，覆盖历史证据（18:25–18:26）。
- 处理（IP-BATCH-FIX-01）：覆盖后状态归档到 `evidence/product/ip-009/evidence-incident/overwritten/`；`evidence/poc/prototype/` 从 `evidence/poc/reviews/POC-008/submitted/` 恢复 14 张 PNG，主控独立复算 14/14 SHA-256 一致；两 spec 证据根改为 `EVIDENCE_ROOT`（默认 `evidence/product/ip-009/legacy`），重跑后旧目录未变。
- **残留**：`evidence/m1/shell/` 原始 7 张截图 + browser-report.json 不可恢复；`evidence-loss.md` 逐文件记录（未重拍、未伪造）。该项属 TASK-007（未 accepted）历史证据，不影响已 accepted 的 M0/TASK-006/POC-008 功能结论，但作为流程事故保留披露。

### F2 交互矩阵 DOM 映射不完整（本次未关闭）

- Lead 用 Playwright 统计 `[data-control-id]`：提交时 Overview 为 0、Global 全缺；条件控件 ID 与矩阵不一致（AT-campaign、AT-advanced-field、ACT-view-preset/mine、DEL-preview、LIB-atelier/export 等）。
- FIX-02 已补齐并保留源码改动：NAV×6、SHELL×4、GUARD×3、OV×5、AT-campaign-{campaignId}/AT-editor-close/AT-advanced-field-*、ACT-view-preset/mine、LIB-atelier/export、DEL-version/DEL-preview 等；新增 `apps/web/tests/product-matrix-dom.spec.ts` 但**未成功运行**。
- **未关闭**：`matrix-dom-audit.json` 未生成；`interaction-audit.json` 未加 `domPresenceChecked`；条件控件是否全部命中仍未实测。移交 FAST_06 完成后一次性跑通并更新审计。

### F3 FAST_06 并行契约变更（已由对方主控重组）

- 18:49 `product-contract.ts` 被扩展（scenarioVersion 必填、CreativeItem 联合、ProductExportRecord 新字段、3 个 provided-asset API），导致旧 IP 代码 typecheck/build 失败；18:56 已重组为：`product-contract.ts` 恢复冻结原版（6548B），新增独立 `provided-asset-contract.ts`（3585B），不再破坏现有实现。
- 该变更属于 FAST_06/AS 批次范围；本批 DSH 被要求不实现 AS 契约、不写兼容桩。当前 typecheck/build 已恢复通过。

### F4 Lead 复核导致 evidence ZIP 字节再生（已披露）

- Lead 为独立验证重跑产品 E2E，Playwright 按固定路径重写了 `evidence/product/ip-007/ip-008/ip-009` 的 ZIP；包内容/版本/manifest/media hash 均正确，但归档字节因导出时间/ID 不同，与 DSH 提交时 `zip-audit.json` 记录的 sha 不再逐字节一致。
- 已在 `evidence/product/lead-review/zip-revalidation.json` 对 6 个包做内容级复核（**6/6 allChecksPass**）：EXPORT.json 附件 manifest bytes+sha、脚本/语言/时点/四镜头/VTT/真实媒体/无 MP4/Draft-Confirmed 标记全部通过；原始归档字节差异已记录。
- DSH 提交时的 `zip-audit.json`/`library-export-audit.json` 保留为历史审计；后续以 Lead revalidation + FAST_06 新导出为准。

## 已知限制（不阻断本批移交，需 FAST_06 知悉）

- 视频/MP4/播放器：FAST_05 范围 deferred；SERENITY provided MP4 已进入 FAST_06 范围（未实现、未验收）。
- `DEL-retry`：仅真实导出错误后出现，guarded；没有常驻假按钮。
- 机会详情 breadcrumb 末级仍为通用 “Strategy detail”。
- `poc-content-only` / `poc-content-delivery` / `theme` / `poc-components` 等旧 spec 仍写旧证据目录，未在本批重跑；后续运行前需同样做 `EVIDENCE_ROOT` 重定向或先备份。
- 全量 `npm run test:unit` 仍会收集 Playwright/旧 evidence 探针（历史结构问题），本批按指定文件运行。
- 批次期间工作区出现外部提供的 SERENITY 素材与探针（`assets/provided/**`、`evidence/poc/provided-assets/**`、`design/presentation-assets/**`，18:35–18:41），属 FAST_06 范围，本批未验证、未纳入结论。

## 移交 FAST_06 的未完成项

1. 跑通 `product-matrix-dom.spec.ts`，生成 `evidence/product/ip-009/matrix-dom-audit.json`，补 `interaction-audit.json` 的 `domPresenceChecked` 与逐控件 DOM 证据；条件控件逐状态实测，guarded 写清前提与恢复。
2. 完成 AS-001..006（provided assets API、SERENITY 内容 1.1.0 绑定、Campaign Brief、视频预览/下载、导出扩展），并复用现有 IP 实现（勿重做 MockApi/IndexedDB/状态机）。
3. 扩展矩阵（媒体/Brief/视频控件）并做合并 AS-IP 全站点击/媒体/ZIP/跨页/视觉审计，提交 `docs/reviews/AS-IP-BATCH-DSH.md`，由主控实际看图/试路径后决定 accepted。
4. 重新 build 并确认六路由 + 新内容可用；当前 `typecheck/build` 在本批重组后已通过，但 AS 实现会再次改动共享代码。
5. 旧证据目录只读；任何需要重跑 shell/prototype 的验证使用 `EVIDENCE_ROOT`；不要重写 `evidence/m1/shell` 与 `evidence/poc/prototype`。

## 证据索引

- 批次提交：`docs/reviews/IP-BATCH-DSH.md`、`IP-001..IP-009-DSH.md`、`IP-BATCH-FIX-01` 记录（同上）
- 主控：本报告；`evidence/product/lead-review/zip-revalidation.json`、`evidence/product/lead-review/README.md`
- 功能/矩阵：`evidence/product/ip-009/e2e.log`、`unit.log`、`typecheck.log`、`build.log`、`legacy-e2e.log`、`interaction-audit.json`、`click-path.md`、`01–36-*.png`
- 证据事故：`evidence/product/ip-009/evidence-incident/`（`evidence-loss.md`、`restore-manifest`、`rerun-immutability-check.json`、`overwritten/`）
- ZIP：`evidence/product/ip-007/library-export-audit.json`、`ip-008/zip-audit.json`（历史字节）+ `lead-review/zip-revalidation.json`（当前字节内容复核）
- 契约/冻结：`contracts/poc/scenario.schema.json` 与接收副本 SHA 一致；三包 catalog packageHash 与 manifest 字节一致；Tokens/product-contract 未被本批修改
