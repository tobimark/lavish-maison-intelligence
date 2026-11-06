# POC-003 主控复查 · changes_requested

2026-11-04。裁决：**不accepted，先修复FIX-POC-003-01；POC-004不启动**。没有修改领域实现或公共契约，未新增业务UI。

## 实测与范围

- typecheck exit0；指定状态机测试23 passed、exit0（414ms）。
- 独立诊断探针evidence/poc/reviews/POC-003/main-probe.test.ts实际调用领域导出函数，结果保存在main-probe.json。该诊断用例运行exit0只表示已记录观察，不表示状态机验收通过。
- 技术数据只读复用POC-001 TEST_ONLY夹具，不生成客户场景。

## 需修复的问题

### P1：编辑确认与重演的游标耦合

首次analysis呈现后保存派生稿再confirmScript，会读取包中固定entry脚本的script.confirmed并要求ID相同，返回INVALID_INPUT。派生稿应允许确认，同时正确标记没有匹配视频，不能被包内回放决策约束。

视频完成后selectScript回原预置版本、confirmScript、executeStage(video)，workflowCursor仍为17，下一条视频事件12返回CORRUPT_EVENT。流程表面ready/running，实际上无法重走视频。操作模式必须以当前stage/attempt管理消费位置与版本绑定；回放全局游标不应成为操作模式重演的障碍。

### P1：模拟交付没有可持续的running/重试闭环

simulateDelivery一次同步完成到failed/completed，未按契约留下queued/running状态供消费。失败后retryStage返回running，但simulateDelivery的ensureNotRunning拒绝继续，applyWorkflowEvent又拒绝全部delivery事件，因此没有成功完成该attempt的入口。

同一探针在scheduledVirtualMs=60000时传virtualTimeMs=0，立即创建simulated_delivered成功记录。需在虚拟时间满足条件后才能结算，不能提前成功。

### P2：回放与操作的guard未统一，queued被当available

reduceReplayEvent(video.queued)已把视频ID放入visible；随后注入连续sequence的stage.completed即成功，尽管video.available从未消费。当前完成guard只检查visibleEntityIds。回放与workflow各有一套手写分支，已出现依赖检查差异（例如discovery完成对trend要求也不同）。必须复用阶段转换/依赖guard，并明确区分queued和available。

纯reducer虽接收typed Event，也不能只依赖TypeScript类型或早期包校验来放任非法消费路径；对包事件的绑定与消费顺序应在同一层可靠验证。

### P2：编辑内容绕过来源锚点与引用类型

saveScriptDraft允许把shot.id改为新来源ID，同时把shot.assetIds改为已存在Product ID，返回ok。validateEditableScript仅检查引用在总索引存在，未要求asset类型，也没有对照源版本的镜头/字幕ID、数量和次序。违反v1只编辑既有镜头/字幕条目的契约。

## 测试覆盖要求

现有23项通过不能替代：首次确认前编辑→确认；完成视频→切回预置稿→再次完整视频；模拟交付失败→retry→成功；排期前不交付；queued后未available不能完成；编辑来源ID和错误实体类型必须拒绝。修复后完整跑到终态，不能只断言中途ready/running。

本轮不把全量Vitest误加载Playwright文件当作POC-003引入的问题；该配置说明记录为独立后续事项，不要求本修复越过白名单修改。使用指定单元测试命令复查。

## 下一步

执行tasks/poc/fixes/FIX-POC-003-01.md。其内部交付开始/结算接口是主控对既有状态机的实施说明，不新增对外MockApi方法、公共Scenario Schema或业务范围。修复完成再提交review。
