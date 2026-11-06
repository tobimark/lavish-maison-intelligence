# AS-006-DSH · 资产版完整点击与产品视觉验收（合并 IP-009）

日期：2026-11-06 · 状态：执行完成，等待主控集中审查与决定 accepted（不自行 accepted）

## 范围与基线

- 基线：`npm run typecheck` exit 0；`npm run build` exit 0，buildId `otW8-a5y66W0hdP0409Ee`；3150 生产服务。
- 工作区含另一批次 FLOW 代码（journey/flow-contract/flow-source、connected-flow 页面、FLOW 控件与测试）。本报告保留其基线、未改动其代码；**FLOW 功能不在 FAST_06 AS 验收范围内**，仅将其中真实存在的控件记录为 out-of-scope。
- SERENITY A 1.1.0 已发布并绑定（AS-003），无 awaiting 内容门禁。

## 119 行矩阵 DOM 审计

证据：`evidence/product/ip-009/matrix-dom-audit.json`（47 个真实状态、246 个实际 data-control-id、矩阵 119 行）。

| 结果 | 数量 |
|---|---:|
| found | 108 |
| guarded（DEL-retry，仅真实导出错误后出现） | 1 |
| NOT_RUN（有明确原因，见下） | 10 |
| notFound / unexpected | 0 / 0 |
| out-of-scope FLOW 控件（未删除、单独记录） | 14 |

NOT_RUN 原因（均未伪标通过）：
- `OV-explore`、`OV-creative`：并行 FLOW 批次以 connected-case/Journey CTA 替换了旧首页 CTA；旧控件已不存在，新 Journey CTA 由 product-provided-assets 实测。
- `AS-SHOT-{shotId}`：四镜头为静态只读 storyboard HTML，无逐镜交互控件。
- `AS-VIDEO-PLAY/SEEK/REPLAY/AUDIO/ERROR`：原生 `<video controls>` 不挂 data-control-id；真实 play/pause/seek/replay 由 E2E 实测。
- `AS-LIB-TYPE-{type}`：Library 使用单一 `LIB-kind` 六选项筛选，无逐类型 AS 控件；筛选功能实测。
- `AS-HANDOFF-EXPAND`：模拟 handoff 通过既有 MAIL 次级抽屉控件，无独立 AS 控件。

## 真实主路径与交互

- Overview → A 机会详情 → Campaign Brief → Atelier EN/AR → Library → Deliverables；六菜单均可自由切换，无空白/Soon/死链；浏览不建 session。
- Brief：SERENITY 1.1.0 Brief/analysis、identity 2000×2000 白底原图、Hero 2560×1440 完整 16:9；无旧 OUD/PERLA 产品字段。
- Atelier：EN/AR v2 脚本、四镜头、SERENITY identity、Provided 视频；视频实测 `720×960 / 10.08s / controls=true / object-fit contain`，play→pause→seek 7.56s→replay 全部通过，无 console/page error；Editing 不更新视频、不挂 15s VTT。
- Library：脚本/分镜 12 行 + Provided 三类型；kind 筛选、图片/视频预览、Open in Atelier 均真实可点；无 session 写入。
- Deliverables：A 1.1.0 双语包、独立 MP4 下载、旧 1.0.0 包、模拟邮件次级抽屉均无回归。
- 只读/跨页/刷新/Back/Forward/dirty guard/Activity 隔离：product-cross-page + navigation + atelier + deliverables 全绿。
- 390 无横向溢出（0px）；AR 截图含 RTL 内容。

## 测试结果

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过 |
| `npm run build` | 0 | 通过 |
| 全量 product-*（13 spec，含 connected-flow） | 0 | **57 passed / 0 failed** |
| legacy shell.spec + poc-prototype.spec（EVIDENCE_ROOT） | 0 | **18 passed / 0 failed** |
| product-asset-downloads（AS-005） | 0 | 3 passed |
| tests/poc/product-asset-export.test.ts | 0 | 2 passed |

日志：`evidence/product/assets/as-006/full-product-e2e.log`、`legacy-e2e.log`、`matrix-dom-e2e.log`、`provided-rerun.log`、`fix-three.log`。

## ZIP/MP4 证据

- A 1.1.0 双语包 `evidence/product/assets/as-005/a-1.1.0-en-ar-pack.zip`：10,736,354B；标准 Expand-Archive 21 files；`noVideo=false`；includedVersions en-v2/ar-v2（scenarioVersion 1.1.0）；provided hero 2,513,070B、identity 538,290B、MP4 1,315,394B，SHA 与 receipt 一致；EXPORT attachments 逐项匹配。
- B 1.0.0 包：`noVideo=true`、无 mp4/provided，旧历史保留。
- 独立 MP4 下载：1,315,394B，SHA `15d3756a0e93f591fc767998d84911ed425e3394554272f62120d61f0e31e10e`。

## 截图（真实 3150 构建）

`evidence/product/assets/as-006/01-overview-1440.png`、`02-opportunity-detail-1440.png`、`03-campaign-brief-1440.png`、`04-atelier-en-1440.png`、`05-atelier-video-seek-1440.png`、`06-atelier-ar-1440.png`、`07-library-1440.png`、`08-library-provided-video-preview-1440.png`、`09-deliverables-1440.png`、`10-overview-1366.png`、`11-campaign-brief-1366.png`、`12-atelier-en-1366.png`、`13-overview-390.png`、`14-atelier-ar-390.png`、`15-library-390.png`；`click-path-observations.json`。

## NOT_RUN / 已知限制

- 核心 15 秒成片与 poster 未制作（作者 pending）；提供 MP4 为独立 10.08s preview，不伪填 15s，不挂 VTT。
- AR 仍为待阿拉伯语母语/品牌审稿草案。
- 10 条矩阵行为 NOT_RUN（原因见上）；未把 FLOW 的 journey/connected-flow 功能写成 FAST_06 通过，也未改动其代码。
- 未做多用户/后台队列/真实后端/真实邮件；所有 mock/simulated 保持标识。
- 视频播放真实性以 Chromium 实测为准；未做跨浏览器矩阵。
