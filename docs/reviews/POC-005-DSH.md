# POC-005 交付报告：确定性回放与操作隔离

- 任务：[tasks/poc/POC-005.md](../../tasks/poc/POC-005.md)；同批交付 POC-007；依据 [DEMO_DELIVERY_POLICY](../../docs/DEMO_DELIVERY_POLICY.md)。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；POC-003/POC-004 已 accepted。
- 状态：**review，未 accepted**；未启动 POC-006/008；未改公共 Schema、Tokens、DESIGN_SYSTEM、domain、生成类型、依赖/配置或客户内容。
- 数据来源：POC-001 accepted 的 TEST_ONLY 合成夹具；技术证据在 `evidence/poc/replay/**`。无客户场景/媒体。

## 1. 交付内容

| 文件 | 内容 |
|---|---|
| [replay/checkpoint.ts](../../apps/web/demo/poc/replay/checkpoint.ts) | 用 POC-003 `reduceReplay` 生成 checkpoint projection；canonical JSON（排除墙钟/速度/事件文本）与 SHA-256；五处 expected checkpoint 对比；确定性虚拟时钟 helper |
| [replay/index.ts](../../apps/web/demo/poc/replay/index.ts) | replay 公共入口 |
| [replay/node-loader.mjs](../../apps/web/demo/poc/replay/node-loader.mjs) / [register.mjs](../../apps/web/demo/poc/replay/register.mjs) | 校验器 Node bridge：内存转译同一 `domain/replay.ts`，不写构建产物 |
| [api/types.ts](../../apps/web/demo/poc/api/types.ts) / [api/mock-api.ts](../../apps/web/demo/poc/api/mock-api.ts) | 增加 `advanceReplay(ctx,{targetVirtualMs})`：按虚拟时间消费到目标 sequence，复用同一 reducer；只改 replay projection/replayRuntime，不写用户交付/稿件 |
| [validation/semantic-rules.mjs](../../apps/web/demo/poc/validation/semantic-rules.mjs) | L3 checkpoint 投影适配：接收同一 reducer，逐项比较 workflow/visible/active/records；默认保留 NOT_RUN 兼容 POC-001 回归 |
| [scripts/poc/validate-scenario.mjs](../../scripts/poc/validate-scenario.mjs) | `--replay` 接线：动态加载同一 TypeScript reducer；L3 pass/fail/not_run 真实反映投影结果 |
| [tests/poc/replay.test.ts](../../tests/poc/replay.test.ts) | 8 项回放/checkpoint/API/CLI 测试 |

## 2. 实现要点

- checkpoints：fixture 5 个 checkpoint（cursor 0/4/11/17/21）全部由同一 reducer 生成并逐字段一致；`compareCheckpointProjections` 返回 0 issue。
- 控制：play/pause/step/seek/restart/setSpeed 复用 POC-004 API；`advanceReplay` 以目标虚拟毫秒找最后 `atMs ≤ target` 的 sequence，再用 `reduceReplay` 冻结投影；速度只由调用方 wall→virtual 映射，reducer/投影/哈希不受速度影响。
- 哈希：direct seek 21、逐 step 21 次、重复 seek、restart+seek、1×/2×/4× 后同 cursor 的 canonical projection/hash 一致。
- 隔离：回放只写 replay state 与 replayRuntime；`deliveryAttempts`、`userVersions`、`history` 不新增；两 session cursor 独立。
- 刷新：`getSession` 视图 replay transport 为 paused；不补算关闭时间。
- 幂等：相同 event/sequence 二次投递投影不变；同 sequence 不同内容 `CORRUPT_EVENT`。
- 校验器：`node scripts/poc/validate-scenario.mjs --dir <TEST_ONLY fixture> --replay` 真实调用同一 reducer，L3 返回 pass、`checkpointProjection.checked=5`。L4 因临时 fixture 没有 public/scenario-media 正确失败；L5 无 media report 为 NOT_RUN；不声称 runnable。

## 3. 实际命令与结果

| 命令 | exit | 结果 |
|---|---|---|
| `npm run typecheck` | **0** | 通过 |
| `npm run test:unit -- tests/poc/replay.test.ts` | **0** | **8 passed** |
| `npm run test:unit -- tests/poc/replay.test.ts tests/poc/mock-api.test.ts tests/poc/storage.test.ts tests/poc/validation.test.ts` | **0** | **64 passed**（8 replay + 24 API + 8 storage + 24 POC-001） |
| `npm run build` | **0** | Next 静态构建通过 |
| 校验器 `--replay`（TEST_ONLY temp fixture） | 1（L4 媒体缺失） | L1/L2/L3 pass；L4 fail（fixture 无 public 媒体）；L5 not_run；L3 checkpointProjection pass/5 |

实际 L3 证据：[evidence/poc/replay/validator-report.json](../../evidence/poc/replay/validator-report.json)（`L3=pass`，`checkpointProjection:{status:'pass',checked:5}`，L4 MEDIA_MISSING 为临时 fixture 缺媒体，不是回放失败）。

## 4. 关键指纹

| 文件 | Bytes | SHA-256 |
|---|---:|---|
| `replay/checkpoint.ts` | 5,672 | `68e9db6c03a02811c26060e473f85cc022693fa92732089876fdda3fb9e67b2a` |
| `replay/node-loader.mjs` | 1,697 | `27ad422c7afb0d44d4a0601be0af0fb9276d95594d3f526e339f95f08bd402c3` |
| `api/types.ts` | 6,961 | `70032115680d95c9674e39ed526c39aa30d674aead56d98e17a8d564a85886b0` |
| `api/mock-api.ts` | 54,817 | `a1ce9b443e7bce3e33bc6d5b2245436cbe137aeedecc9929841c50a309c952b7` |
| `validation/semantic-rules.mjs` | 72,472 | `a764ca3188a5a5d22a60230ab34d96cb9281fc35a17df3e1c171894b476bb391` |
| `scripts/poc/validate-scenario.mjs` | 26,528 | `03b9c50d2abd66109b589454a61ed0e1f5c99ef0c9ded54b120c2609493ca27c` |
| `tests/poc/replay.test.ts` | 10,619 | `a03624e1ccdd009466db5f0ac2b5ac2d4321b20033797a2f2402dd28703f69da` |
| `validator-report.json` | 2,305 | `2c0d675b8f8acd835f37cd8cc7d20a0d686fb5970a39544239b77ad7495b7eaa` |

## 5. NOT_RUN / 限制

- POC-005 不新增业务 UI；真实页面的回放工具条接线由后续 POC-006/008 集中完成。当前在 `/poc-components` 有共享 `ReplayControls` 演示（纯技术页，不调用 API）。
- 无客户完整场景/媒体，checkpoint 使用 TEST_ONLY 夹具；真实场景 checkpoint 校验需内容包。
- `--strict` 下 L4 媒体缺失会失败；这是临时 fixture 预期，不声称可发布。
- 校验器默认仍保留 POC-001 的 L3 NOT_RUN 兼容行为；POC-005 投影通过显式 `--replay` 运行。未修改 POC-001 历史测试。
- 无客户数据、真实外部服务、真实 LTX/邮件/LLM 调用；未自行 accepted，未开下一任务。
