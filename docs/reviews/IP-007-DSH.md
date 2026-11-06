# IP-007 · Creative Library 统一内容浏览与版本定位 · DSH 实施报告

日期：2026-11-05。状态：implemented，等待主控集中 review；不自行 accepted。

## 变更

- 新增 `components/product/library/LibraryPage.tsx`：
  - 直接访问即展示三 Campaign 全部预置 EN/AR 脚本与静态分镜（12 项），并汇总有效 content session 的保存版本（排除 activity 会话）。
  - Campaign / Language / Type (Script/Storyboard) / Origin (Preset/Saved) 组合筛选，条件写入 URL（campaignId/language/kind/origin/versionId/sessionId）并刷新恢复；无匹配明确空态 + Clear filters；不添加视频/AI 图等无数据分类。
  - 行内容：真实标题 + 真实 hook 摘录 + Campaign/产品、单行 meta（类型/语言/来源/确认/导出数），不是满屏内部 ID。
  - Preview 复用 IP-006 ScriptPreview/StoryboardPreview；Open in Atelier 带精确 campaignId/versionId/owner sessionId；Export content pack 调 `exportScriptPack` 生成该精确版本真实 ZIP 并 `markProductExportTriggered`。
  - 筛/预览/打开只读；导出是唯一显式写并只写 export 记录；未保存编辑器内容不进库。
- 主控反馈修正：徽章合并为一行 meta，摘录改真实脚本首句，去除标题/ Campaign 名重复。

## 验证（真实 exitcode）

| 命令 | exitcode | 证据 |
|---|---|---|
| `npm run typecheck` | 0 | evidence/product/ip-007/typecheck.log |
| `npm run build` | 0 | evidence/product/ip-007/build.log |
| `PLAYWRIGHT_PORT=3100 npm run test:e2e -- apps/web/tests/product-library.spec.ts` | 0（5 tests） | evidence/product/ip-007/library.log |

覆盖：12 项全量可读；四筛选组合/URL 刷新/空态清除；12 行逐一 Preview 打开并验证精确 Atelier href；AR 预置稿真实导出 ZIP 并落记录、无 session/邮件；Atelier 保存后 Library 立即出现 Saved 版本、跨页打开同 Campaign/version/session。

## ZIP 标准解压核对（evidence/product/ip-007/library-export-audit.json）

`library-ar-preset-export.zip`（sha256 `826706c0…7d64`）标准 Expand-Archive 解压：
- 8 条目：brief.json / script.json / subtitles-ar.vtt / storyboard.html / README.txt / EXPORT.json / media/logo.png / media/perla.png，无 MP4。
- script id=`scn-luxury-gifting.script.ar-v1`、语言 ar、origin preset、title=الهدية تبدأ بفكرة.、4 shots。
- VTT 4 cues；storyboard 4 个 shot 时码、引用 media/、无 `<script>`。
- EXPORT.json attachments 7 项 bytes/sha256 全部与解压文件一致；script 引用资产（perla/logo）SHA-256 与源包 assets.json 完全一致。

## 视觉证据

- 终版基线：`evidence/product/ip-009/19-library-1440.png`、`30-library-1366.png`、`35-library-390.png`、`20-library-preview-1440.png`、`22-library-saved-ar-1440.png`。
- 主控反馈修正前/后：`evidence/product/ip-003/smoke-library.png`（竖排徽章/重复标题）→ `evidence/product/ip-009/19-library-1440.png`（单行 meta + 真实 hook 摘录）。

## 已知限制 / NOT_RUN

- 保存版本跨会话多用户同步不在本轮；单浏览器 IndexedDB 内即时可见。
- 视频类目/播放器按规格不提供。
