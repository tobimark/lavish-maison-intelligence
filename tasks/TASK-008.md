> SCOPE SUPERSEDED · 2026-11-04：此任务已deferred，不再执行。当前范围 [POC_SCOPE](../docs/POC_SCOPE.md)，执行新 [POC任务](INDEX.md)；尤其禁止照旧要求自行生产业务场景数据。历史内容保留供追踪。

> 本期仅前端Demo，以 docs/FRONTEND_DEMO_SCOPE.md 为准。后端与API类型生成不属于本任务。

# TASK-008 — 实现控件与页面状态组件

### Task ID
TASK-008

### Title
实现控件与页面状态组件

### Goal
统一按钮、表单、Tabs和反馈状态，避免各页重复造样式。

### Dependencies
TASK-006

### Context
- docs/FRONTEND_DEMO_SCOPE.md
- PROJECT_CONSTRAINTS.md
- docs/PRD.md
- docs/DESIGN_REFERENCE_ANALYSIS.md
- docs/DESIGN_SYSTEM.md
- design/tokens.css
- docs/VISUAL_ACCEPTANCE.md
- docs/SCENARIO_SPEC.md

### Files
仅允许以下文件；白名单外修改须主控更新任务。

- apps/web/components/ui/button.tsx
- apps/web/components/ui/form.tsx
- apps/web/components/ui/tabs.tsx
- apps/web/components/ui/status.tsx
- apps/web/components/ui/toast.tsx
- apps/web/components/ui/states.tsx
- apps/web/app/design-lab/page.tsx
- apps/web/tests/controls.spec.ts

### Implementation Requirements
提供Button/IconButton pending/disabled；输入label/help/error/dirty；Tabs键盘；SourceBadge与业务状态分离；Toast、Loading/Empty/Error组件。保留输入、可重试、防双击，不用placeholder代label。

### Visual Specification
DESIGN_SYSTEM组件表；控件40/主按钮44、r7、操作15、正文16。

### Data & API Contract
组件接受显式props与事件回调，不计算业务状态/评分。

### Constraints
只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。

### Acceptance Criteria
每状态在design-lab可查看；键盘、可访问名称、错误关联有效；pending按钮宽度稳定；对比度满足规范。

### Test Commands
以下为实施时必须实际运行的命令；当前未执行。TASK-001创建通用脚本，各任务需提供自己命名的测试文件/脚本。

```powershell
npm run typecheck
npm run test:e2e -- controls.spec.ts
```

### Expected Deliverables
控件库、状态截图与键盘测试。

### Failure Conditions
依赖未验收；越界修改；来源/品牌错误；测试未跑却报通过；截图缺失却报视觉通过；存在无效按钮、字体缩水或视觉漂移；未满足Acceptance Criteria。

### Definition of Done
交付物齐备、命令实际通过、已知问题列明；状态为review，经主控代码/功能/实际浏览器视觉审查accepted后完成。

### DeepSeek Execution Prompt
你是DeepSeek 4.1 Flash 1017编码执行者。执行TASK-008：实现控件与页面状态组件。目标：统一按钮、表单、Tabs和反馈状态，避免各页重复造样式。 前置依赖必须由主控accepted：TASK-006。先阅读：PROJECT_CONSTRAINTS.md、docs/PRD.md、docs/DESIGN_REFERENCE_ANALYSIS.md、docs/DESIGN_SYSTEM.md、design/tokens.css、docs/VISUAL_ACCEPTANCE.md、docs/SCENARIO_SPEC.md。仅允许新增/修改：apps/web/components/ui/button.tsx、apps/web/components/ui/form.tsx、apps/web/components/ui/tabs.tsx、apps/web/components/ui/status.tsx、apps/web/components/ui/toast.tsx、apps/web/components/ui/states.tsx、apps/web/app/design-lab/page.tsx、apps/web/tests/controls.spec.ts。功能：提供Button/IconButton pending/disabled；输入label/help/error/dirty；Tabs键盘；SourceBadge与业务状态分离；Toast、Loading/Empty/Error组件。保留输入、可重试、防双击，不用placeholder代label。 视觉：DESIGN_SYSTEM组件表；控件40/主按钮44、r7、操作15、正文16。 数据/API：组件接受显式props与事件回调，不计算业务状态/评分。 约束：只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。 验收：每状态在design-lab可查看；键盘、可访问名称、错误关联有效；pending按钮宽度稳定；对比度满足规范。 需运行：npm run typecheck；npm run test:e2e -- controls.spec.ts。命令由本任务或前置任务创建，未能执行明确标NOT_RUN，不能编造通过。交付：控件库、状态截图与键盘测试。 报告变更文件、实际命令与exit code、截图路径、已知问题，提交review等待主控验收。契约冲突先报告并请求主控修订任务，不自行扩大范围。
