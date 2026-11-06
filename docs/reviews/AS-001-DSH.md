# AS-001-DSH · 提供素材发布与真实文件验证

日期：2026-11-05 · 状态：实施与验证完成，等待主控集中验收（不自行 accepted）

## 变更

- `apps/web/public/provided-assets/scent-layering/1.0.0/`：逐字节发布三份用户原文件（`hero-serenity.png` 2,513,070B、`product-serenity.png` 538,290B、`final-preview.mp4` 1,315,394B），未转码/裁剪/拉伸。
- `apps/web/public/presentation-assets/scent-layering.json`：逐字节发布主控 sidecar，`contentStatus` 保持 `awaiting_serenity_content`、`scenarioVersion=1.1.0`，未伪改 bound。
- `scripts/poc/validate-provided-assets.mjs`（新增）：读取 sidecar + receipt，校验 PNG 签名/IHDR 真实尺寸、MP4 box 真实参数（mvhd 时长、tkhd 尺寸、stts fps、stsd codec、avcC/SPS chroma）、bytes/SHA、URI 同源与角色/产品/版本/3:4 约束；内置临时 HTTP server 检查 200/MIME/完整字节/Range 206。
- `tests/poc/provided-assets.test.ts`（新增 9 用例）：发布副本字节一致、receipt hash、sidecar 未变/awaiting、PNG/MP4 真实参数、拒绝 15s/9:16 伪标、拒绝坏 hash/URI/角色/产品绑定、HTTP 200/MIME/Range、绿色 static report。

## 命令与真实 exitcode

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过（契约已由主控稳定为 6548B 版；provided 增量在独立 contract） |
| `node scripts/poc/validate-provided-assets.mjs --mapping design/presentation-assets/scent-layering.json --root apps/web/public --report evidence/product/assets/static.json` | 0 | `ok:true`，0 errors，1 warning（awaiting content，预期） |
| `npm run test:unit -- tests/poc/provided-assets.test.ts` | 0 | 9 passed |

补充真实 HTTP/浏览器探测（dev server :3000，public 静态资源）：
- `evidence/product/assets/as-001/next-http-check.json`：三文件 HTTP 200、MIME `image/png`/`video/mp4`、完整字节 SHA 与 receipt 一致、Range 206 + `Accept-Ranges: bytes`。
- `evidence/product/assets/as-001/browser-media-probe.json`：Chromium 读 video `duration=10.08`、`videoWidth=720`、`videoHeight=960`、seek 7.56s 成功、无 media error；Hero `naturalWidth/Height=2560×1440`；identity `2000×2000`。

## 真实文件事实

| asset | bytes | sha256 | 实测 |
|---|---:|---|---|
| hero-serenity.png | 2,513,070 | `1c4e337b…b37499` | PNG 2560×1440 |
| product-serenity.png | 538,290 | `f75fa10b…d026af62` | PNG 2000×2000 |
| final-preview.mp4 | 1,315,394 | `15d3756a…31e10e` | 10.08s（mvhd 10.127s，浏览器 10.08s）、720×960、3:4、24fps、H.264 High/yuv420p、AAC |

- 三文件 hash/bytes 与 `evidence/brand/provided-serenity-assets-receipt.json` 完全一致；public 副本与 source 逐字节相同。
- sidecar 的目标 1.1.0 仍为等待内容，未把旧 1.0.0 OUD/PERLA 包改为 SERENITY，未伪标 bound。
- 10.08s / 3:4 / 720×960 按真实属性记录；没有按冻结 15s/9:16 校验器硬套，也没有反向把 provided 片写进 15s VideoEntry。

## NOT_RUN / 已知限制

- 本任务无 UI/播放器实现，视觉与播放器交互由 AS-004/AS-006 验证。
- 上述 HTTP/浏览器探测使用 dev server :3000；生产 build 后的 Next 静态请求将在同批构建检查点复验（AS-002/IP-FIX-02 后）。
- 音轨存在但未做听音/上游授权审查；AIGC 元数据与上游生产方式未独立确认，不称实拍/官方广告/本 POC 生成。
- SERENITY 1.1.0 内容未到，AS-003/AS-006 最终绑定仍 NOT_RUN。

## 证据路径

- `evidence/product/assets/static.json`
- `evidence/product/assets/as-001/next-http-check.json`
- `evidence/product/assets/as-001/browser-media-probe.json`
