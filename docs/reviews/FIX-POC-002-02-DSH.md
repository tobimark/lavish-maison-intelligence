# FIX-POC-002-02 交付报告：VTT 解析不得丢弃 cue

- 任务：[tasks/poc/fixes/FIX-POC-002-02.md](../../tasks/poc/fixes/FIX-POC-002-02.md)；依据 [POC-002-RECHECK-01.md](POC-002-RECHECK-01.md)。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；POC-001 accepted，POC-002 仍待本修复复查。
- 状态：**review，未 accepted**；未启动 POC-003；仅改 `verify-media.mjs` 的 VTT 解析/诊断及对应测试与 TEST_ONLY VTT；未重写 FIX-01 已通过的播放/同源/ffprobe/脚本/镜头逻辑。
- 原 POC-002、FIX-01 证据与主控复查证据均未覆盖；新证据独立在 `evidence/poc/media/fix-02/`。

## 1. 剩余 P2 的修复

原 `parseVtt` 遇到无法匹配 HH:MM:SS 时间行的内容块直接 `continue`，导致 MM:SS 额外 cue 消失、`textMatched=true` 假阳性。现改为**完整消费字幕块**：

- 每个内容块必须属于以下之一，否则明确报错，不再静默跳过：
  1. 合法 `WEBVTT` 头块（含可选头元数据）；
  2. 合法 `NOTE` / `STYLE` / `REGION` 非 cue 块（按块首行明确识别，不把任意块当注释）；
  3. 合法 cue（可选单行 cue identifier + timing + payload）。
- 支持 **HH:MM:SS.mmm 与 MM:SS.mmm** 两种时间格式（推荐实现）；时间行含 `-->` 但不合法/不支持 → `SUBTITLE_TIME_INVALID`；块结构异常 → `SUBTITLE_CUE_STRUCTURE`；既非 cue 也非合法块 → `SUBTITLE_BLOCK_UNRECOGNIZED`。
- 时间分量校验：分钟/秒必须在 `00–59`，毫秒必须 3 位；非法分量明确失败，不跳过。
- 混合有效/无效 cue、额外 cue 都不会从校验输入中消失；合法额外 cue 计入数量后与绑定 `ScriptVersion.subtitles` 比较，数量不符 → `SUBTITLE_CUE_COUNT_MISMATCH`。
- 解析出现任何问题（`parsed.issues`）时 `media.subtitle.textMatched=false`，并把 `parseErrors` 写入报告，避免“有错误但 textMatched=true”的误导。
- 保留原有文本 NFC/换行规范化、数量/顺序/起止/绑定脚本文本比较；范围/格式负测保留。

## 2. 主控复查案例的实际复现结果

输入与主控 `subtitle-recheck` 相同：

```vtt
WEBVTT

00:00:00.000 --> 00:00:01.000
Expected

00:01.000 --> 00:02.000
Unexpected extra cue
```

绑定脚本只有 1 条 `Expected`（0–1000 ms）。修复后独立 CLI 结果（新证据）：

- **exit 1**
- `SUBTITLE_CUE_COUNT_MISMATCH`，`file=assets.json`，`jsonPointer=/data/assets/0/uri`
- `cues=2`，`scriptVersionId=scn-scent-layering.script.en`
- **`textMatched=false`**，`parseErrors=[]`
- L5 `fail`（该 TEST_ONLY 输入；非客户包）

证据：[evidence/poc/media/fix-02/subtitle-recheck-result.json](../../evidence/poc/media/fix-02/subtitle-recheck-result.json)、[subtitle-recheck-report.json](../../evidence/poc/media/fix-02/subtitle-recheck-report.json)。

## 3. 新增回归测试与保留覆盖

| 新增用例 | 结果 |
|---|---|
| 主控两 cue/脚本一 cue 精确形状 | exit 1，2 cues，`textMatched=false`，`SUBTITLE_CUE_COUNT_MISMATCH` |
| 额外 MM:SS cue（混合格式） | 计入 2 cues 后数量不符，exit 1 |
| 有效 cue + 非法时间行混合 | `SUBTITLE_TIME_INVALID`，坏 cue 不被丢弃 |
| 非法时间分量（如 `00:99:...`） | `SUBTITLE_TIME_INVALID` |
| 合法 NOTE/STYLE/REGION 块 | 识别为非 cue，不计数；3 cues 匹配，exit 0 |
| 未知非 cue 块 | `SUBTITLE_BLOCK_UNRECOGNIZED`，exit 1，不静默跳过 |

原有 19 项覆盖全部保留（播放 delta、跨端口 0 请求、ffprobe 无效时长、脚本字幕/镜头、损坏/伪 MP4、尺寸/时长/404/重定向/MIME/不可 seek/越界 VTT、缺包 NOT_RUN 等）；共 **25 passed**，未删除/放宽任何校验。

技术样例仍验证：1080×1920/15000 ms、不等长镜头 seek、播放 delta>0、3 条字幕与绑定脚本 `textMatched=true`；`ffprobe:not_run` → **L5=not_run**。

## 4. 实际命令与退出码

| 命令 | exit | 结果 |
|---|---|---|
| `npm run typecheck` | **0** | 无回归 |
| `npm run test:unit -- tests/poc/media-validation.test.ts` | **0** | **25 passed（47.35 s）** |
| 主控 recheck 同形 CLI（TEST_ONLY） | **1** | `SUBTITLE_CUE_COUNT_MISMATCH`，2 cues，`textMatched=false`，`assets.json` `/data/assets/0/uri` |
| 技术样例 CLI | **0** | errors=[]，字幕 textMatched=true；无 ffprobe → L5=not_run |
| 真实客户包媒体命令 | **2** | NOT_RUN，不写假报告 |

## 5. 证据与指纹

新证据目录：[evidence/poc/media/fix-02/](../../evidence/poc/media/fix-02/)（README、subtitle-recheck-result/report、technical-sample-report）。
原证据未被覆盖：

- 原 `evidence/poc/media/technical-sample-report.json` 仍为 `8bd1b2d6…746c7`
- FIX-01 `evidence/poc/media/fix-01/technical-sample-report.json` 仍为 `e0be74d1…9eb44`

| 文件 | Bytes | SHA-256 |
|---|---|---|
| `scripts/poc/verify-media.mjs` | 36,910 | `d875840f9e968c23d5790517c0fe267621e52c103f2d3892d8c120cd91b13869` |
| `tests/poc/media-validation.test.ts` | 28,180 | `3d59fd86cbdabb593d995a5128eee83d30ab08e28964338cd66a99bc36393bd7` |
| `evidence/poc/media/fix-02/subtitle-recheck-result.json` | 2,271 | `32df1b0259605e6463055a12b3d9ab7637f5091a5541e811811f0a7c1ee294bc` |
| `evidence/poc/media/fix-02/subtitle-recheck-report.json` | 1,726 | `a8c4273a240167a34bee4d2c84baf23e517afbe7e41cc67407358bf2c336b96f` |
| `evidence/poc/media/fix-02/technical-sample-report.json` | 3,806 | `6cf992fec5130baa6fbd45dfb6a4d135d80f57b3ca15a396318fc4fcd829d594` |
| `evidence/poc/media/fix-02/README.md` | — | `3ee6eaf5c767ab92a33c2f13bb1b17b3d554fc86b2fa26826849578a33880899` |
| `tests/fixtures/poc/media/README.md` | 3,624 | `21c95b0c0953afd43ad3741ff84d4165708a908c98109d1c2a8ec84e9bd6077c` |
| `contracts/poc/scenario.schema.json`（只读） | 108,148 | `6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a` |
| `design/tokens.css`（只读） | 2,609 | `07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814` |

新增 VTT 夹具（均 TEST_ONLY，仅 tests）：`mixed-formats-extra.vtt`、`mixed-invalid-time.vtt`、`illegal-time-components.vtt`、`legal-noncue.vtt`、`unknown-block.vtt`。

## 6. NOT_RUN / 限制

- **真实客户媒体 L5 NOT_RUN**：三套场景仍 awaiting_content，无真实 MP4/poster/VTT/权利与内容审核；媒体命令 exit 2 且不写报告。
- **ffprobe 实际探测 NOT_RUN**（本机无工具）；仅解析/调用失败逻辑由测试覆盖，未声称真实容器探测 PASS。
- L1–L4 在媒体报告中 not_run（POC-001 范围）；L5 技术样例因缺 ffprobe 仍 not_run。
- 无 UI/视觉验收；未调用渲染/转码/邮件/外部服务；未修改公共契约、依赖、配置、Tokens、场景或 public。
- 未启动 POC-003，未自行 accepted。

## 7. 复现

```powershell
npm run typecheck
npm run test:unit -- tests/poc/media-validation.test.ts

# 主控 recheck 案例（TEST_ONLY；本地 HTTP 由测试/证据脚本提供）
node scripts/poc/verify-media.mjs --dir <tmp>/review --base-url http://127.0.0.1:<port> --report evidence/poc/media/fix-02/subtitle-recheck-report.json

# 真实客户包（当前 NOT_RUN）
node scripts/poc/verify-media.mjs --dir scenarios/scent-layering/1.0.0 --base-url http://127.0.0.1:3100 --report evidence/poc/media/fix-02/scenario-a-report.json
```
