# FIX-POC-004-01 交付报告：API 隔离、幂等与可恢复持久化

- 任务：[tasks/poc/fixes/FIX-POC-004-01.md](../../tasks/poc/fixes/FIX-POC-004-01.md)；依据 [POC-004-MAIN.md](POC-004-MAIN.md) 与主控 main-probe。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；POC-003 已 accepted，POC-005 未启动。
- 状态：**review，未 accepted**；未新增业务 UI、未改公共 Schema/事件协议/MockApi 契约/domain/验证器/生成类型/依赖/配置/Tokens/客户场景/public；未覆盖原 POC-004 报告或主控证据。
- 数据来源：POC-001 accepted 的 TEST_ONLY 合成夹具；真实 Chromium smoke 只使用临时 TEST_ONLY DB/QA 页面；无客户数据/媒体。

## 1. 六项主控发现的修复

| 发现 | 修复 | 回归证据 |
|---|---|---|
| 分页丢事件 | `getEvents` 的 `nextSequence` 返回本页最后 sequence（可直接作为下一次 `afterSequence`），结束为 null；exclusive-after 语义不变 | 21 条事件以 limit 1/2/100 完整遍历，无遗漏/重复 |
| 损坏/不支持记录识别与恢复 | 持久化 envelope 增加 `schemaVersion:'1.0.0'`；深度校验 workflow 状态、replay/projection、数组、游标、速度、session/domain id/version/hash、`state.revision===envelope.revision` 等；缺/不支持版本 `SCHEMA_UNSUPPORTED`，结构错误 `CORRUPT_SESSION` | 非法 `video:'INVALID_STATE'` 不再 ok；raw corrupt/unsupported export 均可打开 |
| 原始恢复导出 | `exportSession` 直接读取原始 sessions/history/receipts，不经过正常 session 解析；`RecoveryExport` 为 typed `valid/corrupt/unsupported` envelope（raw payload `unknown`，无 any）；JSON 含 schemaVersion/mode/status/error/raw/history/receipts | 损坏状态/旧包均可导出；正常读仍报错，不修复/删除原数据 |
| 包变化/损坏时 run_record | `getDownload(kind:'run_record')` 直接走原始恢复导出，不调用 `loadScenarioFor`；其他业务命令继续锁定旧包 | 包 hash 变化/损坏 session 下 run_record 成功，内容含 `recoveryStatus` 与原始 session |
| 幂等响应/检查顺序 | 写命令先规范化请求体并查 receipt，再加载 session/包；事务内再次查 receipt + CAS。receipt 保存完整 `data/meta` 快照；createSession 也保存原始 revision-0 响应，重复 key/body 不读当前状态 | 创建后业务命令再重复 create 仍返回 revision 0 原响应；包变化后重复命令返回原 response/meta 而非 `PACKAGE_CHANGED`；同 key 不同 body 仍 `IDEMPOTENCY_CONFLICT` |
| MemoryStorage 可被外部改库 | create/mutate/get/list/receipt/history/export 的输入/Map/输出/响应全部结构化克隆隔离；IndexedDB 仍由 structured clone 保证同一契约 | 修改重复 create 返回对象、mutate 返回 next/response/receipt、getSession 返回对象均不影响已存 session/history/receipt |
| replay 泄漏用户实体 | `getEntity(view=replay)` 对 userVersion/draft/attempt/record 返回 `ENTITY_NOT_REACHED`；`getStageData(replay)` 不返回 localEntities；view 规则统一 | 用户派生稿 workflow visible，replay 不可见 |
| replayCommand 无关参数 | 按 action 严格 discriminated：seek 只允许 `cursorSequence`，setSpeed 只允许 `speed`，play/pause/step/restart 不允许二者；非法字段不写 revision/receipt | pause+speed、seek+speed、setSpeed+cursor 等全部 `INVALID_INPUT`，revision 不变 |

## 2. 真实 Chromium 存储 smoke

临时 Vite dev server（仅本地、无产品路由/页面）+ Playwright Chromium：

```powershell
npx vite --host 127.0.0.1 --port 5179 --strictPort
node evidence/poc/storage/fix-01/smoke.mjs
```

实际结果（exit **0**，Chromium **156.0.8078.4**）：

- 同源刷新：session 创建→mutate revision1→reload→storage 恢复 revision1；
- 两 tab 同 revision0 并发不同 key：**1 success + 1 REVISION_CONFLICT**，最终 revision1；
- 原始损坏：改写 raw session workflow 为 `INVALID_STATE` 后，正常读报 `CORRUPT_SESSION`；`exportSession` 返回 `status:'corrupt'`、错误码 `CORRUPT_SESSION`、原始 invalid workflow、receipt 保留。

源码/结果：[evidence/poc/storage/fix-01/](../../evidence/poc/storage/fix-01/)。
fake-indexeddb 测试与真实 Chromium smoke 分别记录，不把 fake-IDB 当真实浏览器证据。

## 3. 实际命令与结果

| 命令 | exit | 结果 |
|---|---|---|
| `npm run typecheck` | **0** | 通过 |
| `npm run test:unit -- tests/poc/mock-api.test.ts tests/poc/storage.test.ts` | **0** | **32 passed（24 API + 8 storage）** |
| 真实 Chromium smoke | **0** | 刷新/两 tab CAS/raw corrupt export 全通过 |

测试追加覆盖：

- 21 事件完整分页（limit 1/2/100、末页/null）；
- 非法 workflow / 缺 schema / 不支持版本 / raw corrupt export；
- package changed 后重复命令与 run_record 原始导出；
- createSession/写命令原 response+meta 快照；同 key 不同 body；
- Memory 返回对象/响应/receipt 隔离；
- replay userVersion/draft/attempt/record 不可见；
- replay action 字段白名单；
- 原 26 项有效语义保留（其中 create/memory 测试按新 envelope 更新）。

## 4. 文件与指纹

| 文件 | Bytes | SHA-256 |
|---|---:|---|
| `api/types.ts` | 6,689 | `5f863987b74077f24b2646a0b068fbac606978e00b0af25abcc754b29e42cac5` |
| `api/mock-api.ts` | 52,913 | `560429b50cfddf266fbed9b561282b2490342ec4da4105c3be8c392e78b9f468` |
| `api/index.ts` | 53 | `c3f19cb54477cfe163bedc835470bda4865914e4a09a1023ff560a372f9c00d9` |
| `storage/types.ts` | 14,229 | `657b9127dbd8aa38e744cc9669c9df8f8006b63a74eb8b0c37769f9318ee84ed` |
| `storage/indexeddb.ts` | 14,905 | `6fe8de44850f58e0c3afd98556e445e3fae0d3c340f43616da3383c94740b38e` |
| `storage/memory.ts` | 8,648 | `34a4b32b22b4ba9debc5238b2fb68d7e92044d65fe2e310955b255d94c1b18f9` |
| `storage/index.ts` | 80 | `c74d71f3206ab33f34001b8bf4849e957b6719e08793df5f827ae73184d87fdf` |
| `tests/poc/mock-api.test.ts` | 32,643 | `2b5a67fd3cd24e69ddaa17c5782a927afad3e8cd109df1e954c970da8c961131` |
| `tests/poc/storage.test.ts` | 13,268 | `13eb78b9acd6ed7f96d2e53e934a3330740e3595522ea74c89230781734d5995` |
| `evidence/.../browser-smoke.json` | 1,530 | `dd57a398b5b16fceb510267e56181e4802ed46ed65ac1def9176902b6bda9a22` |
| `evidence/.../qa.ts` | 5,064 | `ca48a8226175ff8e214b13ff14a3e5e349d46c77156a478d4b48fd6dc1fdf90c` |
| `evidence/.../smoke.mjs` | 3,660 | `bc844a554cb59fa5075d1cda9b64674fd539628bad7b36aed186b8f098c63d8e` |
| Schema（只读） | 108,148 | `6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a` |
| Tokens（只读） | 2,609 | `07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814` |

## 5. NOT_RUN / 边界

- 真实浏览器 smoke 仅存储边界，不是产品页面/视觉验收；M1 仍未通过。未新增 public/业务路由/客户内容。
- 无客户 A/B/C 场景/媒体；真实 L5、ffprobe、内容审核 NOT_RUN。
- `delivery_bundle` ZIP 仍按 POC-013 未实现，返回明确 `MOCK_FAILURE`。
- 回放 clock/seek UI 接线、`advanceDeliveryAttempt` 实际虚拟时钟属 POC-005；本次未新增对外 MockApi 方法。
- 全量 Vitest 的 TASK-007 Playwright spec 误加载问题未改配置；指定测试通过。
- 未修改公共契约/domain/验证器/生成类型/依赖/配置；未自行 accepted，未启动 POC-005。

## 6. 复现

```powershell
npm run typecheck
npm run test:unit -- tests/poc/mock-api.test.ts tests/poc/storage.test.ts

# 真实 Chromium smoke（临时本地 Vite，仅 evidence QA 页面）
npx vite --host 127.0.0.1 --port 5179 --strictPort
node evidence/poc/storage/fix-01/smoke.mjs
```
