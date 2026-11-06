# WS-004-DSH · 六工作区集中验收

日期：2026-11-06 · 状态：完成并提交集中 review（不自行 accepted）

## 环境

- 新生产构建 `Qn1edGDBs90rcVr7YkDrq`，端口 **3170**；全新 Chromium context 开始，不复用旧页面。
- 证据根：`evidence/product/workspace-integration/final/**`，未覆盖 AS/FLOW 旧证据。
- 六菜单始终原名原顺序；无独立 Journey/四阶段子菜单。

## 主验收路径（实际执行 22 步）

1. Overview：一句系统说明/当前 SERENITY 案例/四段摘要 → 主 CTA 进入带 A 上下文的 Radar。
2. Radar：Insight 摘要/关键观察/趋势/证据；实际打开 evidence 抽屉、切换 Instagram 来源筛选后恢复。
3. Opportunities：StrategyStage（为何 SERENITY/受众/目标/创意/identity）+ 三机会列表；打开完整 Brief。
4. Atelier：CreativeStage 原图→hero→真实 10.08s provided 视频；实际 play(0.22s)/seek(7.56s)/pause；EN/AR 脚本切换。
5. Deliverables：默认社媒工作台；Edit→保存自定义 caption→Review creative 显式确认→Review 准确快照→Simulate publish→View simulated post→刷新 caption 不变。
6. 下载折叠展开：真实双语 ZIP + 原 MP4。
7. Library：同 Campaign/版本素材；视频卡提供 Open in Deliverables。
8. 左栏回 Radar，上下文不丢；B/C 直接进入 Atelier 显示诚实缺项且无 SERENITY 视频/identity。

## 结果

- 帖子：`simulated-post-snapshot.json`，1 条 `published_simulated`，EN，revision 3，video_post，Demo account，视频 SHA `15d3756a…31e10e`；刷新前后 caption 一致。
- 视频：720×960 / 10.08s / native controls / contain；实际为 10.08s 提供片。
- ZIP：`ws-a-1.1.0-en-ar-pack.zip` 10,736,352B；标准 Expand-Archive 21 files；noVideo=false；en-v2+ar-v2@1.1.0；provided hero/identity/MP4 bytes/SHA 与 receipt 一致。
- MP4：1,315,394B，SHA `15d3756a0e93f591fc767998d84911ed425e3394554272f62120d61f0e31e10e`。
- 截图：`accept-01…21`（首页→Radar→证据→筛选→策略→Brief→创意/AR→社媒保存/Review/发布→详情→下载→Library→1366→AR）；`ws-002` 四页 1440/1366；`ws-003` 社媒/AR/详情。
- 无横向溢出（1440/1366/390 关键页）；无 page/console error。

## 命令

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过 |
| `npm run build` | 0 | 通过，buildId `Qn1edGDBs90rcVr7YkDrq` |
| `npm run test:unit -- tests/poc/flow-projection.test.ts tests/poc/social-workflow.test.ts tests/poc/product-asset-export.test.ts` | 0 | **20 passed** |
| `npm run test:e2e -- product-workspace-integration product-navigation product-social-publish product-cross-page product-asset-downloads product-connected-flow` | 0 | **29 passed / 0 failed** |

日志：`ws-004-unit.log`、`ws-004-e2e-final.log`、`acceptance-run.log`、`acceptance-observations.json`、`ws-a-1.1.0-pack-audit.json`。

## 兼容与迁移

- 旧 Journey 四 stage → 对应工作区（replace）；旧帖子/导出/草稿 ID 不变；socialWorkflows/productExports 未清库/未换主键。
- 旧测试迁移时保留版本/语言/准确快照/无浏览写入等核心断言；`product-connected-flow` 改为兼容跳转测试，未删除上下文/无写入验证。
- 矩阵 155 行：6 个已移除旧入口标 `DEPRECATED → replacement`，不伪标 pass；新 FLOW/social 行保留。

## NOT_RUN / 限制

- 社媒失败/Retry 真实 UI 分支未开放失败开关，E2E NOT_RUN；由 `social-workflow.test.ts` 覆盖。
- 15 秒概念片/poster 未制作；AR 仍待母语/品牌审稿；无真实 Instagram/平台/后端/邮件；无生产级并发/跨浏览器矩阵。
- 主控需实际看图、试主路径后决定整批 accepted。
