# IP-005 · 三营销机会与可解释策略详情 · DSH 实施报告

日期：2026-11-05。状态：implemented，等待主控集中 review；不自行 accepted。

## 变更

- 新增 `components/product/opportunities/OpportunitiesPage.tsx` 与 `OpportunityDetailPage.tsx`：
  - 列表恰为三机会（analysis.id 主键），显示市场/产品/推荐摘要，无任何评分或虚构热度；View strategy 进真实详情。
  - 详情首屏回答“机会是什么/为什么适合 Lavish/下一步”：recommendation 作为主 quote，rationale/insights 可读；完整 Campaign Brief（objective/markets/audience/products/concept/tone/channels/languages/keyMessage/cta）结构化展示，不是大表单。
  - Product facts（verifiedFacts/SKU）与 marketing assumptions/uncertainties 分标签；Supporting evidence 逐条（全部，不取第一条）并可回 Radar 对应 signalId；assumptions/uncertainties 可展开。
  - 主 CTA Open campaign → `/atelier?campaignId=<brief.id>`；未知 opportunityId 明确 Not found + 返回列表，不静默换 A。
- 全部浏览/展开只读，不 createSession/selectScript/确认/导出。

## 验证（真实 exitcode）

| 命令 | exitcode | 证据 |
|---|---|---|
| `npm run typecheck` | 0 | evidence/product/ip-005/typecheck.log |
| `npm run build` | 0 | evidence/product/ip-005/build.log |
| `PLAYWRIGHT_PORT=3100 npm run test:e2e -- apps/web/tests/product-opportunities.spec.ts` | 0（4 tests） | evidence/product/ip-005/opportunities.log |

覆盖：三机会列表与三条精确详情路由；每条详情展示 recommendation/rationale/insights/完整 Brief/产品事实；全部 5 条 evidence 可读；assumptions 展开；证据回 Radar 并打开对应信号；三个 Open campaign 分别落到正确 brief.id；未知 ID Not found；全程 sessions=0/exports=0。

## 视觉证据

- `evidence/product/ip-006/opportunity-A-1440.png`、`opportunity-A-1366.png`
- `evidence/product/ip-003/smoke-opportunities.png`

## 已知限制 / NOT_RUN

- 详情 breadcrumb 末级目前是通用 “Strategy detail” 而不是机会名；不影响对象关联，留作 IP-009 视觉清单观察项。
