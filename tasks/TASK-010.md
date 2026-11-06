> SCOPE SUPERSEDED · 2026-11-04：此任务已deferred，不再执行。当前范围 [POC_SCOPE](../docs/POC_SCOPE.md)，执行新 [POC任务](INDEX.md)；尤其禁止照旧要求自行生产业务场景数据。历史内容保留供追踪。

> 本期仅前端Demo，以 docs/FRONTEND_DEMO_SCOPE.md 为准。后端与API类型生成不属于本任务。

# TASK-010 — 实现Home有限高保真场景入口

### Task ID
TASK-010

### Title
实现Home有限高保真场景入口

### Goal
以清楚的业务故事启动演示，避免无意义KPI首页。

### Dependencies
TASK-007, TASK-008

### Context
- docs/FRONTEND_DEMO_SCOPE.md
- PROJECT_CONSTRAINTS.md
- docs/PRD.md
- docs/DESIGN_REFERENCE_ANALYSIS.md
- docs/DESIGN_SYSTEM.md
- design/tokens.css
- docs/VISUAL_ACCEPTANCE.md
- docs/pages/HOME.md
- docs/SCENARIO_SPEC.md

### Files
仅允许以下文件；白名单外修改须主控更新任务。

- apps/web/app/page.tsx
- apps/web/features/home/**
- apps/web/tests/home.spec.ts

### Implementation Requirements
实现三场景选择/开始/继续、最近项目空态与载入错误；使用Prototype DEMO状态，不暗示后台就绪。主按钮创建本地场景会话并导航Radar；任务中若Radar尚未实现保留可测路由契约。

### Visual Specification
HOME逐区布局；场景A主导，B/C简短入口，标题29与body16。

### Data & API Contract
Scenario/ReplaySession形状用前端统一类型；本地mock明确隔离，后续替换adapter。

### Constraints
只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。

### Acceptance Criteria
默认/无会话/错误均可操作；重复开始不重复会话；1440/1366/390截图、键盘顺序正确。

### Test Commands
以下为实施时必须实际运行的命令；当前未执行。TASK-001创建通用脚本，各任务需提供自己命名的测试文件/脚本。

```powershell
npm run typecheck
npm run test:e2e -- home.spec.ts
```

### Expected Deliverables
Home原型及对应状态截图。

### Failure Conditions
依赖未验收；越界修改；来源/品牌错误；测试未跑却报通过；截图缺失却报视觉通过；存在无效按钮、字体缩水或视觉漂移；未满足Acceptance Criteria。

### Definition of Done
交付物齐备、命令实际通过、已知问题列明；状态为review，经主控代码/功能/实际浏览器视觉审查accepted后完成。

### DeepSeek Execution Prompt
你是DeepSeek 4.1 Flash 1017编码执行者。执行TASK-010：实现Home有限高保真场景入口。目标：以清楚的业务故事启动演示，避免无意义KPI首页。 前置依赖必须由主控accepted：TASK-007, TASK-008。先阅读：PROJECT_CONSTRAINTS.md、docs/PRD.md、docs/DESIGN_REFERENCE_ANALYSIS.md、docs/DESIGN_SYSTEM.md、design/tokens.css、docs/VISUAL_ACCEPTANCE.md、docs/pages/HOME.md、docs/SCENARIO_SPEC.md。仅允许新增/修改：apps/web/app/page.tsx、apps/web/features/home/**、apps/web/tests/home.spec.ts。功能：实现三场景选择/开始/继续、最近项目空态与载入错误；使用Prototype DEMO状态，不暗示后台就绪。主按钮创建本地场景会话并导航Radar；任务中若Radar尚未实现保留可测路由契约。 视觉：HOME逐区布局；场景A主导，B/C简短入口，标题29与body16。 数据/API：Scenario/ReplaySession形状用前端统一类型；本地mock明确隔离，后续替换adapter。 约束：只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。 验收：默认/无会话/错误均可操作；重复开始不重复会话；1440/1366/390截图、键盘顺序正确。 需运行：npm run typecheck；npm run test:e2e -- home.spec.ts。命令由本任务或前置任务创建，未能执行明确标NOT_RUN，不能编造通过。交付：Home原型及对应状态截图。 报告变更文件、实际命令与exit code、截图路径、已知问题，提交review等待主控验收。契约冲突先报告并请求主控修订任务，不自行扩大范围。
