> SCOPE SUPERSEDED · 2026-11-04：此任务已deferred，不再执行。当前范围 [POC_SCOPE](../docs/POC_SCOPE.md)，执行新 [POC任务](INDEX.md)；尤其禁止照旧要求自行生产业务场景数据。历史内容保留供追踪。

> 本期仅前端Demo，以 docs/FRONTEND_DEMO_SCOPE.md 为准。后端与API类型生成不属于本任务。

# TASK-013 — 打通三页本地原型与刷新恢复

### Task ID
TASK-013

### Title
打通三页本地原型与刷新恢复

### Goal
验证同一个机会交接到同一个Campaign，避免三个独立静态页面。

### Dependencies
TASK-012

### Context
- docs/FRONTEND_DEMO_SCOPE.md
- PROJECT_CONSTRAINTS.md
- docs/PRD.md
- docs/DESIGN_REFERENCE_ANALYSIS.md
- docs/DESIGN_SYSTEM.md
- design/tokens.css
- docs/VISUAL_ACCEPTANCE.md
- docs/UX_SPEC.md
- docs/SCENARIO_SPEC.md

### Files
仅允许以下文件；白名单外修改须主控更新任务。

- apps/web/mocks/**
- apps/web/features/prototype-session/**
- apps/web/tests/prototype-flow.spec.ts

### Implementation Requirements
Home载入→Radar机会→显式Create Campaign→Atelier Brief预填→编辑新版本→刷新恢复。M1本地storage有独立prototype namespace/schemaVersion，幂等与reset仅作用当前原型会话。来源持续Prototype DEMO；不能将本地逻辑称为M2实现。

### Visual Specification
三页操作位置/状态标签/抽屉一致；不得借集成任务改全局样式。

### Data & API Contract
mock接口使用apps/web/demo/types.ts统一类型；后续服务替换无需重写页面对象结构。

### Constraints
只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。

### Acceptance Criteria
连续两轮无重复Campaign；刷新保留草稿/会话；reset不影响其他原型session；交接商品/证据ID一致。

### Test Commands
以下为实施时必须实际运行的命令；当前未执行。TASK-001创建通用脚本，各任务需提供自己命名的测试文件/脚本。

```powershell
npm run typecheck
npm run test:e2e -- prototype-flow.spec.ts
```

### Expected Deliverables
可连续操作的三页原型与流程录像/截图、集成结果。

### Failure Conditions
依赖未验收；越界修改；来源/品牌错误；测试未跑却报通过；截图缺失却报视觉通过；存在无效按钮、字体缩水或视觉漂移；未满足Acceptance Criteria。

### Definition of Done
交付物齐备、命令实际通过、已知问题列明；状态为review，经主控代码/功能/实际浏览器视觉审查accepted后完成。

### DeepSeek Execution Prompt
你是DeepSeek 4.1 Flash 1017编码执行者。执行TASK-013：打通三页本地原型与刷新恢复。目标：验证同一个机会交接到同一个Campaign，避免三个独立静态页面。 前置依赖必须由主控accepted：TASK-012。先阅读：PROJECT_CONSTRAINTS.md、docs/PRD.md、docs/DESIGN_REFERENCE_ANALYSIS.md、docs/DESIGN_SYSTEM.md、design/tokens.css、docs/VISUAL_ACCEPTANCE.md、docs/UX_SPEC.md、docs/SCENARIO_SPEC.md。仅允许新增/修改：apps/web/mocks/**、apps/web/features/prototype-session/**、apps/web/tests/prototype-flow.spec.ts。功能：Home载入→Radar机会→显式Create Campaign→Atelier Brief预填→编辑新版本→刷新恢复。M1本地storage有独立prototype namespace/schemaVersion，幂等与reset仅作用当前原型会话。来源持续Prototype DEMO；不能将本地逻辑称为M2实现。 视觉：三页操作位置/状态标签/抽屉一致；不得借集成任务改全局样式。 数据/API：mock接口使用apps/web/demo/types.ts统一类型；后续服务替换无需重写页面对象结构。 约束：只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。 验收：连续两轮无重复Campaign；刷新保留草稿/会话；reset不影响其他原型session；交接商品/证据ID一致。 需运行：npm run typecheck；npm run test:e2e -- prototype-flow.spec.ts。命令由本任务或前置任务创建，未能执行明确标NOT_RUN，不能编造通过。交付：可连续操作的三页原型与流程录像/截图、集成结果。 报告变更文件、实际命令与exit code、截图路径、已知问题，提交review等待主控验收。契约冲突先报告并请求主控修订任务，不自行扩大范围。
