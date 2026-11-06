> 本期仅前端Demo，以 docs/FRONTEND_DEMO_SCOPE.md 为准。后端与API类型生成不属于本任务。

# TASK-006 — 封装主题Tokens与双语字体

### Task ID
TASK-006

### Title
封装主题Tokens与双语字体

### Goal
建立所有页面唯一视觉入口，验证字体与原参考的一致性。

### Dependencies
TASK-001

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

- apps/web/styles/**
- apps/web/public/fonts/**
- apps/web/public/licenses/**
- apps/web/app/layout.tsx
- apps/web/app/design-lab/page.tsx
- apps/web/tests/theme.spec.ts

### Implementation Requirements
导入design/tokens.css，不复制色值。打包Inter与Noto Sans Arabic字体和许可、断网可用；建立design-lab排版/色板/间距预览。实现body16/meta14/title29与RTL样本、Reduced Motion。记录本地Inter与参考Segoe渲染差异。

### Visual Specification
DESIGN_SYSTEM全部字体/色值/空间规则；不新增衬线、蓝紫渐变或大面积金底。

### Data & API Contract
只读设计Tokens，无业务API。

### Constraints
只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。

### Acceptance Criteria
实际浏览器font加载成功；EN/AR排版正确；字体/样式断网可用；1440/390截图；主控复查Token无漂移。

### Test Commands
以下为实施时必须实际运行的命令；当前未执行。TASK-001创建通用脚本，各任务需提供自己命名的测试文件/脚本。

```powershell
npm run typecheck
npm run build
npm run test:e2e -- theme.spec.ts
```

### Expected Deliverables
全局主题、字体许可证与design-lab截图。

### Failure Conditions
依赖未验收；越界修改；来源/品牌错误；测试未跑却报通过；截图缺失却报视觉通过；存在无效按钮、字体缩水或视觉漂移；未满足Acceptance Criteria。

### Definition of Done
交付物齐备、命令实际通过、已知问题列明；状态为review，经主控代码/功能/实际浏览器视觉审查accepted后完成。

### DeepSeek Execution Prompt
你是DeepSeek 4.1 Flash 1017编码执行者。执行TASK-006：封装主题Tokens与双语字体。目标：建立所有页面唯一视觉入口，验证字体与原参考的一致性。 前置依赖必须由主控accepted：TASK-001。先阅读：PROJECT_CONSTRAINTS.md、docs/PRD.md、docs/DESIGN_REFERENCE_ANALYSIS.md、docs/DESIGN_SYSTEM.md、design/tokens.css、docs/VISUAL_ACCEPTANCE.md、docs/SCENARIO_SPEC.md。仅允许新增/修改：apps/web/styles/**、apps/web/public/fonts/**、apps/web/public/licenses/**、apps/web/app/layout.tsx、apps/web/app/design-lab/page.tsx、apps/web/tests/theme.spec.ts。功能：导入design/tokens.css，不复制色值。打包Inter与Noto Sans Arabic字体和许可、断网可用；建立design-lab排版/色板/间距预览。实现body16/meta14/title29与RTL样本、Reduced Motion。记录本地Inter与参考Segoe渲染差异。 视觉：DESIGN_SYSTEM全部字体/色值/空间规则；不新增衬线、蓝紫渐变或大面积金底。 数据/API：只读设计Tokens，无业务API。 约束：只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。 验收：实际浏览器font加载成功；EN/AR排版正确；字体/样式断网可用；1440/390截图；主控复查Token无漂移。 需运行：npm run typecheck；npm run build；npm run test:e2e -- theme.spec.ts。命令由本任务或前置任务创建，未能执行明确标NOT_RUN，不能编造通过。交付：全局主题、字体许可证与design-lab截图。 报告变更文件、实际命令与exit code、截图路径、已知问题，提交review等待主控验收。契约冲突先报告并请求主控修订任务，不自行扩大范围。
