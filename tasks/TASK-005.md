> SCOPE SUPERSEDED · 2026-11-04：此任务已deferred，不再执行。当前范围 [POC_SCOPE](../docs/POC_SCOPE.md)，执行新 [POC任务](INDEX.md)；尤其禁止照旧要求自行生产业务场景数据。历史内容保留供追踪。

# TASK-005 — 建立前端统一演示类型与本地场景数据

### Task ID
TASK-005

### Title
建立前端统一演示类型与本地场景数据

### Goal
建立前端统一演示类型与本地场景数据，支持高保真前端演示。

### Dependencies
TASK-001

### Context
- PROJECT_CONSTRAINTS.md
- docs/FRONTEND_DEMO_SCOPE.md
- docs/DESIGN_SYSTEM.md
- docs/BRAND_ASSETS.md
- docs/pages/INTELLIGENCE_RADAR.md
- docs/pages/CREATIVE_ATELIER.md

### Files
- apps/web/demo/types.ts
- apps/web/demo/fixtures/**
- apps/web/demo/fixtures.test.ts

### Implementation Requirements
定义Scenario、Signal、Trend、Evidence、Opportunity、CampaignBrief、AssetVersion最小展示类型。创建A叠喷主链与B礼赠/C沉香缩短场景，固定ID、事件顺序与时间。市场信号/分数/反馈标DEMO；商品事实引用核验记录。提供EN/AR预置文案与空/错状态。只做浏览器可导入本地数据。

### Visual Specification
遵循HTML与DESIGN_SYSTEM；图片保持比例。此任务不开发业务页面。

### Data & API Contract
apps/web/demo/types.ts为唯一前端类型源，不依赖TASK-002/003或OpenAPI生成。

### Constraints
仅修改白名单，不建设后端，不修改全局视觉，不把预置数据冒充实时结果。

### Acceptance Criteria
对象引用全部能解析；同一夹具加载一致；数据能直接服务Radar/Atelier且不需要网络或后端。

### Test Commands
实现时运行，当前未执行。

```powershell
npm run typecheck
npm run test:unit -- apps/web/demo/fixtures.test.ts
```

### Expected Deliverables
指定文件、来源/缺项清单、实际验证结果。

### Failure Conditions
对象引用失效、假商品、来源标识错误、越界改动、未测却称通过。

### Definition of Done
交付完整，经主控审查通过；不自行写accepted。

### DeepSeek Execution Prompt
执行TASK-005：建立前端统一演示类型与本地场景数据。本期仅前端Demo。先读Context，依赖TASK-001，仅改Files。实现：定义Scenario、Signal、Trend、Evidence、Opportunity、CampaignBrief、AssetVersion最小展示类型。创建A叠喷主链与B礼赠/C沉香缩短场景，固定ID、事件顺序与时间。市场信号/分数/反馈标DEMO；商品事实引用核验记录。提供EN/AR预置文案与空/错状态。只做浏览器可导入本地数据。 契约：apps/web/demo/types.ts为唯一前端类型源，不依赖TASK-002/003或OpenAPI生成。 验收：对象引用全部能解析；同一夹具加载一致；数据能直接服务Radar/Atelier且不需要网络或后端。 实际运行：npm run typecheck；npm run test:unit -- apps/web/demo/fixtures.test.ts。交付变更文件、来源/缺项、命令与exit code，等待主控review；不扩展后端或更改视觉。
