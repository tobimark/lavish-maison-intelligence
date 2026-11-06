# Lavish 工作空间设计系统

v0.1 · 权威依据 [HTML 分析](DESIGN_REFERENCE_ANALYSIS.md)，唯一色值/尺寸源 `design/tokens.css`。这是一套产品设计规范，不宣称是 Lavish 官方 VI。

## 视觉与字体

暖白画布、炭黑侧栏、细边界、克制金色。Radar 与 Atelier 共享壳体；Atelier 只有媒体画布使用 #262725。禁止蓝紫渐变、霓虹、玻璃卡片、衬线大标题和铺满 KPI。首页不设无业务意义计数墙。

字体栈继承 HTML 的 Inter/Segoe UI/Roboto/Arial。M1 本地打包 Inter 与 Noto Sans Arabic 并保存许可证，记录字体渲染与 Segoe 基线的差异；离线不依赖 Google Fonts。正文16/1.6，操作15，元信息14，标签12（仅短标签，不能用于正文/证据/操作），区域标题18，页面标题29/1.22/630、手机25。阿文16/1.8、字距0，段落 `lang=ar dir=rtl`；英文型号与 SKU 用 `bdi`，不能简单反转字符或整体翻转画布。

主文本 #252521、次文本 #56564E，可读辅助 #6B6961；原 #85837C 留在 reference token。错误小字用 #A84A40，信息小字#35617D，成功文字用#1F7765（原#207C69在success wash上实测4.488:1，略低于4.5，原值保留作图形）。浅金只作图形/强调，金文字用#816333。正文目标对比4.5:1，控件边界/焦点3:1。所有状态都同时用标签或图标表达。

## 布局约束

桌面≥1451侧栏246，881–1450侧栏222；用户主动收起78；≤1170默认收起78但可展开为覆盖导航；≤880改移动顶栏菜单，关闭时不占内容宽。顶部77、手机66。内容最大1700、宽屏内边38、笔记本27、手机16。页面标题与工具栏底28；区域间18/24；卡片内24，紧凑20。

侧栏只有 Home、Intelligence Radar、Creative Atelier，次组 Campaigns、Content Calendar、Asset Library 在实现阶段逐步开放；未实现导航不伪装成功页面。面包屑、场景与 DEMO 来源标识放顶栏；主业务操作放页面标题右侧，编辑页保存/提交在工作流栏。单个操作区最多一个实心主按钮；破坏性操作放更多菜单或独立确认。

1440 Radar 主区约698px、辅助约448px；实际以可用宽度1.55:1计算，辅助最小310。Atelier 不继承双列仪表盘：画布占主要宽度，编辑侧栏320px，版本缩略条放底部。≤1170编辑侧栏切抽屉；≤880单列，不用整体缩小字号。页面自然滚动，只允许表格/时间线内部横滚。

## 组件契约

| 组件 | 外观 / 结构 | 状态 / 交互 |
|---|---|---|
| AppShell/Header/Sidebar | 同 Tokens，选中金条3px、暖暗底、线性18px图标 | active aria-current；收起后 tooltip；移动导航 focus trap；刷新保留用户折叠偏好 |
| Button/IconButton | r7；常规40/主操作44；图标16–18；主黑白字、次浅底边界、文字深金 | default/hover/focus/pressed/disabled/pending；pending保留宽度、防双击、aria-busy；触屏44 |
| Form/Select | label在上、控件40/44、textarea≥120，单一间距8/16 | required、帮助、inline error、disabled、dirty；错误aria-describedby，保存失败不丢值；不以placeholder代标签 |
| Tabs | 暖灰轨道、白色选中、r5；单行可滚动 | role=tablist/tabpanel；箭头移动、Home/End；不以重载丢草稿 |
| Card/Section | r12、line1px、极弱阴影，标题18 | 默认只包业务整体，禁止卡片内层层套卡片 |
| SourceBadge/Status | 12–14短标签，来源与任务状态分开 | DEMO / IMPORTED / LIVE；Preset / Live model；不可仅颜色区分 |
| Table/List | 业务文本14–16，行≥56，表头14 | hover、selected、排序、空结果；行操作明确；不把整行和内按钮事件混淆 |
| TrendChart | 金实线当前、灰虚线比较、网格低对比 | SVG不得拉伸文字；轴/图例≥12；键盘定位、tooltip可读、数据表替代；注明模拟时间窗 |
| Dialog | 浅底表单宽560、r12/p24；媒体宽min1080/暗底 | 同一Portal与焦点陷阱；Escape/关闭/取消；打开首个合理焦点，关闭回触发器；背景inert，滚动锁 |
| Drawer | 右侧480，≤880全屏；标题/关闭固定、底部操作固定 | 与Dialog共用overlay原语；最多一个编辑浮层；脏数据先保存/丢弃/继续编辑 |
| Toast | 暗底白字、r8、右下24，最多3条 | role=status；普通3.2秒，错误持续至关闭；不能独自承担关键错误 |
| Loading/Empty/Error | skeleton保持布局；空状态一句原因+一个行动；错误保留上下文 | 不显示虚假进度；可重试、可返回；aria-live不持续刷屏 |
| MediaCanvas | 画布暗色、作品原始比例，缩放显示独立 | 商品原图contain不变形；背景可cover；无图显示待资产，不合成假瓶；可预览/导出实际文件 |

## 动效与反馈

hover180ms，抽屉/侧栏220ms standard easing；禁止循环发光、随机数字跳动。Agent 时间线由事件状态驱动，动画只是展示。Reduced Motion 所有位移/平滑滚动关闭，加载文本仍表达状态。展示模式可隐藏杂项工具，不隐藏 DEMO 与模拟发布标记。

## 图片、品牌与质量

Logo 保留比例与完整图形；禁止 AI 重画、拉伸、金色滤镜覆盖。商品主视觉像素不得低于最大显示尺寸×DPR；产品本体完整、标签可辨、留安全边。授权/来源记录见 BRAND_ASSETS。当前品牌素材未齐，只能通过布局与组件审查，不能批准品牌素材完整性。

前端任务必须引用本文件与相应页面规格。全局规范变更只由主控评估，保留变更原因、受影响页面与重拍证据。验收详见 VISUAL_ACCEPTANCE。
