# POC-001 交付报告：场景校验器与公共类型

- 任务：[tasks/poc/POC-001.md](../../tasks/poc/POC-001.md)；交接：[tasks/DSH_HANDOFF_POC_01.md](../../tasks/DSH_HANDOFF_POC_01.md)。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；主控工程 Agent 负责契约与验收。
- 执行时间：2026-11-04 Asia/Shanghai；工作目录 `D:\workspace\maison-intelligence`。
- 状态：**review，未 accepted**。实现与测试已交付，但正例包在 **L1 被一个冻结 Schema 契约缺陷阻塞**；该缺陷需要主控修改 `contracts/poc/scenario.schema.json`/`scripts/poc/build-contract.mjs`，本执行者未改契约、未绕过、未伪装通过。POC-002 及后续未启动。

## 0. 结论先行：阻塞性契约缺陷（需要主控处理）

冻结的 `contracts/poc/scenario.schema.json` 中 `analysis` 与 `video` 两个 **entry** 定义被同名 **envelope** 定义覆盖：

- `scripts/poc/build-contract.mjs` 第 33 行定义 analysis entry；第 40 行定义 video entry；第 79 行的 envelope 循环
  `for (const name of filenames) defs[name] = envelope(ref(`${name}Data`));` 把 `defs.analysis`、`defs.video` 覆盖为十文件 envelope。
- 因此 `analysisData.analyses.items` 指向 `#/$defs/analysis`（envelope）→ 要求 `data.analysisData` → 又要求 `analyses.items` … 无限递归；**不存在任何有限 analysis entry 能满足该 Schema**。video 同理。
- 影响：任何按契约交付的十文件场景包都会在 L1 失败；`analysis.json`/`video.json` 无法获得真实 entry 结构；生成类型中的 `Analysis`/`Video` 递归包含 envelope，虽可编译但不能实例化为业务 entry；POC-002/005/006 的校验与媒体关联均被阻塞。
- 本执行者**未修改**该 Schema 或 build-contract（白名单外且只有主控可改契约），校验器把该缺陷作为 `CONTRACT_DEFECT` 明确报出，**不**把它隐藏为 pass。

建议主控修复方案（二选一，改完重跑 `node scripts/poc/build-contract.mjs`）：

1. 重命名 entry：`defs.analysisEntry` / `defs.videoEntry`，并让 `analysisData`/`videoData` 的 items 指向它们；或
2. 重命名 envelope：`defs.analysisFile` / `defs.videoFile`，同步 `files/*.schema.json` 的 `$ref` 与第十文件 wrapper。

修复后预期：十文件正例可通过 L1；L2/L3-static/L4 现有规则与 TEST_ONLY 正例应继续通过；L3 checkpoint 投影仍按任务要求 **NOT_RUN**（POC-005），L5 仍 NOT_RUN（POC-002），runnable=false。

## 1. 交付文件与改动

| 文件 | 类型 | 说明 |
|---|---|---|
| [scripts/poc/validate-scenario.mjs](../../scripts/poc/validate-scenario.mjs) | 新增 | 标准 JSON Schema 2020-12（Ajv）离线校验；十文件装配；L1/L2/L4 + L3 静态检查；错误 file+jsonPointer；报告/退出码；`--catalog`、`--strict`、`--media-report` |
| [scripts/poc/generate-types.mjs](../../scripts/poc/generate-types.mjs) | 新增 | 从唯一 Schema 生成 `apps/web/demo/poc/generated/**`；`--check` 可复现校验；prefixItems 元组修复；附带生成清单与契约缺陷记录 |
| [apps/web/demo/poc/validation/semantic-rules.mjs](../../apps/web/demo/poc/validation/semantic-rules.mjs) | 新增 | 共享纯语义函数：实体索引、typed refs、entry 链、镜头/字幕边界、事件守卫/有序性、期望 checkpoint 静态检查、媒体路径安全、checkpoint 投影 NOT_RUN 接口 |
| [semantic-rules.d.mts](../../apps/web/demo/poc/validation/semantic-rules.d.mts) | 新增 | 供未来 TS reducer 使用的类型声明（实现保持 Node ESM，CLI 直接导入） |
| [validation/index.ts](../../apps/web/demo/poc/validation/index.ts) | 新增 | 统一导出共享语义，纳管进 `npm run typecheck` |
| `apps/web/demo/poc/generated/scenario.types.ts` | 生成 | 从 Schema 生成；包含 `ScenarioPackage`、`Event` discriminated union、`DeliveryRecord` union、manifest 的 4 阶段元组等 |
| `apps/web/demo/poc/generated/index.ts` | 生成 | 类型与语义统一出口 |
| `apps/web/demo/poc/generated/generation-manifest.json` | 生成 | schema sha/bytes、types sha/bytes、prefixItems 数量、contractDefects |
| [tests/poc/validation.test.ts](../../tests/poc/validation.test.ts) | 新增 | 19 项 Vitest 测试：目录/catalog、契约缺陷、类型生成、正例语义、负例定位、L5 合并、缺包 exit2 |
| [tests/fixtures/poc/build-fixture.ts](../../tests/fixtures/poc/build-fixture.ts) | 新增 | **TEST_ONLY** 最小合成技术夹具（明确标记，仅 tests，不进 public/scenarios） |
| `package.json` / `package-lock.json` | 修改 | 仅新增验证器/类型生成依赖与命令：`ajv@8.20.0`、`ajv-formats@3.0.1`、`json-schema-to-typescript@16.0.0`；`poc:validate`、`poc:types`、`poc:types:check` |
| [docs/reviews/POC-001-DSH.md](POC-001-DSH.md) | 新增 | 本报告 |

未修改：`contracts/poc/**`（Schema/入口 wrapper/契约）、`design/tokens.css`（SHA-256 仍 `07f8b08d…1814`）、`docs/DESIGN_SYSTEM.md`、业务页面/组件、旧 TASK-005/008–014、`scenarios/`（仅保留原 catalog）、`apps/web/public/scenario-media/`（未创建/未写假媒体）。

## 2. 实现范围与实际行为

### 2.1 校验器 `validate-scenario.mjs`

- **标准 Schema**：Ajv 2020-12 + ajv-formats；先把 `scenario.schema.json` 按本地 `$id` 注册，再注册十个 `files/*.schema.json`；所有 `.invalid` `$id` 仅作本地标识，**不发起任何网络请求**。
- **十文件装配**：只接受 manifest + 九个数据文件；缺文件、多余 JSON、未知字段、错误 JSON、错误类型均报出 `file` + `jsonPointer`。
- **L1**：manifest/文件清单、Schema、契约缺陷。
- **L2**：全局 ID 唯一、同版本/scenario 头一致、typed refs（含列表元素）、跨场景引用、entry 链（Brief→Script→Video→DeliveryPlan→Record、附件含 MP4）、品牌/产品/资产类型绑定、delivery 记录与 `.invalid` 收件人。
- **L3 静态**：4 镜头时间轴连续且合计 15000ms；字幕有序、不重叠、不越界；视频 1080×1920/15000ms/frameRate/preproduced/披露；storyboard 与脚本镜头一致；事件 sequence 连续、atMs 非递减、阶段顺序不交错、每阶段唯一 started/completed、`stage.failed` 不进黄金流、event payload 类型、inputRefs 直接依赖与可见性、outputRefs 精确实体、script.confirmed 仅 entry、video progress 单调且最后 100、delivery queued/simulated/record 时间与绑定；expected checkpoints 排序/范围/初始状态/阶段完成状态/未来泄漏/active 指针静态检查。
- **L3 投影**：`compareCheckpointProjection()` 为 POC-005 留接口，当前返回 `{status:'not_run'}`；L3 层状态因此 **not_run**，任何包都不允许 runnable。
- **L4**：媒体路径安全（`.`, `..`, 反斜杠、百分号、query/fragment、越界、场景/slug/version 不符、文件名）、实际文件存在、bytes、SHA-256；错误定位 `assets.json` 或 `manifest.json`。
- **L5**：无 `--media-report` 时 **not_run**；传入报告时校验 scenarioId/scenarioVersion/packageHash 一致且 L5 pass，否则 L5 fail（`MEDIA_REPORT_MISMATCH`）。
- **报告**：严格输出 `{schemaVersion,checkedAt,scope,scenarioId,scenarioVersion,packageHash,layers:[{name,status}],errors:[{code,file,jsonPointer,message}],warnings:[],runnable}`；`runnable` 仅在五层 pass 且 authoring.reviewStatus=reviewed 时为真。
- **退出码**：0 = 请求层通过；1 = 校验失败或 `--strict` 有未执行层；2 = 用法/IO/环境错误（缺目录、坏参数、media report 缺失/不可解析）。
- **catalog**：校验 catalog 结构与三条 awaiting_content 的 `scenarioVersion=null/packagePath=null`；明确 warning “awaiting_content 不是验证成功、0 runnable”；不会把 3 条 await 计为通过。

### 2.2 共享语义与类型

- 共享语义为纯函数（无 fs/网络/DOM），未来 POC-003/005 reducer 可直接 import `apps/web/demo/poc/validation/index.ts`，复用于事件 guard、时间轴、引用/实体索引与 checkpoint 静态规则；投影比较接口明确 NOT_RUN。
- 类型由唯一 Schema 生成，`npm run typecheck` 实际编译通过；`generation-manifest.json` 记录 schema sha `920974b0…2933`、types sha `e001f198…aa4` 与两个契约缺陷。
- 生成器修复了 `prefixItems` 在 json-schema-to-typescript 中被降级成 `never[]` 的问题：manifest `stages` 现为精确元组 `["discovery","analysis","video","delivery"]`。

## 3. 实际命令与退出码

| 命令 | exit | 结果 |
|---|---|---|
| `npm run typecheck` | **0** | `tsc --noEmit` 无错误（含生成的 `ScenarioPackage`/Event/DeliveryRecord 与 validation 导出） |
| `npm run test:unit -- tests/poc/validation.test.ts` | **0** | **19 passed（约 8.4–9.7 s）**，覆盖下述正/负例 |
| `npm run poc:types:check` | **0** | 生成文件与 Schema 当前字节一致（schema sha256 `920974b0ecf9aba5ac1de81c6befd5e3cd9607f9daddb09fc45f457795c92933`） |
| `node scripts/poc/validate-scenario.mjs --catalog scenarios/catalog.json --report <tmp>` | **0** | L1 pass，L2–L5 not_run，runnable=false；warning 明确 3 条 awaiting_content 不计成功 |
| 同上加 `--strict` | **1** | 严格模式要求 L1–L4 全部 pass；L2–L4 未执行故 exit1（设计如此） |
| 合成正例 `--dir <TEST_ONLY fixture>` | **1** | L1 fail（CONTRACT_DEFECT + Schema entry 错误）、L2 pass、L3 not_run、L4 pass、L5 not_run、runnable=false；见 §4 |
| 同上 `--strict` | **1** | 同上 |
| 缺包目录 `--dir <不存在>` | **2** | 明确 “Scenario directory not found”，不写假报告、不假通过 |

未执行：真实三场景包（不存在）、POC-002 的 L5 媒体验证、POC-005 的 checkpoint 投影、Axe/200% 缩放/真实浏览器媒体审查；均按 NOT_RUN 记录，不报告通过。

## 4. 错误定位证据（全部 file + jsonPointer + exit 1）

负例均由测试实际调用 CLI 或语义函数验证，**不是只看代码推断**：

| 场景 | 错误码 / 定位证据 |
|---|---|
| 缺文件 | `MISSING_FILE`，`brand.json`，pointer `''`，exit 1 |
| 未知字段 | `SCHEMA_INVALID`，`manifest.json`，pointer `/unexpectedProperty` |
| 重复 ID | `DUPLICATE_ID`，第二次出现实体所在文件/pointer（如 `discovery.json/data/evidence/0/id`），L2 fail |
| 错误引用类型 | `REFERENCE_TYPE_MISMATCH`，`discovery.json/data/signals/0/evidenceIds/0` |
| 跨场景引用 | `CROSS_SCENARIO_REFERENCE`，`discovery.json/data/signals/0/evidenceIds/0` |
| 事件乱序 | `EVENT_SEQUENCE_INVALID`/`EVENT_TIME_DISORDER`，`events.json/data/events/N/...` |
| 错误 hash | `FILE_HASH_MISMATCH`，`manifest.json/files/0/sha256`，L4 fail |
| 路径越界 | `PATH_TRAVERSAL`，`assets.json/data/assets/0/uri`，L4 fail |
| 非 `.invalid` 收件人 | `INVALID_RECIPIENT_DOMAIN`，`delivery.json/data/recipients/0/email` |
| 缺媒体 | `MEDIA_MISSING`，`assets.json/data/assets/0/uri`，L4 fail |
| expected 未来泄漏 | `CHECKPOINT_VISIBLE_FUTURE_LEAK`，`expected.json/data/checkpoints/1/visibleEntityIds/...` |
| 镜头空洞 | `SCRIPT_SHOT_GAP`，`script.json/data/versions/0/shots/1/startMs` |
| 契约缺陷 | `CONTRACT_DEFECT`，`contracts/poc/scenario.schema.json#/$defs/analysisData/properties/analyses/items` 与 `.../videoData/properties/videos/items` |

合成正例运行结果（TEST_ONLY，包 hash `f76d23a93f829c83773bdd38fb15c76969dbcc03b571c27a183b385379f2380f`）：

```
L1=fail  L2=pass  L3=not_run  L4=pass  L5=not_run
runnable=false  exit=1
errorCodes=[SCHEMA_INVALID, CONTRACT_DEFECT]   （均由冻结 Schema 缺陷产生）
warnings = L3 projection NOT_RUN; L5 NOT_RUN; content reviewStatus pending
```

除上述缺陷外，该 TEST_ONLY 夹具的语义检查（L2/L3-static/L4 路径）全部通过，证明相关规则实现有效；修复 Schema 后应可在 L1 正常进入正例路径。

## 5. 测试覆盖（19 项）

1. catalog：3 条 awaiting_content 为合法目录状态但 0 个验证成功；runnable=false；strict 行为正确。
2. 契约缺陷精确指针；`$defs.analysis/video` 与 data items 的递归关系。
3. 类型生成确定性、schema hash/bytes、prefixItems 元组、contractDefects。
4. 正例语义 L2/L3-static/L4 路径 pass；checkpoint 投影接口 not_run。
5. CLI 正例：L1 fail（缺陷）、L2 pass、L3/L5 not_run、runnable=false、packageHash 64 hex。
6. 缺包 exit2 且不产报告。
7–18. 缺文件、未知字段、重复 ID、错误引用类型、跨场景、事件乱序、错误 hash、路径越界、非 `.invalid`、缺媒体、expected 未来泄漏、镜头空洞——全部断言 file+jsonPointer 与 exit1。
19. `--media-report` 合并：packageHash 匹配且 L5 pass 时 L5=pass 但 L3 not_run 仍 runnable=false；packageHash 不匹配时 L5 fail + `MEDIA_REPORT_MISMATCH`。

## 6. 数据来源、媒体缺项与 NOT_RUN

- **数据来源**：未收到客户/ChatGPT 三套场景包；`scenarios/catalog.json` 仅三条 `awaiting_content`。本任务**没有**创建业务场景、没有把 TEST_ONLY 夹具写入 `scenarios/` 或 public。所有正例数据均在 `tests/fixtures/poc/build-fixture.ts`，每个文件/实体显式带 `TEST_ONLY` 标识（标题、reasoningSummary、limitations、asset sourceNote）。
- **媒体缺项（真实场景）**：A/B/C 三套均缺 manifest/十 JSON、真实 MP4、poster、EN/AR VTT、产品图、Logo 副本、权利/身份核验、内容 review；`apps/web/public/scenario-media/` 不存在。TEST_ONLY 夹具媒体只存在临时目录，不进入仓库 public；POC-002 L5 未执行。
- **NOT_RUN**：
  - L3 checkpoint 实际投影比较（必须 POC-005 同一 reducer）；
  - L5 实际 HTTP/媒体解码/seek/download（POC-002）；
  - 真实场景 L1–L4；
  - 内容人工语义/媒体匹配审查；
  - Axe、200% 缩放、真实屏幕阅读器、跨浏览器媒体；本任务无 UI，不适用视觉验收。

## 7. 文件指纹（本任务交付时）

| 文件 | Bytes | SHA-256 |
|---|---|---|
| `scripts/poc/validate-scenario.mjs` | 23,766 | `a510ae0fe6bbb16a2b1a9d45a0cd7f6c3efaf862ae512c701eef132ca8ea04db` |
| `scripts/poc/generate-types.mjs` | 7,777 | `8d32866754c45e88172bb0aa7c134d698994907e90e9502034183e31684eb2e2` |
| `apps/web/demo/poc/validation/semantic-rules.mjs` | 69,894 | `875876e9dc21a1bf19fa4f6b9e97dff5e5cfd068bb1832e6e89eb1708fa9cc4e` |
| `apps/web/demo/poc/validation/semantic-rules.d.mts` | 3,636 | `5bb8ed5c42b807a06a0d8af34323abb0a91195d623d51ec8d246c155de095c0e` |
| `apps/web/demo/poc/validation/index.ts` | 358 | `acebcaef2dee02cefe3682105696b84f82230d66d35941a7185af59c3c1a4f64` |
| `apps/web/demo/poc/generated/scenario.types.ts` | 22,017 | `e001f1980899768e11907c880d9550184401e50106ba03acdc47d2c920f96aa4` |
| `apps/web/demo/poc/generated/index.ts` | 462 | `0ee4ce3d43114f6219e0753a6a2868440b4fd7034ecd899d07df2720dd3a7fae` |
| `apps/web/demo/poc/generated/generation-manifest.json` | 1,743 | `8300c8f37cc9be150b63d0aa54c01e07f4c5f421dd70bd6ddc12640ae472c635` |
| `tests/poc/validation.test.ts` | 19,197 | `fa1e900a8f6948c922048a621154479a7ea6e112f65afb604cddc45f4c7bab0b` |
| `tests/fixtures/poc/build-fixture.ts` | 18,545 | `4d18a08ec0ef6d01bc80fd245668a94f607e3debc8c9c1c777545b73e2d0f9fa` |
| `package.json` | 1,285 | `985bd4e9eb3aef42c0df38f7d592d9dd0a6c2632616b37fb696eb3b8078bf906` |
| `package-lock.json` | 78,536 | `5d927cff17dab9c1bfc7ae89cbcd5507b0939c5c13d5011bbe918cc056bea81d` |
| `contracts/poc/scenario.schema.json`（只读，未改） | 103,950 | `920974b0ecf9aba5ac1de81c6befd5e3cd9607f9daddb09fc45f457795c92933` |
| `design/tokens.css`（只读，未改） | 2,609 | `07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814` |

## 8. 约束确认

- 未修改公共 Schema、build-contract、Tokens、DESIGN_SYSTEM、业务页面/组件、后端或旧任务。
- 未调用真实平台/LLM/视频生成/邮件服务；校验器无网络请求；`.invalid` 仅作本地 Schema 标识。
- 未创建/填充客户场景或 public 媒体；TEST_ONLY 夹具仅在 tests，且测试运行时写 OS 临时目录并清理。
- 未自行 accepted，未启动 POC-002 或任何 UI 任务。

## 9. 复现

```powershell
npm ci
npm run typecheck
npm run test:unit -- tests/poc/validation.test.ts
npm run poc:types:check

# catalog（当前无完整包）
node scripts/poc/validate-scenario.mjs --catalog scenarios/catalog.json --report <tmp>\catalog.json
node scripts/poc/validate-scenario.mjs --catalog scenarios/catalog.json --strict --report <tmp>\catalog-strict.json

# 修复契约后，真实包（A 到齐时）：
node scripts/poc/validate-scenario.mjs --dir scenarios/scent-layering/1.0.0 --strict --report evidence/poc/scenario-a-validation.json
```

## 10. 需要主控决定

1. **修复 `analysis`/`video` entry 与 envelope 命名冲突**（§0），重新生成 `contracts/poc/scenario.schema.json`；这是 POC-001 正例 L1 通过及后续 POC-002/005/006 的前置条件。
2. 修复后通知我复跑 `npm run poc:types`、`npm run typecheck`、`npm run test:unit -- tests/poc/validation.test.ts`，并补一份真实/正例验证报告；在当前契约下我不会把 L1 缺陷改成 PASS。
3. 是否接受“L1 缺陷由校验器显式报错、其余规则/类型/测试已完成”的中间交付，由主控 review 裁决；本执行者仅提交 review，不自行 accepted，不启动下一任务。
