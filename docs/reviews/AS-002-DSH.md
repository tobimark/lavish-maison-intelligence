# AS-002-DSH · 资产映射 Source 与 Mock API 扩展

日期：2026-11-05 · 状态：实施与验证完成，等待主控集中验收（不自行 accepted）

## 变更

- `apps/web/demo/poc/api/provided-asset-source.ts`（新增）：只读 ProvidedAssetSource；浏览器实现只从 `/presentation-assets/scent-layering.json` 读取映射、从映射 `uri` 取真实字节；拒绝非 same-origin/含 `..` 的 URI；提供真实 `DownloadResult` 构造。
- `apps/web/demo/poc/api/types.ts`：`MockApiOptions` 增加可选 `providedAssetSource`（缺省 = 无资产）。
- `apps/web/demo/poc/api/mock-api.ts`：
  - `BrowserMockApi implements AssetAwareMockApi`，新增 `getProvidedAssets` / `getProvidedAssetDownload` / `listLibraryItems`；
  - 校验 `campaignId + scenarioVersion + productId`：仅 A `scn-scent-layering.brief.main` + `1.1.0` 返回 sidecar；错误 Campaign/版本/产品返回 null/NOT_FOUND，B/C 与无 source 均正常返回 `null`/脚本成果；
  - 资产下载读取真实已发布字节，校验 length 与 SHA-256，返回真实 DownloadResult；未知 asset → NOT_FOUND；不 createSession / 不导出 / 不触发视频 workflow 或邮件；
  - `listLibraryItems`：脚本/分镜（原 CreativeItem）与三类 Provided（version=null）判别联合；支持 kind/campaign/query/origin；不伪造 versionId；
  - `exportCampaignPack`/`get/list/markCampaignPackExport*` 暂为诚实未接线占位（返回错误/空，不造假成功），由 AS-005 替换。
- `apps/web/components/poc/browser-api.ts`：`getBrowserApi()` 返回 `AssetAwareMockApi`，注入浏览器 sidecar/字节 loader；页面仍只经同一门面。
- `tests/poc/product-assets-api.test.ts`（新增 8 用例）：sidecar/资产真实 hash、错误版本/产品拒绝、三资产真实下载、未知 asset、Library 联合与过滤、只读无副作用、导出占位不造假。

## 命令与真实 exitcode

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过 |
| `npm run test:unit -- tests/poc/product-assets-api.test.ts tests/poc/product-read.test.ts` | 0 | 17 passed（AS-002 8 + 既有 read 9） |

日志：`evidence/product/assets/as-002-unit.log`、`evidence/product/assets/as-002-typecheck.log`；摘要 `evidence/product/assets/as-002/api-summary.json`。

## 关键行为

- A 1.1.0 sidecar：`contentStatus=awaiting_serenity_content`（未伪改 bound），3 资产真实 bytes/SHA/roles 与 AS-001/receipt 一致；错误产品/版本不返回资产，旧 A 1.0.0 不偷换图。
- 同一 assetId 的 URI/bytes/SHA/roles 只来自 sidecar 一处，六个页面通过同一 API 读取（页面接线见 AS-004）。
- 提供视频可独立下载真实 1,315,394B 原文件，不调用旧 video executeStage、不写 confirmation/delivery。
- 只读查询前后 `listSessions`、`getOverview().recentExports`、`listDeliverables().exports` 均为空。

## NOT_RUN / 已知限制

- `exportCampaignPack` 完整 ZIP/记录实现属 AS-005，本任务仅保证不造假成功；当前返回 `MOCK_FAILURE` 且无记录。
- UI 组件接线/视觉/播放器交互属 AS-004；本任务无视觉通过声明。
- SERENITY 1.1.0 新内容未到，sidecar 仍 awaiting；A 最终内容绑定属 AS-003。
- `listLibraryItems` 对 Provided 资产的语言/来源过滤按“语言中立、非 preset/saved 版本”处理；origin=saved 时不混入 Provided。

## 证据路径

- `evidence/product/assets/as-002/api-summary.json`
- `evidence/product/assets/as-002-unit.log`
- `evidence/product/assets/as-002-typecheck.log`
