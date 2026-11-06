> SCOPE SUPERSEDED · 2026-11-04：此任务已deferred，不再执行。当前范围 [POC_SCOPE](../docs/POC_SCOPE.md)，执行新 [POC任务](INDEX.md)；尤其禁止照旧要求自行生产业务场景数据。历史内容保留供追踪。

> 本期仅前端Demo，以 docs/FRONTEND_DEMO_SCOPE.md 为准。后端与API类型生成不属于本任务。

# TASK-014 — 执行核心原型视觉门禁与修复闭环

### Task ID
TASK-014

### Title
执行核心原型视觉门禁与修复闭环

### Goal
在业务开发前确认真实浏览器中的视觉与交互质量。

### Dependencies
TASK-004, TASK-013

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

- evidence/m1/**
- docs/reviews/M1.md
- tasks/fixes/**

### Implementation Requirements
按VISUAL_ACCEPTANCE获取四尺寸与状态截图，逐个按钮/表单/浮层实测；对照原HTML与Radar已通过截图，报告字体/留白/颜色/动效/图片比例。问题变为限定文件FIX任务由DeepSeek修复，主控复拍查看；PO体验确认。此任务不能自行更新gate accepted。

### Visual Specification
DESIGN_SYSTEM、所有页面规格、VISUAL_ACCEPTANCE全部要求。

### Data & API Contract
不修改公共API/数据模型；取证必须记录seed、状态、文件hash、浏览器字体。

### Constraints
只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。

### Acceptance Criteria
阻断与P2清零；品牌资产完整性可核验；主控代码/截图审查和PO体验通过，才由主控更新tasks/gates.json并安排后续前端演示功能。

### Test Commands
以下为实施时必须实际运行的命令；当前未执行。TASK-001创建通用脚本，各任务需提供自己命名的测试文件/脚本。

```powershell
npm run build
npm run test:e2e
node scripts/validate-baseline.mjs
```

### Expected Deliverables
M1审查报告、完整截图、交互测试、FIX关闭记录和主控门禁决定。

### Failure Conditions
依赖未验收；越界修改；来源/品牌错误；测试未跑却报通过；截图缺失却报视觉通过；存在无效按钮、字体缩水或视觉漂移；未满足Acceptance Criteria。

### Definition of Done
交付物齐备、命令实际通过、已知问题列明；状态为review，经主控代码/功能/实际浏览器视觉审查accepted后完成。还需PO体验确认与主控门禁记录。

### DeepSeek Execution Prompt
你是DeepSeek 4.1 Flash 1017编码执行者。执行TASK-014：执行核心原型视觉门禁与修复闭环。目标：在业务开发前确认真实浏览器中的视觉与交互质量。 前置依赖必须由主控accepted：TASK-004, TASK-013。先阅读：PROJECT_CONSTRAINTS.md、docs/PRD.md、docs/DESIGN_REFERENCE_ANALYSIS.md、docs/DESIGN_SYSTEM.md、design/tokens.css、docs/VISUAL_ACCEPTANCE.md、docs/SCENARIO_SPEC.md。仅允许新增/修改：evidence/m1/**、docs/reviews/M1.md、tasks/fixes/**。功能：按VISUAL_ACCEPTANCE获取四尺寸与状态截图，逐个按钮/表单/浮层实测；对照原HTML与Radar已通过截图，报告字体/留白/颜色/动效/图片比例。问题变为限定文件FIX任务由DeepSeek修复，主控复拍查看；PO体验确认。此任务不能自行更新gate accepted。 视觉：DESIGN_SYSTEM、所有页面规格、VISUAL_ACCEPTANCE全部要求。 数据/API：不修改公共API/数据模型；取证必须记录seed、状态、文件hash、浏览器字体。 约束：只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。 验收：阻断与P2清零；品牌资产完整性可核验；主控代码/截图审查和PO体验通过，才由主控更新tasks/gates.json并安排后续前端演示功能。 需运行：npm run build；npm run test:e2e；node scripts/validate-baseline.mjs。命令由本任务或前置任务创建，未能执行明确标NOT_RUN，不能编造通过。交付：M1审查报告、完整截图、交互测试、FIX关闭记录和主控门禁决定。 报告变更文件、实际命令与exit code、截图路径、已知问题，提交review等待主控验收。契约冲突先报告并请求主控修订任务，不自行扩大范围。
