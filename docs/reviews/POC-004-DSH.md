# POC-004 交付报告：统一 Mock API 与浏览器持久化

- 任务：[tasks/poc/POC-004.md](../../tasks/poc/POC-004.md)；依赖 POC-003 accepted。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；主控负责代码/功能复查。
- 状态：**review，未 accepted**；未启动 POC-005；未新增业务 UI、未改公共 Schema/Tokens/DESIGN_SYSTEM/客户场景/public；只改任务白名单（api/**、storage/**、两个测试、package 测试依赖、本报告）。
- 数据来源：POC-001 accepted 的 TEST_ONLY 合成夹具（测试只读导入）；无客户业务数据、无客户媒体。

## 1. 交付文件

| 文件 | 职责 |
|---|---|
| [api/types.ts](../../apps/web/demo/poc/api/types.ts) | `Result<T>`/`ApiError`/`ApiMeta`、CommandContext、SessionView、ScenarioSource、方法接口 |
| [api/mock-api.ts](../../apps/web/demo/poc/api/mock-api.ts) | 前端唯一业务入口 `BrowserMockApi`：全部 MOCK_API 方法、严格字段校验、Result/错误码、幂等+CAS 命令、事件消费、下载 |
| [api/index.ts](../../apps/web/demo/poc/api/index.ts) | API 入口 |
| [storage/types.ts](../../apps/web/demo/poc/storage/types.ts) | PersistedSession、Receipt、HistoryBundle、恢复导出、PocStorage 接口、持久化校验 |
| [storage/indexeddb.ts](../../apps/web/demo/poc/storage/indexeddb.ts) | IndexedDB `lavish-poc` v1：packages/sessions/commandReceipts/history；单 transaction CAS/幂等/历史写入；损坏隔离、配额/不可用错误 |
| [storage/memory.ts](../../apps/web/demo/poc/storage/memory.ts) | 显式内存模式，同 CAS/幂等语义，刷新丢失需明确提示 |
| [storage/index.ts](../../apps/web/demo/poc/storage/index.ts) | storage 入口 |
| [tests/poc/mock-api.test.ts](../../tests/poc/mock-api.test.ts) | 19 项 API/路由/幂等/下载/刷新/版本/重置/内存测试 |
| [tests/poc/storage.test.ts](../../tests/poc/storage.test.ts) | 7 项 IndexedDB/内存 CAS、两 tab、receipt、history、导出、损坏测试 |
| `package.json` / `package-lock.json` | 仅新增测试依赖 `fake-indexeddb@^6.2.4` |

## 2. 架构边界

- 组件只依赖 `MockApi`；API 是唯一业务入口，页面/组件不直接读 IndexedDB。
- `storage/**` 只被 `api/**` 使用；storage 不 import domain/React/DOM 页面，也不发起网络/外部服务。
- `api/**` 只使用 POC-003 domain reducer/guard 与只读 POC-001 验证器实体索引；没有新增第二套实体或状态转换。
- 大 MP4 不写 IndexedDB/localStorage；`getDownload` 从同源静态媒体适配器读取真实字节并计算 SHA-256。
- 下载 `delivery_bundle`（ZIP）明确返回 `MOCK_FAILURE`，POC-013 补齐；不伪造 ZIP。

## 3. MOCK API 实现

全部方法：`listScenarios`、`getScenario`、`createSession`、`listSessions`、`getSession`、`getStageData`、`getEntity`、`executeStage`、`workflowCommand`、`selectScript`、`saveScriptDraft`、`confirmScript`、`saveDeliveryDraft`、`simulateDelivery`、`retryStage`、`replayCommand`、`getEvents`、`getHistory`、`getDownload`、`resetSession`。

- **Result/meta**：`{ok:true,data,meta}` / `{ok:false,error:{code,message,fieldErrors,retryable},meta}`；meta 固定 `mode:'mock'`、`schemaVersion:'1.0.0'`、requestId、sessionId、revision。
- **严格字段**：每个请求/上下文拒绝额外字段；ScriptEditable 只允许 title/hook/message/cta/shots/subtitles/caption/hashtags；`retryStage` 只接收失败 attempt ID。
- **执行**：`executeStage` 调用 POC-003 domain 后按 stage+attempt 源事件区间消费 canonical 事件，停在分析确认/阶段终态；不调用外部服务，不自动确认。
- **人工边界**：`confirmScript`/`simulateDelivery` 由命令产生，不由 preset 事件驱动；`simulateDelivery` 开始 running pending，`virtualNow >= scheduledVirtualMs` 时通过内部 `advanceDeliveryAttempt` 结算；失败重试保留旧 attempt。
- **回放**：`replayCommand` play/pause/step/restart/seek/setSpeed 使用 POC-003 replay reducer；replay 不改用户 script/delivery attempt/history。
- **刷新**：`getSession` 返回 replay paused、无 running 时 workflowPlayback idle；不补算关闭期间时间。
- **可见数据**：`getStageData`/`getEntity` 返回 package 可见实体，并补充当前用户的 `userScriptVersion`、`deliveryDraft`、`deliveryAttempt`、`deliveryRecord`；preset AgentEvent 只通过 `getEvents` 暴露，`getHistory` 过滤掉 `event:*` 事件记录，保持“用户操作日志/预置事件”分离。
- **下载**：video/poster 真实 media 字节+sha256，script 当前版本 JSON，run_record 会话记录；video 需当前 video completed + available；ZIP 显式未实现。

## 4. 持久化与并发

IndexedDB `lavish-poc` version 1，四个 store：

- `packages`：包元信息（packageHash/scenarioId/version）；
- `sessions`：PersistedSession 全量；
- `commandReceipts`：按 `sessionId|operation|idempotencyKey`；
- `history`：每 session ActionRecord bundle。

`mutateSession` 在同一 readwrite transaction 内：

1. 先查 receipt：同 key 同 canonical body → 返回原 response/meta，不应用；同 key 不同 body → `IDEMPOTENCY_CONFLICT`；
2. 读取 session 比较 `expectedRevision`；过时 → `REVISION_CONFLICT`；
3. 执行纯 mutation，写 session/receipt/history 后 transaction 完成。

两个 tab 同 revision 并发写：IndexedDB 事务串行，只有一个成功，另一个收到 `REVISION_CONFLICT`；MemoryStorage 用串行 mutex 提供相同语义。所有失败不写成功 receipt/state。

- `createSession` 固定包 `packageHash`，使用独立 `creationKey` receipt；重复 key 不新建，不同 body conflict。
- 损坏 session：`validatePersistedSession`/读取时隔离并返回 `CORRUPT_SESSION`，不清库隐藏；`exportSession` 导出 session/history/receipts 供恢复。
- 配额/不可用：IDB transaction/put 错误映射 `STORAGE_QUOTA`/`STORAGE_UNAVAILABLE`，不返回已保存。
- 内存模式：显式 `MemoryStorage`，SessionView `storageMode:'memory'`；无静默 fallback。

## 5. 实际命令与结果

| 命令 | exit | 结果 |
|---|---|---|
| `npm run typecheck` | **0** | 通过 |
| `npm run test:unit -- tests/poc/mock-api.test.ts tests/poc/storage.test.ts` | **0** | **26 passed（19 API + 7 storage，约 0.39 s）** |

测试覆盖摘要：

- list/getScenario/createSession 固定包 hash；重复 creationKey；非 ready 拒绝；
- 读方法不改 revision；future entity `ENTITY_NOT_REACHED`；
- executeStage 自动消费 canonical 事件到分析确认/阶段终态；save/confirm/select/video 全路径；
- simulateDelivery 排期前 running、到期结算；失败→retry→成功；重复 key 原响应/meta；重复 delivery 不重复记录；
- 两 session 隔离；两 tab 同 revision 并发一成功一冲突；同 key 同 body 重放、不同 body 冲突；
- IndexedDB 刷新恢复同 revision 且 replay paused；packageHash 变化 `PACKAGE_CHANGED`；
- reset 只清当前 session，其他 session 不变，保留 reset audit；
- replay play/pause/step/restart/seek/setSpeed、getEvents 分页、下载真实字节/hash、ZIP 明确错误；
- 严格字段/额外字段/非法 revision；storage quota 代理不报告已保存；损坏 session 隔离 + 导出；
- MemoryStorage 模式提示与 CAS/idempotency。

## 6. 证据与文件指纹

测试为纯 Node/Vitest（fake-indexeddb 模拟 IndexedDB），无浏览器/网络/客户数据。

| 文件 | Bytes | SHA-256 |
|---|---:|---|
| `api/types.ts` | 6,689 | `5f863987b74077f24b2646a0b068fbac606978e00b0af25abcc754b29e42cac5` |
| `api/mock-api.ts` | 49,406 | `2c3f93600bb4b4956bdcc0f8d315cb6951d1966515ce05467ddbb8aef51babd4` |
| `api/index.ts` | 53 | `c3f19cb54477cfe163bedc835470bda4865914e4a09a1023ff560a372f9c00d9` |
| `storage/types.ts` | 5,019 | `5bcb56e01a77a599bfe8b961bc938ec303d69e8bf9f0e69fbc27cb7453175bef` |
| `storage/indexeddb.ts` | 13,442 | `7cba2d73fb4bddf18e8aa91bf8a4831348c39bda3c53aeb185f130c57d32dbe5` |
| `storage/memory.ts` | 7,441 | `9a54f87fb32989fb043c6990645f563d0b59ebb7fd15b0fbfa7cfbb59c0da8ee` |
| `storage/index.ts` | 80 | `c74d71f3206ab33f34001b8bf4849e957b6719e08793df5f827ae73184d87fdf` |
| `tests/poc/mock-api.test.ts` | 25,643 | `628f678de054bfe58db34fcc0998ae3707dcee1705212c928673fda0721c9554` |
| `tests/poc/storage.test.ts` | 9,849 | `98ccc027e76c732e053524b525fae1f997fea6440d44a3bec0fa4f72e90c17ad` |
| `package.json` | 1,317 | `bbf4369c23542d4e13f4462508ffdc06557f52afbc3ae62ac2b6964467e666fa` |
| `package-lock.json` | 78,954 | `f91ed046bc65d90263c1d76118f1abaa6eeb74c64a3c149f6d7dc8dd54e28020` |
| Schema（只读） | 108,148 | `6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a` |
| Tokens（只读） | 2,609 | `07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814` |

## 7. NOT_RUN / 已知限制

- **未做真实浏览器 IndexedDB/刷新测试**：使用 `fake-indexeddb` 验证单事务/并发/损坏；真实浏览器持久化、两 tab 广播、配额 UI 属后续浏览器验收。
- **无客户 A/B/C 场景/媒体**：测试只使用 POC-001 TEST_ONLY 夹具；真实 L5、ffprobe、内容审核、下载真实客户媒体 NOT_RUN。
- **`delivery_bundle` ZIP 未实现**：按任务明确由 POC-013 补齐，返回 `MOCK_FAILURE`。
- **回放 clock/seek 的 UI 推进** 与 `advanceDeliveryAttempt` 的实际虚拟时钟接线待 POC-005；POC-004 暴露注入 `virtualNow`，未新增对外 MockApi 方法。
- 无业务页面/视觉验收（M1 仍待门禁）；未启动 POC-005；未自行 accepted。
- 全量 `npm run test:unit` 仍存在 TASK-007 Playwright spec 误加载的既有配置问题；本任务仅执行指定两个测试，未扩大白名单改配置。

## 8. 复现

```powershell
npm run typecheck
npm run test:unit -- tests/poc/mock-api.test.ts tests/poc/storage.test.ts
```

`fake-indexeddb` 仅作为测试依赖；浏览器实际 IndexedDB 由 `IndexedDbStorage` 适配器使用。
