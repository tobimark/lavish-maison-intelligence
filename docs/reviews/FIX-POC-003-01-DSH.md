# FIX-POC-003-01 交付报告：操作重演、交付闭环与共享 guard

- 任务：[tasks/poc/fixes/FIX-POC-003-01.md](../../tasks/poc/fixes/FIX-POC-003-01.md)；依据 [POC-003-MAIN.md](POC-003-MAIN.md) 与主控探针。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；主控复查裁决。
- 状态：**review，未 accepted**。未启动 POC-004；未新增 UI/公共 Schema/事件协议/MockApi 契约/配置/依赖；只改 domain 白名单、状态机测试、新增 fix-01 证据与本报告。
- 数据来源：POC-001 accepted 的 TEST_ONLY 合成夹具（只读导入）；无客户业务数据、无客户媒体。

## 1. 主控六项观察的修复

| 观察 | 修复 | 证据/测试 |
|---|---|---|
| 首次确认前编辑脚本→确认失败 | `confirmScript` 不再用包内固定 `script.confirmed` entry ID 否决用户选择；派生稿/非 entry 已呈现稿均可确认，无匹配视频则 analysis completed + video stale | `confirmEditedBeforeFirstConfirmation.ok=true`；单测“derived script can be confirmed...”“non-entry...” |
| 视频完成后切回预置稿无法重演 | 操作模式事件消费改为 **stage+attempt 绑定源事件区间**（`sourceStartSequence/sourceEndSequence/lastSequence`），新 video attempt 从包内 video 事件起点重新消费；replay 游标不参与/不污染 | `restartVideoAfterReselect`：attempt1/2 均 completed，replayCursor=0 |
| 交付失败重试卡 running | simulateDelivery 只开始 running attempt；`advanceDeliveryAttempt` 到期结算；retry 用失败 attempt 原始快照创建新的 running attempt，可再次 advance 成功/失败 | 失败→retry→advance 成功；outcomes `[failed, simulated_delivered]`，旧 attempt 不变 |
| 排期前写成功记录 | pending attempt 保存 `scheduledVirtualMs`；到期前 advance 保持 running、0 记录；到期只结算一次 | start running/0 records；59999 running/0；60000 1 record |
| 回放可跳过 video.available | 共享 `videoOutputComplete` 要求 `availability==='available'` + `progress===100` + visible；queued/available 为独立 map；canonical event 校验拒绝改序/改 payload | queued 注入 completion → `CORRUPT_EVENT`；共享 guard 报“has not reached video.available” |
| 编辑来源 ID/素材类型漏检 | 以 `sourceScriptVersionId` 原始脚本为锚：shots/subtitles 数量、ID、顺序必须保持；每个 `shot.assetIds` 必须解析为 kind=`asset` | 改 shot/subtitle ID、product-as-asset → `INVALID_INPUT`，fieldErrors 精确到路径 |

## 2. 内部边界与类型（不新增对外 MockApi 端点）

- `DomainState` 新增 typed 字段：
  - `stageAttempts[].sourceStartSequence/sourceEndSequence/lastEventJson/lastAtMs`：attempt 绑定包内源事件位置；
  - `videoAvailability: Record<videoId,'queued'|'available'>` 与 `videoProgress`：queued ≠ available；
  - `pendingDeliveryAttempts: PendingDeliveryAttempt[]`：交付开始快照，与终态 `DeliveryAttempt`/`SimulatedDeliveryRecord` 隔离。
- 内部方法：`advanceDeliveryAttempt(state,pkg,{attemptId,virtualTimeMs,nowIso})`，由 POC-004 MockApi/本地虚拟时钟包装调用；不是新的对外端点。
- `simulateDelivery` 返回 `delivery: running`，保存 draft/video/script/attachments/recipientIds/subject/body/failureCase/scheduledVirtualMs 快照，不写成功/失败终态。
- `retryStage(delivery)` 使用失败终态 attempt 快照（默认 `failureCase=null` 成功路径；可选显式 `delivery_failed` 并按包内失败样例校验），创建新 running pending attempt；旧 attempt/记录不变。
- 未知 attempt、非当前 attempt、`NaN/Infinity`/负虚拟时间被拒绝；旧 settled attempt 不会结算当前 attempt。

## 3. 共享 guard 与操作/回放隔离

新增 [domain/guards.ts](../../apps/web/demo/poc/domain/guards.ts)，workflow 与 replay 共同使用：

- `stageStartIssue`：阶段顺序/前置阶段（operation/replay 入口差异只在 mode）。
- `discoveryOutputsComplete`：signals + trends 全部可见。
- `videoOutputComplete`：available + progress 100 + visible（queued 不足）。
- `canonicalEventIssue`：事件必须与包内同 sequence 的规范事件完全一致，拒绝改序/改 payload/atMs。
- `scriptAnchorIssues` / `assetReferenceIssues`：编辑锚点与 asset 类型。
- `videoBoundToScript`：脚本-预置视频版本绑定。

操作模式按 stageAttempt 源区间消费，相同 sequence 重复按 attempt `lastSequence/lastEventJson` 幂等，内容变化报 `CORRUPT_EVENT`；replay 使用独立全局 cursor，操作重演不修改 replay projection/cursor。

## 4. 实际命令与结果

| 命令 | exit | 结果 |
|---|---|---|
| `npm run typecheck` | **0** | 通过 |
| `npm run test:unit -- tests/poc/state-machine.test.ts` | **0** | **31 passed（约 0.32 s）** |
| 独立临时 probe（TEST_ONLY，生成 fix-01 JSON） | **0** | 六项观察均为修复后结果；见证据 |

测试覆盖（31 项，含原有效语义 + 新路径）：

- 首次确认前派生稿确认；非 entry 脚本确认；
- 完整 video 完成后 select preset/confirm/replay 全事件序列；
- delivery start → advance 前/到期结算；失败 → retry → advance 成功/再次失败；
- unknown/old/非当前 attempt、非法虚拟时间；
- queued 无 available 负测 + canonical 篡改；
- 编辑 shot/subtitle 锚点、product-as-asset、未知 asset、时间线 gap；
- replay 5 个 POC-001 checkpoint 字段一致；
- frozen package/state/attempt 不变量、history 前缀不变、旧 attempt/记录不变；
- reset 运行中原子 canceled + reset audit。

## 5. 证据

新证据目录：[evidence/poc/domain/fix-01/](../../evidence/poc/domain/fix-01/)

- [main-probe-after-fix.json](../../evidence/poc/domain/fix-01/main-probe-after-fix.json)：六项观察实际结果（confirm ok/stale、video attempt2、delivery running→completed、retry 成功、queued guard、edit rejected）。
- [README.md](../../evidence/poc/domain/fix-01/README.md)：数据来源、命令/exit、边界。
- 未覆盖 `evidence/poc/reviews/POC-003/main-probe.json` 或原 POC-003 报告。

## 6. 文件指纹

| 文件 | Bytes | SHA-256 |
|---|---:|---|
| `domain/types.ts` | 7,449 | `98b7917ba2520bb8c6f8fb522e82ac3373ef9c13d3dbf92d6ccd6ee75b6c3606` |
| `domain/core.ts` | 8,474 | `b8f7d69aeca25aba1d923852d97b2aebf7504b97d54b81f59f855d586eb9845b` |
| `domain/guards.ts` | 6,255 | `b332aa3a00c1c2cae8cb3ca2e390e62ba4a97d07fcbaac293694a111b3edb726` |
| `domain/replay.ts` | 14,716 | `4c6c942ce0f0f791ff5d64e9ebf8c561ffb0f16fe9fa34eb0fa617606f69502a` |
| `domain/workflow.ts` | 45,525 | `5f9aeb7c29510475db13e0aadb0823306cd9cdd3273a2f112b405c6f1eb5a952` |
| `domain/index.ts` | 129 | `c6846816fb56de691dc2c1061e35ee4389215a21bf2552db200fdb784ab36199` |
| `tests/poc/state-machine.test.ts` | 42,223 | `14b6e36cf5ca87872ddd8e361c0d2df32e08d696f4617d1c57d70645bd2107d4` |
| `evidence/poc/domain/fix-01/main-probe-after-fix.json` | 2,197 | `c680ccd8f005e84a51fb02108e2a0d34fd8284ebbdb8f93f52d56d5f2604b846` |
| `contracts/poc/scenario.schema.json`（只读） | 108,148 | `6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a` |
| `design/tokens.css`（只读） | 2,609 | `07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814` |

## 7. NOT_RUN / 已知限制

- **未实现 POC-004 持久化/MockApi 包装/页面**；`advanceDeliveryAttempt` 是内部纯函数，实际虚拟时钟调用由后续 MockApi 接入。无 UI/视觉验收。
- 无客户 A/B/C 包或真实媒体；真实 L5、ffprobe、内容审核 NOT_RUN。
- 全量 `npm run test:unit` 仍会误加载 TASK-007 Playwright spec（既有配置发现范围问题，主控已记录，不属本修复白名单）；本任务指定命令通过，未趁机改配置。
- 未改公共 Schema/事件协议/MockApi 契约/验证器/生成类型/依赖/Tokens/场景/public；未覆盖旧证据；未自行 accepted，未启动 POC-004。

## 8. 复现

```powershell
npm run typecheck
npm run test:unit -- tests/poc/state-machine.test.ts
```

纯 Node/Vitest，无浏览器、网络、服务器或客户数据。临时 probe 源码未保留在仓库，JSON 结果与 README 说明其数据来源/方法。
