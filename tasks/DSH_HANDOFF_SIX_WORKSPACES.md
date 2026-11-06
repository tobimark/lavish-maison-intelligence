# DSH执行交接 · 六工作区承载完整营销流程

日期：2026-11-06。用户已明确授权本次改造。唯一代码执行者沿用原DSH会话（DeepSeek 4.1 Flash 1017）；主控负责规格、内容/契约裁决及代码、实际浏览器与视觉验收。本文可直接交给DSH连续执行，不逐项停等accepted；最终集中提交review。

## 一、交付目标与已通过基线

保留现有六个一级菜单及顺序：**Overview、Intelligence Radar、Opportunities、Creative Atelier、Creative Library、Deliverables**。不增加Campaign Journey、Social Publishing一级菜单或四个阶段子菜单。

将已经accepted的FLOW各环节整合进对应工作区，让左栏本身就能进入真实业务内容。默认SERENITY案例的主路径：

**Overview → Radar热点总结 → Opportunities营销策略 → Atelier原图/主视觉/视频 → Deliverables社媒预览、编辑、审阅、模拟发布和记录。**

用户可以随时点击任意左栏入口，不要求按顺序解锁。Creative Library集中管理素材/脚本/版本；Deliverables的下载变为辅助功能。原AS和FLOW验收记录保留，作为迁移回归基线，不重做Mock架构、素材、视频、内容或状态机。

## 二、必须阅读

- 本交接单（本轮页面规格和优先级以本文为准）。
- `docs/DESIGN_SYSTEM.md`、`design/tokens.css`、`reference/LAVISH_LiveVision_RealVideo_Demo.html`。
- `docs/reviews/FLOW-BATCH-ACCEPTANCE.md`、`docs/reviews/FAST_06-AS-CLOSURE-REVIEW.md`。
- `docs/CONNECTED_MARKETING_FLOW.md`、`docs/SOCIAL_MOCK_CONTRACT.md`（数据/命令规则继续生效；独立Journey主页面/四阶段tabs入口被本文覆盖）。
- `docs/reviews/FLOW-CONTENT-PROVENANCE.md`（现有摘要/文案来源，不再等待网页包）。
- 现有`apps/web/components/product/journey/{JourneyPage,InsightStage,StrategyStage,CreativeStage}.tsx`及`journey/social/**`、六工作区组件、`NavigationGuard.tsx`。
- `apps/web/demo/poc/api/{product-contract,provided-asset-contract,flow-contract}.ts`、`components/poc/browser-api.ts`及`components/shell/{AppShell,Sidebar}.tsx`。

SERENITY A1.1.0已绑定，原图/Hero/10.08秒MP4、EN/AR脚本、侧车与社媒功能均已有。本轮没有内容缺包前置，不索取已有素材，不制作15秒片，不将AR母语审稿当开发前置。

## 三、页面归属与默认显示

| 左栏/路由 | 主内容与迁移要求 | 主要下一步 | 次级内容 |
|---|---|---|---|
| Overview `/` | 一句话介绍系统、当前SERENITY案例和可见成果；主CTA仍可叫Explore the campaign，但进入该案例的Radar。现有四段摘要如保留，分别链接到对应工作区 | Explore the campaign → Radar | 其他机会、最近成果；不保留独立Journey入口 |
| Radar `/radar` | 将InsightStage的热点结论/意义/关键观察放在当前案例主体；下方复用现有来源筛选、信号、趋势与证据。不要在上下两处重复同一摘要 | Review campaign idea → Opportunities当前案例 | Evidence、Agent Activity按需展开；保留其他案例探索 |
| Opportunities `/opportunities`及已有详情 | 保留三机会选择；选中案例后显示StrategyStage的产品匹配/受众/目标/核心创意/推荐依据。默认SERENITY，完整Brief仍可打开。列表与详情复用相同策略组件，不另写内容 | Open in Creative Atelier | 证据/不确定性、完整Brief。不要只剩列表卡片 |
| Atelier `/atelier` | 整合CreativeStage的产品原图→主视觉→提供视频及解释；EN/AR脚本、四镜头和既有编辑/保存/版本/确认继续可用。结果预览优先，编辑按需；移除重复的大块素材陈列 | Prepare social post → Deliverables当前案例/语言 | 版本、脚本编辑、概念时码；视频不因编辑脚本而改变 |
| Library `/library` | 原有脚本/分镜/原图/Hero/视频/已保存版本筛选与预览继续工作，同Campaign/语言上下文正确 | Open in Atelier或Open in Deliverables（按资产实际用途） | 不把Library变成第二套发布编辑器 |
| Deliverables `/deliverables` | **主画面即SocialStage的视频＋EN/AR发布文案与Instagram预览。** 编辑→保存→明确确认源创意→审阅→Simulate publish；成功显示帖子结果、记录和详情入口；刷新可恢复 | Review / Simulate publish / View simulated post | Download content pack / Download video为次级动作或折叠区；模拟邮件历史再降一级，不占默认主体 |

Deliverables采用“成果审阅与发布”的定位，左栏英文名仍为Deliverables。顶部直接回答“发布到哪里、用哪段视频、配什么文字”；默认不能仍先展示大Hero画廊、文件清单或邮件日志，再把社媒塞在页尾。

社媒帖子详情沿用`/campaigns/[campaignId]/social/[attemptId]`，左栏高亮Deliverables，返回按钮回对应Deliverables并保留案例/版本/语言。完整Brief的已有路由高亮Opportunities，返回同一机会。

## 四、共享案例上下文与路由契约

### 4.1 上下文

工作区间链接传递`campaignId`、`scenarioVersion`；语言`language=en|ar`只在相关页面传递。已保存脚本的`versionId/sessionId`通过当前精确引用和既有工作会话读取；进入Library或Deliverables不能静默改选preset、不能把用户保存稿覆盖。

- 首页主案例A：`campaignId=scn-scent-layering.brief.main`，`scenarioVersion=1.1.0`。默认入口通过现有只读API/已发布版本索引解析，不在各页面分别硬编码不同版本。
- 用户显式选择B/C后，后续主CTA/左栏链接沿用B/C真实上下文。无SERENITY视频或社媒预置文案的案例展示已有成果与诚实缺项，不借A视频/文案、不保留假发布按钮；原下载仍能用。
- URL是当前工作区上下文的可分享来源，刷新/Back/Forward保持；必要的客户端context仅缓存解析结果，不复制业务数据，不为“记住选项”建新DB/store或第二套localStorage事实源。
- 在有当前案例的工作区点击左栏时带上下文；没有上下文的冷访问解析默认公开案例。带显式未知Campaign/版本时显示可恢复错误，不静默回退A。
- 只读切页/筛选/预览/旧路由重定向不创建session、social draft、确认、attempt、导出记录。首次显式Edit/Review等操作才调用原写命令。

### 4.2 唯一旧Journey兼容映射

旧URL`/campaigns/[campaignId]/journey?scenarioVersion=...&stage=...`成为兼容跳转入口，不再渲染另一套四段产品界面：

| stage | 新目的地（保留case/version及合法language） |
|---|---|
| 缺stage、insight | `/radar?campaignId=...&scenarioVersion=...` |
| strategy | `/opportunities?campaignId=...&scenarioVersion=...` |
| creative | `/atelier?campaignId=...&scenarioVersion=...` |
| social | `/deliverables?campaignId=...&scenarioVersion=...` |

先验证准确Campaign/版本再跳转；缺失必需版本或无效stage沿用诚实错误和恢复入口，不能借重定向吞掉无效上下文。使用replace避免Back循环；历史有效链接可用，原稿/帖子原ID不变。内部新增CTA全部使用新工作区链接，不能继续把用户送回旧Journey。

### 4.3 左栏高亮

六项仍一组真实菜单。href含query后，高亮应按pathname和业务归属判断，不能用`currentPath === item.href`比较含query的完整字符串而全部失效。`/campaigns/.../brief`归Opportunities，`/campaigns/.../social/...`归Deliverables；兼容Journey跳转后高亮目标工作区。折叠/移动菜单同规则。

## 五、复用边界与已知修复保护

- `SocialStage`当前接收`{journey:CampaignJourney,onChanged}`，直接复用在Deliverables；`journey`内部数据类型/文件夹名称可保留，不需要为改产品导航大规模重命名。
- 可以抽取统一只读加载hook/context，让Radar/策略/Atelier/Deliverables复用`getCampaignJourney`及既有查询。它只负责解析和读取，不改变已accepted的数据契约。
- 保留FLOW修复：写操作后用silent refresh，不能整页卸载SocialStage导致AR语言重置；保留重复publish保护与幂等。
- 复用现有NavigationGuard，避免同时挂载旧邮件编辑器和社媒编辑器各自注册guard导致互相覆盖。默认只挂载当前打开编辑面，已关闭的邮件抽屉不得覆盖社媒guard。
- 保留现有socialWorkflows、workspaceLinks、productExports、session及旧记录；不清库、不换主键、不加新状态机、后台或真实平台请求。
- 主界面隐藏hash/reviewHash/revision/package ID等实现字段，放“Technical details”折叠区。审阅框优先展示账号/平台、语言、视频预览或清晰名称、完整caption/CTA/hashtags。准确快照检查保留在数据与测试中，不依赖向普通用户展示SHA。
- Mock/Simulated和Provided素材说明保持简短可见；不声称实时生成或真实发送。15秒概念与10.08秒提供片继续分离，无未对齐字幕挂轨。
- 冻结Schema、Tokens、DESIGN_SYSTEM、场景JSON/媒体字节、已accepted公共命令不改。确需公共契约扩展时交主控具体差异，继续不依赖该差异的任务，不自行绕过。

## 六、同批四个原子任务

### WS-001 · 案例上下文、路由映射与左栏高亮

**目标：** 六菜单直接可用且保留准确案例，旧Journey可靠跳转。

**依赖：** 已accepted的AS/FLOW；没有新内容依赖。

**需要阅读：** 本文四/五节、AppShell/Sidebar、journey-utils/JourneyPage、product/flow只读契约、NavigationGuard。

**允许修改文件：**

- `apps/web/components/product/shared/workspace-{context,routes}.ts(x)`、`useCampaignWorkspace.ts`（按需新增，实际只选一种context实现）
- `apps/web/components/shell/{AppShell,Sidebar,Breadcrumbs}.tsx`及必要`./shell.module.css`
- `apps/web/components/product/journey/{JourneyPage,journey-utils}.tsx/ts`（按实际扩展名）
- `apps/web/app/campaigns/[campaignId]/journey/page.tsx`
- `apps/web/components/product/NavigationGuard.tsx`（仅兼容新导航所必需，保留行为）
- `apps/web/tests/product-workspace-integration.spec.ts`（新增核心导航/旧URL用例）
- `docs/reviews/WS-001-DSH.md`、新证据`evidence/product/workspace-integration/ws-001/**`

**功能/视觉规格：** 按本文4.1–4.3；恰好六菜单、原名原顺序、无Soon/假入口；Brief/帖子详情归属准确。共享上下文不写业务数据。无新增全局视觉系统。

**数据/API：** 沿用getCampaignJourney/getCampaign/listCampaigns等只读API，参数由统一helper组装。读取结果确认后构建上下文；不新增旧API必填字段。不要用字符串替换推导Opportunity ID。

**验收：** 四个旧stage均到对应工作区、query/Back正常；显式错误不回退；切六菜单context不丢、高亮唯一正确、浏览零写入；旧帖子链接仍打开原快照。

**测试命令：** `npm run typecheck`；`npm run test:e2e -- product-workspace-integration.spec.ts`（与页面整合依赖的用例可同批后补齐运行，不伪记pass）。

**完成定义/交付：** 代码+准确路由表+相关测试结果/报告，状态review，不自行accepted。不得因旧Journey测试不再显示四tabs就删除其上下文/无写入验证，应改测兼容跳转。

### WS-002 · 首页、Radar、Opportunities、Atelier承接业务环节

**目标：** 用户从任何左栏入口都能看到对应业务内容，沿主CTA完成前三段。

**依赖：** WS-001。

**需要阅读：** 本文页面表、DESIGN_SYSTEM与原HTML、InsightStage/StrategyStage/CreativeStage、既有Radar/Opportunity/Atelier页面与版本编辑逻辑。

**允许修改文件：**

- `apps/web/components/product/Overview.tsx`、`workspace.module.css`
- `apps/web/components/product/{radar,opportunities,brief,atelier}/**`
- `apps/web/components/product/journey/{InsightStage,StrategyStage,CreativeStage,CampaignContext}.tsx`及`journey.module.css`（提取复用，可新增可选展示/导航props，禁止复制业务文案）
- `apps/web/components/product/shared/{PreviewBlocks,ProvidedAssets}.tsx`及对应CSS模块（仅移除重复展示、保护原比例）
- `apps/web/app/{radar,opportunities,atelier}/**`及已有Brief页面（仅必要接线）
- `apps/web/tests/product-workspace-integration.spec.ts`及`product-{navigation,radar,opportunities,atelier,brief,provided-assets,connected-flow}.spec.ts`（仅受迁移影响的断言）
- `docs/reviews/WS-002-DSH.md`、新证据`evidence/product/workspace-integration/ws-002/**`

**功能规格：** 按三节前三业务页面；摘要与原列表/筛选融合，不把完整旧Journey页面再嵌进工作区形成双Header/双导航。Atelier保留编辑/保存/版本/确认和语言，结果主视觉只出现一份；下一步直达Deliverables。没有已准备社媒的B/C不借用A。

**视觉规格：** 首屏标题为工作区/当前案例业务含义，不出现Stage x of 4或Journey四tab；16px正文/14px辅助、统一间距与按钮。原图→Hero→视频仍保持等宽等高媒体框，真实比例contain、身份图瓶标完整。1440/1366不横溢，主操作突出，技术信息按需收起。

**数据/API：** 通过同一只读工作区context及既有API；引用批准sidecar、Brief/analysis、精确脚本版本；不手写另一套热点/策略。既有用户稿优先按明确工作版本读取，不能因迁移重置。

**验收：** 首页主CTA进入带A上下文的Radar；Radar→Opportunities→Atelier→Deliverables正确，左栏可反向自由切换；来源筛选/证据/Brief、EN/AR、四镜头和实际播放器可用；编辑保存刷新无退化。

**测试命令：** `npm run typecheck`；`npm run build`；`npm run test:e2e -- product-workspace-integration.spec.ts product-radar.spec.ts product-opportunities.spec.ts product-atelier.spec.ts product-provided-assets.spec.ts`（证据目录先隔离后运行）。

**完成定义/交付：** 真实1440/1366前三工作区截图、主CTA/反向导航及编辑结果、代码和报告；不以旧组件简单堆叠或只改菜单链接视为完成。

### WS-003 · Deliverables升级为成果审阅与模拟发布

**目标：** 点击左栏Deliverables直接进入视频＋文案的发布工作台，下载为辅助。

**依赖：** WS-001；与WS-002同一执行者连续接线。

**需要阅读：** 本文Deliverables行与五节、已accepted的SocialStage/SocialAttemptDetail、旧Deliverables导出/邮件、FLOW社媒测试与NavigationGuard。

**允许修改文件：**

- `apps/web/components/product/deliverables/**`、`apps/web/app/deliverables/**`
- `apps/web/components/product/journey/social/**`（复用/抽取，不改命令状态）
- `apps/web/components/product/shared/workspace-*`、`useCampaignWorkspace.ts`（仅共享context接线）
- `apps/web/app/campaigns/[campaignId]/social/[attemptId]/page.tsx`（仅返回路由、归属和参数）
- `apps/web/components/product/library/LibraryPage.tsx`（资产到Deliverables的正确入口）
- `apps/web/tests/product-{social-publish,deliverables,asset-downloads,cross-page,workspace-integration}.spec.ts`
- `docs/reviews/WS-003-DSH.md`、新证据`evidence/product/workspace-integration/ws-003/**`

**功能规格：** 默认同屏左右布局：左EN/AR发布文案及Edit/Save/Review/Simulate，右视频帖子预览。显式源创意确认/准确审阅与发布沿用原机制；成功结果与帖子记录是主体下方可见区。Downloads可用折叠区，原包/独立MP4/历史原字节重下必须保留；邮件仅按需挂载的更次级抽屉。B/C可见已有文案/导出和真实缺项，隐藏无法执行的模拟发布动作。

**视觉规格：** 页面H1保留Deliverables，说明如“Review your video and copy, then simulate a social post.”；不要用文件清单定义用途。账号名正常换行，Simulated/Provided可见但不重复成段堆叠。审阅及帖子详情的hash/revision收进技术详情，不遮蔽视频、文案与主按钮；保持准确性测试。1440/1366同页能比较视频和文案，允许自然滚动。

**数据/API：** 直接复用`SocialStage({journey,onChanged})`及同一socialWorkflows记录，silent refresh保留AR/编辑目标；原稿/帖子ID不变，不建新发布API/数据库。视频、caption、语言、CTA和hashtags与保存/审阅快照一致。明确无内容发送到Instagram。

**验收：** 冷打开Deliverables即可预览预置帖且无业务写入；EN/AR独立编辑保存刷新、确认、审阅、双击仅一次模拟发布、旧帖不随改稿变化；离开/换Campaign时Save/Discard/Cancel有效；帖子详情高亮Deliverables并返回正确语言/上下文。下载不要求发布成功或邮件前置。

**测试命令：** `npm run typecheck`；`npm run build`；`npm run test:e2e -- product-social-publish.spec.ts product-deliverables.spec.ts product-asset-downloads.spec.ts product-workspace-integration.spec.ts`。

**完成定义/交付：** 正常发布全链、AR与1366实际截图、原帖/旧导出兼容验证及报告；只在现有下载页尾加Social模块、另起一套发布记录或丢失guard均不合格。

### WS-004 · 一次六工作区整体验收交付

**目标：** 证明主线从左栏工作区真正可达，并守住已accepted数据/功能。

**依赖：** WS-001..003。

**需要阅读：** 本交接、前三项报告、AS/FLOW验收、交互矩阵与既有spec。

**允许修改文件：**

- `apps/web/tests/product-*.spec.ts`（仅受本次迁移影响及必要回归）；可新增`product-workspace-integration.spec.ts`
- `playwright.config.ts`（仅当有必要统一证据配置；不得改测试断言放宽质量）
- `docs/INTERACTION_AUDIT_MATRIX.csv`（保持旧行可追溯，标注deprecated→replacement，不把已移除入口伪标pass）
- `docs/reviews/WS-{004,BATCH}-DSH.md`、`docs/STATUS.md`、`tasks/registry.json`（只标review/真实提交状态，不改AS/FLOW accepted历史）
- `evidence/product/workspace-integration/final/**`

**验收路径：** 全新context：Overview主CTA→Radar摘要/证据/来源过滤→Opportunities当前策略/Brief→Atelier三段创意/真实视频/双语脚本→Deliverables改稿保存/确认/审阅/模拟发布→帖子详情刷新→辅助下载真实包/MP4→Library查看同Campaign素材→左栏回Radar。另直接点击六菜单、四旧Journey链接、B/C无A素材借用、已存稿/已发帖/旧导出兼容、脏稿离开保护各检查一次。

**测试命令：**

```powershell
npm run typecheck
npm run build
npm run test:unit -- tests/poc/flow-projection.test.ts tests/poc/social-workflow.test.ts tests/poc/product-asset-export.test.ts
npm run test:e2e -- product-workspace-integration.spec.ts product-navigation.spec.ts product-social-publish.spec.ts product-cross-page.spec.ts product-asset-downloads.spec.ts
```

**证据规则：** 本轮所有浏览器截图/ZIP/日志写新目录。旧spec若硬编码旧证据路径，先改为显式`EVIDENCE_ROOT`可配置参数，并给本轮设置新根；不要覆盖原AS/FLOW evidence。测试适配新页面/入口时保留版本/语言/精确快照/无浏览写入等核心断言，不为转绿删除。

**完成定义：** 一份WS-BATCH报告包含变更文件、执行命令/exit、主路径与兼容映射、1440/1366及AR截图、真实ZIP/MP4/模拟帖子记录、未完成项；主控实际看图/试路径后才决定accepted。失败UI故障注入、15秒制作、AR母语审稿本轮不要求。不新开逐控件门禁或额外大规模审计。

## 七、DSH可直接执行的Prompt

> 执行tasks/DSH_HANDOFF_SIX_WORKSPACES.md，连续完成WS-001..004，同批提交一次review。用户已批准：严格保留现有六个菜单，Journey各环节整合进Radar/Opportunities/Atelier/Deliverables，Deliverables负责社媒预览、编辑保存、审阅、模拟发布和帖子记录，下载为辅助，邮件为更次级。复用已accepted的FLOW组件、MockApi/IndexedDB、草稿/发布快照、版本和ZIP，禁止重新实现业务状态。统一Campaign/版本上下文，左栏与下一步CTA都保留所选案例并准确高亮；旧Journey四stage链接replace到对应工作区，不继续提供第二套产品页面。先按本文白名单做导航/context，再融合前三工作区及Deliverables；保护silent refresh/AR隔离/重复发布/NavigationGuard和旧帖旧导出。主界面技术hash与revision收进详情，真实Mock/Provided标识保留。SERENITY内容和视频已齐，无需等待或重制；不得改冻结Schema/Tokens/原内容素材。跑必要测试一次，全部新证据隔离，提交WS-001..004及WS-BATCH报告、真实截图/帖子/ZIP/MP4；状态review，不自行accepted、不自动启动下一批。
