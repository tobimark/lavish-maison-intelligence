> 2026-11-05最高优先级更新：当前以 docs/INTERACTIVE_MOCK_PRODUCT.md、docs/INTERACTIVE_PRODUCT_API.md、docs/pages/INTERACTIVE_WORKSPACES.md 和 tasks/DSH_HANDOFF_DEMO_FAST_05.md 为准。六工作区可自由探索，Scenario只作数据容器；只读浏览无阶段前置。旧固定四步/唯一Home可用/导出依赖模拟邮件的要求不再用于开发。冻结场景Schema/业务JSON/Tokens不改，视频仍deferred。

> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

# 信息架构

| 路由 | 业务主对象 | 主要行动 | 阶段 |
|---|---|---|---|
| / | DemoScenario、最近 Campaign | 载入场景、继续演示 | M1 原型 / M6 完整 |
| /radar | Signal、Trend、ReplaySession | 查看机会、控制回放 | M1 原型 / M2/M3 完整 |
| /radar/opportunities/:id | MarketingOpportunity、Evidence | Create Campaign | M3；M1只抽屉预览 |
| /atelier/:projectId | CreativeProject、CampaignBrief | 编辑Brief、生成/预览素材 | M1 原型 / M4 完整 |
| /campaigns | Campaign | 打开项目 | M4 |
| /assets | CreativeAsset、AssetVersion | 预览/下载/版本 | M4 |
| /atelier/:projectId/video | Storyboard、RenderJob | 渲染MP4 | M5 |
| /approvals | Approval | 审批精确版本 | M5 |
| /calendar | ScheduledPost | 周/月、排期编辑 | M5 |
| /campaigns/:id/feedback | MetricSnapshot | 分析模拟表现 | M5 |
| /runs/:id | AgentRun、AgentEvent | 查看输入/输出/失败 | M2 |

M1只开放Home/Radar/Atelier三条路径与共享抽屉。未实现页面不放可点击空壳导航。所有路由状态以对象ID恢复；面包屑不依赖上一次页面内存。
