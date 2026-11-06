# AS-004-DSH · 成果主视觉、Brief 与播放器组件接线（含 AS-004 首页修正）

日期：2026-11-05 · 状态：首页修正实施与验证完成，等待主控集中验收（不自行 accepted）

说明：AS-004 的共享组件、Brief 路由、Atelier/Deliverables 接线由同批并行实现已存在；本报告记录本会话按 `tasks/assets/AS-004-HOME-CORRECTION.md` 完成的首页用途优先与三阶段展示修正，并保留 AS-004 的既有结论/证据引用。

## 本次修正内容

- `apps/web/components/product/Overview.tsx`
  - 用途区移到资产之前；唯一 H1 改为 “From market insight to campaign-ready creative”；说明句为 “Explore opportunities, review bilingual scripts and storyboards, and download campaign materials.”；两个真实 CTA（Explore opportunities → `/opportunities`、Browse creative work → `/atelier`）。
  - 删除素材仓库式标题（“A real product story…”/Featured product）与首屏逐项下载/技术参数；资产区改用新的创意演进组件。
  - 增加 `overviewPage` 密度类：缩小 intro 间距；≤1400 隐藏右侧 “This workspace” 说明块，保证 1366×768 首屏可看到三阶段媒体与标题。
- `apps/web/components/product/shared/ProvidedAssets.tsx`
  - 新增 `HomeCreativeProgression`：案例标题 “SERENITY · Creative concept”、副标题 “Product image → Campaign visual → Video preview”、简短 Provided 说明与（awaiting 时）唯一 “Campaign copy is being prepared.”。
  - 三卡 DOM/视觉/窄屏顺序固定为 01 Product image（白底 identity）→ 02 Campaign visual（Hero）→ 03 Video preview（MP4）。每卡编号+业务名+一句用途+真实预览入口；三卡均为真实 `<button>`，点击打开预览 Dialog。
  - 首页不渲染逐项 Download、MB/px/ms/包版本等技术文字；下载仍在 Library/Deliverables。
  - 视频初始为统一尺寸缩略预览（无 controls、paused、poster 为 hero_reference），完整原生播放器只在 Dialog 中出现；Dialog 复用现有 `Overlay`（关闭/ESC/焦点恢复），关闭或切页暂停视频；错误显示真实提示 + Retry。
  - 保留 `ProvidedAssetShowcase` 供 Atelier/Deliverables 使用，首页专用布局不影响其 compact 形态。
- `apps/web/components/product/shared/provided.module.css`：新增首页 progression 样式；媒体框固定高度 1440=240px、1366=220px；identity contain、Hero contain（完整优先）、video 3:4 contain；卡片 header/media/caption/action 行对齐；≤900px 单列堆叠。
- `apps/web/components/product/workspace.module.css`：仅新增 `overviewPage` 密度规则（首页专用，未改其他页面）。
- `apps/web/tests/product-provided-assets.spec.ts`：改为首页修正路径检查（用途先于素材、H1/CTA、DOM/屏幕顺序、三卡与媒体框对齐、无下载/技术文字、awaiting 单句、视频 Dialog 实际 play/pause/seek/replay/焦点恢复、窄屏无溢出），并保留 Deliverables compact、双语 ZIP、原 MP4 下载回归。
- `docs/INTERACTION_AUDIT_MATRIX.csv`：仅更新首页预览入口的 page/scope（AS-IDENTITY-OPEN、AS-HERO-PREVIEW、AS-VIDEO-TAB、AS-VIDEO-PLAY/SEEK/REPLAY/AUDIO/ERROR），行数仍 119，未删除失败项；下载入口仍保留在 Deliverables/Library。

## 命令与真实 exitcode

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过 |
| `npm run build` | 0 | 通过（生产构建） |
| `PLAYWRIGHT_PORT=3120 npm run test:e2e -- product-provided-assets.spec.ts` | 0 | 7 passed |
| `PLAYWRIGHT_PORT=3120 npm run test:e2e -- product-deliverables.spec.ts` | 0 | 4 passed（compact showcase 不回归） |

日志：`evidence/product/assets/home-correction-typecheck.log`、`home-correction-build.log`、`home-correction-e2e.log`、`home-correction-deliverables-e2e.log`；服务为临时 3120 生产实例（避免旧 3100 build）。

## 对齐与首屏测量（evidence/product/assets/home-correction/alignment.json）

| 视口 | 用途先于素材 | DOM/屏幕顺序 | 卡宽差 | 卡顶/底差 | 媒体高 | 媒体顶/底差 | caption/action 顶差 | 溢出 |
|---|---|---|---|---|---:|---|---:|---:|
| 1440×900 | 是 | identity → hero → video | 0 | 0 / 0 | 240px | 0 / 0 | 0 / 0 | 0 |
| 1366×768 | 是 | identity → hero → video | 0.01px | 0 / 0 | 220px | 0 / 0 | 0 / 0 | 0 |

- 1440×900 首屏可见用途、两个 CTA、三阶段媒体、标题、说明与操作行（截图 `home-purpose-1440.png`）。
- 1366×768 首屏可见用途、CTA、三阶段媒体与标题（截图 `home-purpose-1366.png`）；说明/操作行在折叠线下，属于可滚动内容（规格只要求媒体及标题在首屏）。
- identity 实际 2000×2000 object-fit contain；Hero 实际 2560×1440 contain（完整优先）；视频 720×960、3:4、10.08s、原生 controls、无 autoplay。

## 预览交互实测

- 点击 03 Video preview 打开 `home-preview-dialog`；真实 MP4 元数据 720×960、duration 10.08s、controls=true、初始 paused=true、object-fit contain。
- 实际执行 play → currentTime 前进 → pause → seek 7.56s → 回 0 重播 → pause；Dial 关闭（ESC）后视频卸载/暂停，焦点恢复到触发按钮；再点 identity 卡打开图片预览，ESC 关闭。
- 截图：`home-video-preview-1440.png`、`home-image-preview-1440.png`、`home-purpose-390.png`（390 单列顺序 01→02→03，无横向溢出）。

## 已知问题 / NOT_RUN

- SERENITY 1.1.0 内容未到：首页仅显示 “Campaign copy is being prepared.”；下方旧 A 仍为历史 OUD/PERLA 内容，未被标成 SERENITY 新文案；AS-003 最终绑定仍 NOT_RUN。
- 视频 poster 复用 Hero，只是 `hero_reference`，不声称影片帧/官方封面；首页缩略图为此 poster，完整播放器在 Dialog。
- 首页已移除逐项下载与技术参数；需要下载请到 Library/Deliverables（Deliverables compact 仍提供图像/MP4 下载，回归通过）。
- 1366 首屏卡片说明/操作行在折叠线下（媒体与标题可见）；若主控要求整卡在首屏，可进一步压缩，但会偏离 220px 媒体建议。
- 未改冻结 Schema/Tokens/素材字节/公共 API/状态机；未改 Atelier/Brief/Deliverables 既有布局（仅首页专用类与共享组件新增分支）。

## 证据路径

- `evidence/product/assets/home-correction/home-purpose-1440.png`
- `evidence/product/assets/home-correction/home-purpose-1366.png`
- `evidence/product/assets/home-correction/home-video-preview-1440.png`
- `evidence/product/assets/home-correction/home-image-preview-1440.png`
- `evidence/product/assets/home-correction/home-purpose-390.png`
- `evidence/product/assets/home-correction/deliverables-compact-regression-1440.png`
- `evidence/product/assets/home-correction/alignment.json`
- 日志与 ZIP：同目录 `home-correction-*.log`、`bilingual-campaign-pack.zip`

## AS-004-HOME-FIX-02 · 旧导航/首页 spec 断言更新（测试-only）

- 产品代码未改；仅更新过期测试预期。
- `apps/web/tests/product-navigation.spec.ts`：两处 overview route heading 由 `Marketing opportunities for Lavish` 改为 `From market insight to campaign-ready creative`（保留真实内容/无 Soon/无 session 等核心断言）。
- `apps/web/tests/poc-prototype.spec.ts`：首页 H1 改为新标题（稳定定位 `overview-page` + `role=heading, level=1`）；首页 “Video deferred” 旧标记改为当前真实徽标 `Six workspaces`（两处）。
- 验证（3130 生产实例，EVIDENCE_ROOT 仅用于 poc-prototype 旧 spec，避免覆盖历史证据）：
  - `PLAYWRIGHT_PORT=3130 npm run test:e2e -- product-navigation.spec.ts` → exit 0，**5 passed / 0 failed**。
  - `EVIDENCE_ROOT=evidence/product/ip-009/legacy PLAYWRIGHT_PORT=3130 npm run test:e2e -- poc-prototype.spec.ts` → exit 0，**10 passed / 0 failed**（输出写入 legacy 根）。
  - `PLAYWRIGHT_PORT=3130 npm run test:e2e -- product-provided-assets.spec.ts` → exit 0，**7 passed / 0 failed**。
- 历史证据未变：`evidence/product/assets/home-correction/old-evidence-unchanged.json` 显示 `evidence/m1/shell` 8/8、`evidence/poc/prototype` 16/16 的 hash/size/mtime 与 FIX-01 基线一致；`poc-prototype` 本次输出仅写 `evidence/product/ip-009/legacy`。
- 日志：`evidence/product/assets/home-correction/navigation-e2e.log`、`poc-prototype-e2e.log`、`provided-assets-e2e-3130.log`。
- 不自行 accepted；等待主控复跑与集中验收。

## AS-004-HOME-FIX-03 · product-as-audit 首页播放器断言适配（测试-only）

- 产品代码未改；只更新 `apps/web/tests/product-as-audit.spec.ts`。
- 所有路由 `goto` 改为 `waitUntil:'load'`，避免视频媒体请求拖住 `networkidle`。
- 首页初始断言改为：`provided-video-thumb` 存在、`provided-video` 数量 0（缩略图 `controls=false`、`paused=true`）；点击 `[data-stage="video"]` 打开 `home-preview-dialog` 后才取 `provided-video`，断言 `controls=true`、`videoWidth=720`、`videoHeight=960`、duration≈10.08s；随后 ESC 关闭，Dialog 与完整播放器均消失。
- 保留 AS 控件收集、available/notRun/missing 与 `evidence/product/as-006/interaction-audit.json` 输出；首页实际 AS 控件为 AS-HERO-EXPLORE / AS-IDENTITY-OPEN / AS-HERO-PREVIEW / AS-VIDEO-TAB，available 10 项全部 from DOM，未删 NOT_RUN 项。
- 3130 结果：`product-as-audit.spec.ts` exit 0，**1 passed / 0 failed**；`product-provided-assets.spec.ts` exit 0，**7 passed / 0 failed**。
- 审计输出：`evidence/product/as-006/interaction-audit.json`（missingFromDom=[]，media={controls:true,width:720,height:960,duration:10.08}，homepagePreview 记录 thumb/dialog/ESC）。
- 日志：`evidence/product/assets/home-correction/as-audit-e2e.log`、`provided-assets-e2e-3130.log`。
- 不自行 accepted；等待主控全量复跑。

## AS-004 剩余 · 1.1.0 SERENITY 对象、Brief/Atelier/Library 接线

- Brief `/campaigns/[campaignId]/brief`：读取 1.1.0 SERENITY Brief/analysis；产品 focus= SERENITY（SKU 6290360533636 / 100014），不再出现 PERLA/LAVISH OUD；identity 白底原图 2000×2000 仅作 identity，Hero 完整 16:9 展示；新增 `product-brief.spec.ts`（A/B/C/unknown、只读无 session）。
- Atelier：默认结果顶部新增 `ProvidedCampaignAssets`（identity + Provided 视频）；视频 3:4 contain、原生 controls、playsInline、preload=metadata、不 autoplay、poster=Hero（hero_reference）、无 VTT；EN/AR v2 与四镜头仍在下方 tabs；编辑/切 Campaign 不更新视频。
- Library：脚本/分镜列表保持原行为（12 行）；新增 Provided SERENITY assets 区（Hero/identity/video 三类型），支持 `LIB-kind` 三类筛选、预览（图片实际 2000×2000；视频 720×960/10.08s controls）、Open in Atelier；筛选/预览不建 session。
- 首页/creative progression 已由并行 FLOW 批次改为 connected-case + Journey 结构（另一批次基线，保留未改，未纳入 FAST_06 验收）；Journey 内 identity→Hero→video 等高/预览由 product-provided-assets 测试覆盖。
- 视频实测：720×960、3:4、10.08s、controls=true、paused 初始；Dialog/内嵌播放均可 play/pause/seek/replay；首页/Journey 预览关闭暂停。
- 验证：typecheck exit 0；build exit 0（buildId `otW8-a5y66W0hdP0409Ee`）；product-brief/atelier/library/provided-assets/navigation 共 **26 passed / 0 failed**；日志 `evidence/product/assets/as-004/e2e-final.log`。
- 截图（真实 3150 生产构建）：`as004-overview-1440/1366/390`、`as004-brief-1440/1366/390`、`as004-atelier-en-1440/1366`、`as004-atelier-ar-1440/390`、`as004-library-1440/390`；`as004-evidence.json` 记录视频元数据与无 console/page error。
- 已知：15s 成片/poster 仍未制作（pending，不伪填）；AR 为待母语/品牌审稿草案；Atelier poster 为 Hero 参考图；FLOW 新 Journey/connected-case 功能属另一批次，未纳入本批验收、未改动其代码。
