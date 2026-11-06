# FLOW-002 · 首页到四段营销Journey

## Goal / Dependencies / Context

让普通人看懂热点→推荐→创意→社媒关系。依赖FLOW-001；阅读CONNECTED_MARKETING_FLOW、SOCIAL_MOCK_CONTRACT、DESIGN_SYSTEM、HTML参考、AS-004-HOME-CORRECTION、现有Overview、Brief、Atelier及ProvidedAssets组件。

## Allowed Files

- apps/web/app/campaigns/[campaignId]/journey/page.tsx（新增）
- apps/web/components/product/journey/**（新增页面及CSS模块）
- apps/web/components/product/{Overview.tsx,workspace.module.css}
- apps/web/components/product/shared/{ProvidedAssets.tsx,provided.module.css,PreviewBlocks.tsx}（复用演进/预览，不改其他页面行为）
- apps/web/components/product/{opportunities,brief,atelier}/**（仅精确Campaign/版本的Journey返回入口与必要参数传递）
- apps/web/tests/product-connected-flow.spec.ts（核心路由/浏览用例）
- docs/reviews/FLOW-002-DSH.md；evidence/product/connected-flow/flow-002/**

## Functional / Visual Specification

首页一个明确案例入口，Journey真实四段导航，URL stage任意直接访问和刷新；同一Campaign上下文始终可见。每段按主控页面表先展示结论/结果，证据和字段按需。第三段原图→主视觉→视频保留已通过等高对齐和完整比例，增加各步业务解释；讲解用预置数据，不产生假渲染。播放真实10.08秒片，15秒概念脚本作为独立展开内容；EN/AR/四镜头复用现有预览。第四段接FLOW-003，未接入时仅在内部开发显示缺项，最终不能提交空占位为完工。

统一Token/16px正文/14px辅助，1440及1366一个主体区域，四段tabs可点击且active明确；顶部不堆Mock/版本/来源长说明。主操作承接下一段，六侧栏自由离开；不新增只读完成状态，不要求跑上一阶段。复用guard，带未保存稿离开受保护。

## Data Contract / Acceptance / Tests

只用getCampaignJourney和现有API；引用新A准确版本，pending诚实，不在页面硬编码热点或新脚本。冷进入任一段不建session或发布；各段产品/创意/视频相同；普通人能说出为什么选产品、得到什么成果。

```powershell
npm run typecheck
npm run build
npm run test:e2e -- product-connected-flow.spec.ts
```

## Deliverables / Failure / DoD / Prompt

真实1440/1366四段截图、主CTA/跳段/返回与视频验证、代码/报告。把原素材画廊简单加step编号、仍需跨六页猜关系、首页重复大型素材区、假进度均不满足。最终绑定等AS-003，工程与FLOW-003可连续推进，不自行accepted。

> 执行FLOW-002，按两份flow规格做同一案例的四段Journey及首页入口，明确每段输入/结论/下一步，保留六工作区自由访问。复用原图→主视觉→视频组件及播放器，在数据到齐后展示真实创意解释和EN/AR脚本。不要只复制原页面堆成长列表；不要用假生成动画代替关系说明。按白名单实现并提交实际截图/点击证据，未绑定如实记录。
