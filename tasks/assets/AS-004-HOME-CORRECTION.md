# AS-004 首页修正补充 · 产品原图 → 营销主视觉 → 视频预览

2026-11-05用户截图反馈，覆盖AS-004及旧资产方案中冲突的首页布局要求。属于FAST_06现有任务内修正，不另开阶段或重复基础验收；DSH实现，本文件不是已修复或视觉通过的报告。

## 目标与已定位问题

首页先讲Lavish营销工作区用途，再用SERENITY展示从产品素材到视觉成果的创意演进。现有Overview.tsx把ProvidedAssetShowcase放在用途介绍之前；ProvidedAssets.tsx依次render hero / identity / video；provided.module.css使用1.3fr / .45fr / .65fr、align-items:start，媒体分别16:9 / 1:1 / 3:4，造成素材仓库式首屏、次序错误及高低参差。不能仅交换两张图后声称完成。

## 依赖与阅读

复用已实现IP工作区及AS资产API，无需等新文案包才能修正展示结构。阅读docs/DESIGN_SYSTEM.md、docs/PRODUCT_RESCUE_ASSET_INTEGRATION.md、tasks/DSH_HANDOFF_DEMO_FAST_06.md、design/presentation-assets/scent-layering.json以及当前Overview/ProvidedAssets源码。不得自行编写新趋势、SERENITY营销脚本或假生成记录。

## 允许修改

- apps/web/components/product/Overview.tsx
- apps/web/components/product/workspace.module.css
- apps/web/components/product/shared/ProvidedAssets.tsx
- apps/web/components/product/shared/provided.module.css
- apps/web/tests/product-provided-assets.spec.ts（必要布局/实际播放路径检查）
- docs/INTERACTION_AUDIT_MATRIX.csv（同步变更入口，不为装饰箭头添加按钮）
- docs/reviews/AS-004-DSH.md（保留旧结论，追加修正结果）及evidence/product/assets/home-correction/**新证据。

不得改冻结Schema、Tokens、素材字节、用户草稿、公共API或状态机；不要把首页专用布局强制用于Atelier与Deliverables。

## 页面及视觉规格

1. 用途介绍必须在资产区域之前。唯一H1可用“From market insight to campaign-ready creative”；说明“Explore opportunities, review bilingual scripts and storyboards, and download campaign materials.” 两个清晰入口为Explore opportunities与Browse creative work，沿用真实路由。删除首页“A real product story, with supplied product assets”以及Featured product这种不能解释工作流的主标题。
2. 案例区标题“SERENITY · Creative concept”，副标题“Product image → Campaign visual → Video preview”。不是强制三步向导，三项任意点击，不锁后续工作区。
3. 三卡顺序在DOM、视觉与窄屏阅读顺序均为：01 Product image（白底identity）→ 02 Campaign visual（氛围Hero）→ 03 Video preview（提供的MP4）。每卡上方有编号与业务名称，下面一句用途说明，箭头仅表达创意顺序。不要将Hero/identity等内部角色名当主要用户文案。
4. 桌面三卡等宽、等高；编号、媒体框顶底、说明起点和操作行分别对齐。统一媒体框高度：1440宽视口建议240px，1366建议220px，可按实际首屏空间微调。卡片内部使用一致的header/media/caption/action行，不能按图片自然高撑卡，也不能靠添加多行技术文字补高度。
5. 等高的是展示框，三种文件保持原始比例：产品图contain且瓶身完整；Hero完整呈现优先；视频3:4 contain。不得拉伸、裁掉产品标签，不能为消除留白把视频裁为横屏。中性底色形成有意留白；图片加载前后不跳高。完整播放器只在用户展开或打开预览后出现，首页初始用统一尺寸预览入口；播放入口必须真能打开播放器。
6. 1440×900与1366×768初始视口应能看到用途、主要CTA、三阶段媒体及各自标题，不被大段状态和巨型视频挤出首屏。窄屏按01/02/03垂直堆叠，箭头改向下或去掉；不出现横向溢出。
7. 首页移除逐项Download hero/identity按钮与MB、像素、毫秒、包版本等技术说明；下载入口集中到Library/Deliverables。Mock全局标签保留；此区一条简短可见说明“Provided demo assets · Creative progression shown for illustration.” 视频预览旁保留“Provided demo asset · Not generated live”。来源细节按需展开，不能完全隐藏真实性提示。
8. 内容未绑定时只显示一条简短“Campaign copy is being prepared.”，不展示1.1.0工程交接段落，不把旧OUD/PERLA脚本伪装为SERENITY，不禁用浏览其他场景。

## 数据、交互与真实性

继续从同一MockApi/sidecar按product_identity、hero、final_preview角色取资产，不另硬编码路径。此顺序是用户要求的产品叙事，不证明现有Hero由原图实际生成、MP4由Hero或脚本实际渲染。不得新增假Generate按钮、实时进度或成功事件。

若使用预览弹窗：复用现有Dialog，支持关闭/ESC/焦点恢复；关闭或切页暂停视频；播放器play/pause/seek/replay正常，视频元数据实际为10.08秒720×960；不得挂未对齐15秒字幕。只读查看不改变Campaign确认/编辑状态。

## 验收与测试

- 真实浏览器确认用途介绍先于素材区；DOM与屏幕均identity → Hero → video。
- 1440/1366三卡外框和媒体框顶底差不超过2 CSS px；标题与操作行对齐，无溢出、拉伸或标签被裁；检查加载完成后截图。
- 实点主CTA、三阶段已有预览入口、关闭/返回；视频真实播放、暂停和seek，跨页状态保持。不存在只做hover的假入口。
- 保存两个桌面实际截图和视频预览截图到新证据目录；主控实际看图后决定视觉是否通过，不覆盖旧证据。

```powershell
npm run typecheck
npm run build
npm run test:e2e -- product-provided-assets.spec.ts
```

只补本次顺序/对齐及已有预览核心路径检查，不扩展为新一轮全站审计。更新矩阵中因移除首页下载或改预览而变化的入口；其余FAST_06集中检查沿用。

## 完成定义与DSH指令

> 在AS-004现有范围内执行AS-004-HOME-CORRECTION.md。首页先说清营销工作区用途，再按Product image → Campaign visual → Video preview呈现SERENITY。修复Overview与ProvidedAssetShowcase的信息层级、等宽等高卡片和统一媒体框，保留原始比例与产品标签。主页视频通过真正可操作的预览入口打开，不把大播放器和素材下载堆满首屏。复用MockApi、Dialog、现有样式Token与状态机制，不生成新素材、不伪造生成链路、不编营销内容。跑相关检查，交真实1440/1366截图及预览操作结果，在AS-004报告追加说明；不自行accepted，不新开项目阶段。
