# AS-005-DSH · 双语成果包与原视频下载

日期：2026-11-05/06 · 状态：实施与真实验证完成，等待主控集中验收（不自行 accepted）

## 实现现状

- `exportCampaignPack` / `listCampaignPackExports` / `getCampaignPackExport` / `markCampaignPackExportTriggered` 由同批既有实现提供；本任务完成 1.1.0 绑定后的正式验证。
- A 1.1.0 双语包：显式选择实际 preset EN/AR 版本（en-v2/ar-v2，scenarioVersion=1.1.0），包含
  - `en|ar/brief.json`、`script.json`（真实选定版本）、`subtitles-*.vtt`（15 秒概念）、`storyboard.html`、四镜头真实图片
  - `provided/hero-serenity.png`、`provided/product-serenity.png`、`provided/final-preview.mp4`（原字节）
  - `README.txt`、`EXPORT.json`（含 includedVersions/providedAssetSetId/providedAssetIds/attachments）
- `noVideo` 按实际条目计算：A 包含 MP4 → **false**；旧 1.0.0 B 包无 provided 资产 → **true**。
- 独立 `Download video` 走真实 Blob 下载，不触发确认/模拟邮件/旧 video workflow。
- 历史导出记录仍按记录保存原 ZIP 字节；旧 1.0.0 不被新包/新稿替换。

## 真实验证（3150 生产构建）

| 验证 | 结果 |
|---|---|
| A 包标准解压 | 21 files，10,733,932B 解压内容；ZIP 10,736,354B |
| A EXPORT.json | noVideo=false、noRealEmail=true、providedAssetSetId=`provided.scent-layering.serenity-v1`、providedAssetIds 3 项、includedVersions 2 项均 scenarioVersion=1.1.0、en-v2/ar-v2 |
| A 附件逐字节 | `provided/final-preview.mp4` 1,315,394B SHA-256 `15d3756a…31e10e`；hero 2,513,070B `1c4e337b…b37499`；identity 538,290B `f75fa10b…026af62`；EXPORT.json 内 attachments 全部与解压文件 bytes/SHA 一致 |
| B 1.0.0 包 | ZIP 3,369,118B；无 `.mp4`/`provided/` 条目；EXPORT.json noVideo=true、includedVersions 均 1.0.0、providedAssetIds=[] |
| 独立 Download video | 1,315,394B；SHA-256 `15d3756a0e93f591fc767998d84911ed425e3394554272f62120d61f0e31e10e` = receipt |
| 标准工具解压 | PowerShell `Expand-Archive` 成功（`evidence/product/assets/as-005/unzipped-a|b`） |

命令：
- `npm run typecheck` → 0
- `npm run test:unit -- tests/poc/product-asset-export.test.ts` → 0（2 passed）
- `npm run build` → 0（buildId `otW8-a5y66W0hdP0409Ee`）
- `PLAYWRIGHT_PORT=3150 npm run test:e2e -- product-asset-downloads.spec.ts` → 0（**3 passed / 0 failed**）

## 证据

- `evidence/product/assets/as-005/a-1.1.0-en-ar-pack.zip` + `unzipped-a/**`
- `evidence/product/assets/as-005/b-1.0.0-pack.zip` + `unzipped-b/**`
- `evidence/product/assets/as-005/deliverables-provided-final-preview.mp4`
- `evidence/product/assets/as-005/a-1.1.0-pack-audit.json`、`b-1.0.0-pack-audit.json`、`video-download-audit.json`
- `evidence/product/assets/as-005/e2e.log`、`as-005-unit.log`

## NOT_RUN / 已知限制

- 包内 15 秒概念 VTT 与 script 对应；提供的 10.08s MP4 为独立 preview，未挂 VTT、不称由 15s 脚本生成/同步。
- 核心 15s 成片与 poster 仍未制作（pending），包内不含伪造 15s 视频。
- 模拟邮件仍为次级旧 content delivery，不是普通导出回执；本任务未把邮件作为包前置。
- 历史记录重下逻辑沿用现有 productExports 快照；本次仅验证新包与原 MP4，不重新生成旧 ZIP。
- 工作区含另一批次 FLOW 代码（journey/connected flow），未纳入本任务验收、未改动。
