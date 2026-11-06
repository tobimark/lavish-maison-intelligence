> ACCEPTED（前端基础范围）：build、typecheck与实际Web启动通过。见 docs/reviews/M0.md。

# TASK-001 — 建立最小工程与检查入口

### Task ID
TASK-001

### Title
建立最小工程与检查入口

### Goal
为后续任务提供可构建的Web/API空壳和明确测试命令。

### Dependencies
无；受PROJECT_CONSTRAINTS与公共基线约束

### Context
- PROJECT_CONSTRAINTS.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/DATA_MODEL.md
- docs/API_CONTRACT.md
- contracts/openapi.json
- docs/SCENARIO_SPEC.md

### Files
仅允许以下文件；白名单外修改须主控更新任务。

- package.json
- package-lock.json
- apps/web/package.json
- apps/web/tsconfig.json
- apps/web/next.config.*
- apps/web/app/layout.tsx
- apps/web/app/page.tsx
- backend/pyproject.toml
- backend/app/main.py
- .gitignore
- .env.example
- scripts/check-contract.mjs

### Implementation Requirements
建立Next.js/React/TypeScript与FastAPI最小启动；首页只显示Foundation ready，不开发业务页面。提供/api/v1/health。锁定相容依赖，记录Node/Python版本。npm scripts提供dev/build/typecheck/test:unit/test:e2e/check:contract；后端pytest入口可运行。未有测试不得伪造成功结果。忽略node_modules/.env/临时渲染，不忽略证据或设计文档。

### Visual Specification
无业务页面视觉实现；不触及全局设计。

### Data & API Contract
health仅返回status=ok，不添加业务模型或替代API。

### Constraints
只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。

### Acceptance Criteria
全新依赖安装后Web/API可启动；build/typecheck通过；缺配置错误清楚；依赖锁文件存在，无密钥。

### Test Commands
以下为实施时必须实际运行的命令；当前未执行。TASK-001创建通用脚本，各任务需提供自己命名的测试文件/脚本。

```powershell
npm ci
npm run typecheck
npm run build
node scripts/validate-baseline.mjs
```

### Expected Deliverables
锁文件、最小工程、启动与检查说明；不要求业务截图。

### Failure Conditions
依赖未验收；越界修改；来源/品牌错误；测试未跑却报通过；截图缺失却报视觉通过；未满足Acceptance Criteria。

### Definition of Done
交付物齐备、命令实际通过、已知问题列明；状态为review，经主控代码/功能审查accepted后完成。

### DeepSeek Execution Prompt
你是DeepSeek 4.1 Flash 1017编码执行者。执行TASK-001：建立最小工程与检查入口。目标：为后续任务提供可构建的Web/API空壳和明确测试命令。 前置依赖必须由主控accepted：无；受PROJECT_CONSTRAINTS与公共基线约束。先阅读：PROJECT_CONSTRAINTS.md、docs/PRD.md、docs/ARCHITECTURE.md、docs/DATA_MODEL.md、docs/API_CONTRACT.md、contracts/openapi.json、docs/SCENARIO_SPEC.md。仅允许新增/修改：package.json、package-lock.json、apps/web/package.json、apps/web/tsconfig.json、apps/web/next.config.*、apps/web/app/layout.tsx、apps/web/app/page.tsx、backend/pyproject.toml、backend/app/main.py、.gitignore、.env.example、scripts/check-contract.mjs。功能：建立Next.js/React/TypeScript与FastAPI最小启动；首页只显示Foundation ready，不开发业务页面。提供/api/v1/health。锁定相容依赖，记录Node/Python版本。npm scripts提供dev/build/typecheck/test:unit/test:e2e/check:contract；后端pytest入口可运行。未有测试不得伪造成功结果。忽略node_modules/.env/临时渲染，不忽略证据或设计文档。 视觉：本任务不交付业务前端；如有诊断页面不得作为视觉原型验收。 数据/API：health仅返回status=ok，不添加业务模型或替代API。 约束：只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。 验收：全新依赖安装后Web/API可启动；build/typecheck通过；缺配置错误清楚；依赖锁文件存在，无密钥。 需运行：npm ci；npm run typecheck；npm run build；node scripts/validate-baseline.mjs。命令由本任务或前置任务创建，未能执行明确标NOT_RUN，不能编造通过。交付：锁文件、最小工程、启动与检查说明；不要求业务截图。 报告变更文件、实际命令与exit code、截图路径、已知问题，提交review等待主控验收。契约冲突先报告并请求主控修订任务，不自行扩大范围。
