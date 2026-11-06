# WS-002-DSH · Overview / Radar / Opportunities / Atelier 承接前三段业务

日期：2026-11-06 · 状态：完成并提交集中 review（不自行 accepted）

## 实现

- **Overview**：保留 connected-case 首页；主 CTA `Explore the campaign` 现在进入带 A 上下文的 Radar；四段摘要分别链接 Radar/Opportunities/Atelier/Deliverables；不再提供独立 Journey 入口。
- **Radar**：主体顶部加入 InsightStage（`mode="workspace"`）：takeaway/关键观察/趋势/证据 + “Review campaign idea” → Opportunities；保留原有来源筛选、信号/趋势/证据、Agent Activity 与其他案例探索，未在上下重复第二份摘要。
- **Opportunities**：保留三机会列表；默认 A 显示 StrategyStage（为何 SERENITY、受众/目标/创意/关键信息、identity），next → Atelier；完整 Brief 仍可打开；B/C 不借 A，展示已有列表与诚实策略缺项。
- **Atelier**：用 CreativeStage（workspace 模式）整合原图→主视觉→真实 provided 10.08s 视频 + 解释；移除重复的 ProvidedCampaignAssets 大块陈列；保留 EN/AR 脚本、四镜头、编辑器/保存/版本/确认；next → Deliverables，且视频不因编辑脚本改变。
- 视觉：工作区标题/业务含义优先，不出现 Stage x of 4；原图/hero/video 保持等宽等高媒体框、真实比例 contain；1440/1366 无横向溢出。

## 验证

- typecheck/build exit 0（最终 buildId `Qn1edGDBs90rcVr7YkDrq`）。
- `product-workspace-integration.spec.ts` WS-002 部分 **3 passed**（主链 Overview→Radar→Opportunities→Atelier→Deliverables、1440/1366 无溢出、B/C 不借 A）。
- 迁移回归：`product-radar`、`product-opportunities`、`product-atelier`、`product-brief`、`product-provided-assets` **23/23 passed**。
- 实拍三页 1440/1366：`evidence/product/workspace-integration/ws-002/{home,radar,opportunities,atelier}-{1440,1366}.png`。
- 视频实测：720×960 / 10.08s / controls / contain；EN/AR 四镜头可切；编辑保存/刷新由 atelier 回归覆盖。

## 限制

- 15 秒概念片仍为 not produced；10.08s 提供片独立，不冒充 15s。
- B/C 无 SERENITY 社媒/视频时显示诚实缺项，不显示可执行发布。
