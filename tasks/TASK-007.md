# TASK-007 — 统一壳体、导航与响应布局

> READY：2026-11-04主控已验收TASK-006并关闭FIX-TASK-006-01，允许DSH开始本任务。完成后提交review；本任务不等于M1总门禁。

### Task ID
TASK-007

### Title
实现统一壳体导航与响应布局

### Goal
为后续Home、Radar和Atelier提供同一套Lavish工作空间壳体。只实现壳体与内部预览，不开发业务页面。

### Dependencies
TASK-006 accepted，见 docs/reviews/TASK-006-ACCEPTANCE.md。

### Context
- docs/FRONTEND_DEMO_SCOPE.md
- PROJECT_CONSTRAINTS.md
- docs/DESIGN_REFERENCE_ANALYSIS.md
- reference/LAVISH_LiveVision_RealVideo_Demo.html
- evidence/reference/reference-1440x900.png
- docs/DESIGN_SYSTEM.md
- design/tokens.css（只读）
- docs/INFORMATION_ARCHITECTURE.md
- docs/BRAND_ASSETS.md
- evidence/brand/logo-receipt.json
- docs/VISUAL_ACCEPTANCE.md
- docs/reviews/TASK-006-ACCEPTANCE.md

### Files
- apps/web/components/shell/**（含壳体自己的CSS module）
- apps/web/public/brand/**
- apps/web/app/shell-preview/**（内部QA预览）
- apps/web/app/layout.tsx（只有壳体集成确有必要时；保留Token标准导入与字体入口）
- apps/web/tests/shell.spec.ts
- docs/reviews/TASK-007-DSH.md
- evidence/m1/shell/**

原有design-lab保持独立，避免把内部设计验证页硬塞进业务导航后改变已验收的焦点顺序。壳体先在/shell-preview实际呈现，后续业务页面复用同一组件。不要新建Home/Radar/Atelier空壳冒充业务成果；/当前Foundation ready保留。

### Implementation Requirements
1. 实现可复用AppShell、Sidebar、Header、面包屑与内容容器；内容通过children/明确props传入，不写死未来业务。
2. Sidebar含正式Logo与准确品牌名Lavish Perfumes，软件名MAISON INTELLIGENCE。原样复制 assets/brand/lavish-logo-primary-294x294-rgb.png 到public/brand；SHA256必须为f504781a6a6bbfd7f0f9a51ac077dc37e54c41dba96060667f38992d136f3966。保持完整方图、比例与可读性，无重绘、裁切、滤镜或拉伸。
3. 桌面支持展开/收起，收起偏好存专用localStorage键；读取失败或SSR时有稳定默认态，无hydration错误。收起图标保留可访问名称和hover/focus tooltip。
4. 导航结构为Home / Intelligence Radar / Creative Atelier。只有真实存在的目标可以启用；尚未实现的Radar/Atelier用明确禁用状态，不跳404、不用toast假装打开。预览页标Internal shell preview，面包屑与实际位置一致。
5. 顶栏提供面包屑、清晰DEMO标记和必要导航控制；不加入未经定义的账号/通知/搜索按钮。
6. 移动端菜单关闭时不占内容宽，菜单可用键盘打开、关闭、Escape和回焦；开启期间管理焦点与背景滚动。实现限于shell菜单，不提前建设TASK-009浮层组件库。
7. /shell-preview展示壳体、页面标题、自然段与简洁内容区域，足以检查构图/留白。不是完整首页，不填KPI墙，不引入产品图/视频/聊天面板。

### Visual Specification
直接消费已验收Tokens，保持暖白画布、炭黑侧栏、克制金色与无衬线排版。
- 侧栏宽246（≥1451）/222（桌面紧凑）/78（收起）；≤1170默认收起，≤880改覆盖式移动菜单。
- 顶栏77，手机66；内容边距38/27/16，最大宽1700。
- 正文16、操作15、辅助14；页面标题29，手机25；不得缩字号解决溢出。
- 当前项如有真实对应位置，使用统一暖暗底/金色标识；不要为预览页伪造另一路由的aria-current。
- 控件触屏有效点击区44px，焦点清晰；动效使用180/220ms Token并遵守Reduced Motion。
- 图标无额外包也可用一致的内联SVG；不为壳体引入庞大UI框架或改设计语言。

### Data & API Contract
前端组件props与localStorage折叠偏好，无业务API/数据库。未实现导航保持禁用；不改全局模型。

### Constraints
只改白名单，不修改design/tokens.css、DESIGN_SYSTEM、Next/TS配置或依赖；不开发业务页面；不覆盖TASK-006证据；不声称M1已通过。

### Acceptance Criteria
1920×1080、1440×900、1366×768、390×844均无document横溢；顶栏/侧栏不遮内容；桌面折叠与刷新恢复正常；移动菜单焦点/Escape/回焦正确；可见控件行为明确，Logo完整准确。
原design-lab仍能通过现有8项检查，无字体/AR/Token回归。

### Test Commands
从根目录运行；当前本任务尚未实现，以下不是已通过记录。

```powershell
npm run typecheck
npm run build
npm run test:e2e -- theme.spec.ts shell.spec.ts
```

为新壳体编写有意义的浏览器检查：折叠/恢复、localStorage不可用、未实现导航无错误跳转、移动菜单键盘焦点/关闭/滚动、四尺寸无溢出与console错误。沿用现有Playwright配置，不要求后端。

### Expected Deliverables
代码、正式Logo复制与哈希证明、/shell-preview可访问页面、四尺寸默认截图、1440收起截图、390菜单打开截图与键盘焦点截图；保存到evidence/m1/shell。报告写docs/reviews/TASK-007-DSH.md，列出文件、实际命令/exit code、测试结果、URL、截图和已知限制。

### Failure Conditions
Logo失真；Token或主题漂移；死按钮/404导航；移动越界；焦点丢失；未执行却报告通过；提前开发业务页或自行accepted。

### Definition of Done
交付齐备，开发者实际查看截图并自修问题，提交review。主控再次查看实际网页及截图后才能accepted。到此停止，不继续TASK-008或Home/Radar/Atelier。

### DeepSeek Execution Prompt
在D:/workspace/maison-intelligence完整读取tasks/TASK-007.md并仅执行本任务。TASK-006已由主控accepted。只实现共享AppShell/Sidebar/Header、真实Logo、桌面折叠、移动菜单与/shell-preview内部预览；消费现有Tokens，不建设后端、不开发业务页。严格遵守Files与视觉规格。原design-lab保持独立不破坏其回归。运行typecheck/build以及theme.spec.ts+shell.spec.ts，保存指定截图与docs/reviews/TASK-007-DSH.md，提交主控review后停止，不自行accepted。
