> 2026-11-05最高优先级更新：当前以 docs/INTERACTIVE_MOCK_PRODUCT.md、docs/INTERACTIVE_PRODUCT_API.md、docs/pages/INTERACTIVE_WORKSPACES.md 和 tasks/DSH_HANDOFF_DEMO_FAST_05.md 为准。六工作区可自由探索，Scenario只作数据容器；只读浏览无阶段前置。旧固定四步/唯一Home可用/导出依赖模拟邮件的要求不再用于开发。冻结场景Schema/业务JSON/Tokens不改，视频仍deferred。

> 2026-11-05范围更新：用户暂缓视频制作；当前以 docs/CONTENT_ONLY_DELIVERY.md 和 tasks/DSH_HANDOFF_DEMO_FAST_04.md 为准，视频缺失不阻塞非视频开发。旧完整视频要求保留作未来范围，不将文案Demo标为完整视频验收通过。

# Unified Mock API v1.0

本期是浏览器内 TypeScript 异步 Facade，不新增 HTTP 后端或 Next Route Handler。API 命名是稳定调用协议，不伪装已存在网络端点。仅适配器允许读取已校验场景 JSON/媒体；组件只调用 `MockApi`，同一对象的所有视图从统一 store 查询。

## 通用类型与一致性

`Result<T> = {ok:true,data:T,meta:{mode:'mock',schemaVersion:'1.0.0',requestId,sessionId:null|string,revision:null|integer}} | {ok:false,error:{code,message,fieldErrors:[{path,message}],retryable},meta}`。详情由错误码决定；不允许返回 success+空对象掩盖失败。

读方法不改变状态。所有写方法接收 `CommandContext {sessionId, expectedRevision, idempotencyKey}`；创建 session 除外（使用独立 creationKey），reset 仍需 revision。相同 session+operation+key+规范化 body 返回原结果，不能重复发送/建稿/记日志；同 key 不同 body → IDEMPOTENCY_CONFLICT。先查幂等缓存，再检查 revision；过时写入 → REVISION_CONFLICT。IndexedDB 单 transaction 原子更新 state、history、command receipt；使用跨标签页 revision 比较，广播只是 UI 刷新信号，不替代写入互斥。

Session `{id,scenarioId,scenarioVersion,packageHash,revision,createdAt,updatedAt,mode:'mock',workflow,workflowPlayback,activeBriefId,activeScriptVersionId,activeVideoId,userVersions,deliveryDrafts,deliveryAttempts,replay,history}`。workflowPlayback保存当前stage、stage内cursorSequence、virtualMs和transport（idle/playing/paused）；replay独立保存全包cursorSequence、virtualMs、speed、transport与projection。完整数据形状从场景 Schema 和协议生成；禁止 any/任意 payload。history 为不可变 `ActionRecord {id,sequence,action,entityIds,occurredAt,outcome,mode:'mock'}`。错误尝试可记录但不写成功业务记录。

Session另存stageAttempts[]：`{id,stage,ordinal,inputRefs,status:'running'|'completed'|'failed'|'canceled',lastSequence,startedAt,finishedAt:null|UTC,errorCode:null|string}`。executeStage/simulateDelivery创建attempt，retryStage引用失败attempt，事务内分配ordinal；deliveryAttempts在相应stageAttempt上补`draftId,scriptVersionId,videoId,attachmentAssetIds,outcome`和快照。attempt.id为usr会话命名空间，不能与包内预置record.id混用。

DeliveryDraft：`{id,planId,revision,scriptVersionId,videoId,recipientSnapshot:[{id,displayName,email}],subject,body,attachmentAssetIds,scheduledVirtualMs,confirmedRevision:null|integer}`；用户不能改附件使其不再匹配video。模拟时间等待采用workflow虚拟clock；不使用系统计时器在关闭页面后发送，也不因现实日历到期自动投递。

## 方法表（唯一业务访问入口）

| 方法 | 请求 | 成功 data / 行为 |
|---|---|---|
| listScenarios | 无 | `{items:[{scenarioId,title,scenarioVersion:null|string,readiness:'awaiting_content'|'invalid'|'ready',issues:[]}]}`；不 ready 不可启动 |
| getScenario | `{scenarioId,scenarioVersion}` | 已校验 manifest + brand +媒体索引；非 ready 返回 SCENARIO_NOT_READY |
| createSession | `{scenarioId,scenarioVersion,creationKey}` | Session；固定包版本/哈希，initial 状态，重复 key 不新建 |
| listSessions | `{scenarioId?:string}` | `{items:SessionSummary[]}` 按 updatedAt 降序/id 稳定打破平局 |
| getSession | `{sessionId}` | Session；恢复后 replay 默认 paused，离线期间不补跑 |
| getStageData | `{sessionId,stage,view:'workflow'|'replay'}` | discovery/analysis/video/delivery 的类型化可见数据；future result 不返回 |
| getEntity | `{sessionId,entityId,view}` | 对应 typed entity；未到事件游标的结果 → ENTITY_NOT_REACHED |
| executeStage | ctx + `{stage:'discovery'|'analysis'|'video'}` | Session；按阶段前置条件开始预置事件消费；不调用外部服务 |
| workflowCommand | ctx + `{action:'pause'|'resume'}` | Session；仅暂停/恢复当前running阶段的本地事件消费，不重置游标/attempt；无workflow seek |
| selectScript | ctx + `{scriptVersionId}` | Session；检查同会话/包、是否有匹配成片，按状态机使旧 video/delivery 失效 |
| saveScriptDraft | ctx + `{baseVersionId,content:ScriptEditable}` | `{session,version}`；content 只含 title/hook/message/cta/shots/subtitles/caption/hashtags；保持 briefId/language/productIDs，语言切换通过selectScript选对应语言版本；镜头校验依旧 |
| confirmScript | ctx + `{scriptVersionId}` | Session；绑定此版本确认，不代表视频已生成 |
| saveDeliveryDraft | ctx + `{planId,recipientIds,recipientsOverride,subject,body,scheduledVirtualMs}` | `{session,draft}`；只允许 .invalid、保留 Mock 标记、绑定当前 video/script；不用真实系统时钟发件 |
| simulateDelivery | ctx + `{draftId,confirmedVideoId,failureCase:null|'delivery_failed'}` | `{session,attempt}`；queued 后消费模拟事件，确认仅作用于精确版本，失败 case 来自包预设，不能随机掷骰 |
| retryStage | ctx + `{stage,failedAttemptId}` | Session；相同输入新 attempt；上一 attempt 保留，不在幂等重试时创建额外 attempt |
| replayCommand | ctx + discriminated command | `{session,projection}`；play/pause/step/restart/seek/setSpeed，详见事件协议 |
| getEvents | `{sessionId,afterSequence:integer,limit:1..100}` | `{items:AgentEvent[],nextSequence:null|integer}`，源事件有序不改写 |
| getHistory | `{sessionId}` | `{items:ActionRecord[]}`；真实操作日志与预置 AgentEvent 分开 |
| getDownload | `{sessionId,kind:'video'|'poster'|'script'|'delivery_bundle'|'run_record',entityId}` | `{blob,filename,mimeType,bytes,sha256}`；实际字节；video须当前 ready/可见，script导出当前版本 JSON，bundle规则见媒体文档 |
| resetSession | ctx + `{confirmation:'RESET_THIS_SESSION'}` | 新 revision 的初始 Session；仅清此会话演示数据，保留 reset 审计与幂等 receipt；其他会话/场景/壳体偏好不动 |

replay command：`{action:'play'|'pause'|'step'|'restart'}`、`{action:'seek',cursorSequence:0..N}`、`{action:'setSpeed',speed:1|2|4}`。额外字段拒绝。ScriptEditable 的允许字段清单与 Schema 共享字段定义，禁止通用任意对象 PATCH。

## 错误与持久化

错误码：SCENARIO_NOT_READY、SCHEMA_UNSUPPORTED、PACKAGE_CHANGED、NOT_FOUND、ENTITY_NOT_REACHED、INVALID_INPUT、INVALID_TRANSITION、REVISION_CONFLICT、IDEMPOTENCY_CONFLICT、VIDEO_VERSION_MISMATCH、ASSET_UNAVAILABLE、STORAGE_UNAVAILABLE、STORAGE_QUOTA、SESSION_NOT_FOUND、CORRUPT_SESSION、MOCK_FAILURE。每种失败必须有可观察 UI、保留稿件与恢复入口。

存储：数据库 `lavish-poc`，version=1；stores packages（元信息）、sessions、commandReceipts、history。大 MP4 不写 localStorage/IndexedDB，保留同源静态文件。持久化 schemaVersion 与 packageHash 不兼容时锁定旧会话并提供导出记录/新会话；禁止静默套用新内容。损坏记录隔离，不能清库隐藏问题。空间不足时明确未保存，可导出当前会话 JSON；允许用户明确选择内存模式，刷新丢失提示持续可见。

“四步工作执行”与“Presentation Replay”投影分别存储。回放不能新增稿件/交付尝试；重新播放不重复实际模拟交付记录。展示回放中的 preset receipt 必须标“预置示例记录”，用户操作形成的记录标“本次演示记录”。
