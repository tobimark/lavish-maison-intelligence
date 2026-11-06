> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

> 当前生效范围为[前端 Demo](FRONTEND_DEMO_SCOPE.md)。下文涉及后端、数据库、API与服务端任务的内容保留作未来参考，不是本期实施或验收条件。

# Presentation Replay 引擎

ReplaySession固定scenarioId+version+eventsHash，与后台Feed和其他session独立。初始paused、t=0、speed=1。控制API由expectedRevision防两端竞态。播放时服务存(anchorCursorMs,anchorRealTime,speed)，目标t=anchorCursorMs+(now-anchorRealTime)*speed，限制在[0,duration]；业务状态只由t决定。

`stateAt(t) = reduce(initialState, events where virtualTimeMs <= t sorted by sequence)`。snapshot包含scenarioVersion、lastSequence、cursorMs、stateHash；向后seek使用之前最近snapshot再前推，不能对现态手工撤销。不同播放速度、seek路径、刷新恢复应产生相同业务投影哈希（排除sessionId、真实时间等元信息）。

play/pause/speed-change先固定当前t再换anchor；step跳下一事件时间并应用该时间所有同时间事件，最终paused；seek保持原play/pause状态，重置anchor；restart回0 paused；end状态completed。滑块拖动本地预览，松开提交，服务端返回实际cursor与revision；快速多次seek丢弃旧响应。

刷新GET session取持久控制状态，playing会按anchor推进；UI请求对应snapshot。网络断开暂停本地推断并显示Disconnected，不伪造服务成功。多个演示会话互不共享cursor/草稿。reset session不删除别的Campaign。

Create Campaign是唯一从Replay复制到持久业务的交接命令，提交source=sessionId+opportunityId+scenarioVersion。服务取该session已到达的机会快照；尚未出现的机会409；事务建立Campaign链并返回稳定ID。seek/restart不能自动再次创建Campaign。

验收：直接seek20s、1×/2×/4×到20s、30→5→20、刷新→20的投影哈希相同；同时两session不同游标；更换scenario版本拒绝旧snapshot；API重试无重复Campaign；关闭浏览器不改变Feed工作。
