# DSH下一轮 · FLOW主线补齐并交集中Review

> **已完成并accepted（2026-11-06）**：FLOW-001..004收口，主控报告`docs/reviews/FLOW-BATCH-ACCEPTANCE.md`。下方为执行历史，不再重复实施或自动追加任务。15秒成片及AR审稿保留后续；失败UI不作本批前置。

2026-11-06，AS批次已accepted，本轮唯一交付是可理解、可操作的“热点→产品/策略→创意/视频→社媒模拟帖子”完整案例。沿用原唯一DSH执行者，不重做AS、不制作15秒片、不要求AR母语审稿作为本轮前置。主控负责内容/契约与实际视觉验收；本文件不表示已自动派发。

## 当前实际基线

- FLOW-001已有实现及`docs/reviews/FLOW-001-DSH.md`，未由主控accepted。
- Journey四段、flow API/存储和social组件均已存在，不按旧任务planned状态从零再写。
- `product-connected-flow.spec.ts`已存在；`product-social-publish.spec.ts`尚缺。FLOW-002/003/004及FLOW-BATCH交付报告尚缺。
- SERENITY A1.1.0已发布绑定，AS-001..006已accepted，不再等待原十JSON或重复接片。
- presentation侧车已存在，但发布记录注明由DSH从批准内容装配，含部分改述；本轮需补精确来源表供主控审查，不能称网页作者正式交付，不能自行新增营销结论。

## 必读与实现权限

读取`docs/CONNECTED_MARKETING_FLOW.md`、`docs/SOCIAL_MOCK_CONTRACT.md`、`docs/DESIGN_SYSTEM.md`、`docs/reviews/FAST_06-AS-CLOSURE-REVIEW.md`、`docs/reviews/SERENITY-A-1.1.0-PUBLISH.md`及`tasks/flow/FLOW-001..004.md`。复用原任务Allowed Files并按各任务归属补缺，不因本handoff扩大到冻结Schema、Tokens、原素材/十JSON或真实外部服务。

本轮允许更新FLOW报告、矩阵/任务状态为review及下述来源表；只修实际链路缺陷，不做无关重构。公共契约已发生的增量要列清修改文件及兼容性；不得自行继续改旧产品契约绕过错误，也不能盲目回退其他会话代码。需要进一步公共契约裁决时将具体差异交主控处理，其余工作继续。

## 连续执行的四项工作

1. **核对现状并补主链。** 首页一个明确案例入口；四段均直接可达且上下文相同。热点先讲观察及意义，策略讲为何选择SERENITY，创意按原图→主视觉→提供视频解释演进，社媒展示同视频与准确发布文案。用具体下一步CTA连接；六工作区始终自由访问。不要再以素材画廊、下载或邮件作为主链终点。
2. **完成社媒真实交互与测试。** EN/AR预览与编辑保存、创意确认、帖子审阅、Simulate publish、内部帖子详情及刷新恢复。准确所选脚本/文案/视频，未保存稿不进入确认，重复点击不重复发，修改后旧帖子保持原快照；失败保留稿并可重试。新增`apps/web/tests/product-social-publish.spec.ts`验证真实UI全路径，复用现有social-workflow单测，不能只以API用例代替。
3. **补内容来源与视觉收敛。** 新增`docs/reviews/FLOW-CONTENT-PROVENANCE.md`，将presentation每个文本字段对应到批准文件+JSON Pointer，区分原文复用/机械拆分/改述。改述不得自行扩写成新的策略或产品事实；主控据此审查，无需重复向用户索取已有十JSON。检查四段实际1440/1366截图与AR帖子RTL；Deliverables的旧Featured product技术文案、素材块占主体等非阻断意见只在影响本轮主路径时一并收敛，保持下载/视频可用。不恢复旧首页，也不推翻已通过素材比例与身份。
4. **集中演示验证并提交。** 用一个全新浏览器上下文走下面路径，保存全程关键截图、真实帖子快照、ZIP及操作结果。旧证据只读；新证据统一`evidence/product/connected-flow/final-2026-11-06/**`，测试输出路径须支持此目录，不能覆盖AS或旧FLOW证据。提交FLOW-002/003/004报告和`docs/reviews/FLOW-BATCH-DSH.md`，未完成项如实列出，不自行accepted。

## 唯一主验收路径

首页→进入SERENITY→读热点摘要/展开证据→查看产品匹配/Brief→原图和主视觉预览→播放真实视频→查看EN/AR脚本与四镜头→进入社媒帖子→修改并保存文案→明确确认创意→审阅准确帖子→模拟发布→打开已发模拟帖→刷新内容不变→下载内容包/原MP4→回Radar/Atelier继续浏览。

补测未保存离开、重新审阅、重复发布点击和发布后编辑这几个正常边界即可，不开启生产级并发/平台接入测试。明确区分15秒概念与10.08秒独立提供片；Simulated标签与“No content was sent to Instagram”可见。

```powershell
npm run typecheck
npm run build
npm run test:unit -- tests/poc/flow-projection.test.ts tests/poc/social-workflow.test.ts
npm run test:e2e -- product-connected-flow.spec.ts product-social-publish.spec.ts product-provided-assets.spec.ts product-cross-page.spec.ts
```

相关命令真实执行一次即可；新增变更或失败才针对性复跑。不要重跑会覆盖旧证据的历史spec。交付3–5分钟演示操作稿，说明每一步的业务结果，避免朗读ID/版本/工程日志。

## 可直接复制给DSH

> 执行tasks/DSH_HANDOFF_FLOW_FINISH.md。FAST_06 AS已accepted，不重做。先检查现有FLOW实现，复用Journey/API/存储/social组件，补齐热点→策略→原图/主视觉/视频→社媒帖子审阅与模拟发布的完整可操作路径。重点补product-social-publish.spec.ts真实UI测试、保存刷新/准确快照/幂等/旧帖不变，以及四段之间的业务解释和下一步操作。SERENITY A1.1.0已绑定，不再等用户十JSON；补presentation逐字段来源表供主控审查，不自编客户内容。按原FLOW任务白名单实施，提交FLOW-002/003/004和FLOW-BATCH报告、新目录实际1440/1366与AR截图、真实模拟帖子及下载证据。15秒制作和AR母语审稿另列后续，不作本批前置；主控看图并试完整路径后决定accepted。
