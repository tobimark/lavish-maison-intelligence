# IP-004 · Radar 自由筛选、热点证据与 Agent 活动 · DSH 实施报告

日期：2026-11-05。状态：implemented，等待主控集中 review；不自行 accepted。

## 变更

- 新增 `components/product/radar/RadarPage.tsx` + `TrendChart.tsx`：
  - 冷启动读取 15 条真实模拟信号；All+实际四来源 chips、Topic、Campaign 组合筛选（AND）、Clear filters、`?source=&topic=&campaignId=&signalId=&activity=1` URL 恢复/分享。
  - 信号卡：平台/话题/区域/证据数/可读摘要/View evidence；Drawer 展示完整信号、全部真实 evidence（逐条，不固定取第一条）、Simulated evidence 披露、关联趋势图、View related opportunity（analysis.id 精确链接）。Close/Escape 保留筛选。
  - 趋势图共用 0–100 示意指数纵轴、时间窗与单位说明，不造增长率；右侧 Theme context 直接读 trend interpretation 并指向机会。
  - Agent Activity 二级抽屉：Preset Agent demo / Your actions 分区；打开只读不建会话；仅 Play/Pause/Step/Restart/Seek/1×2×4× 显式命令调用 openActivityReplay + replayCommand/advanceReplay；activity session 与工作稿/导出/交付隔离；回放结束不显示视频/发送成功。命令通过 promise 队列串行化，避免并发 revision 冲突。
- 只读浏览不 createSession；未知信号 ID 明确提示且不静默换 A；无匹配显示可清除空态。

## 验证（真实 exitcode）

| 命令 | exitcode | 证据 |
|---|---|---|
| `npm run typecheck` | 0 | evidence/product/ip-004/typecheck.log |
| `npm run build` | 0 | evidence/product/ip-004/build.log |
| `PLAYWRIGHT_PORT=3100 npm run test:e2e -- apps/web/tests/product-radar.spec.ts` | 0（4 tests） | evidence/product/ip-004/radar.log |

覆盖：15 信号逐条打开；四来源逐一筛选+URL 刷新恢复；topic+campaign AND（含无匹配空态）、Clear 恢复 15；5 个信号 drawer 全证据与精确 opportunity 链接；Escape/关闭保留筛选；打开 Activity 不建 session、Step 后仅新增 purpose=activity、工作 session revision/activeBriefId/workflow 不变；Your actions 显示真实编辑操作历史。

## 视觉证据

- `evidence/product/ip-006/radar-A-1440.png`、`radar-A-1366.png`（A 场景真实截图）
- `evidence/product/ip-003/smoke-radar.png`、`radiation-activity.png`

## 已知限制 / NOT_RUN

- 回放仅 discovery/analysis 前缀，无视频/发送事件（本批范围）。
- 完整 88 行矩阵逐项观察与截图归档在 IP-009。
