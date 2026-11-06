# IP-001 · 统一只读产品查询与业务投影视图 · DSH 实施报告

日期：2026-11-05。状态：implemented，等待主控集中 review；不自行 accepted。

## 变更

- 新增 `apps/web/demo/poc/api/product-queries.ts`：实现 `ProductReadApi` 全部读方法（getOverview/listSignals/getSignal/listOpportunities/getOpportunity/listCampaigns/getCampaign/listCreativeAssets/getCreativeAsset/listDeliverables/getAgentActivity），复用现有 `ScenarioSource` 三包（content_ready）与 `PocStorage`。
- `apps/web/demo/poc/api/mock-api.ts`：`BrowserMockApi` 现在实现 `ProductMockApi`，只读方法委托给查询服务；读取不 createSession/executeStage/selectScript/confirm，不写 history/receipt/export/delivery。
- `apps/web/demo/poc/storage/types.ts` + memory/indexeddb：新增 `purpose?: 'editing'|'activity'` 字段校验、`workspaceLinks`/`productExports` 接口（IP-002 使用），DB 版本 1→2 仅增量建 store。
- 关联规则：Opportunity=`analysis.id`，Campaign=`brief.id`，按 `brief.analysisId`/manifest entry 链关联；不新建持久化 Campaign、不造评分。Signal/Evidence/Trend 来自三包真实 mock 数据；saved version 汇总有效 content session，排除 `purpose=activity`；activity/legacy 规则见报告。
- 筛选：campaignId/source（platform 标准化 instagram/tiktok/pinterest/youtube/other）/topic/query 组合 AND；无匹配返回空集合；未知 ID 返回 `NOT_FOUND`，不静默换 A。
- `scriptContentFromVersion`、真实图片（ReceivedAsset）与中文/阿文 version 投影均直接来自包数据。

## 验证（真实 exitcode）

| 命令 | exitcode | 证据 |
|---|---|---|
| `npm run typecheck` | 0 | evidence/product/ip-001/typecheck.log |
| `npm run test:unit -- tests/poc/product-read.test.ts` | 0（9 tests） | evidence/product/ip-001/unit-product-read.log |

覆盖：三机会/三 Campaign/15 信号；四来源组合筛选；全部信号逐条 `getSignal` 证据链；未知信号/机会/Campaign NOT_FOUND；默认与带 `language`/`versionId` 深链预览；creative assets 12 项（3×2 语言×2 类型）与 deliverables 6 项；saved 版本投影；只读 sweep 前后 sessions/history/workflow/exports 相等；Activity 只读不建会话。

## 契约外必要适配（请主控确认）

- 因 DB 允许版本 1→2（新增两 store，保留旧数据），两条旧测试中的裸 `factory.open(dbName, 1)` 注入改为 version 2，否则 fake-indexeddb 抛 VersionError；断言本身未删除、未放宽。文件：`tests/poc/storage.test.ts:183`、`tests/poc/mock-api.test.ts:515`。
- `downloads/zip.ts` 保留文件名中的 `media/` 目录（仍剥离绝对路径/`..`），供 IP-002 导出包规范；旧 content pack 文件名不受影响。

## 已知限制 / NOT_RUN

- 本任务无 UI，无截图；视觉验收在 IP-003 之后。
- 浏览器真实加载（fetch 三包/IndexedDB）在 IP-003 E2E 验证；本任务只跑 node 单测。
- 完整 15 信号的“所有实际项”浏览器点击矩阵在 IP-004/IP-009 覆盖。
