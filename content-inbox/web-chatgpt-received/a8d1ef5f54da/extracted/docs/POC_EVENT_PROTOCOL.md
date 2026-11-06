# POC Agent Event Protocol v1.0

Agent 在此是预置流程的事件展示，不是后台运行模型。唯一事件 Schema 位于场景 Schema 的 `$defs/event`，types 是 discriminated union；额外字段、未知事件或版本必须报错。

Envelope：`{id,scenarioId,scenarioVersion,sequence,atMs,stage,runKey,mode:'mock',type,inputRefs:[],outputRefs:[],payload}`。

- sequence 从1开始连续；atMs 从0起非递减，相同时间按 sequence。时间只是演示节奏，不代表真实采集/推理/渲染耗时。
- runKey 为该阶段的演示运行标识；不等于某用户 sessionId。重复事件 ID/sequence 拒绝；运行时相同 sequence 二次投递幂等忽略，同 sequence 不同内容报 CORRUPT_EVENT。
- inputRefs 必须已经在游标可见或为 brand/product/asset 元数据；outputRefs 必须与 type payload 引用一致。未完成阶段的业务输出不可先露出。媒体清单已载入也不能绕过 API 展示未来结果。

| type | stage | payload | 语义 |
|---|---|---|---|
| stage.started | 任一 | `{stage}` | locked不可启动，ready/failed进入running；video需脚本精确匹配 |
| signal.discovered | discovery | `{signalId}` | 暴露信号及其证据 |
| trend.summarized | discovery | `{trendId}` | 暴露趋势，引用信号须已展示 |
| analysis.presented | analysis | `{analysisId}` | 展示预先推演结果与依据 |
| brief.presented | analysis | `{briefId}` | 展示 Brief |
| script.presented | analysis | `{scriptVersionId}` | 展示完整预置脚本；workflow等待用户确认 |
| script.confirmed | analysis | `{scriptVersionId}` | replay的预置确认动作；workflow须由真实用户 confirmScript 驱动 |
| video.queued | video | `{videoId}` | 预置视频演示任务排队；不是启动 renderer |
| video.progressed | video | `{videoId,progress:0..100}` | 仅预置渲染过程展示，caption始终 Simulated render |
| video.available | video | `{videoId}` | replay逻辑上暴露成片；workflow还需真实asset检查通过 |
| delivery.queued | delivery | `{planId}` | replay预置交付排队；workflow必须明确用户确认 |
| delivery.simulated | delivery | `{recordId}` | 暴露预置回执，outcome与record一致；不创建用户真实操作日志 |
| stage.failed | 任一 | `{stage,code,retryable}` | 可恢复演示失败，不丢已保存稿件；错误原因来自包 |
| stage.completed | 任一 | `{stage}` | 检查输出/确认前置条件后完成；不能用一条事件绕过门禁 |

v1 主 events 是完整成功路径，checkpoint至少阶段结束4处+cursor0。可恢复失败行为通过 delivery.records 中 outcome=failed 的失败样例及 API failureCase 显式触发，不把互斥分支混在同一线性黄金时间轴。失败样例没有对应有效 plan/outcome 时接口拒绝触发。

## 主事件流的精确顺序

每个阶段有且只有一条stage.started和stage.completed；依次完整结束discovery、analysis、video、delivery，禁止交错。阶段内部：

- discovery：started → 每个signal.discovered → 依赖已可见的trend.summarized → completed。
- analysis：started → analysis.presented → brief.presented → script.presented（可多个语言版本）→ script.confirmed（仅entryScriptVersionId）→ completed。presented进入awaiting_confirmation；confirmed置确认标志，随后的completed消费后阶段才completed。
- video：started → video.queued → video.progressed（非递减，最后100）→ video.available → completed。progress不能代替available；每个事件videoId均为entryVideoId。
- delivery：started → delivery.queued → delivery.simulated（成功record，planId=entryDeliveryId）→ completed。失败记录存在delivery.json作显式失败分支，不混入主流。record.atMs与事件atMs相同，queued时间不早于plan.scheduledVirtualMs。

除stage控制事件外，outputRefs必须恰好等于payload所指实体（progressed/confirmed不新增可见实体，outputRefs为空）；inputRefs必须包含该实体的直接业务依赖：Signal的evidence、Trend的signal、Analysis的trend/evidence、Brief的analysis/product、Script的brief、Video的script/shot/assets、Plan的video/script/recipient/assets、Record的plan。Brand/Product/Asset/Evidence/Recipient为已加载基础元数据；分析结论等输出仍按事件游标隐藏。输入依赖可从契约实体解析，校验器必须比对，不能只检查ID存在。

script.presented暴露该ScriptVersion及其嵌套shots/subtitles；直接outputRefs仍只写scriptVersionId，展开规则由reducer固定。重复queued/progressed不重复创建实体。expected.visibleEntityIds包括已暴露的顶层业务实体与嵌套shot/subtitle，不包含基础元数据、event或checkpoint自身；按ID字典序保存用于精确对照。

工作流executeStage(analysis)停在script.presented后；confirmScript同步应用确认与阶段completed，不再等播放自动确认。工作流simulateDelivery必须先saveDeliveryDraft并人工确认，再原子开始delivery的started/queued。Replay允许从ready消费预设delivery started/queued作为包内的示例确认；这是唯一的模拟人工边界例外，不可用于workflow。Replay事件中的确认只绑定manifest entry版本。

## 回放与用户操作隔离

1. Replay projection 初始状态由包决定，`reduce(package, events[0..cursorSequence])` 是纯函数。不依赖 Date.now/Math.random/网速/DOM；checkpoint只是对照或校验过的快照，不能替代业务 reducer。
2. 播放以虚拟 clock 消费已到 atMs 的完整事件。1×/2×/4×只改变墙钟映射。seek以 sequence 为最终精确游标，seek到Ms的UI先选择 atMs≤目标的最后sequence；step推进一条事件。
3. seek/restart先还原初始状态或已验证快照，再按sequence折叠。跳到同一游标的 canonical JSON（按键排序、排除墙钟与播放速度）和 hash 必须一致。
4. Pause/seek、速度、游标、session包版本持久化；刷新恢复 paused，不把关闭浏览器的时间补算成后台工作。
5. Workflow 使用相同领域 reducer 和 guard，但人工确认事件由命令产生；预置 script.confirmed/delivery.queued 只能用于 replay。executeStage只消费当前阶段的自动事件，不能自动跨越人工边界。
6. Replay可播放全四步预置演示，包括标明预置的示例回执；它不改变用户所选版本、草稿、simulateDelivery次数和操作历史。进入真实可操作流程使用“开始操作演示”，加载同包初始 workflow，不复制回放回执。
7. UI并列标记“操作模式 / 回放模式”；从回放切回操作模式恢复自己的状态。两种模式不能共享一份可变 workflow。

只保存序列化数据，不把 HTML 文案、模型输出文字解释成指令。事件对未知实体、乱序、跨阶段、已失效版本的写入必须失败并给出校验定位。
