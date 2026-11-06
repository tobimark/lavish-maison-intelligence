# WS 六工作区整合 · 主控验收

日期：2026-11-06。执行者：唯一 DSH。范围：tasks/DSH_HANDOFF_SIX_WORKSPACES.md（WS-001..004）。

## 结论

**WS-001..004 功能与视觉验收通过（accepted），附一项已披露的证据隔离事故；不追认“旧证据未被覆盖”。**

六菜单原名原顺序保留，Journey 业务内容已并入对应工作区，Deliverables 默认成为社媒审阅/模拟发布工作台；主链、旧 URL 兼容、左栏高亮、B/C 诚实缺项、ZIP/MP4/帖子记录均实际验证。

## 主控实际验收

### 实际浏览器 spot check（3170 当前构建）

- 六菜单：Overview / Intelligence Radar / Opportunities / Creative Atelier / Creative Library / Deliverables，无 Journey/Social 一级菜单。
- 旧 `/campaigns/.../journey?scenarioVersion=1.1.0&stage=social` → `replace` 到 `/deliverables?campaignId=...&scenarioVersion=1.1.0`；左栏 active = Deliverables。
- `/campaigns/.../brief` 左栏 active = Opportunities。
- Deliverables H1 仍为 Deliverables，首屏说明 “Review your video and copy, then simulate a social post.”，主画面是 Instagram 视频+文案，不是 Hero 画廊/文件清单/邮件。

### 页面截图（实际打开）

- `ws-002/{home,radar,opportunities,atelier}-{1440,1366}.png`：Overview 主 CTA→Radar 当前案例 Insight；Radar 摘要/观察/证据/趋势；Opportunities Strategy+identity；Atelier 原图→Hero→真实 10.08s 视频（3:4 contain/controls）+ EN/AR 四镜头。
- `ws-003/{deliverables-1440,deliverables-1366,deliverables-ar-1440,social-published-ar-1440,social-stage-ar-390}.png`：Deliverables 默认社媒工作台；AR RTL；下载折叠为辅助。
- `final/accept-01..21-*.png`：22 步主链（含 Brief、视频播放、保存、Review 确认框、发布、详情、下载、Library、1366、AR）。
- 无横向溢出/死入口；技术 hash/revision 已收进详情。

### 功能与数据

- 旧 Journey 四 stage 全部正确映射并保留 campaign/version/language；无效上下文诚实报错；浏览不写 session/draft/export。
- Deliverables 复用 SocialStage：EN/AR 独立保存刷新、显式 Review creative、准确快照、Simulate publish、1 条 attempt、发布后改稿旧帖不变、刷新一致、NavigationGuard 保留。
- 真实 ZIP：`ws-a-1.1.0-en-ar-pack.zip` 10,736,352B；解压 21 files；`noVideo=false`；en-v2/ar-v2@1.1.0；Hero/identity/MP4 SHA 与 receipt 一致。
- 独立 MP4：1,315,394B SHA `15d3756a…31e10e`；模拟帖子 `simulated-post-snapshot.json` 1 条 `published_simulated`。
- 测试：typecheck/build 0（buildId `Qn1edGDBs90rcVr7YkDrq`）；flow/social/asset-export 单测 **20 passed**；6 个 E2E **29 passed**；迁移回归 23 passed + deliverables 4 passed。

## 证据隔离事故（已披露，不掩盖）

本轮测试仍有多处硬编码旧证据路径，实际覆盖了已 accepted 记录：

1. FLOW `final-2026-11-06/` 5 张截图（social-post-detail-ar/en、social-published-ar、social-stage-ar-1366/390），15:10–15:11 被 WS-003 E2E 覆盖；`main-review-2026-11-06/` 有近似副本，但非原字节。
2. FLOW `flow-002/provided-assets/` 9 个文件，15:24 被 WS-002 回归覆盖；无同名原字节副本，不可恢复。
3. AS-005 6 个文件，15:39–15:42 被 product-asset-downloads 重写；A/B 包字节数、MP4 SHA、包内 provided SHA 与 accepted 记录一致；audit `checkedAt` 变化，原 audit 字节不可恢复。
4. AS-006/ip-009 3 个导出 ZIP，15:40 被 cross-page 重写；accepted 引用的 `matrix-dom-audit.json` 未触碰，但这 3 个 zip 原字节不可恢复。
5. AS-004、`assets/as-006` 未触碰。

DSH 已在 `WS-BATCH-DSH.md` 逐项列出当前字节/时间/副本情况，未伪造恢复；并将 social-publish/asset-downloads/deliverables/provided-assets/cross-page/as-audit/matrix-dom 改为 `EVIDENCE_ROOT` 可配置，默认写 `workspace-integration/**`，已验证后续运行不再改 AS-005/ip-009 mtime。

**主控裁决：功能/视觉 accepted；证据完整性列为已披露事故，旧 AS/FLOW “证据只读”要求本轮未满足。** 无 git，无法恢复原字节；后续所有 spec 必须使用本轮 EVIDENCE_ROOT 约定，禁止再写 accepted 证据目录。

## 矩阵

`docs/INTERACTION_AUDIT_MATRIX.csv` 155 行：6 个已移除旧入口标 `DEPRECATED → replacement`（OV-explore/OV-creative/FLOW-stage-insight/strategy/creative/social），旧行保留；未伪标 pass。

## NOT_RUN / 限制

- 社媒发布失败/Retry 真实 UI 分支无公开失败开关，E2E NOT_RUN；由 social-workflow 单测覆盖，未加假按钮。
- 15 秒概念片/poster 未制作；AR 待母语/品牌审稿。
- 无真实 Instagram/平台/后端/邮件；无生产级并发/跨浏览器矩阵。
- 旧证据事故见上；不能声称原证据完好。

## 证据/报告

- `docs/reviews/WS-001-DSH.md`、`WS-002-DSH.md`、`WS-003-DSH.md`、`WS-004-DSH.md`、`WS-BATCH-DSH.md`（含 22 步验收、命令 exit、证据隔离披露）
- `evidence/product/workspace-integration/{ws-001,ws-002,ws-003,ws-004,final}/**`
- 真实产物：`final/ws-a-1.1.0-en-ar-pack.zip`、`final/ws-provided-final-preview.mp4`、`final/simulated-post-snapshot.json`
