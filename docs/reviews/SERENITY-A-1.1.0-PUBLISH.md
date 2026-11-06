# SERENITY A 1.1.0 · 发布绑定与 presentation 侧车记录

2026-11-05，执行 PUBLISH（承接 `docs/reviews/SERENITY-A-1.1.0-CONTENT-INTAKE.md` 的接入裁决 2–4）。本记录证明内容已按批准副本发布并可被客户端读取，不代表 FLOW 主线或 FAST_06 已验收。

## 发布来源与位置

- 唯一来源：`content-inbox/web-chatgpt-prepared/a8d1ef5f54da/scent-layering/1.1.0/`（主控批准的规范接收副本）。
- 场景 JSON：`apps/web/public/content-scenarios/scent-layering/1.1.0/`，manifest+9 个业务 JSON 共 10 个文件，逐字节复制。
- 场景媒体：`apps/web/public/scenario-media/scent-layering/1.1.0/`，5 个真实文件（Logo、SERENITY 白底原图、SERENITY Hero、EN/AR 15 秒概念字幕）。两条未来 15 秒影片/poster 仍为 pending，未伪造。
- 版本策略：`content-scenarios/catalog.json` 保留 1.1.0 为 A 默认内容、1.0.0 为历史，其它两场景不变。

## 校验结果

- `manifest.json` 的 9 条 files bytes/SHA-256 全部一致；packageHash = `709abfdeb11f28a316ca6709c751f21cbcabdcb7cf30e4756418d9d8f46f854d`，与 catalog 及接收报告一致。
- 5 个真实媒体 bytes/SHA-256 全部一致（`evidence/product/assets/as-003/publish/publish-verification.json`）。
- 复用现有校验器：`node scripts/poc/validate-content-only.mjs --dir apps/web/public/content-scenarios/scent-layering/1.1.0 ...` → L1/L2/L3/L4 pass、contentRunnable=true、media 5 real / 2 pending，exit 0。
- 提供素材 sidecar `design/presentation-assets/scent-layering.json` 与 `apps/web/public/presentation-assets/scent-layering.json` 为 `contentStatus: bound`，3 个资产 bytes/SHA 与已发布原文件一致。HTTP 探测需运行中的服务器，本轮记录为 NOT_RUN。

## presentation 侧车

新增 `apps/web/public/campaign-presentation/scent-layering/1.1.0.json`（4,279 bytes，SHA-256 `d816938ea8ad27deef8c54a329fd5cc7e865bcfb2ed76643fbd1cd8f1a6d164a`），结构严格按 `docs/SOCIAL_MOCK_CONTRACT.md`：

- `packageHash` = 已发布 `manifest.json` 字节 SHA-256，与场景包一致；EN/AR 两条 Instagram 预置帖 accountLabel 固定为 `Lavish Perfumes · Demo account`，视频均引用 `provided.scent-layering.final-preview`，脚本引用 `en-v2/ar-v2`。
- **来源说明（重要）**：网页端 ChatGPT 尚未交付作者版 sidecar。本轮为让主线可实施/可演示，由 DSH 从已批准的 A1.1.0 内容逐项装配，不新增热点、指标、产品事实或效果声称：
  - `insight.title/takeaway` 改述自 `analysis.data.analyses[0].insights[0]` 与 `brief.concept`；signal/trend/evidence IDs 均来自已发布 `discovery.json`（s1–s4 为 rising 主题信号，含 s5 对照证据）。
  - `strategy.whyThisProduct` 改述自同一 analysis 的 `rationale` 与官方 citrus/floral/musk 边界。
  - `creative.steps[].explanation` 改述自 `script.json` 镜头 1–3 的 visual 说明及作者 `VIDEO_RELATIONSHIP.md` 的“10.08 秒独立 Provided preview、非 15 秒四镜头成片”结论；资产 ID/角色与 provided sidecar 一致。
  - `socialPosts[].caption` 取自已批准 `script.json` 的 `caption`，仅机械拆分出末尾 hashtags；`cta` 与 `hashtags` 直接取自已批准脚本/Brief。
- 该装配件应在网页作者交付正式 sidecar 后原字节替换（路径不变、接口不变），替换后需重跑 sidecar 校验与主路径抽查；在此之前不得把它描述为“网页作者已交付内容”。

## 未完成 / 边界

- `scripts/poc/validate-campaign-presentation.mjs` 由 FLOW-001 同批新增，交付后对上述文件实际运行并补记录。
- 浏览器读取、页面视觉、Journey/社媒主线与 ZIP 整链：NOT_RUN，属 FLOW-002..004。
- 15 秒概念片/poster 未制作；10.08 秒片仅为独立 Provided preview，不挂 15 秒字幕、不称生成。
- 本记录不改变作者 `reviewStatus=pending`，不声称 Lavish 已批准对外投放。

## 命令与证据

```powershell
node scripts/poc/validate-content-only.mjs --dir apps/web/public/content-scenarios/scent-layering/1.1.0 --report evidence/product/assets/as-003/publish/content-validation-published.json
node scripts/poc/validate-provided-assets.mjs --mapping apps/web/public/presentation-assets/scent-layering.json --root . --report evidence/product/assets/as-003/publish/provided-assets-validation.json
```

- `evidence/product/assets/as-003/publish/publish-verification.json`：发布文件/媒体/侧车哈希、catalog 一致性、错误清单（空）。
- `evidence/product/assets/as-003/publish/content-validation-published.json`：现有 content-only 校验报告。
- `evidence/product/assets/as-003/publish/provided-assets-validation.json`：静态校验 errors 为空；HTTP 探测因无运行服务器 404，NOT_RUN。
