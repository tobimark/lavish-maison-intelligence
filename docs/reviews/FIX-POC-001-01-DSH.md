# FIX-POC-001-01 交付报告：实体归属校验与修正契约回归

- 任务：[tasks/poc/fixes/FIX-POC-001-01.md](../../tasks/poc/fixes/FIX-POC-001-01.md)；依据 [POC-001-MAIN.md](POC-001-MAIN.md)（changes_requested）。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；主控已完成 analysisEntry/videoEntry 契约勘误，本执行者**未修改公共 Schema/build-contract**。
- 状态：**review，未 accepted**；未启动 POC-002；未修改任务状态/门禁；POC-001 原报告与主控复查证据均未覆盖。
- 新冻结 Schema SHA-256：`6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a`（本任务只读）。

## 1. 本次修复的两项 P2

### 1.1 全实体 namespace 校验（主控 P2）

原实现只在“实体被引用”时检查 ID 前缀，未引用实体可绕过 L2。现新增 `validateEntityNamespaces(bundle, index)`：

- 遍历实体索引中的**全部**实体：Brand、Product、Evidence、Signal、Trend、AnalysisEntry、Brief、ScriptVersion、嵌套 Shot/Subtitle、VideoEntry、Recipient、DeliveryPlan、DeliveryRecord、Asset、Event（包括未被任何引用指向的实体）。
- 每个实体 ID 的首段必须等于 `manifest.scenarioId`；否则报
  `CROSS_SCENARIO_ENTITY`，`file` 为该实体实际所在文件，`jsonPointer` 精确到实际 `id` 字段（如 `/data/evidence/1/id`、`/data/assets/5/id`、`/data/versions/0/shots/0/id`、`/data/events/0/id`）。
- 既有“引用目标跨场景”校验（`CROSS_SCENARIO_REFERENCE`）保留；二者分别覆盖实体自身与引用边。
- 该函数为纯语义函数并已从 `validation/index.ts`/`.d.mts` 导出，未来 reducer 可复用。

### 1.2 修正契约后的生成物与测试回归

- 用主控新 Schema 重新生成 `apps/web/demo/poc/generated/**`：`AnalysisEntry`、`VideoEntry` 现在是实际业务实体；`Analysis`/`Video` 是十文件包装；`analysisData.analyses → analysisEntry`、`videoData.videos → videoEntry`。
- 生成器 banner 改为**条件提示**：仅当 `detectContractDefects(schema)` 非空时才加警告；当前实际 Schema 无缺陷，banner 不再声称有缺陷。`generation-manifest.json` 的 `contractDefects` 为 `[]`。
- 缺陷检测测试改为：实际冻结 Schema 必须 `detectContractDefects()===[]`；另复制一份 Schema 并故意把两个 data 数组指回文件包装，验证检测器仍能报出两个精确指针。
- 旧“正例 L1 fail/exit1”与 L5 merge 的旧 exit 假设已更新；所有既有负向测试保留，未删除任何校验来变绿。
- 技术夹具注释改为“遵循修正后的 analysisEntry/videoEntry 结构”，不再声称当前 Schema 有缺陷；仍明确 **TEST_ONLY、非客户内容、不得进入 public/scenarios**。

## 2. 实际命令、退出码与结果

| 命令 | exit | 结果 |
|---|---|---|
| `npm run poc:types` | **0** | 重新生成 3 个文件；schema sha `6676cc09…0222a`，types sha `a5583f08…2ba71b` |
| `npm run poc:types:check` | **0** | 生成物与当前 Schema 一致 |
| `npm run typecheck` | **0** | 含生成类型、`AnalysisEntry`/`VideoEntry`、validation 导出 |
| `npm run test:unit -- tests/poc/validation.test.ts` | **0** | **24 passed（10.6 s）** |
| 合成有限正例 `--dir <TEST_ONLY fixture>` | **0** | L1=pass、L2=pass、L3=not_run、L4=pass、L5=not_run；`errors=[]`；runnable=false |
| 同一正例加 `--strict` | **1** | L3 未执行，符合 strict 契约 |
| `--catalog scenarios/catalog.json` | **0** | L1 pass，L2–L5 not_run，runnable=false；3 条 awaiting_content 不计成功 |
| 同上 `--strict` | **1** | 严格模式要求 L1–L4 全部 pass；L2–L4 未执行 |
| 缺包目录 | **2** | 明确 not found，不写假报告（单测覆盖） |

有限正例报告关键字段（TEST_ONLY，包 hash `f76d23a93f829c83773bdd38fb15c76969dbcc03b571c27a183b385379f2380f`）：

```json
{
  "scope": "scenario",
  "layers": [
    { "name": "L1", "status": "pass" },
    { "name": "L2", "status": "pass" },
    { "name": "L3", "status": "not_run" },
    { "name": "L4", "status": "pass" },
    { "name": "L5", "status": "not_run" }
  ],
  "errors": [],
  "runnable": false
}
```

warnings（不伪造通过）：L3 checkpoint projection NOT_RUN（POC-005）、L5 media NOT_RUN（POC-002）、content reviewStatus 未 reviewed（主控内容门禁，不由 Schema 推断）。

## 3. Namespace 负例精确定位（全部实测）

| 负例 | code | file | jsonPointer |
|---|---|---|---|
| 未引用的外场景 evidence（`scn-oud-storytelling.evidence.unreferenced-foreign`） | `CROSS_SCENARIO_ENTITY` | `discovery.json` | `/data/evidence/1/id` |
| 未引用的外场景 asset | `CROSS_SCENARIO_ENTITY` | `assets.json` | `/data/assets/5/id` |
| 嵌套外场景 shot（改 script version 0 的 shot） | `CROSS_SCENARIO_ENTITY` | `script.json` | `/data/versions/0/shots/0/id` |
| event 自身外场景 id | `CROSS_SCENARIO_ENTITY` | `events.json` | `/data/events/0/id` |

以上 CLI 均 exit 1，L2 fail；同时旧负例（缺文件、未知字段、重复 ID、错误引用类型、跨场景引用、事件乱序、错误 hash、路径越界、非 `.invalid`、缺媒体、expected 未来泄漏、镜头空洞）全部保留并通过。

## 4. 测试清单（24 项，均为实际执行）

- catalog：awaiting_content 合法但不计成功；非 strict exit0 / strict exit1。
- 契约：实际 Schema 无缺陷、Entry 与 wrapper 分离；故意破坏的本地 Schema 副本可检出两个缺陷；生成类型确定性/Schema hash/`AnalysisEntry`/`VideoEntry`/stages 元组/无缺陷 banner。
- 正例：L2/L3-static/L4 语义 pass；CLI L1/L2/L4 pass、errors 空、exit0；strict exit1；runnable=false。
- 负例（原有 12 类全部保留）：见 §3 与报告原任务；均断言 code/file/jsonPointer 与 exit1。
- 新增 namespace 4 类：未引用 evidence/asset、嵌套 shot、event 自身。
- L5 merge：packageHash 匹配且 L5 pass 时 L5=pass 但 L3 not_run、runnable=false、exit0；packageHash 不匹配时 L5=fail、`MEDIA_REPORT_MISMATCH`、exit1。
- 缺包 exit2 且不产假报告。

> 原 19 项中的有效语义全部保留：旧“实际契约有缺陷”测试被替换为“实际无缺陷 + 本地破坏副本可检测”两项，旧负向用例一个未删；最终 24 项。

## 5. 文件变化与指纹

| 文件 | Bytes | SHA-256 |
|---|---|---|
| `apps/web/demo/poc/validation/semantic-rules.mjs` | 70,712 | `9a3003183c91c97fc9045494ca35dfe047fa603bb134ce86c3fd34730e4f49fc` |
| `apps/web/demo/poc/validation/semantic-rules.d.mts` | 3,749 | `0665358b9cb5b305bd72f826d1dc10aa536c2d0d5f38c2de4128210ab1f9299f` |
| `apps/web/demo/poc/validation/index.ts` | 358 | `acebcaef2dee02cefe3682105696b84f82230d66d35941a7185af59c3c1a4f64`（未变） |
| `scripts/poc/generate-types.mjs` | 7,785 | `ad8b1162ecd4e5768a13fb6444742bb86d6b93886916cbd68dba1ddac640062c` |
| `apps/web/demo/poc/generated/scenario.types.ts` | 22,863 | `a5583f08345fd353336ffb897d8c9bb857640669f91493e1d17a8f7eda2ba71b` |
| `apps/web/demo/poc/generated/index.ts` | 462 | `eea18bc5867fad9b9d845055fdfef48cc3d4957c44897af92c0c90606cb0a6e1` |
| `apps/web/demo/poc/generated/generation-manifest.json` | 467 | `03341f8202e89304b8540a09c58e28a17d1fa39b4cbc4378b49aaa055328939b` |
| `tests/poc/validation.test.ts` | 22,864 | `91119b547f1d9eb1a8429e13f9b80685e551e7d082c0483df62e0d077be6a70f` |
| `tests/fixtures/poc/build-fixture.ts` | 18,445 | `747d5d8cfec212515448dea065461b5f367b1f8e2babd33b19462313eaa61b78` |
| `contracts/poc/scenario.schema.json`（只读，主控修正） | 108,148 | `6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a` |
| `design/tokens.css`（只读，未改） | 2,609 | `07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814` |

未修改：公共 Schema/build-contract、Tokens、DESIGN_SYSTEM、业务页面、真实场景、任务状态/门禁。`package.json`/lock 未在本修复中新增依赖或命令（沿用 POC-001 的验证器/类型生成依赖）。

## 6. 已知限制 / NOT_RUN

- **L3 checkpoint 实际投影比较仍 NOT_RUN**，必须由 POC-005 接入同一 domain reducer；本任务未实现、未标 PASS，runnable 仍为 false。
- **L5 实际 HTTP/媒体解码/seek/download 仍 NOT_RUN**（POC-002）；本任务只验证 `--media-report` 合并逻辑，不声称媒体验证通过。
- 三套真实场景仍 `awaiting_content`；无客户内容/媒体进入仓库；TEST_ONLY 夹具只在 tests，运行时写 OS 临时目录并清理，不入 public/scenarios/catalog。
- 内容人工语义/媒体匹配审查、Axe/200%/跨浏览器媒体等没有在本任务执行；本任务无 UI，不涉及视觉验收。
- `npm run typecheck` 只覆盖 `apps/web/**`（含生成类型），不单独 typecheck `tests/**`；测试由 Vitest 实际转译执行（24 passed）。

## 7. 复现

```powershell
npm run poc:types
npm run poc:types:check
npm run typecheck
npm run test:unit -- tests/poc/validation.test.ts

# 有限正例（测试自建 TEST_ONLY 临时工作区；以下为临时目录示例）
node scripts/poc/validate-scenario.mjs --dir <tmp>\scenarios\scent-layering\1.0.0 --report <tmp>\report.json
node scripts/poc/validate-scenario.mjs --dir <tmp>\scenarios\scent-layering\1.0.0 --strict --report <tmp>\strict.json

# catalog
node scripts/poc/validate-scenario.mjs --catalog scenarios/catalog.json --report <tmp>\catalog.json
```

本报告仅提交 review；不自行 accepted，不启动 POC-002，等待主控复跑与裁决。
