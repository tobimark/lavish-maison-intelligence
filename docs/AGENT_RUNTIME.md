> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

> 当前生效范围为[前端 Demo](FRONTEND_DEMO_SCOPE.md)。下文涉及后端、数据库、API与服务端任务的内容保留作未来参考，不是本期实施或验收条件。

# Agent Runtime

Intelligence与Creative为确定性工作流，非自由自治框架。独立worker从Postgres领取due job，`FOR UPDATE SKIP LOCKED`，lease 30s、每10s续期；可配置、测试使用虚拟时钟。进程中断后租约超时重领；写结果前检查lease owner与namespace generation。

运行步骤：validate input → normalize/plan → execute stage → persist output + event + outbox → finish。事件含输入输出引用、耗时、错误、attempt，不记录密钥。默认最多3次重试，指数退避2/4秒；422与权限错误不自动重试。每阶段用runId+stepId唯一效果键；重试不能重复创建机会或素材。

Feed默认每60秒读取下一批预置DEMO信号；任务唯一键(namespace,scenarioVersion,tickIndex)。浏览器关闭5分钟后再次查询，应看到后台有新的tick及完整输入输出。演示不要求后台真实外部采集。

服务有明确health/readiness、心跳和worker dead状态；UI显示真实job状态，不把本地setInterval当Runtime。暂停Replay只影响session，Feed用独立pause/resume控制。Preset计算立即可完成，不人为假装网络生成。
