> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

> 当前生效范围为[前端 Demo](FRONTEND_DEMO_SCOPE.md)。下文涉及后端、数据库、API与服务端任务的内容保留作未来参考，不是本期实施或验收条件。

# API 契约 v0.1

可机器读取的完整设计阶段端点清单与请求/响应结构：`contracts/openapi.json`；架构生成源 `scripts/generate-contract.mjs`。**这不是已运行的API**。TASK-002需实现Pydantic tagged payload校验、导出比对与OpenAPI语法验证；M1由同一契约生成mock，不手写冲突字段。

Base `/api/v1`；demo_session HttpOnly cookie提供服务端namespace；私有本地演示不等于企业鉴权。JSON字段camelCase，UTC ISO8601，列表items+nextCursor，limit≤100。所有写操作带Idempotency-Key，作用域namespace+operation；复用key不同requestHash返回409。同body/key返回原响应。

错误 `{code,message,requestId,details}`；400参数组合错误，401会话缺失，403越界，404不存在，409修订/状态/幂等冲突，422字段/引用约束，503provider或worker不可用。关键code：REVISION_CONFLICT、INVALID_TRANSITION、MISSING_EVIDENCE、VERSION_NOT_APPROVED、REPLAY_OPPORTUNITY_NOT_REACHED、PROVIDER_FAILED、ASSET_UNVERIFIED、STALE_GENERATION。不得把错误变成200空数据。

核心入口：scenarios；replay-sessions/create/get/state/commands；runs/events；signals/trends/opportunities/evidence；campaigns create/get/patch；creative/generations；assets/versions/restore；copilot proposals/apply；approvals/decisions；scheduled-posts/simulate；render-jobs；files/download；demo/reset；events/stream。

约束：ReplayCommand seek必需cursorMs，set_speed必需speed且只能1/2/4；其余action禁止无关参数。CreateCampaign replaySession非null时scenarioVersion必填；服务端从session投影取得机会，不信任客户端构造摘要。PATCH有expectedRevision；AssetVersionEdit有baseVersionId。Storyboard projectId必须匹配路径，shots时长和必须15000。

Approval对in_review作decision，退回/拒绝reason不能为空；新版本默认draft。排期必须匹配批准version和approval；模拟发布仅DEMO，scheduled到期或明确演示执行才能领任务。MetricSnapshot按固定seed汇总，曝光点击等不得页面自行编造。Render202返回真实job，下载仅succeeded可用，文件校验与Content-Disposition必须正确。

输入输出中的版本化payload需按kind与schemaVersion校验，具体模板字段在M4/M5细化任务中由主控补充，不授权下游自由改变公共实体。API里job输出resultRef引用已创建实体，不接受用户提供任意文件系统路径。

当前验证分层：baseline脚本检查所有$ref和端点参数；TASK-002执行标准OpenAPI validator并验证生成的后端契约；业务实现阶段做状态机、权限与幂等集成测试。不能把结构自检称为完整API测试。
