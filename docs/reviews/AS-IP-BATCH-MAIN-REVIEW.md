# AS-IP-BATCH-MAIN-REVIEW · FAST_06 非内容部分主控审查

日期：2026-11-05。执行者：并行会话的 DSH（本会话 DSH 按用户裁决停写）；本会话 Lead 转为独立审查/验收。范围：tasks/DSH_HANDOFF_DEMO_FAST_06.md 的非内容部分（AS-001/002/004 部分/005 部分 + IP-FIX-02），SERENITY A 1.1.0 内容仍未提供。

## 结论

**Not accepted（部分实现通过主控独立复核，但批次不得 accepted）。**

- 非内容基础质量可用：构建/类型/单测/产品 E2E 全绿；真实资产发布、统一资产 API、Overview Hero、Brief 路由、Deliverables 双语包与独立 MP4 下载、FIX-02 矩阵 DOM 审计均实际跑通。
- 阻断点不是“功能坏了”，而是：(1) **AS-003/AS-006 依赖的 SERENITY 1.1.0 内容不存在**，A 案例、Library/Atelier 的资产版成果、含 MP4 的 campaign pack 与完整 119 行审计均无法完成；(2) **AS-004 尚有规格内未完成项**（Library 的 Provided 类型/预览、Brief/Atelier 的 campaign-bound identity/video 未接）；(3) **AS-004/005/006 任务报告缺失**（仅有 AS-001/002 与批次报告）。
- 未发现把旧 OUD/PERLA 冒充 SERENITY、伪造内容、假视频/假下载或放宽旧 guard 的行为。

## 主控独立验证（本会话执行）

| 检查 | 结果 | 证据 |
|---|---|---|
| `npm run typecheck` | exit 0 | 本会话复跑 |
| `npm run build` | exit 0；12 static + 3 dynamic（含 `/campaigns/[campaignId]/brief`） | 本会话复跑 |
| 单元：provided-assets / product-assets-api / product-asset-export / product-read / product-commands / product-export | **39 passed / 6 files** | 本会话复跑 |
| 产品 E2E：IP 7 spec + provided-assets + brief + matrix-dom + as-audit | **35 passed**（3.1m） | 本会话复跑 |
| 资产字节/hash | 3/3 与 receipt 一致（hero 2,513,070B；identity 538,290B；MP4 1,315,394B，SHA `15d3756a…`） | 独立哈希 |
| 静态发布 | public 副本 = source；sidecar 设计副本 = public 副本；HTTP 200/MIME 正确；MP4 Range 206 | 独立探测 |
| 视频真实播放 | 720×960、10.08s、3:4、`object-fit: contain`、原生 controls、非 autoplay；play/pause/seek 7.56s/replay 全部成功，无 media error | 独立 Chromium 探测 |
| 内容诚实性 | `contentStatus=awaiting_serenity_content`；无 `scenarios/scent-layering/1.1.0`；旧 1.0.0 JSON mtime 未变；未发现 SERENITY 文案替换 | 静态检查 |
| FIX-02 矩阵 DOM | 101 基础行：100 found / 1 guarded（DEL-retry）/ 0 missing / 0 unexpected；119 行矩阵，18 条 AS 行 | matrix-dom-audit + 主控复跑 |
| AS 增量审计 | 10 个可用 AS 控件 found；8 个 content/native-media 项 NOT_RUN（如实标注） | evidence/product/as-006/interaction-audit.json |
| 双语包 | 3,617,840B 真实 ZIP；EN+AR 各含 brief/script/VTT/storyboard/media/README；`noVideo:true`；无 MP4 | Expand-Archive + 主控复核 |
| 独立 MP4 下载 | 原字节 1,315,394B / SHA 与 receipt 一致；不建 session、不触发邮件 | 证据 + E2E |
| 旧证据 | `evidence/m1/shell`、`evidence/poc/prototype` 未被本次触碰（mtime 仍 18:26/恢复时点）；冻结 Schema/Tokens/场景 JSON 未变 | 主控检查 |
| 390 布局 | Overview 无横向溢出 | 截图 + 探测 |

## 阻断/未完成项

1. **AS-003（SERENITY 1.1.0）未实现**：无新包，sidecar 未 bound。不得把旧包换图/改写当完成。
2. **AS-006 无法完成**：依赖 AS-003；完整 119 行矩阵、A 全链资产版视觉、AR 资产面、含 MP4 包与最终点击验证均 NOT_RUN。
3. **AS-004 规格未齐（主控 20:50 实测确认）**：
   - Library 尚未暴露 ProvidedAsset（hero/identity/video）类型/预览：`SERENITY`/Provided DOM 元素均为 0，`AS-LIB-TYPE-*` NOT_RUN。
   - Brief 路由无 hero/identity/video（`video=0`、`provided-hero=0`、`SERENITY` 文本 0）；Atelier 亦无 campaign-bound `video`/`SERENITY` 元素（报告称“pending 绑定避免误导”，可理解，但 AS-004 验收明确要求 Atelier 默认结果含 identity+真实 video；应在 AS-003 绑定后补齐或由主控明确改范围）。
   - Deliverables 已具备 10 个 AS 控件（AS-PACK-VERSIONS/AS-PACK-VERSION-en/ar/AS-PACK-DOWNLOAD/AS-VIDEO-DOWNLOAD 等）；1366 下视频仍 720×960、3:4 contain。
   - 结果：AS-004 只能算“部分完成”。
4. **AS-005 只完成非内容部分**：当前双语包来自旧 1.0.0 脚本且 `noVideo:true`；A 的 hero/identity/MP4 入包、`noVideo:false`、includedVersions 指向 1.1.0 等要在 AS-003 后重验。
5. **任务报告缺失**：缺 `docs/reviews/AS-004-DSH.md`、`AS-005-DSH.md`、`AS-006-DSH.md`；批次报告不能替代任务 DoD 报告。
6. **证据路径偏差**：AS 审计写在 `evidence/product/as-006/`，任务要求 `evidence/product/assets/as-006/`；建议统一或说明。
7. **产品回归 spec 会重写固定 `evidence/product/ip-*` 生成物**（批次报告已披露）；本次复核也触发重写。后续正式审计应使用可配置 evidence root，避免归档证据漂移。
8. **视觉/理解风险（内容到齐后需复查）**：Overview/Brief/Deliverables 重复大块 hero/showcase，SERENITY 素材下紧邻旧 OUD/PERLA 机会与 Brief，虽有 “Campaign content pending” 标签，仍可能让用户混淆当前案例；Atelier 未展示资产反而与其它页不一致。内容绑定后必须统一走查。

## 建议下一步（唯一 owner）

0. 内容到达后按 [AS-003-INTAKE-CHECKLIST.md](AS-003-INTAKE-CHECKLIST.md) 接收/校验/绑定/重验，避免漏项。
1. 网页端 ChatGPT 交付 SERENITY A 1.1.0（十 JSON + media + events/expected），主控接收审核。
2. DSH 执行 AS-003：发布 1.1.0、版本索引、校验、A 默认切新、旧 1.0.0 仅历史、sidecar 由主控批准后 bound。
3. 完成 AS-004 剩余：Library Provided 类型/预览、Brief/Atelier campaign-bound identity/video（保持 3:4 contain、Provided 标签、无未对齐 VTT）。
4. 重跑 AS-005：含 Hero/identity/原 MP4 的 campaign pack，`noVideo:false`，字节/hash 核对；旧包原字节保留。
5. AS-006：补全 119 行矩阵 DOM/click/媒体/跨页/视觉审计，补 3 份任务报告，提交后由主控实际看图/试路径决定 accepted。

## 证据索引

- 提交：`docs/reviews/AS-IP-BATCH-DSH.md`、`AS-001-DSH.md`、`AS-002-DSH.md`
- 主控：本报告；本会话探测输出在 `tmp/lead-review/as-verify/`（临时，非证据）
- 资产/媒体：`evidence/product/assets/static.json`、`as-001/next-http-check.json`、`as-001/browser-media-probe.json`、`as-004/*`、`as-004/bilingual-campaign-pack.zip`、`as-004/provided-final-preview.mp4`
- 矩阵/审计：`evidence/product/ip-009/matrix-dom-audit.json`、`evidence/product/as-006/interaction-audit.json`、`docs/INTERACTION_AUDIT_MATRIX.csv`（119 行）
- 回归：`evidence/product/ip-009/e2e.log` 等（本会话复跑通过，未另行归档）
