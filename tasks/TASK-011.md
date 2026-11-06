> SCOPE SUPERSEDED · 2026-11-04：此任务已deferred，不再执行。当前范围 [POC_SCOPE](../docs/POC_SCOPE.md)，执行新 [POC任务](INDEX.md)；尤其禁止照旧要求自行生产业务场景数据。历史内容保留供追踪。

> 本期仅前端Demo，以 docs/FRONTEND_DEMO_SCOPE.md 为准。后端与API类型生成不属于本任务。

# TASK-011 — 实现Radar核心视觉原型并先行审查

### Task ID
TASK-011

### Title
实现Radar核心视觉原型并先行审查

### Goal
先建立Intelligence工作空间视觉标杆页，作为后续页面的附加基线。

### Dependencies
TASK-005, TASK-009, TASK-010

### Context
- docs/FRONTEND_DEMO_SCOPE.md
- PROJECT_CONSTRAINTS.md
- docs/PRD.md
- docs/DESIGN_REFERENCE_ANALYSIS.md
- docs/DESIGN_SYSTEM.md
- design/tokens.css
- docs/VISUAL_ACCEPTANCE.md
- docs/pages/INTELLIGENCE_RADAR.md
- docs/SCENARIO_SPEC.md

### Files
仅允许以下文件；白名单外修改须主控更新任务。

- apps/web/app/radar/page.tsx
- apps/web/features/radar/**
- apps/web/mocks/radar.ts
- apps/web/tests/radar-prototype.spec.ts

### Implementation Requirements
实现热点选择/趋势/机会摘要/证据Drawer/有限固定事件回放控制及状态；所有数据来自同一夹具。明确Prototype replay，不实现或宣称后台Runtime。Create Campaign只准备显式交接动作；独立详情页M3再做。

### Visual Specification
Radar页面规格全部布局与状态；1.55:1主次区、无KPI墙、折叠事件条、图表文字不得压缩。

### Data & API Contract
apps/web/demo/types.ts统一的Signal/Trend/Opportunity/Replay类型；分数来自fixture，不另算；来源DEMO。

### Constraints
只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。

### Acceptance Criteria
筛选、选中、证据、播放控制无死按钮；loading/empty/error可复现；4尺寸截图；主控实际查看并通过Radar视觉审查后TASK-012才能开始。

### Test Commands
以下为实施时必须实际运行的命令；当前未执行。TASK-001创建通用脚本，各任务需提供自己命名的测试文件/脚本。

```powershell
npm run typecheck
npm run build
npm run test:e2e -- radar-prototype.spec.ts
```

### Expected Deliverables
Radar原型、状态矩阵截图、主控审查问题记录；不是M1总门禁。

### Failure Conditions
依赖未验收；越界修改；来源/品牌错误；测试未跑却报通过；截图缺失却报视觉通过；存在无效按钮、字体缩水或视觉漂移；未满足Acceptance Criteria。

### Definition of Done
交付物齐备、命令实际通过、已知问题列明；状态为review，经主控代码/功能/实际浏览器视觉审查accepted后完成。

### DeepSeek Execution Prompt
你是DeepSeek 4.1 Flash 1017编码执行者。执行TASK-011：实现Radar核心视觉原型并先行审查。目标：先建立Intelligence工作空间视觉标杆页，作为后续页面的附加基线。 前置依赖必须由主控accepted：TASK-005, TASK-009, TASK-010。先阅读：PROJECT_CONSTRAINTS.md、docs/PRD.md、docs/DESIGN_REFERENCE_ANALYSIS.md、docs/DESIGN_SYSTEM.md、design/tokens.css、docs/VISUAL_ACCEPTANCE.md、docs/pages/INTELLIGENCE_RADAR.md、docs/SCENARIO_SPEC.md。仅允许新增/修改：apps/web/app/radar/page.tsx、apps/web/features/radar/**、apps/web/mocks/radar.ts、apps/web/tests/radar-prototype.spec.ts。功能：实现热点选择/趋势/机会摘要/证据Drawer/有限固定事件回放控制及状态；所有数据来自同一夹具。明确Prototype replay，不实现或宣称后台Runtime。Create Campaign只准备显式交接动作；独立详情页M3再做。 视觉：Radar页面规格全部布局与状态；1.55:1主次区、无KPI墙、折叠事件条、图表文字不得压缩。 数据/API：apps/web/demo/types.ts统一的Signal/Trend/Opportunity/Replay类型；分数来自fixture，不另算；来源DEMO。 约束：只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。 验收：筛选、选中、证据、播放控制无死按钮；loading/empty/error可复现；4尺寸截图；主控实际查看并通过Radar视觉审查后TASK-012才能开始。 需运行：npm run typecheck；npm run build；npm run test:e2e -- radar-prototype.spec.ts。命令由本任务或前置任务创建，未能执行明确标NOT_RUN，不能编造通过。交付：Radar原型、状态矩阵截图、主控审查问题记录；不是M1总门禁。 报告变更文件、实际命令与exit code、截图路径、已知问题，提交review等待主控验收。契约冲突先报告并请求主控修订任务，不自行扩大范围。
