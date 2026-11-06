# FIX-POC-002-01 交付报告：媒体门禁误判与脚本匹配修复

- 任务：[tasks/poc/fixes/FIX-POC-002-01.md](../../tasks/poc/fixes/FIX-POC-002-01.md)；依据 [POC-002-MAIN.md](POC-002-MAIN.md)（changes_requested）。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；POC-001 accepted，POC-002 尚未 accepted。
- 状态：**review，未 accepted**；未启动 POC-003；未改公共 Schema/依赖/配置/Tokens/DESIGN_SYSTEM/业务页面/真实场景。
- 原 POC-002 证据保持不动；新证据单独存放 `evidence/poc/media/fix-01/`（原 technical-sample-report hash 仍为 `8bd1b2d6…746c7`）。

## 1. 四项主控发现的修复

### 1.1 播放推进误判（P1）

原代码 seek 到片尾后用 `currentTime > 0.02` 判 played，seek 后的绝对时间造成假阳性。现改为：

- 先确认 `canplay`（超时记录 `canPlayReady=false`，不得当作就绪）。
- 在播放前记录 `playback.beforeMs`，调用 `play()` 后实测 400 ms，再记录 `playback.afterMs` 与 `deltaMs`。
- `played = canPlayReady && deltaMs >= 100 && media.error == null`；若 `play()` resolve 但无推进 → `VIDEO_PLAYBACK_FAILED`。
- 报告记录 before/after/delta/playResolved；技术样例实测 `14500 → 14905 ms，delta=405 ms`。
- 新增测试专用环境开关 `POC_MEDIA_TEST_DISABLE_PLAYBACK=1`（仅测试 seam，运行时不设置），把 `play()` 替换为立即 resolve；CLI exit 1、`VIDEO_PLAYBACK_FAILED`、`deltaMs=0`、`played=false`。

### 1.2 跨端口重定向被当作同源（P2）

- `fetchAsset` 现在严格要求重定向目标的 **origin（scheme+host+port）等于 `baseUrl.origin`**；在发出目标请求之前拒绝，跨端口/协议/host 均报 `EXTERNAL_REDIRECT`。
- Playwright 浏览器上下文增加 `context.route`：只允许同源与 `data:` 子资源，其他请求在浏览器侧 abort。
- 回归测试使用**另一个本地端口**的第二个 HTTP 服务作重定向目标；CLI exit 1、`EXTERNAL_REDIRECT`，并断言第二服务收到的请求数为 **0**。

### 1.3 ffprobe 缺失/无效时长未拒绝（P2）

`parseFfprobeJson` 现在要求 `format.duration` 存在、可解析、有限且 **> 0**；缺失/`null`/空串/`NaN`/`Infinity`/负数均报 `FFPROBE_DURATION_INVALID`。与期望时长差异 >100 ms 继续报错；H.264、yuv420p、宽高、AAC 检查保留。

- 纯解析测试覆盖 `undefined/null/''/'NaN'/'Infinity'/'-1'`；本机无 ffprobe，所以实际容器探测仍 **NOT_RUN**，不安装/不伪造 ffprobe。

### 1.4 字幕未对照脚本 / seek 未按真实镜头起点（P2）

- `parseVtt` 保留 cue 文本，并新增乱序/重叠检查（`SUBTITLE_ORDER_INVALID`），文本做最小规范化（NFC、统一换行、去行尾空白/首尾空白），不丢弃语言差异。
- 字幕通过精确 `video.subtitleAssetIds → video.scriptVersionId → scriptVersion.subtitles` 绑定；比较数量、顺序、start/end、文本。缺失 owner/script → `SUBTITLE_SCRIPT_MISSING`；错文本 → `SUBTITLE_TEXT_MISMATCH`；数量/时码/顺序各有错误码。
- 视频 seek 改为使用绑定脚本的**镜头起点**（不等长样例 `[0,2000,5000,9000]`，第一个 0 单独验证 `startAtZero`），再加片尾前 `14500 ms`；实际 target/actual 写入报告。缺 owner script/4 镜头数据 → `VIDEO_SCRIPT_MISSING`/`VIDEO_SCRIPT_SHOTS_MISSING`，不声称镜头点检查通过。
- 新增负测：错误文本、缺 cue、多 cue、乱序/重叠、错语言文本；技术夹具脚本写明 4 个不等长镜头与 3 条字幕。

### 1.5 保留原有有效覆盖

原有 14 项有效覆盖全部保留（损坏/伪 MP4、错尺寸/时长、404、外域跳转、Content-Type、不可 seek、越界 VTT、缺包 NOT_RUN、helper 测试）；新增 5 项针对性回归，**共 19 passed**。未删除校验、未把 fail/not_run 改成 PASS。

## 2. 实际命令、退出码与结果

| 命令 | exit | 结果 |
|---|---|---|
| `npm run typecheck` | **0** | 无回归 |
| `npm run test:unit -- tests/poc/media-validation.test.ts` | **0** | **19 passed（33.23 s）**；含原 14 项 + 新增 5 项 |
| 有限技术样例 `verify-media`（TEST_ONLY 本地服务） | **0** | HTTP/签名/hash/不等长镜头 seek/播放推进/poster/VTT 脚本文本全部通过；本机无 ffprobe → **L5=not_run**；errors=[]；runnable=false |
| 真实客户包媒体命令 | **2** | `NOT_RUN: scenario directory not found — the complete customer package/media has not been received; no media PASS is claimed.`；不写假报告 |

技术样例报告（新证据）关键值：

- 包 hash：`ef34545a892d51543db2a1cbf35b83afee5502a84a8cd147a3c96b5f0a0ec925`
- 视频：1080×1920 / 15000 ms；`canPlayReady=true`、`startAtZero=true`。
- 镜头起点 `[0,2000,5000,9000]`；实际 seek targets `[2000,5000,9000,14500]`，全部 `seeked=true`，actual 精确到目标。
- 播放：before 14500 → after 14905 ms，**delta=405 ms**，`played=true`。
- Poster：1080×1920；VTT 3 cues，绑定 `scriptVersionId` 且 `textMatched=true`。
- `layers`：L1–L4 not_run、**L5 not_run**、`ffprobe:not_run`、`runnable:false`。

## 3. 四项主控发现的回归证据

| 发现 | 回归证据 |
|---|---|
| 禁用实际播放仍 played=true | `POC_MEDIA_TEST_DISABLE_PLAYBACK=1` CLI test：exit 1、`VIDEO_PLAYBACK_FAILED`、`deltaMs=0`、`played=false` |
| 跨端口重定向被当同源 | 第二端口服务请求计数保持 **0**；exit 1、`EXTERNAL_REDIRECT`；浏览器 route 同源限制 |
| ffprobe 缺时长未报错 | 纯解析测试缺失/NaN/Infinity/负数 → `FFPROBE_DURATION_INVALID`；ffprobe 缺失仍 L5 not_run |
| 字幕未比对脚本/镜头点覆盖不足 | 文本/数量/时码/顺序/语言负测；不等长 4 镜头实际 seek targets/actual 记录；缺 owner 报错 |

## 4. 证据与文件指纹

新证据目录（原 POC-002 证据未覆盖）：

- [evidence/poc/media/fix-01/technical-sample-report.json](../../evidence/poc/media/fix-01/technical-sample-report.json)
- [evidence/poc/media/fix-01/README.md](../../evidence/poc/media/fix-01/README.md)
- 原 `evidence/poc/media/technical-sample-report.json` SHA-256 仍为 `8bd1b2d6656847a53004d4890b0b56fc17cfb3a57a888e17645b1f1445e746c7`

| 文件 | Bytes | SHA-256 |
|---|---|---|
| `scripts/poc/verify-media.mjs` | 34,857 | `acfbda858d61f59dc4d7cd9e5ed2ff4eca9f5328a840d2e1092430ffab566cd2` |
| `tests/poc/media-validation.test.ts` | 24,593 | `20d3b8e0ec1499df26d26d398ad694bbaa2e09c13db3a5a4de059449b3a1fd57` |
| `evidence/poc/media/fix-01/technical-sample-report.json` | 3,779 | `e0be74d1c782fa3021e29729f81d4d3da74a40f97119e9bc21dfd847a199eb44` |
| `evidence/poc/media/fix-01/README.md` | 3,633 | `566bf24cfd19b01dca88cb3f4617ca6390c17afb916fc5ff8a615f99c8f9b67f` |
| `tests/fixtures/poc/media/README.md` | 2,875 | `d154d0a0b91b31b4bca943366f546ee3bffefce8f3692038c2e5db9703af0eab` |
| `contracts/poc/scenario.schema.json`（只读） | 108,148 | `6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a` |
| `design/tokens.css`（只读） | 2,609 | `07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814` |

新增测试媒体（均 TEST_ONLY，位于 `tests/fixtures/poc/media/`，不入 catalog/public）：`wrong-text.vtt`、`missing-cue.vtt`、`extra-cue.vtt`、`unordered.vtt`、`wrong-language.vtt`；原技术样例媒体未改。

## 5. 未运行 / 限制

- **本机无 ffprobe**：实际容器编码/PixelFormat 探测 NOT_RUN；ffprobe 解析逻辑由纯函数测试覆盖，不能声称真实 ffprobe PASS。
- **无客户场景/媒体**：A/B/C 十文件包、真实 MP4/poster/VTT/产品图/权利与内容审核均未到；真实 L5 NOT_RUN，媒体命令 exit 2 且不写假报告。
- L1–L4 在媒体报告中 not_run（属 POC-001 范围）；L5 只有技术样例浏览器结果，缺 ffprobe 不标 PASS。
- 未做视觉/业务 UI 验收；无客户视频播放或发送。
- 浏览器媒体测试需 Chromium；主控沙盒若不可见缓存，需在可用本机环境复跑（原主控已验证该环境限制）。
- 未安装/替换 ffprobe，未调用渲染/转码/邮件/外部服务；技术样例由本地 ffmpeg 仅生成 TEST_ONLY 色块素材。

## 6. 复现

```powershell
npm run typecheck
npm run test:unit -- tests/poc/media-validation.test.ts

# 有限技术样例 CLI（由测试服务器提供本地 HTTP；见 fix-01 README）
node scripts/poc/verify-media.mjs --dir <tmp>\scenario --base-url http://127.0.0.1:<port> --report evidence/poc/media/fix-01/technical-sample-report.json

# 客户真实包（当前 NOT_RUN，exit 2）
node scripts/poc/verify-media.mjs --dir scenarios/scent-layering/1.0.0 --base-url http://127.0.0.1:3100 --report evidence/poc/media/fix-01/scenario-a-report.json
```

提交 review 后停止；不自行 accepted，不启动 POC-003，不修改契约/设计。
