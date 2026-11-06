> SCOPE SUPERSEDED · 2026-11-04：此任务已deferred，不再执行。当前范围 [POC_SCOPE](../docs/POC_SCOPE.md)，执行新 [POC任务](INDEX.md)；尤其禁止照旧要求自行生产业务场景数据。历史内容保留供追踪。

> 本期仅前端Demo，以 docs/FRONTEND_DEMO_SCOPE.md 为准。后端与API类型生成不属于本任务。

# TASK-009 — 实现共享Dialog与Drawer交互原语

### Task ID
TASK-009

### Title
实现共享Dialog与Drawer交互原语

### Goal
所有证据、编辑与预览浮层遵守同一交互。

### Dependencies
TASK-008

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

- apps/web/components/ui/dialog.tsx
- apps/web/components/ui/drawer.tsx
- apps/web/app/design-lab/page.tsx
- apps/web/tests/overlays.spec.ts

### Implementation Requirements
用可访问原语提供浅表单Dialog560/媒体1080/Drawer480；焦点陷阱、Escape、关闭、回焦、background inert、滚动锁；dirty退出保存/丢弃/继续；单一编辑浮层策略。

### Visual Specification
DESIGN_SYSTEM overlay/radius/padding；移动全屏Drawer，关闭按钮44触控区。

### Data & API Contract
onOpenChange与beforeClose返回用户决定，禁止浮层自行写业务对象。

### Constraints
只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。

### Acceptance Criteria
Tab不能逃出，关闭回到触发按钮；移动无越界；页面不双重滚动；脏稿不丢失。

### Test Commands
以下为实施时必须实际运行的命令；当前未执行。TASK-001创建通用脚本，各任务需提供自己命名的测试文件/脚本。

```powershell
npm run typecheck
npm run test:e2e -- overlays.spec.ts
```

### Expected Deliverables
共享浮层、浅/暗/移动/焦点截图。

### Failure Conditions
依赖未验收；越界修改；来源/品牌错误；测试未跑却报通过；截图缺失却报视觉通过；存在无效按钮、字体缩水或视觉漂移；未满足Acceptance Criteria。

### Definition of Done
交付物齐备、命令实际通过、已知问题列明；状态为review，经主控代码/功能/实际浏览器视觉审查accepted后完成。

### DeepSeek Execution Prompt
你是DeepSeek 4.1 Flash 1017编码执行者。执行TASK-009：实现共享Dialog与Drawer交互原语。目标：所有证据、编辑与预览浮层遵守同一交互。 前置依赖必须由主控accepted：TASK-008。先阅读：PROJECT_CONSTRAINTS.md、docs/PRD.md、docs/DESIGN_REFERENCE_ANALYSIS.md、docs/DESIGN_SYSTEM.md、design/tokens.css、docs/VISUAL_ACCEPTANCE.md、docs/SCENARIO_SPEC.md。仅允许新增/修改：apps/web/components/ui/dialog.tsx、apps/web/components/ui/drawer.tsx、apps/web/app/design-lab/page.tsx、apps/web/tests/overlays.spec.ts。功能：用可访问原语提供浅表单Dialog560/媒体1080/Drawer480；焦点陷阱、Escape、关闭、回焦、background inert、滚动锁；dirty退出保存/丢弃/继续；单一编辑浮层策略。 视觉：DESIGN_SYSTEM overlay/radius/padding；移动全屏Drawer，关闭按钮44触控区。 数据/API：onOpenChange与beforeClose返回用户决定，禁止浮层自行写业务对象。 约束：只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。 验收：Tab不能逃出，关闭回到触发按钮；移动无越界；页面不双重滚动；脏稿不丢失。 需运行：npm run typecheck；npm run test:e2e -- overlays.spec.ts。命令由本任务或前置任务创建，未能执行明确标NOT_RUN，不能编造通过。交付：共享浮层、浅/暗/移动/焦点截图。 报告变更文件、实际命令与exit code、截图路径、已知问题，提交review等待主控验收。契约冲突先报告并请求主控修订任务，不自行扩大范围。
