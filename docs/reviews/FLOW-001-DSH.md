# FLOW-001-DSH · 连贯案例投影与本地社媒状态

日期：2026-11-06 · 状态：代码/测试/真实数据校验完成，等待主控集中验收（不自行 accepted）

## 交付范围

按 `docs/SOCIAL_MOCK_CONTRACT.md`、`docs/CONNECTED_MARKETING_FLOW.md`、`tasks/flow/FLOW-001.md`，在**现有** MockApi / PocStorage / IndexedDB 门面内新增只读 Journey 投影与本地社媒草稿/审阅/模拟发布状态；未新建后端、第二数据源、Agent 框架，未改冻结十 JSON Schema、AgentEvent/Replay/邮件 API，未改 UI 与 public 内容。

## 文件

新增：

- `apps/web/demo/poc/api/flow-contract.ts` — CampaignPresentation、SocialDraft/Attempt/Receipt、SocialWorkflowState、CampaignJourney、FlowAwareMockApi（组合 AssetAwareMockApi，不改旧成员）。
- `apps/web/demo/poc/api/flow-source.ts` — presentation sidecar 加载与**结构性**校验（shape/enums/EN+AR preset/role 顺序）；浏览器 loader 使用 `/campaign-presentation/<slug>/<version>.json` + `cache: 'no-store'`；缺失或结构非法 -> null。
- `apps/web/demo/poc/api/flow-queries.ts` — `getCampaignJourney` 闭包投影与跨引用校验（campaign/packageHash/scenarioVersion、discovery 引用、analysis/brief、EN+AR 真实脚本、provided asset role/type/product、真实视频 bytes/SHA-256、EN/AR preset 脚本与视频一致）；pending 诚实且保留真实 campaign/opportunity/selectedVersions/providedAssets；浏览零写入。
- `apps/web/demo/poc/api/flow-commands.ts` — prepare/get/list/save/review/simulate/getSocialPost；同一 aggregate 单次原子 put；CAS、幂等 receipt、reviewHash、失败注入仅测试。
- `scripts/poc/validate-campaign-presentation.mjs` — 小型 sidecar 校验器（真实 manifest 字节 SHA-256、id 引用、语言对、三个 asset role、真实媒体 bytes/SHA）。
- `tests/poc/flow-projection.test.ts`、`tests/poc/social-workflow.test.ts` — TEST_ONLY fixture（非客户内容），含 fake-indexeddb DB2->3 迁移。

修改（增量，不改旧签名/行为）：

- `apps/web/demo/poc/api/mock-api.ts`、`types.ts`、`index.ts` — 同一 BrowserMockApi 门面委托新方法；`MockApiOptions` 增加可选 `presentationSource` 与测试专用 `socialSimulateFailure`；`createMockApi` 返回 `FlowAwareMockApi`。
- `apps/web/demo/poc/api/product-contract.ts` — `CampaignBrowseInput.scenarioVersion?`（可选；省略时行为完全不变）。
- `apps/web/demo/poc/api/product-queries.ts` — `getBundleForVersion` 精确版本读取；`getCampaign` 支持显式 scenarioVersion；`toOpportunityView` 公开（复用同一投影）。
- `apps/web/demo/poc/storage/{types,memory,indexeddb}.ts` — `socialWorkflows` 聚合 store（key=`campaignId@packageHash`）、`get/put/listSocialWorkflow(s)`；`DB_VERSION 2 -> 3`，升级只新增 store，不清 sessions/workspaceLinks/productExports/receipts。
- `apps/web/components/poc/browser-api.ts` — 构造 presentation source，`getBrowserApi(): FlowAwareMockApi` 并导出该类型。
- 测试夹具机械更新（主控已批准，仅版本常量，不改断言）：`tests/poc/storage.test.ts:183`、`tests/poc/mock-api.test.ts:515` 的 `factory.open(dbName, 2)` -> `3`（DB v3 后重新打开以注入原始损坏记录，测试意图不变）。

## 契约决策（实现细节）

- `CampaignJourney`：`{campaign, opportunity, contentStatus:'pending'|'ready', presentation, selectedVersions:{en,ar}, providedAssets, socialDrafts, socialAttempts, contentIssue}`；`presentation` 仅在**全部**跨引用闭合时非 null；`selectedVersions` 可为 null（缺失该语言脚本时），仍保留其余真实段落。
- `SocialDraft` 在契约最小字段上增加 `presetPostId`（同一 preset 只复用一份草稿，不覆盖用户编辑）与可空 `reviewHash`（保存即清除，审阅写入；便于 UI 显示 ready 与审计）。两者均为新增类型内的增量字段，不影响旧契约。
- 修订语义：save `revision+1`、status=draft、reviewHash=null；review `revision+1`、status=ready、写入确定性 reviewHash（对 campaign/version/packageHash + 精确快照做 canonical SHA-256）；simulate **不改 revision**，只把 status 改为 published_simulated，保证发布后再次编辑仍可用当前 revision 做 CAS。
- 幂等：prepare/save/review/simulate 均以 `operation|idempotencyKey` 存 receipt；同 key 同 body 返回**原 ApiResult**，同 key 不同 body -> `IDEMPOTENCY_CONFLICT`。注入的模拟失败不写 receipt、保留 ready 草稿、写入 failed_simulated attempt，因此可用同 key 重试并生成新 attempt（旧失败历史不可变）。
- 审阅/发布来源校验复用既有确认事实：`findVersion` 的 `confirmation === 'confirmed_current'`（来自既有 `beginCampaignEdit` + `confirmScript` 的 session 状态），缺失返回 `CONFIRMATION_REQUIRED` 并提示去 creative 段确认；不静默确认。审阅/发布同时复核 provided video 的 assetSetId/assetId/SHA-256 与真实 bytes。
- 成功反馈只在 `putSocialWorkflow`（IndexedDB 事务 commit / Memory 原子替换）resolve 并回读确认后才返回；失败返回错误，不先报成功。
- `contentStatus:'pending'` 时 presentation=null、contentIssue 为具体原因（缺 sidecar/packageHash 不匹配/引用缺失/provided 未 bound/视频 hash 不匹配等），绝不生成默认营销文案。
- 存储新增只读 `listSocialWorkflows()`（getSocialDraft/getSocialPost 需要按 draftId/attemptId 定位聚合；仍只有单个 store，无平行事实源）。

## 命令与真实 exitcode

沙箱说明：本会话 DSH file sandbox 下 vitest 默认 forks pool 触发 `spawn EPERM`（非代码失败），执行证据使用 `--pool=threads`；主控已确认此前证据在沙箱外生成。

| 命令 | exit | 结果 |
|---|---:|---|
| `node scripts/poc/validate-campaign-presentation.mjs --presentation apps/web/public/campaign-presentation/scent-layering/1.1.0.json --scenario-dir apps/web/public/content-scenarios/scent-layering/1.1.0 --provided-assets apps/web/public/presentation-assets/scent-layering.json` | **0** | 106/106 checks pass；packageHash `709abfde…f854d` 与 manifest 字节一致 |
| `npm run typecheck` | **0** | 通过 |
| `npx vitest run --pool=threads tests/poc/flow-projection.test.ts tests/poc/social-workflow.test.ts` | **0** | 2 files / 18 tests passed |
| `npm run test:unit -- tests/poc/flow-projection.test.ts tests/poc/social-workflow.test.ts` | 1 | 沙箱 spawn EPERM（forks pool），非代码失败；同命令 threads pool 为 0 |
| `npx vitest run --pool=threads <10 个既有+新增单测文件>` | **0** | 107 tests passed（含 mock-api/storage/product-read/product-commands/product-export/product-asset-export/state-machine/content-delivery） |
| `npx vitest run --pool=threads`（全默认套件） | 1 | 见下“全量套件失败归类”，均为环境或其他任务范围 |

全量默认套件（36 files / 191 tests）失败归类，均非 FLOW-001 逻辑：

1. `apps/web/tests/*.spec.ts` 被 vitest 默认 include 收集，Playwright 报 “did not expect test()/test.describe() to be called here”（基线即如此）。
2. `tests/poc/validation.test.ts`、`media-validation.test.ts`、`replay.test.ts` 通过 child_process 调 CLI，沙箱 `spawn EPERM`。
3. `tests/poc/provided-assets.test.ts`、`product-assets-api.test.ts`、`content-only.test.ts` 仍断言 SERENITY 发布前状态（`awaiting_serenity_content`、catalog 3 条）；当前已由内容发布任务改为 bound / 4 条。属内容绑定任务的断言更新范围。
4. `evidence/poc/reviews/POC-004/main-probe.test.ts` 以 `factory.open(dbName, 1)` 打开旧版 DB，DB v3 后 VersionError；该 evidence probe 不在 FLOW-001 写范围，需机械改为 3 或从 test:unit 排除。

## 真实数据校验

- 校验器对主控已发布的 A1.1.0 + sidecar + bound provided sidecar 全绿（exit 0，106 checks）：manifest packageHash、campaign `scn-scent-layering.brief.main`、product `…serenity`、discovery/analysis/brief 引用、EN `en-v2`/AR `ar-v2`、三个 provided asset role/type/product、真实图片与 10.08s MP4 bytes/SHA、EN/AR preset 语言脚本与同一 final preview。
- 主控独立用临时 lead-only vitest 对同一真实数据走通 getCampaignJourney ready -> prepare -> save -> review(CONFIRMATION_REQUIRED) -> beginCampaignEdit+confirmScript -> review ready -> simulate published_simulated -> 发布后编辑旧 attempt 不变、旧 reviewHash 拒绝；本次不重复声明该结果。

## 已知限制 / NOT_RUN

- 无 UI/浏览器视觉验收声明；本任务不含页面与 Playwright e2e（FLOW-002/003/004）。
- 模拟发布不调用任何外部服务，不产生平台 URL/指标；无真实 Instagram 集成。
- 跨标签页并发写只有单标签页内命令串行化 + 单次原子 aggregate put；未实现 IndexedDB 跨 tab 的 compare-and-swap（Mock 范围足够，记录为限制）。
- 失败注入只经测试依赖 `socialSimulateFailure`，不在客户 UI 提供开关。
- 未运行真实浏览器 IndexedDB 手工刷新验证（单测用 fake-indexeddb 覆盖 2->3 迁移与保存刷新）。
- 证据：`evidence/product/connected-flow/flow-001/`（commands.json、validate-campaign-presentation.real.{json,log}、typecheck.log、flow-tests-threads.log、required-command-default-pool.log、existing-unit-regression.log、full-unit-suite.log）。
