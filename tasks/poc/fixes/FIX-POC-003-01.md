> 主控已验收POC-003，FIX-POC-003-01已关闭；见docs/reviews/POC-003-ACCEPTANCE.md。下文为原任务规格。

# FIX-POC-003-01 · 操作重演、交付闭环与共享guard

### Task ID
FIX-POC-003-01

### Goal
让四阶段领域引擎完成真实可重复的操作路径，并关闭主控探针复现的状态/引用漏检。

### Dependencies
POC-003提交；阅读docs/reviews/POC-003-MAIN.md及evidence/poc/reviews/POC-003/main-probe.json。POC-001/002已accepted。

### Context
docs/POC_STATE_MACHINES.md、docs/POC_EVENT_PROTOCOL.md、docs/MOCK_API_CONTRACT.md、docs/SCENARIO_DATA_CONTRACT.md、tasks/poc/POC-003.md。

### Files
允许apps/web/demo/poc/domain/**、tests/poc/state-machine.test.ts；新增docs/reviews/FIX-POC-003-01-DSH.md、evidence/poc/domain/fix-01/**。

禁止修改公共Schema/事件协议/MockApi契约/验证器/生成类型、依赖/配置、Tokens/DESIGN_SYSTEM、客户场景/public/UI、既有交付报告/主控证据、任务状态及门禁。

### Implementation Requirements
1. **确认与操作游标**：派生稿/非entry已呈现脚本可由人工确认，得到analysis completed且无匹配视频则video stale；不要拿包内script.confirmed的固定entryId否决用户选择。事件消费按stage+attempt绑定源事件位置，切回预置脚本后可重新消费完整video事件序列；不得回退/污染replay游标或覆盖历史attempt。重复投递仍幂等、内容冲突仍拒绝。旧结果不能让新attempt跳过available。
2. **交付开始与结算（主控确定的内部边界）**：simulateDelivery只开始本地模拟attempt，返回delivery running，保存精确draft/video/script/附件/recipient快照和该attempt的failureCase、scheduledVirtualMs，不立即写成功/失败终态。新增纯内部函数`advanceDeliveryAttempt(state,pkg,{attemptId,virtualTimeMs,nowIso})`，由后续MockApi/本地时钟调用；到期前保持running且无成功记录，到期后按开始时保存的预置结果结算一次，未知/旧attempt不得结算当前attempt。拒绝非法/非有限虚拟时间。
3. retryStage(delivery)必须用失败attempt原始输入快照开始新attempt，默认成功路径failureCase=null；如需显式失败演示，可在内部RetryStageInput添加可选failureCase并按包样例校验。重试后通过同一advanceDeliveryAttempt可成功/失败结束，旧attempt/记录不变，不再次制造另一份“开始”attempt。pending状态可增内部typed字段；对外MockApi仍使用已定义simulateDelivery/retryStage，未增加对外端点。事件回放不能驱动这些用户attempt。
4. **共享guard**：将workflow/replay共同的阶段/依赖/版本/输出前置条件集中复用；人工决策只在对应模式入口不同。queued与available必须不同标志；视频仅available+所需进度/依赖满足才可完成，discovery完成必须signals/trends完整可见。对preset事件可验证其与包内相同sequence的规范事件一致，拒绝改序/改payload；重演的合法重复由attempt位置管理，不得靠取消序列校验实现。保留已定义失败/重试能力。
5. **编辑guard**：对照sourceScriptVersionId原始镜头/字幕锚点，数量/ID/顺序均保持；所有shot.assetIds必须解析为asset，不得只检查总索引存在。保留时长/字幕/未知资产校验与派生内容不可覆盖原稿。字段不合法返回typed错误，不接受any逃逸。
6. **验证到终态**：为主控每项复现新增针对性用例，运行首次确认前编辑确认、完成视频后切回重演、失败重试到成功的完整路径。queued→completed、错误脚本/素材/锚点、过期attempt和排期前结算均有负测。旧23项有效语义保留；原同步交付测试改为开始+结算，不保留错误终态假设。

### Visual Specification
无UI，只修纯领域逻辑与技术测试；不启动任何页面或外部服务。

### Data & API Contract
包实体类型仍唯一来源于generated/scenario.types；不新增冲突实体。时间/ID由显式参数与单调counter确定，不用Date.now/Math.random。attempt.pending快照与终态记录隔离，更新不可变；所有新内部类型在domain/types.ts明确声明。

### Acceptance Criteria
主控六个观察结果改为正确行为；上述三个完整业务路径可达到规定终态。workflow/replay隔离，输入冻结不被修改，事件幂等/冲突检查及历史版本一致，旧attempt不覆盖。POC-004可直接包装这些领域方法，无需另写矛盾的状态转换补丁。

### Test Commands
```powershell
npm run typecheck
npm run test:unit -- tests/poc/state-machine.test.ts
```
不要求修改全量Vitest配置；它与Playwright的既有发现范围冲突另记，不能趁本修复扩大白名单。

### Expected Deliverables
限定修复、完整路径与负向测试、明确内部方法/状态字段说明、实际命令/exitcode、不可变与回放隔离证据、NOT_RUN。不覆盖旧证据。

### Failure Conditions
只修到ready/running而无终态；同步假交付/提前交付；跳过序列或版本guard；使用旧available标记；双份矛盾转换；编辑锚点/类型漏检；越权改契约或启动POC-004。

### Definition of Done
提交review，主控复跑后决定POC-003是否accepted；无视觉验收声明。

### DeepSeek Execution Prompt
执行tasks/poc/fixes/FIX-POC-003-01.md。先读POC-003-MAIN和独立探针结果，仅改Files。解决派生稿首次确认与视频重演的游标耦合；按任务明确的内部simulateDelivery开始/advanceDeliveryAttempt结算边界实现排期与失败重试闭环；共享workflow/replay guard，区分queued/available；按来源脚本验证镜头/字幕锚点和asset引用类型。保留有效测试，新增端到端纯领域路径直至终态及对应负测。运行Test Commands，交实际exitcode/报告/NOT_RUN。不要改公共契约/配置/场景/UI，不覆盖旧证据，不自行accepted或启动POC-004。
