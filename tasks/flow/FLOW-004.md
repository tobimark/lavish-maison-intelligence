# FLOW-004 · 一次完整演示路径验收

## Goal / Dependencies / Context

证明普通营销人员能从热点一直看到模拟社媒成品。依赖FLOW-001..003、AS-003新SERENITY包及presentation审核绑定、AS-005最终成果包。读取两份flow规格及三项实现报告、AS-003检查单、已有主控首页审查；复用已通过结果，不重开基础审计。

## Allowed Files

apps/web/tests/product-{connected-flow,social-publish,cross-page}.spec.ts；tests/poc/{flow-projection,social-workflow}.test.ts（仅实际发现问题所需）；docs/INTERACTION_AUDIT_MATRIX.csv（新增实际flow/social控件）；docs/reviews/FLOW-{004,BATCH}-DSH.md；evidence/product/connected-flow/final/**。

## Acceptance / Visual / Data Requirements

演示一次：Overview→热点摘要/证据→SERENITY推荐理由/Brief→原图/主视觉/视频/脚本→EN或AR社媒文案→编辑保存→现有创意确认→审阅→模拟发布→刷新打开准确帖子→下载真实内容包/MP4→任意切回Radar/Atelier。未保存/重复点击/再次编辑与旧帖快照检查集中做一次，数据与媒体不能错配。

1440/1366实际截图，AR帖子RTL及视频播放、四段自由跳转/刷新、无死入口；源内容、创意方向、帖子、下载相同Campaign/版本。说明15秒概念与10.08秒独立预览，无live generation/真实发信/平台成功声称。提供3–5分钟中文演示说明，描述业务价值，不朗读文件ID。

```powershell
npm run typecheck
npm run build
npm run test:unit -- tests/poc/flow-projection.test.ts tests/poc/social-workflow.test.ts
npm run test:e2e -- product-connected-flow.spec.ts product-social-publish.spec.ts product-provided-assets.spec.ts product-cross-page.spec.ts
```

## Deliverables / Failure / DoD / Prompt

交一次FLOW-BATCH-DSH集中报告、真实新截图/ZIP/播放与模拟帖子记录、测试exit与未完成项。新包未到不能宣称全链通过；不要因这个等待重测旧首页或向用户重复索取已有媒体。主控实际看图/试主路径后决定整批accepted。

> 执行FLOW-004集中验收，按完整营销主线操作一次，不只统计测试通过数。保存热点到社媒预览/模拟帖的实际截图与真实文件，核对文案版本、语言、产品、视频hash及刷新历史。复用既有验收，有限回归正常路径，报告未完成项，不自行accepted。
