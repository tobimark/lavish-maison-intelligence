# FLOW 内容来源表 · presentation sidecar 逐字段追溯

日期：2026-11-06 · 审查对象：`apps/web/public/campaign-presentation/scent-layering/1.1.0.json`（4,279 bytes，SHA-256 `d816938ea8ad27deef8c54a329fd5cc7e865bcfb2ed76643fbd1cd8f1a6d164a`）
来源：DSH 从已批准 SERENITY A 1.1.0 十 JSON 装配，**不是网页作者正式交付的 sidecar**；不新增营销结论、指标、产品事实或效果声称。

## 0. 批准源文件

| 代号 | 路径 | 用途 |
|---|---|---|
| SCRIPT | `scenarios/scent-layering/1.1.0/script.json` | EN/AR 标题、hook、message、caption、cta、hashtags、四镜头、字幕 |
| ANALYSIS | `scenarios/scent-layering/1.1.0/analysis.json` | insights、rationale、assumptions、uncertainties、recommendation、brief |
| BRAND | `scenarios/scent-layering/1.1.0/brand.json` | 官方 citrus/floral/musk 边界、prohibitedClaims、产品 verifiedFacts |
| ASSETS | `scenarios/scent-layering/1.1.0/assets.json` | 资产 ID、角色、sourceNote、bytes/SHA |
| DISCOVERY | `scenarios/scent-layering/1.1.0/discovery.json` | signal/trend/evidence ID 与摘要 |
| PROVIDED | `design/presentation-assets/scent-layering.json`（public 副本同字节） | provided 资产 ID/角色/SHA/URI |

JSON Pointer 均相对文件根；`~`/`/` 转义遵循 RFC 6901。

## 1. 逐字段映射

| presentation 字段 | 来源文件 + JSON Pointer | 关系 | 说明 |
|---|---|---|---|
| `insight.title` | ANALYSIS `/data/analyses/0/insights/0`；ANALYSIS `/data/analyses/0/recommendation` | **改述** | “一次香氛、以印象序列讲述”由 insight 0 的“succession of sensory impressions”压缩；未加新结论。 |
| `insight.takeaway` | ANALYSIS `/data/analyses/0/insights/0`；`/data/analyses/0/insights/1`；`/data/analyses/0/rationale` | **改述** | 保留“light / floral / warm soft close”和“not verified note progression / layering”边界；无效果或成分新断言。 |
| `insight.signalIds[0..3]` | DISCOVERY `/data/signals/0/id` … `/data/signals/3/id` | **原文引用** | s1–s4 为 rising 主题信号。 |
| `insight.trendIds[0]` | DISCOVERY `/data/trends/0/id` | **原文引用** | trend.main。 |
| `insight.trendIds[1]` | DISCOVERY `/data/trends/1/id` | **原文引用** | trend.control。 |
| `insight.evidenceIds[0..4]` | DISCOVERY `/data/evidence/0/id` … `/data/evidence/4/id` | **原文引用** | e1–e5，含 s5 对照证据；页面按 ID 读取，不硬编码摘要。 |
| `strategy.analysisId` | ANALYSIS `/data/analyses/0/id` | **原文引用** | 精确 A analysis。 |
| `strategy.briefId` | ANALYSIS `/data/briefs/0/id` | **原文引用** | 精确 A brief。 |
| `strategy.whyThisProduct` | ANALYSIS `/data/analyses/0/rationale`；BRAND `/data/products/0/verifiedFacts/2`；BRAND `/data/brand/rules/3` | **改述** | 仅复用“verified product / official citrus, floral, musk / single-product restrained concept / no invented note order, layering or performance”；未增加成分、容量、效果。 |
| `creative.title` | SCRIPT `/data/versions/0/title`；SCRIPT `/data/versions/1/title`（AR 对照） | **原文** | EN “SERENITY — A Story in Layers” 与 AR “SERENITY — حكاية بطبقات من الإحساس”；sidecar 单标题按 EN 原文，非合并新文案。 |
| `creative.scriptVersionIds[0]` | SCRIPT `/data/versions/0/id` | **原文引用** | `scn-scent-layering.script.en-v2`。 |
| `creative.scriptVersionIds[1]` | SCRIPT `/data/versions/1/id` | **原文引用** | `scn-scent-layering.script.ar-v2`。 |
| `creative.steps[0].role/assetId` | ASSETS `/data/assets/1/id`；PROVIDED `/assets/1/id` / `/assets/1/roles` | **原文引用** | product_identity → `provided.scent-layering.product-serenity`。 |
| `creative.steps[0].explanation` | SCRIPT `/data/versions/0/shots/0/visual`；ASSETS `/data/assets/1/sourceNote` | **改述** | 白底原图、真实比例、身份基准；未新增画面元素。 |
| `creative.steps[1].role/assetId` | ASSETS `/data/assets/2/id`；PROVIDED `/assets/0/id` / `/assets/0/roles` | **原文引用** | hero → `provided.scent-layering.hero-serenity`。 |
| `creative.steps[1].explanation` | SCRIPT `/data/versions/0/shots/1/visual`；ASSETS `/data/assets/2/sourceNote` | **改述** | 暖光/花影为 mood，瓶标完整，道具非成分证据；来自 shot 1 visual 与 asset note。 |
| `creative.steps[2].role/assetId` | PROVIDED `/assets/2/id`/`roles` | **原文引用** | final_preview → `provided.scent-layering.final-preview`。 |
| `creative.steps[2].explanation` | ANALYSIS `/data/analyses/0/assumptions/2`；ANALYSIS `/data/analyses/0/uncertainties/2`；PROVIDED `/assets/2/metadata` | **改述** | 10.08s/720×960 独立提供片，非 15s 四镜头成片渲染；来自 assumptions/uncertainties 与素材元数据。 |
| `creative.relationship` | SOCIAL_MOCK_CONTRACT（`illustrative_workflow_with_provided_assets`） | **契约常量** | 表达“示意工作流 + 提供素材”，不是营销文案。 |
| `socialPosts[0].id/channel/placement/accountLabel` | 契约字段；SCRIPT 无对应文案 | **契约/固定值** | 账号标签固定 `Lavish Perfumes · Demo account`，不映射真实账号。 |
| `socialPosts[0].language` | SCRIPT `/data/versions/0/language` | **原文** | `en`。 |
| `socialPosts[0].sourceScriptVersionId` | SCRIPT `/data/versions/0/id` | **原文引用** | en-v2。 |
| `socialPosts[0].videoAssetId` | PROVIDED `/assets/2/id` | **原文引用** | final-preview。 |
| `socialPosts[0].caption` | SCRIPT `/data/versions/0/caption`（去掉末尾 hashtags） | **机械拆分** | 除拆分 hashtags 外逐字一致；未重写。 |
| `socialPosts[0].cta` | SCRIPT `/data/versions/0/cta`；ANALYSIS `/data/briefs/0/cta` | **原文** | “Discover SERENITY”。 |
| `socialPosts[0].hashtags[0..1]` | SCRIPT `/data/versions/0/caption` 末尾；SCRIPT `/data/versions/0/hashtags` | **机械拆分/原文** | `#LavishPerfumes`, `#SERENITY`。 |
| `socialPosts[1].language` | SCRIPT `/data/versions/1/language` | **原文** | `ar`。 |
| `socialPosts[1].sourceScriptVersionId` | SCRIPT `/data/versions/1/id` | **原文引用** | ar-v2。 |
| `socialPosts[1].videoAssetId` | PROVIDED `/assets/2/id` | **原文引用** | final-preview（同一真实 10.08s 片，不裁 9:16）。 |
| `socialPosts[1].caption` | SCRIPT `/data/versions/1/caption`（去掉末尾 hashtags） | **机械拆分** | 除拆分 hashtags 外逐字一致；AR 仍标注为待母语/品牌审稿草案。 |
| `socialPosts[1].cta` | SCRIPT `/data/versions/1/cta`；ANALYSIS `/data/briefs/0/cta` | **原文** | “اكتشف SERENITY”。 |
| `socialPosts[1].hashtags[0..1]` | SCRIPT `/data/versions/1/caption` 末尾；SCRIPT `/data/versions/1/hashtags` | **机械拆分/原文** | `#LavishPerfumes`, `#SERENITY`。 |

## 2. 非文案/非营销字段

| 字段 | 来源 | 校验 |
|---|---|---|
| `schemaVersion` / `scenarioId` / `scenarioVersion` / `campaignId` / `productIds` / `mode` | 契约固定值与已发布包 | packageHash 与 manifest 字节 SHA 一致；查询返回 A 1.1.0。 |
| `packageHash` | `scenarios/scent-layering/1.1.0/manifest.json` 字节 SHA-256 | `709abfdeb11f28a316ca6709c751f21cbcabdcb7cf30e4756418d9d8f46f854d`。 |
| 资产 URI/bytes/SHA | PROVIDED sidecar | hero 2,513,070B、identity 538,290B、MP4 1,315,394B，SHA 与 receipt 一致。 |

## 3. 审查结论与边界

- 原文复用：脚本标题/CTA/caption（除 hashtags 拆分）、所有 ID 引用、资产 ID；机械拆分：caption → caption + hashtags；改述：insight 文案、strategy 理由、三步创意解释。
- 未新增：热点增长率、平台指标、产品容量/成分顺序/功效、真实账号或平台成功、15 秒成片存在性。
- `presentation` 仍为 DSH 装配件；网页作者正式 sidecar 到位后应原路径原字节替换，并重跑本表校验。不得表述为“网页作者已交付”。
- AR 文案/字幕仍需阿拉伯语母语与 Lavish 品牌审稿；本表只证明来源可追溯，不证明对外投放批准。
- 15 秒概念脚本/分镜与 10.08 秒提供片独立；页面已分别标注，未把提供片描述为 15 秒成片。
