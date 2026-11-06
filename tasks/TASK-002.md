> DEFERRED：完整系统任务，不属于当前前端Demo，不得作为M1前置依赖。见 docs/FRONTEND_DEMO_SCOPE.md。

# TASK-002 — 实现公共Schema与OpenAPI契约验证

### Task ID
TASK-002

### Title
实现公共Schema与OpenAPI契约验证

### Goal
消除前后端分别定义实体的风险。

### Dependencies
TASK-001

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

- backend/app/schemas/**
- backend/tests/test_contract.py
- packages/contracts/**
- scripts/check-contract.mjs
- scripts/generate-types.mjs
- package.json

### Implementation Requirements
把设计契约映射为Pydantic DTO/枚举与条件校验；TS由契约生成。验证所有$ref、operationId、参数、错误结构；使用标准OpenAPI validator。补seek/set_speed条件、Storyboard时长、CreateCampaign参数组合。若设计契约不能表达某约束，提交主控修订请求，不直接改公共契约。

### Visual Specification
无业务页面视觉实现；不触及全局设计。

### Data & API Contract
contracts/openapi.json v0.1；docs/DATA_MODEL中的关系和状态为业务不变量。此任务不实现业务端点。

### Constraints
只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。

### Acceptance Criteria
生成类型与契约无漂移；非法来源/速度/时长被拒；CI检查发现刻意破坏的契约。

### Test Commands
以下为实施时必须实际运行的命令；当前未执行。TASK-001创建通用脚本，各任务需提供自己命名的测试文件/脚本。

```powershell
npm run check:contract
npm run typecheck
python -m pytest backend/tests/test_contract.py
```

### Expected Deliverables
Pydantic/TS类型、生成脚本与契约校验结果。

### Failure Conditions
依赖未验收；越界修改；来源/品牌错误；测试未跑却报通过；截图缺失却报视觉通过；未满足Acceptance Criteria。

### Definition of Done
交付物齐备、命令实际通过、已知问题列明；状态为review，经主控代码/功能审查accepted后完成。

### DeepSeek Execution Prompt
你是DeepSeek 4.1 Flash 1017编码执行者。执行TASK-002：实现公共Schema与OpenAPI契约验证。目标：消除前后端分别定义实体的风险。 前置依赖必须由主控accepted：TASK-001。先阅读：PROJECT_CONSTRAINTS.md、docs/PRD.md、docs/ARCHITECTURE.md、docs/DATA_MODEL.md、docs/API_CONTRACT.md、contracts/openapi.json、docs/SCENARIO_SPEC.md。仅允许新增/修改：backend/app/schemas/**、backend/tests/test_contract.py、packages/contracts/**、scripts/check-contract.mjs、scripts/generate-types.mjs、package.json。功能：把设计契约映射为Pydantic DTO/枚举与条件校验；TS由契约生成。验证所有$ref、operationId、参数、错误结构；使用标准OpenAPI validator。补seek/set_speed条件、Storyboard时长、CreateCampaign参数组合。若设计契约不能表达某约束，提交主控修订请求，不直接改公共契约。 视觉：本任务不交付业务前端；如有诊断页面不得作为视觉原型验收。 数据/API：contracts/openapi.json v0.1；docs/DATA_MODEL中的关系和状态为业务不变量。此任务不实现业务端点。 约束：只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。 验收：生成类型与契约无漂移；非法来源/速度/时长被拒；CI检查发现刻意破坏的契约。 需运行：npm run check:contract；npm run typecheck；python -m pytest backend/tests/test_contract.py。命令由本任务或前置任务创建，未能执行明确标NOT_RUN，不能编造通过。交付：Pydantic/TS类型、生成脚本与契约校验结果。 报告变更文件、实际命令与exit code、截图路径、已知问题，提交review等待主控验收。契约冲突先报告并请求主控修订任务，不自行扩大范围。
