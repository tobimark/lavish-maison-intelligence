> SCOPE SUPERSEDED · 2026-11-04：此任务已deferred，不再执行。当前范围 [POC_SCOPE](../docs/POC_SCOPE.md)，执行新 [POC任务](INDEX.md)；尤其禁止照旧要求自行生产业务场景数据。历史内容保留供追踪。

> 本期仅前端Demo，以 docs/FRONTEND_DEMO_SCOPE.md 为准。后端与API类型生成不属于本任务。

# TASK-012 — 实现Atelier核心画布与Brief原型

### Task ID
TASK-012

### Title
实现Atelier核心画布与Brief原型

### Goal
验证以素材与编辑为主体的第二工作空间，并保持Radar设计一致。

### Dependencies
TASK-011

### Context
- docs/FRONTEND_DEMO_SCOPE.md
- PROJECT_CONSTRAINTS.md
- docs/PRD.md
- docs/DESIGN_REFERENCE_ANALYSIS.md
- docs/DESIGN_SYSTEM.md
- design/tokens.css
- docs/VISUAL_ACCEPTANCE.md
- docs/pages/CREATIVE_ATELIER.md
- docs/SCENARIO_SPEC.md

### Files
仅允许以下文件；白名单外修改须主控更新任务。

- apps/web/app/atelier/[projectId]/page.tsx
- apps/web/features/atelier/**
- apps/web/mocks/atelier.ts
- apps/web/tests/atelier-prototype.spec.ts

### Implementation Requirements
实现Brief编辑/校验/保存状态、Concept选择、EN/AR文案、画布预览、版本切换与Copilot差异应用本地原型。未完成图像/视频真实生成不显示已完成下载。未提供商品图用明确pending；审批/排期仅展示未实现流程状态。

### Visual Specification
Atelier规格：媒体画布主导、320编辑区、底部版本条、Copilot复用编辑区而非大聊天面板；AR正确RTL。

### Data & API Contract
CampaignBrief/CreativeProject/AssetVersion用同一mock adapter；本地版本不可覆盖、修改只影响目标。

### Constraints
只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。

### Acceptance Criteria
EN/AR/dirty/error/版本/Copilot差异均可操作；1366画布不被挤占；390编辑Drawer完整；需与Radar截图并排人工审查。

### Test Commands
以下为实施时必须实际运行的命令；当前未执行。TASK-001创建通用脚本，各任务需提供自己命名的测试文件/脚本。

```powershell
npm run typecheck
npm run build
npm run test:e2e -- atelier-prototype.spec.ts
```

### Expected Deliverables
Atelier有限原型、状态截图与品牌pending清单。

### Failure Conditions
依赖未验收；越界修改；来源/品牌错误；测试未跑却报通过；截图缺失却报视觉通过；存在无效按钮、字体缩水或视觉漂移；未满足Acceptance Criteria。

### Definition of Done
交付物齐备、命令实际通过、已知问题列明；状态为review，经主控代码/功能/实际浏览器视觉审查accepted后完成。

### DeepSeek Execution Prompt
你是DeepSeek 4.1 Flash 1017编码执行者。执行TASK-012：实现Atelier核心画布与Brief原型。目标：验证以素材与编辑为主体的第二工作空间，并保持Radar设计一致。 前置依赖必须由主控accepted：TASK-011。先阅读：PROJECT_CONSTRAINTS.md、docs/PRD.md、docs/DESIGN_REFERENCE_ANALYSIS.md、docs/DESIGN_SYSTEM.md、design/tokens.css、docs/VISUAL_ACCEPTANCE.md、docs/pages/CREATIVE_ATELIER.md、docs/SCENARIO_SPEC.md。仅允许新增/修改：apps/web/app/atelier/[projectId]/page.tsx、apps/web/features/atelier/**、apps/web/mocks/atelier.ts、apps/web/tests/atelier-prototype.spec.ts。功能：实现Brief编辑/校验/保存状态、Concept选择、EN/AR文案、画布预览、版本切换与Copilot差异应用本地原型。未完成图像/视频真实生成不显示已完成下载。未提供商品图用明确pending；审批/排期仅展示未实现流程状态。 视觉：Atelier规格：媒体画布主导、320编辑区、底部版本条、Copilot复用编辑区而非大聊天面板；AR正确RTL。 数据/API：CampaignBrief/CreativeProject/AssetVersion用同一mock adapter；本地版本不可覆盖、修改只影响目标。 约束：只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。 验收：EN/AR/dirty/error/版本/Copilot差异均可操作；1366画布不被挤占；390编辑Drawer完整；需与Radar截图并排人工审查。 需运行：npm run typecheck；npm run build；npm run test:e2e -- atelier-prototype.spec.ts。命令由本任务或前置任务创建，未能执行明确标NOT_RUN，不能编造通过。交付：Atelier有限原型、状态截图与品牌pending清单。 报告变更文件、实际命令与exit code、截图路径、已知问题，提交review等待主控验收。契约冲突先报告并请求主控修订任务，不自行扩大范围。
