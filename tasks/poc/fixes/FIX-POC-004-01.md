> 主控已accepted POC-004、FIX已关闭，见docs/reviews/POC-004-ACCEPTANCE.md。

# FIX-POC-004-01 · API隔离、幂等与可恢复持久化

### Task ID
FIX-POC-004-01

### Goal
关闭主控复现的分页、恢复导出、幂等、对象引用与回放查询隔离缺陷，使POC-004可由前端可靠调用。

### Dependencies
先读docs/reviews/POC-004-MAIN.md及evidence/poc/reviews/POC-004/main-probe.json。POC-003已accepted，POC-005不启动。

### Context
docs/MOCK_API_CONTRACT.md、docs/POC_SCOPE.md、tasks/poc/POC-004.md；现有api/storage类型、domain公共导出只读。

### Files
允许apps/web/demo/poc/api/**、apps/web/demo/poc/storage/**、tests/poc/mock-api.test.ts、tests/poc/storage.test.ts；新增evidence/poc/storage/fix-01/**、docs/reviews/FIX-POC-004-01-DSH.md。
不得修改公共Scenario Schema/事件协议/MockApi契约文档/domain/验证器/生成类型、依赖/配置、Tokens/业务UI/客户场景/public；不覆盖原报告与主控证据或改任务门禁。

### Implementation Requirements
1. getEvents返回可直接作为下一次afterSequence的游标，按现有exclusive-after语义返回本页最后sequence，结束为null。完整分页遍历全部事件且无遗漏/重复；limit1/2/100、末页均覆盖。
2. 存储envelope显式记录schemaVersion=1.0.0；检查版本、workflow/replay状态、必需数组/对象/游标/速度、session/domain id/version/hash与revision等一致性，不以浅层typeof放过损坏状态。缺版本或不支持版本明确SCHEMA_UNSUPPORTED或CORRUPT_SESSION，不静默迁移、清库或套新包。内部本地DTO可增加此已要求字段，不修改公共Scenario Schema。解析失败按契约错误返回。
3. 为IndexedDB和Memory提供不依赖正常session解析的原始恢复导出；原始坏记录、history、receipts保留可取。RecoveryExport允许内部typed discriminated envelope表示valid/corrupt/unsupported，raw payload用unknown，禁止any。getDownload(kind=run_record)在包缺失/变更/损坏时仍可导出带Mock标识的恢复JSON，不调用loadScenarioFor阻塞；其他业务命令继续锁定旧包。真正IO不可用时明确失败，不假导出。不要在导出时修复/删除原数据。
4. createSession与其他写命令保存完整原响应data/meta快照；相同key/body返回同一内容，即使之后revision变化/reset/包下线；同key不同body先返回IDEMPOTENCY_CONFLICT。校验请求基本结构与规范化body后先查receipt，再依赖可执行会话/包；事务内再次查receipt+CAS防并发。不能因预读绕过原子检查。创建回执不得只存sessionId然后返回当前状态。
5. MemoryStorage的输入、存储Map、输出、响应及receipt完全隔离，使用结构克隆等确定性手段。修改任何一次普通/重复create或mutate的返回对象不能改变已存session/history/receipt；即使调用方保留参数引用也不能事后改库。IndexedDB适配器也应满足同一契约。
6. getEntity(view=replay)不得返回操作模式的userVersion/deliveryDraft/attempt/record；已知用户实体返回ENTITY_NOT_REACHED等符合契约的不可见错误。getStageData和getEntity同一view使用统一可见性规则；不要靠前端隐藏来修复。
7. replayCommand按action严格限定字段：seek必须且只可带cursorSequence，setSpeed必须且只可带speed，play/pause/step/restart不许二者。拒绝无关/额外/非法值，错误不改revision/receipt。
8. 保留原26项有效测试，补每项主控复现。新增一个可重跑的真实Chromium存储smoke（源码可在evidence/poc/storage/fix-01/，非产品页面）：同源刷新恢复、两tab同revision CAS一成功一冲突、损坏记录原始导出；只用临时TEST_ONLY DB/QA页面，不写public/业务路由、不新增依赖。可用现有TypeScript转译和Playwright临时服务加载storage模块。沙盒浏览器路径不可用时在本机已安装Chromium环境复跑，不把fake-indexeddb当真实浏览器证据。

### Visual Specification
不开发产品UI，无视觉验收；浏览器QA页面仅承载真实IndexedDB验证。

### Data & API Contract
对外MockApi方法不新增；现有run_record作为恢复导出入口。Recovery JSON显式schemaVersion、mode=mock、恢复状态/错误说明，保留原始数据。SCHEMA_UNSUPPORTED/CORRUPT_SESSION/PACKAGE_CHANGED行为与契约一致；所有失败保留数据，不能变成200空对象。Replay仍不新增用户业务记录。

### Acceptance Criteria
分页得到全部21个技术事件；非法workflow不再ok返回；损坏/不支持版本/旧包均有可打开的原始导出；创建与写命令幂等重放原data/meta；修改返回对象不改存储；replay不可见用户对象；无关命令字段拒绝；fake-IDB与真实浏览器smoke有分别记录的实际结果。

### Test Commands
```powershell
npm run typecheck
npm run test:unit -- tests/poc/mock-api.test.ts tests/poc/storage.test.ts
```
另提交真实浏览器smoke准确命令/exitcode及源码、浏览器版本、结果JSON；未运行标NOT_RUN，不自行accepted。

### Expected Deliverables
白名单修复、回归测试、原始恢复导出样例、独立新证据、实际命令/exitcode、NOT_RUN/限制。无客户场景填充。

### Failure Conditions
丢事件、数据损坏/包变化无法导出、可变引用改库、幂等变当前状态、回放泄漏、宽松action参数、仅自报PASS、越权改契约或启动POC-005。

### Definition of Done
提交review，主控独立复跑后决定POC-004是否accepted。

### DeepSeek Execution Prompt
执行tasks/poc/fixes/FIX-POC-004-01.md。先读主控POC-004-MAIN及诊断JSON，仅改Files。修复分页游标、持久化版本/结构与原始恢复导出、receipt优先及创建原响应快照、Memory可变引用、replay本地实体可见性和action字段限制。保留原测试并补精确回归，在临时QA服务完成真实Chromium IndexedDB刷新/两tab CAS/原始导出smoke。只用现有依赖和TEST_ONLY数据；不改公共契约/domain/业务UI/客户场景，不覆盖旧证据、不自行accepted或启动POC-005。提交实际命令/exitcode、新证据与NOT_RUN。
