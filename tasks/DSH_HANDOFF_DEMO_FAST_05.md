# DSH执行交接 · Interactive Mock Product

2026-11-05。主控已冻结新产品规格、页面布局、增量API类型和交互矩阵；**允许立即按依赖实施**。没有自动执行入口，本文件交付不等于已派发/已实现。视频继续deferred，不等待新内容、不重做POC-001或已验收基础。

## 必读与优先级

用户最新“Interactive Mock Product”要求 → docs/INTERACTIVE_MOCK_PRODUCT.md → docs/INTERACTIVE_PRODUCT_API.md及apps/web/demo/poc/api/product-contract.ts → docs/pages/INTERACTIVE_WORKSPACES.md → docs/NO_DEAD_CONTROLS_GATE.md和INTERACTION_AUDIT_MATRIX.csv → 每个tasks/interactive/IP-*.md。DESIGN_SYSTEM/HTML/Tokens作为视觉权威继续只读。

旧FAST_04/NV规范只复用已验收实现；旧“必须先进入Scenario/Run完成才能阅读”、Home唯一可点击菜单、Soon断言、导出必须模拟发送的依赖均已被新要求覆盖。不要再次停工询问是否可以开放Radar/Atelier；主控已明确批准这六个工作区和增量API/存储改动。

## 执行顺序

1. IP-001读查询 → IP-002写上下文/普通导出；复用旧MockApi/IndexedDB/状态/ZIP，不写第二套系统。
2. IP-003路由/Overview/全局导航开始接线，与IP-004 Radar、IP-005 Opportunities、IP-006 Atelier完成真实页面。IP-003的路由轻包装可先落地，但六页真实内容齐前不能把空路由当该任务完成；后续任务以壳体**已实现部分**接入，不要求逐项accepted。
3. A的Radar→机会详情→Atelier结果预览先实际截图给主控。页面必须读得懂机会、推荐理由、已有创意，不重新变成长表单。共用数据/组件可继续推进；主控指出构图问题先集中修正再复制其他页面。
4. IP-007 Library、IP-008 Deliverables；A通用结构复用到B/C，现有三包全部有真实可读/可导出结果。
5. IP-009整站点击/状态快照/下载/截图/理解审计，提交docs/reviews/IP-BATCH-DSH.md集中review。不逐控件停工、不扩展边缘工程测试、不自行accepted。

## 强制产品结果

- Sidebar为Overview、Intelligence Radar、Opportunities、Creative Atelier、Creative Library、Deliverables，全部真实路由；无Soon/空白/纯说明占位。Agent Activity是Radar次级抽屉。
- 干净浏览器直接访问任一工作区能看预置信号、推荐、Brief、EN/AR文案、四镜头和可交付内容。Scenario仅作内部数据来源，不在主导航/必经向导。
- 浏览/筛选/语言/版本预览不建/推进/确认工作会话；显式Edit/Confirm才通过API准备上下文，之后复用既有Save/Select/Confirm。普通导出直接产生真实内容包和导出记录，不调用模拟邮件。
- Opportunity=analysis.id、Campaign=brief.id；同一Campaign/版本/owner session在Atelier/Library/Deliverables准确关联。URL优先、旧稿/导出快照保留；保留NV两条修复。
- 人可读业务观点优先：正常策略页展示analysis的洞察/理由/证据/不确定性；结果预览优先、编辑按需。控制Mock披露重复度，保留真实性。原始ID/hash/毫秒不是首屏主体。

## 范围与交付

允许改动按各原子任务白名单；API类型和两store/purpose增量已经主控指定，不改冻结Schema/场景JSON/全局视觉规范/依赖，不发明新热点/素材/随机KPI。所有交互通过统一MockApi；页面不得直接import场景或读IndexedDB。

测试标识按矩阵Test ID映射，实际DOM用data-control-id；88行模板按真实项目展开，有新增控件须补矩阵。报告区分pass/fail/not_run/guarded，写evidence/product/interaction-audit.json，所有可见核心控件有实质观察证据。图片/视频/导出文件不存在时不做假成功；本轮没有视频播放器/渲染。

交付：实现与必要测试、实际可访问URL、9任务变更说明、1440/1366关键图及AR/窄屏、真实ZIP标准解压/版本/时码/图片/hash核对、只读导航前后状态快照，以及一条3–5分钟真实点击路径。原证据与验收报告保留；新证据只写evidence/product/**。

## 可直接复制给DeepSeek的指令

> 执行tasks/DSH_HANDOFF_DEMO_FAST_05.md与tasks/interactive/IP-001至IP-009，把现有Lavish无视频POC改为可自由探索的Interactive Mock Product。先读主控INTERACTIVE_MOCK_PRODUCT、INTERACTIVE_PRODUCT_API、product-contract.ts、INTERACTIVE_WORKSPACES和NO_DEAD_CONTROLS_GATE。六主路由全部有真实内容与操作，去掉Soon/Scenario必经/Run解锁/模拟邮件才能导出的限制。读查询不改业务状态，显式编辑/确认/普通导出/活动播放走指定API，复用现有状态机/IndexedDB/版本/ZIP及已修复脏稿逻辑。正常策略页展示实际洞察、推荐理由和证据，Atelier默认成果预览、编辑按需。按依赖连续实施，先A的Radar/机会/Atelier实际截图给主控，再复用B/C；六页齐后逐项执行交互矩阵、完整点击路径和跨页状态/真实ZIP检查，提交IP-BATCH-DSH集中review。每项按任务白名单，不改冻结Schema/Tokens/客户JSON、不加后端/真实服务/视频、不造业务内容。没有MP4不阻断，不重做已accepted基础；不自行accepted或启动本批外新任务。
