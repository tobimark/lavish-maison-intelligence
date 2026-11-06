> DEFERRED：完整系统任务，不属于当前前端Demo，不得作为M1前置依赖。见 docs/FRONTEND_DEMO_SCOPE.md。

# TASK-003 — 建立核心关系数据库迁移

### Task ID
TASK-003

### Title
建立核心关系数据库迁移

### Goal
将统一实体、版本、命名空间与幂等边界落实为数据库约束。

### Dependencies
TASK-002

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

- backend/app/db/**
- backend/migrations/**
- backend/alembic.ini
- backend/tests/test_schema_constraints.py

### Implementation Requirements
实现DATA_MODEL列出的表与FK/unique/check/index；JSONB载荷配schemaVersion；命名空间、revision、版本号、审批与排期关联可约束。使用Alembic并验证空库升级与降级再升级。只做存储基础，不实现Agent/发布服务。

### Visual Specification
无业务页面视觉实现；不触及全局设计。

### Data & API Contract
DATA_MODEL完整模型；版本不可变由服务后续控制，数据库必须至少unique与FK正确。

### Constraints
只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。

### Acceptance Criteria
无孤儿版本或排期；重复版本号/幂等键受约束；跨namespace关联拒绝；迁移可复演。

### Test Commands
以下为实施时必须实际运行的命令；当前未执行。TASK-001创建通用脚本，各任务需提供自己命名的测试文件/脚本。

```powershell
python -m pytest backend/tests/test_schema_constraints.py
```

### Expected Deliverables
迁移、模型与真实Postgres测试结果；SQLite替代不算通过。

### Failure Conditions
依赖未验收；越界修改；来源/品牌错误；测试未跑却报通过；截图缺失却报视觉通过；未满足Acceptance Criteria。

### Definition of Done
交付物齐备、命令实际通过、已知问题列明；状态为review，经主控代码/功能审查accepted后完成。

### DeepSeek Execution Prompt
你是DeepSeek 4.1 Flash 1017编码执行者。执行TASK-003：建立核心关系数据库迁移。目标：将统一实体、版本、命名空间与幂等边界落实为数据库约束。 前置依赖必须由主控accepted：TASK-002。先阅读：PROJECT_CONSTRAINTS.md、docs/PRD.md、docs/ARCHITECTURE.md、docs/DATA_MODEL.md、docs/API_CONTRACT.md、contracts/openapi.json、docs/SCENARIO_SPEC.md。仅允许新增/修改：backend/app/db/**、backend/migrations/**、backend/alembic.ini、backend/tests/test_schema_constraints.py。功能：实现DATA_MODEL列出的表与FK/unique/check/index；JSONB载荷配schemaVersion；命名空间、revision、版本号、审批与排期关联可约束。使用Alembic并验证空库升级与降级再升级。只做存储基础，不实现Agent/发布服务。 视觉：本任务不交付业务前端；如有诊断页面不得作为视觉原型验收。 数据/API：DATA_MODEL完整模型；版本不可变由服务后续控制，数据库必须至少unique与FK正确。 约束：只改Files白名单；不改架构/公共契约/全局视觉；不引入虚构品牌/商品；来源标识准确；只完成本任务，不提前开发其他页面或M2业务。 验收：无孤儿版本或排期；重复版本号/幂等键受约束；跨namespace关联拒绝；迁移可复演。 需运行：python -m pytest backend/tests/test_schema_constraints.py。命令由本任务或前置任务创建，未能执行明确标NOT_RUN，不能编造通过。交付：迁移、模型与真实Postgres测试结果；SQLite替代不算通过。 报告变更文件、实际命令与exit code、截图路径、已知问题，提交review等待主控验收。契约冲突先报告并请求主控修订任务，不自行扩大范围。
