> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

> 当前生效范围为[前端 Demo](FRONTEND_DEMO_SCOPE.md)。下文涉及后端、数据库、API与服务端任务的内容保留作未来参考，不是本期实施或验收条件。

# 事件协议 v1

```json
{"id":"uuid","schemaVersion":1,"runId":"uuid","sequence":1,"virtualTimeMs":0,"type":"signal.normalized","sourceType":"DEMO","payload":{"signalId":"uuid"},"inputRef":"ref","outputRef":"ref","causationId":null}
```

同run严格sequence递增；virtualTimeMs非递减，时间相同按sequence排序；id去重。来源/实体引用必须可在该场景版本解析。不得把非确定性Date.now或Math.random写入投影；所有随机在生成场景时由seed固定。

类型：run.started、signal.ingested、signal.normalized、signal.deduplicated、trend.clustered、trend.scored、opportunity.created、opportunity.explained、run.succeeded、run.failed。Creative运行另有brief.created、concept.selected、asset.version_created、render.queued/completed/failed；发布另有post.simulated_published/failed。事件载荷用tagged union，不把任意文本解释成状态命令。

SSE：id是namespace事件游标，event=agent_event；data是Event Envelope；15秒heartbeat；Last-Event-ID补读，超出保留范围返回410与snapshot URL。客户端先应用snapshot再按sequence幂等消费；重复/断线不重复业务写入。未知schemaVersion停止该投影并提示更新，不能静默跳过关键事件。
