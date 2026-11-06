# POC-003 交付报告：四阶段纯状态机

- 任务：[tasks/poc/POC-003.md](../../tasks/poc/POC-003.md)；依赖 POC-001 accepted。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；主控负责代码/功能复查。
- 状态：**review，未 accepted**。未启动 POC-004；未新增业务 UI、未修改公共 Schema/Tokens/DESIGN_SYSTEM/依赖/配置/场景/public；仅改任务白名单文件。
- 范围：纯领域 reducer、版本失效、typed guards、workflow/replay 分离；不包含持久化 API、页面、虚拟 clock 播放器。

## 1. 交付文件

| 文件 | 职责 |
|---|---|
| [apps/web/demo/poc/domain/types.ts](../../apps/web/demo/poc/domain/types.ts) | 领域类型、StageStatus/Attempt/Draft/History/ReplayProjection、`DomainResult<T>`；实体类型全部复用 POC-001 生成类型 |
| [apps/web/demo/poc/domain/core.ts](../../apps/web/demo/poc/domain/core.ts) | 初始 workflow、不可变 history、typed error、POC-001 实体索引/脚本语义复用、脚本草稿校验、可见实体展开 |
| [apps/web/demo/poc/domain/workflow.ts](../../apps/web/demo/poc/domain/workflow.ts) | 操作模式命令/事件：executeStage、presented 事件、confirmScript、saveScriptDraft/selectScript、saveDeliveryDraft、simulateDelivery、failStage、retryStage、resetSession |
| [apps/web/demo/poc/domain/replay.ts](../../apps/web/demo/poc/domain/replay.ts) | 纯 replay reducer、cursor/atMs/sequence 校验、重复投递幂等、同 sequence 内容冲突、projection checkpoint、transport 独立状态 |
| [apps/web/demo/poc/domain/index.ts](../../apps/web/demo/poc/domain/index.ts) | 领域公共入口 |
| [tests/poc/state-machine.test.ts](../../tests/poc/state-machine.test.ts) | **23 项**纯领域测试（原合法/非法/失效/重复/重试/不可变 + POC-001 checkpoint 对照） |

未改：`contracts/poc/scenario.schema.json`、`apps/web/demo/poc/generated/**`、POC-001 验证器/证据、媒体工具/证据、Tokens/设计、业务页面、场景数据、依赖配置。

## 2. 状态机实现映射

| POC_STATE_MACHINES 行 | 实现 | 测试 |
|---|---|---|
| `executeStage(discovery/analysis/video)` | 前置状态/阶段依赖/脚本视频绑定 guard；创建 stageAttempt；不自动跨人工边界 | discovery 合法；analysis 提前/跨阶段非法；video 需 confirmed script |
| discovery completed | 要求全部 signal/trend 已 visible；discovery completed + analysis ready；attempt completed | 未展示 trend 时 completion 被拒 |
| script presented | analysis running→awaiting_confirmation；多语言版本呈现；不自动确认 | analysis 停在 awaiting；video locked |
| `confirmScript` | 绑定当前 presented/active script；分析结构有效；匹配预置 video→ready，否则 video stale + 警告；消费包内确认游标位置 | 错脚本拒绝；用户草稿无成片 stale |
| video completed | 要求 running、active video 已 `video.available` 暴露；video completed + delivery ready | 提前 completion 被拒；完整事件链通过 |
| `saveDeliveryDraft` | 仅 ready/awaiting/failed；成片/script 精确匹配；`.invalid` 收件人；附件必须含当前 MP4；编辑生成新 revision 并撤销旧确认 | 空 subject 拒绝；附件/收件人快照精确 |
| `simulateDelivery` | 仅 awaiting_confirmation；人工确认精确 draft/video/script；成功写不可变 Simulated record；失败样例显式 failed attempt | 错视频拒绝；成功记录快照；重复确认拒绝 |
| 运行失败 / `retryStage` | running→failed 保存原因/attempt；失败→running 新 attempt，保留旧 attempt；禁止并行重试 | video 失败重试新旧 attempt；delivery 失败 attempt |
| `saveScriptDraft` / `selectScript` | 新 ID（一字修改也新 ID）；父/源版本保留；video/delivery→stale；清 video/draft 指针；历史保留 | 一字修改新 ID、stale、回选预置再确认 |
| `resetSession` | 显式 `RESET_THIS_SESSION`；running attempt 原子 canceled；清派生数据但保留 reset 审计；不触碰其他 session | 未确认拒绝；运行中 reset 产生 canceled/reset |
| replay | 同状态枚举；允许包内 confirmed/queued；sequence 连续、atMs 非递减；重复同事件幂等、同 sequence 内容变化/CORRUPT；transport 独立 | 全 5 个 POC-001 checkpoint 字段一致；重复/缺口/corrupt 负测 |

## 3. 关键设计

### 3.1 统一 reducer 与 workflow/replay 分离

- workflow 的 `workflowCursor`、`workflowVisibleEntityIds`、`stageAttempts`、用户 drafts/userVersions 与 replay 的 `ReplayState.projection` 完全分离。
- 同一组事件语义由 workflow 事件处理与 replay reducer 分别实现共享状态枚举/visible/active 规则，但 replay 不读取/修改用户 workflow；workflow 拒绝 `script.confirmed`、`delivery.queued`、`delivery.simulated`（REPLAY_ONLY_EVENT）。
- transport（idle/playing/paused/ended/error）只是 replay 字段，不改变 workflow。

### 3.2 版本失效与确认边界

- 编辑脚本产生 `usr.<session>.script.<n>` 新 ID，即使只改一个字符；`parentVersionId/sourceScriptVersionId` 保留，旧包脚本只读。
- 编辑/切换后 `video/delivery → stale`，清 `activeVideoId/deliveryDraftId`；旧 MP4 不能被当作新稿成片。
- `confirmScript` 是 analysis 唯一完成路径；`simulateDelivery` 必须已有保存的 draft 且精确确认 video/script；`video` 只能消费确认后的预置视频。

### 3.3 typed guards 与不可变

- 每个命令返回 `DomainResult<DomainState>`；错误码含 `INVALID_TRANSITION / INVALID_INPUT / NOT_FOUND / VIDEO_VERSION_MISMATCH / CONFIRMATION_REQUIRED / CORRUPT_EVENT / REPLAY_ONLY_EVENT`。
- 所有命令只读输入；新建 state/数组/history；测试对 package + state 做 `deepFreeze` 后调用命令，JSON 与旧 history 引用不变。
- attempt/draft/record 均快照 script/video/attachment/recipient；旧 attempt 与旧 delivered record 不被重写。

### 3.4 复用 POC-001

- 实体读取/存在性通过 POC-001 `collectEntityIndex`；脚本内容校验调用 POC-001 `validateScriptTimelineAndVideos`，再补 editable 字段/asset refs，未维护第二套实体结构。
- 所有类型来自 `apps/web/demo/poc/generated/scenario.types`。

### 3.5 纯度

- 领域目录及测试中无 `Date.now`/`Date(...)`/`Math.random`/DOM/window/fetch/IndexedDB/localStorage；时间全部由 `nowIso/virtualMs/atMs` 入参提供，ID 由 session + 单调 ordinal 生成。
- 无外部平台/LLM/视频生成/邮件/网络调用。

## 4. 实际命令与结果

| 命令 | exit | 结果 |
|---|---|---|
| `npm run typecheck` | **0** | 通过 |
| `npm run test:unit -- tests/poc/state-machine.test.ts` | **0** | **23 passed（约 0.31 s）** |
| POC-001 expected checkpoint 对照 | 测试内通过 | cursor 0/4/11/17/21 的 workflow、visibleEntityIds、activeScriptVersionId、activeVideoId、deliveryRecordIds 全部一致 |

测试覆盖摘要：

- 5 个阶段 checkpoint 与 POC-001 expected 完全一致；
- discovery/analysis/video 合法转换与提前/跨阶段非法跳转；
- script 不匹配 `VIDEO_VERSION_MISMATCH`（video/plan 两处）；
- 一字编辑新 ID、video/delivery stale、旧交付确认失效；
- 失败 attempt + retry，新 attempt ordinal=2 且旧 attempt 不变；
- 同事件重复：同 sequence/id/内容幂等，同 sequence 不同内容 → `CORRUPT_EVENT`；缺口/乱序/atMs 回退拒绝；
- frozen package/state 无原位修改；history 前缀与旧记录不变；
- reset 运行中原子 canceled + reset audit；
- 附件/收件人 `.invalid` 精确绑定；
- POC-001 语义校验拒绝不连续 shot 和未知 asset。

### 全量测试说明

按任务指定命令执行 `tests/poc/state-machine.test.ts` 通过。另执行全量 `npm run test:unit` 时，Vitest 会误加载 TASK-007 的 `apps/web/tests/*.spec.ts`（Playwright `test.beforeAll` 在 Vitest 下报错，属既有待审任务配置，不在 POC-003 白名单）；其中已加载的 72 个单元测试通过（POC-001 24 + POC-002 25 + POC-003 23）。未修改该配置。

## 5. 文件指纹

| 文件 | Bytes | SHA-256 |
|---|---:|---|
| `apps/web/demo/poc/domain/types.ts` | 6,192 | `f9b81ac5b045602a9384ef2daacc3ee58534b9f2c1059237ec2934fb21bcc5a7` |
| `apps/web/demo/poc/domain/core.ts` | 8,659 | `90675384a5bbc9da51080b83b506d1aaf7542b6ad5390be56f11e89101020a07` |
| `apps/web/demo/poc/domain/replay.ts` | 13,360 | `c33834fd65fdfe79470e103e9d4465602223807e01c8f9c947116e2c6510f7bd` |
| `apps/web/demo/poc/domain/workflow.ts` | 38,664 | `a2390829488e577874bc376a038562afd8cc5cfb64979847d6e106788352d459` |
| `apps/web/demo/poc/domain/index.ts` | 103 | `738c8ae4ef7482848a1d7bfbb368150f7c6e9bcf65a387cdb899bc0fc0849a03` |
| `tests/poc/state-machine.test.ts` | 29,209 | `6d5e0a4d89a784a6ee19622985cc1fece593274a247168fc47d87d3ece394eab` |
| `contracts/poc/scenario.schema.json`（只读） | 108,148 | `6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a` |
| `design/tokens.css`（只读） | 2,609 | `07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814` |

## 6. 数据来源与未运行项

- 数据来源：POC-001 accepted 的 `tests/fixtures/poc/build-fixture.ts` 生成的 **TEST_ONLY** 合成技术包（EN/AR 脚本、事件、失败 delivery record、`.invalid` recipient），测试中只读导入；没有生成客户业务数据、没有客户场景包/真实媒体。
- **未运行 / 不在本任务**：持久化 IndexedDB/会话恢复、Mock API 方法层（POC-004）、真实回放 clock/seek UI（POC-005）、业务页面与浏览器视觉验收（M1）、真实客户媒体 L5、ffprobe、邮件/外呼。无 UI 改动。
- 内容依赖：POC-003 只实现领域逻辑；未用空客户测试数据冒充客户内容；真实场景到齐后由后续任务使用同一 reducer。
- 未修改 TASK-007/M1 门禁；本轮仅提交 review，不自动 accepted，不启动 POC-004。

## 7. 复现

```powershell
npm run typecheck
npm run test:unit -- tests/poc/state-machine.test.ts
```

测试为纯 Node/Vitest，不需要 Web 服务、浏览器、网络或 ffprobe。
