# POC-004 主控复查 · changes_requested

2026-11-04。裁决：**不accepted，先修复FIX-POC-004-01；POC-005未启动**。

主控实际运行：typecheck exit0；两个指定测试26 passed、exit0（713ms）。已检查api/storage实现并用独立TEST_ONLY探针实际复现下列问题。诊断源码evidence/poc/reviews/POC-004/main-probe.test.ts与main-probe.json可重放；诊断脚本exit0仅表示观察已记录，不代表功能验收通过。

## 发现

1. **P1：分页丢事件。** getEvents按sequence>afterSequence筛选，却返回last.sequence+1作nextSequence。21条事件、limit2，按返回游标继续请求得到1,2,4,5,7,8...19,20，丢失3/6/9/12/15/18/21。应定义nextSequence为下次afterSequence的值（本页最后sequence），与现有请求语义一致。
2. **P1：损坏/不兼容记录的识别和恢复导出不成立。** validatePersistedSession放过workflow.video=INVALID_STATE，getSession以ok:true返回。持久化记录未保存schemaVersion，核心域字段/版本关系缺验证。删除state.history后能报CORRUPT_SESSION，但IndexedDbStorage.exportSession又调用同一严格getSession，因此无法导出原始损坏数据；包hash变化时getDownload(run_record)也先loadScenarioFor，PACKAGE_CHANGED阻止导出。错误提示承诺导出，实际无恢复路径。
3. **P2：幂等响应及检查顺序不符合契约。** createSession同creationKey在一次业务操作后返回revision1而非原revision0；其receipt只存sessionId并重读当前会话。runCommand在查receipt前先loadScenarioFor，旧命令已成功但包变化后重试返回PACKAGE_CHANGED而非原响应。需在原子写入中保存原data/meta快照，重复先读回执，同key不同body仍冲突。
4. **P1：MemoryStorage暴露内部引用，可绕过事务改状态。** 重复createSession返回的workflow直接引用sessions Map。主控修改返回对象workflow.video，之后storage.getSession读到同样变化，revision/receipt/history均未更新。读结果、写响应、幂等回执均需隔离快照，不能借调用方对象原位修改持久化状态。
5. **P2：回放查询泄漏用户操作版本。** getEntity先findLocalEntity，不区分view；回放cursor0查询用户保存的派生稿返回ok:true。与getStageData(replay)不返回localEntities的行为矛盾，破坏回放/操作隔离。
6. **P2：ReplayCommand仍接受无关参数。** 实测`{action:'pause',speed:2}`成功。契约要求discriminated command：seek只允许cursorSequence，setSpeed只允许speed，其他action不能携带二者。

## 保留边界

CAS/transaction/幂等写路径已有测试价值，应保留；ZIP明确未实现符合POC-013边界。虚拟clock接线仍属POC-005，本次不要求提前实现。fake-indexeddb测试不能声明真实浏览器刷新/两tab通过；修复后补一个限定存储smoke实际验证。无产品UI/视觉验收，无客户数据或外部服务。

全量Vitest发现范围问题继续单独记录，本修复不改依赖或测试配置。只处理当前API/storage边界，禁止让后续页面绕过这些错误自行读DB或维护第二份状态。
