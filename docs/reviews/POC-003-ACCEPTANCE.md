# POC-003 主控验收 · accepted

2026-11-04。裁决：**POC-003 accepted；FIX-POC-003-01 closed**。验收范围为纯领域状态机、操作/回放guard、版本失效与交付attempt闭环；不代表持久化MockApi、回放clock、客户场景或M1视觉验收完成。

## 主控实际检查

| 检查 | 结果 |
|---|---|
| npm run typecheck | exit0 |
| npm run test:unit -- tests/poc/state-machine.test.ts | exit0，31 passed（529ms） |
| npm run test:unit -- evidence/poc/reviews/POC-003/fix-recheck.test.ts | exit0，独立完整路径断言通过（340ms） |

已检查domain/types/core/guards/workflow/replay修复，确认：

- 用户确认与包内固定entry确认分离，首次保存派生稿可确认，analysis completed、video stale。
- 操作事件按stage+attempt源区间消费。独立重新完成第二轮视频，两个video attempt均completed，replay projection/cursor未改变。
- simulateDelivery开始running，advanceDeliveryAttempt结算；到期前无成功记录。独立执行失败→retry→成功，终态保留failed/simulated_delivered两条attempt和一条成功记录，旧attempt不变，重复结算不增加记录。
- workflow/replay复用阶段/输出guard。queued与available独立，规范事件篡改与queued后提前completion被拒绝。
- 以sourceScriptVersionId校验镜头/字幕数量、ID与顺序；非asset实体不能作为shot素材。独立分别测试改锚点、Product ID作asset，两者均失败。

## 证据与指纹

evidence/poc/reviews/POC-003/fix-recheck.test.ts及fix-recheck.json包含主控独立可重放测试源码、断言和结构化结果，原main-probe证据未覆盖。acceptance-source-hashes.json记录本次文件指纹。下游fix-01证据仅作交叉参考，不代替主控实测。

公共Schema、Tokens保持原已核对版本；本次不改任何产品实现、客户内容或媒体，不进行视觉验收。

## 已知边界

实际IndexedDB/并发/幂等请求包装待POC-004；回放时钟/seek恢复与验证器L3投影接线待POC-005。客户三场景仍awaiting_content，真实L5/实际ffprobe/品牌内容审查均未完成。不能把本次纯领域验收标为可运行客户完整POC。

全量npm run test:unit的发现范围会包含Playwright spec与历史诊断探针，需单独限制到适当单元测试目录；本次只执行任务要求的指定测试及独立复查。未把全量测试记录为通过，未为此越过白名单改配置。后续测试入口调整须由主控明确授权文件。

POC-004“统一Mock API与浏览器持久化”设为ready，可交DSH执行，尚未自动派发/启动。按既有任务白名单实施；不得另写与本次状态机矛盾的转换，交付后再主控review。TASK-007及M1整体仍待原门禁。
