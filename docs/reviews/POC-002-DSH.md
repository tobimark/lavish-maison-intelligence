# POC-002 交付报告：实际媒体校验工具

- 任务：[tasks/poc/POC-002.md](../../tasks/poc/POC-002.md)；依赖 POC-001 accepted（[POC-001-ACCEPTANCE.md](POC-001-ACCEPTANCE.md)）。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；主控负责实际代码/证据复查。
- 状态：**review，未 accepted**。未启动 POC-003；未修改公共 Schema/Tokens/DESIGN_SYSTEM/业务页面/真实场景。
- 结论：媒体工具已实现并可对**有限技术样例**做真实 HTTP/签名/hash/解码/播放/seek/封面/字幕检查；**没有收到客户三套场景包与真实媒体，因此真实 L5 为 NOT_RUN**，未验收任何客户视频。本环境无 `ffprobe`，按规则 L5 为 `not_run`（不是 PASS）。

## 1. 交付文件

| 文件 | 说明 |
|---|---|
| [scripts/poc/verify-media.mjs](../../scripts/poc/verify-media.mjs) | 只读媒体校验 CLI：HTTP GET（无外域跟随）、Content-Type/签名/bytes/SHA-256、Playwright 真实解码/播放/seek、poster 解码、WebVTT 时码、可选 ffprobe 编码/像素格式/时长探测；报告/退出码 |
| [tests/poc/media-validation.test.ts](../../tests/poc/media-validation.test.ts) | **14 项** Vitest：正例 metadata、损坏/伪 MP4、错尺寸/时长、404、外域跳转、Content-Type 不符、不可 seek、字幕越界、缺包 NOT_RUN、ffprobe/VTT/seek 辅助函数 |
| [tests/fixtures/poc/media/](../../tests/fixtures/poc/media/) | **TEST_ONLY** 合成技术媒体（ffmpeg 色块 H.264、Pillow poster、VTT；明确不含客户内容，不入 catalog/public） |
| [evidence/poc/media/technical-sample-report.json](../../evidence/poc/media/technical-sample-report.json) | 技术样例实际 verify-media 报告（L5=not_run，浏览器 metadata 已记录） |
| [evidence/poc/media/README.md](../../evidence/poc/media/README.md) | 数据来源、NOT_RUN 边界、证据与复现方式 |
| [docs/reviews/POC-002-DSH.md](POC-002-DSH.md) | 本报告 |

未修改：`contracts/poc/**`、`design/tokens.css`、`docs/DESIGN_SYSTEM.md`、`scenarios/catalog.json`、业务页面/组件、POC-001 代码/证据、任务状态/门禁、依赖版本。

## 2. 工具实际行为

### 2.1 HTTP / 完整性 / 签名

- 只接受 `--base-url` 为 `127.0.0.1`/`localhost`/`::1` 的本地 HTTP(S) 服务，拒绝外部服务器参数。
- 每个 asset 用真实 HTTP GET；手动处理重定向：**外域 Location 直接失败**（不跟随、不请求外部）；同源重定向最多 3 次。
- 校验：状态 200、`Content-Type` 与 asset.mimeType、实际 bytes、SHA-256、容器签名（PNG/JPEG/WebP/MP4 `ftyp`/WebVTT/音频头）；路径必须为 `/scenario-media/...`，拒绝 `%`、反斜杠、query/fragment、空段、`.`/`..`。
- 不写 public，不调用渲染/转码/上传/邮件服务。

### 2.2 浏览器检查（Playwright Chromium）

- 页面加载到被测服务同源根，避免 `about:blank` 阻断子资源。
- 视频：真实 `loadedmetadata`/`canplay`、`duration`、`videoWidth/Height`、`seekable`、实际 seek 到 25%/50%/90% 并核对 `currentTime`、短播放确认时间推进、`video.error` 检查；与 asset/script 期望的 1080×1920、15000 ms（±100 ms）比对。
- 图片/poster：真实 `Image` 解码并核对 naturalWidth/Height。
- WebVTT：解析真实文件；要求 `WEBVTT`、至少一个 cue、`start < end`、cue end 不超过关联视频时长（+50 ms 容差）。
- 不可 seek 检测：无 Range/不可 seek 的响应在测试中被实际识别为 `VIDEO_SEEK_FAILED`/`VIDEO_UNSEEKABLE`。
- 缺 `ffprobe` 时明确 warning，浏览器检查仍执行，但 **L5 状态为 not_run，绝不写成 pass**。

### 2.3 可选 ffprobe

- 按 `--ffprobe`、`FFPROBE_PATH`、`FFPROBE`、PATH（`where ffprobe`）查找本地只读探测工具。
- 找到时检查视频流 `h264`、`yuv420p`、宽高、时长（±100 ms），若有音频则要求 `aac`；失败即 L5 fail。
- 本环境**没有 ffprobe**：技术样例 L5=not_run；报告 `ffprobe:"not_run"`，未声称编码/PixelFormat/完整容器验证通过。

## 3. 实际命令与退出码

| 命令 | exit | 结果 |
|---|---|---|
| `npm run typecheck` | **0** | 无回归（本任务无 TS 业务代码改动） |
| `npm run test:unit -- tests/poc/media-validation.test.ts` | **0** | **14 passed（17.06 s）** |
| 技术样例 `verify-media`（本地 TEST_ONLY 服务） | **0** | HTTP/签名/hash/播放/seek/poster/VTT 全部检查通过；`ffprobe:not_run` → **L5=not_run**；`errors=[]`；runnable=false |
| 真实 A 包媒体命令 `--dir scenarios/scent-layering/1.0.0 --base-url http://127.0.0.1:3100` | **2** | `NOT_RUN: scenario directory not found — the complete customer package/media has not been received; no media PASS is claimed.`；不写假报告 |
| 损坏/伪 MP4 等负例（测试内 CLI） | **1** | 结构化失败报告，`file`+`jsonPointer` 精确到 assets.json |
| 缺包（测试内 CLI） | **2** | NOT_RUN，无 report |

技术样例报告关键值（`evidence/poc/media/technical-sample-report.json`，包 hash `ef34545a892d51543db2a1cbf35b83afee5502a84a8cd147a3c96b5f0a0ec925`）：

- 视频：HTTP 200，真实 metadata **1080×1920 / 15000 ms**；seek 3750/7500/13500 ms 全部 `seeked=true` 且 `currentTime` 精确；`played=true`；无 `video.error`。
- Poster：真实解码 **1080×1920**。
- VTT：3 条 cue，均在 0–15000 ms。
- `layers`：L1–L4 `not_run`，**L5 `not_run`**；`runnable=false`；`errors=[]`。

## 4. 验收条件与证据

| 验收条件 | 实测 |
|---|---|
| 损坏/伪 MP4 | 截断 MP4 → `VIDEO_DECODE_FAILED`，exit 1；PNG 改名 `.mp4` → `MEDIA_SIGNATURE_MISMATCH`，exit 1 |
| 错尺寸/时长 | 640×360 → `VIDEO_WIDTH_MISMATCH`/`VIDEO_HEIGHT_MISMATCH`；5 s → `VIDEO_DURATION_MISMATCH`（容差 100 ms） |
| 404 | `MEDIA_HTTP_STATUS`，exit 1 |
| 外域跳转 | `EXTERNAL_REDIRECT`，exit 1；不跟随外部请求 |
| 不可 seek | 无 Range 响应 → `VIDEO_SEEK_FAILED`/`VIDEO_UNSEEKABLE`，exit 1 |
| 良好技术样例 | 记录真实浏览器 metadata（见 §3），exit 0；因缺 ffprobe L5=not_run |
| 失败返回非 0 | 所有负例 exit 1；缺包/缺参数 exit 2 |
| 客户媒体未到 | 明确 NOT_RUN（exit 2），未下载/未虚构/未验收 |

证据：`evidence/poc/media/technical-sample-report.json` + README；单元测试临时报告不冒充客户场景 L5。

## 5. 媒体缺项与 NOT_RUN

- **客户三套场景均未到**：无十文件 JSON、真实 MP4/poster/EN-AR VTT/产品图/Logo 副本、素材权利/身份核验、内容 review；`scenarios/` 仍只有 `catalog.json` 三条 `awaiting_content`；`apps/web/public/scenario-media/` 不存在。
- **L5 真实场景：NOT_RUN**（无包、无真实媒体；且本机无 ffprobe）。
- **ffprobe 编码/PixelFormat 探测：NOT_RUN**（工具缺失；不写成 PASS）。
- L1–L4 在媒体报告中为 `not_run`（POC-002 只负责 L5；POC-001 负责结构/语义）。
- 未执行：真实 Next Web 服务下的客户媒体、真实内容/画面语义与品牌匹配审核、POC-005 投影、视觉验收；均不报告通过。
- 技术测试媒体为 TEST_ONLY 合成色块/poster/VTT，不进入 catalog/public，不作为客户成片。

## 6. 文件指纹

| 文件 | Bytes | SHA-256 |
|---|---|---|
| `scripts/poc/verify-media.mjs` | 27,787 | `2da02bbc0091461465243858cf1fbe679e81fb6a7a71f6afb4c47994ce7aa7c2` |
| `tests/poc/media-validation.test.ts` | 18,562 | `0c9764e39439d7419b3d7200bd5f8cac0951151d8549674a81f36b0e7e06fa1b` |
| `evidence/poc/media/technical-sample-report.json` | 3,062 | `8bd1b2d6656847a53004d4890b0b56fc17cfb3a57a888e17645b1f1445e746c7` |
| `evidence/poc/media/README.md` | 3,379 | `3f685427553008aa74473dc89fddeb8220d4fba10bf965e52312d4930a5f86a8` |
| `tests/fixtures/poc/media/README.md` | 2,204 | `87fcc04b2f17cb9746dedc22815d8b64d753e14f384f25e46b9c2aeb4ff0a0ee` |
| `tests/fixtures/poc/media/good-1080x1920-15s.mp4` | 20,937 | `b41e789ad90d58644f00369dc520174413401d12a53df5727033a50e1323333f` |
| `tests/fixtures/poc/media/poster-1080x1920.png` | 12,248 | `5af047be9134cdf3c4ea404952e4c8d92d972cfaa7577604c8651d2feeb2f863` |
| `tests/fixtures/poc/media/good.vtt` | 166 | `bd937b1ae5738e04aa70d2a2e469865fedfaf07b6fc54838c722e00be814aabc` |
| `contracts/poc/scenario.schema.json`（只读） | 108,148 | `6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a` |
| `design/tokens.css`（只读） | 2,609 | `07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814` |

其余负例媒体（wrong dims/duration/corrupt/fake/bad VTT）hash 见 `tests/fixtures/poc/media/README.md`。

## 7. 已知限制

1. 本机无 `ffprobe`，无法完成编码/H.264 PixelFormat/容器级完整探测；L5 只能 NOT_RUN。若主控环境安装 ffprobe，工具会按同一代码检查并可将技术样例 L5 置 pass（未在本环境验证）。
2. 浏览器 metadata 能验证尺寸/时长/seek/播放，但不等于 H.264/yuv420p/AAC 的 ffprobe 级证明。
3. 无真实客户场景/媒体，L5 不能验收；必须等 A 包与真实媒体交接、Web 启动后重跑契约命令。
4. 媒体报告在契约 envelope 上增加了 `media`/`baseUrl`/`ffprobe`/`probeAttempted` 字段用于记录实际 metadata；L1–L4 明确 not_run，`runnable=false`。POC-001 合并只读取 L5/packageHash，不会因此放宽门禁。
5. 测试夹具由本地 ffmpeg 生成，仅 tests 技术样例，不含品牌/产品画面，不进入 catalog/public；不是客户内容。

## 8. 复现

```powershell
npm run typecheck
npm run test:unit -- tests/poc/media-validation.test.ts

# 真实客户包到齐且 Web 启动后（当前 NOT_RUN）：
node scripts/poc/verify-media.mjs --dir scenarios/scent-layering/1.0.0 \
  --base-url http://127.0.0.1:3100 --report evidence/poc/media/scenario-a-report.json
```

本报告仅提交 review；不自行 accepted，不启动 POC-003，不修改契约或视觉。
