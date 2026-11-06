# FAST_06 · AS-IP 最终主控验收

日期：2026-11-06。执行者：本会话 DSH（用户确认为唯一实现者；另一会话的 FLOW 批次已停写并保留为基线，未纳入本批验收）。范围：FAST_06 AS-001..006 + IP-FIX-02，SERENITY A 1.1.0 接入。

## 结论

**FAST_06 AS 批次：accepted（实现 + 内容绑定 + 证据），附明确范围说明与已知限制。**

- 通过理由：构建/类型/全量回归全绿；A 1.1.0 内容原字节发布并校验、catalog/version-index 正确、查询确认后 sidecar bound；Brief/Atelier/Library 使用 SERENITY 1.1.0；含 MP4 双语包真实且附件哈希正确；119 行矩阵 found 108 / guarded 1 / NOT_RUN 10（逐项原因），notFound 0、unexpected 0；旧 1.0.0 保留历史。
- 不包含：另一批次的 FLOW journey/connected-flow/social 功能（未验收、未改动，仅作为当前工作区基线）；AS-004 首页三卡修正已被 FLOW 批次替换（当前首页为 “From social trends to your next Lavish campaign” 的 Journey 概览，不在本批通过范围）；15 秒核心成片/poster 仍未制作；AR 仍待母语/品牌审稿；无真实后端/邮件/平台/LLM。

## 主控实际验收

### 内容/绑定

- `validate-content-only`（scenarios/scent-layering/1.1.0）：L1-L4 pass，contentRunnable=true，5 real / 2 pending。
- catalog A 1.1.0 `content_ready`，packageHash `709abf…f854d`；version-index `defaultVersion=1.1.0`，1.0.0 historical/explicitOnly。
- design/public sidecar 均 `bound`，SHA 一致；旧 1.0.0 原字节、旧 session/导出未重标。

### 页面（3150 当前构建，实际浏览器）

| 页面 | 验收结果 |
|---|---|
| Overview | 当前为 FLOW batch 的 Journey 概览（H1 “From social trends to your next Lavish campaign.”），非 AS-004 三卡首页——属于另一批次，记为范围外 |
| Campaign Brief | SERENITY — A Story in Layers；SKU 6290360533636/100014；无 PERLA/LAVISH OUD；identity+Hero 16:9 |
| Atelier | EN/AR v2、四镜头、identity；Provided 视频真实 720×960、10.08s、3:4 contain、controls、paused 初始；无 VTT |
| Library | “Provided SERENITY assets” 三类型（Hero image / Product original / Provided video），Preview/Open in Atelier 可用；旧 B/C 历史内容仍显示 |
| Deliverables | 实际文本 “bound to the 1.1.0 campaign”；A 包下载含 21 files、`noVideo=false` |

- 视频实测：play→pause→seek 7.56s→replay；无 console/page error；390 无横向溢出（DSH 证据）。

### 真实 ZIP/MP4（主控独立打开）

- A 1.1.0 双语包：10,736,354B、21 files；`provided/hero-serenity.png` SHA `1c4e337b…b37499`；`provided/product-serenity.png` SHA `f75fa10b…026af62`；`provided/final-preview.mp4` 1,315,394B SHA `15d3756a…31e10e`；`noVideo=false`、`noRealEmail=true`、includedVersions en-v2/ar-v2@1.1.0。
- B 旧 1.0.0 包：3,369,118B、无 mp4/provided、`noVideo=true`。
- 独立 Download video：1,315,394B，SHA 与 receipt 一致。

### 测试

| 命令 | exit | 结果 |
|---|---:|---|
| typecheck / build | 0 / 0 | buildId `otW8-a5y66W0hdP0409Ee` |
| 全量 product-*（13 spec，含 FLOW connected-flow） | 0 | 57 passed / 0 failed |
| legacy shell + poc-prototype（EVIDENCE_ROOT） | 0 | 18 passed / 0 failed |
| product-asset-downloads / product-asset-export unit | 0 | 3 passed / 2 passed |

### 矩阵

`evidence/product/ip-009/matrix-dom-audit.json`：47 states、246 observed data-control-id；119 行：found 108 / guarded 1（DEL-retry）/ NOT_RUN 10 / notFound 0 / unexpected 0。NOT_RUN：FLOW 替换的旧首页 CTA 2 项、静态分镜 AS-SHOT、原生视频控件 5 项、单 select 的 AS-LIB-TYPE、次级邮件 AS-HANDOFF-EXPAND。FLOW 控件 14 个单独 out-of-scope。

## 主控发现与披露

1. **AS-006 截图 `09-deliverables-1440.png` 过期**：图中文本仍为 “bound to the 1.0.0 campaign”，当前代码/页面实际为 “bound to the 1.1.0 campaign”。主控已保存实时截图 `evidence/product/assets/as-006/lead-recheck-deliverables-1440.png` 作为更正证据；原图保留不删，报告中不再以原图作为绑定文本依据。
2. **首页已被 FLOW 批次替换**：AS-004-HOME-CORRECTION 的三卡 identity→Hero→video 首页当前不存在；当前首页为 FLOW Journey 概览。该变更来自另一批次，不是本会话/本批实现；若需恢复三卡首页，应由用户明确优先级后另做，不在本次 accepted 范围。
3. **FLOW 代码保留未验收**：flow-contract/source/queries/commands、journey/social 页面、相关测试均另一批次产物；本会话未改动、未纳入 FAST_06 通过。`product-contract.ts` 被该批次修改（非本会话），属于冻结契约的额外变更，需由 FLOW 批次自行审查。
4. 10 条 NOT_RUN 均为如实记录；FLOW 替换导致的 OV-explore/OV-creative 失效说明矩阵需随 FLOW 下一步更新，不由本批掩盖。

## 建议下一步

- FLOW 批次（journey/social）单独验收；其首页替代若为最终方向，需重做 AS-004 首页验收基线并更新矩阵。
- 15 秒核心成片/poster 与 AR 母语审稿仍是后续内容项，不做伪造。

## 证据索引

- 报告：`docs/reviews/AS-003-DSH.md`、`AS-004-DSH.md`、`AS-005-DSH.md`、`AS-006-DSH.md`、`AS-IP-BATCH-DSH.md`（末尾 FINAL UPDATE）
- 截图：`evidence/product/assets/as-006/01..15-*.png`、`lead-recheck-deliverables-1440.png`；`evidence/product/assets/as-004/as004-*.png`
- 包/审计：`evidence/product/assets/as-005/**`、`evidence/product/ip-009/matrix-dom-audit.json`、`evidence/product/as-006/interaction-audit.json`
- 内容：`docs/reviews/SERENITY-A-1.1.0-CONTENT-INTAKE.md`、`docs/reviews/SERENITY-A-1.1.0-PUBLISH.md`
