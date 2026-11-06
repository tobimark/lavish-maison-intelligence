# HTML 视觉标杆分析

权威源：`reference/LAVISH_LiveVision_RealVideo_Demo.html`。SHA-256 `040b47018d67e5a73cab999cc8d3dd3996fc2650909c7de433b9291a9c34cb83`。原路径与资源清单见 `reference/manifest.json`。分析对象为最终 CSS 层叠结果，不只读首段 :root。

## 运行与依赖证据

2026-11-03 用 Edge 156.0.4314.58 / Playwright 1.58.2 实际 file URL 渲染，DPR=1、Reduced Motion。沙箱内浏览器启动失败后，通过授权的沙箱外无头浏览器完成。原 HTML 未修改。截图视频固定到 2 秒，仅为确定性取证。

- CSS、脚本、SVG 图标和图表内联，无 CDN JS、无外部字体文件。
- 视频 `LAVISH_Face_Track_Preview.mp4`：6,701,161 bytes，浏览器识别 1280×720、25.664 秒，readyState=4。页面包含缩略与弹窗两个 video 元素。
- 外链 App 图像返回 200，1200×630；显示于 49×49 框、object-fit:cover。它是 App 商店宽图而非正式 Logo 原件，当前效果中文字过小。不将其裁切方式继承为产品规范。
- 声明字体 Inter → Segoe UI → Roboto → Arial；未加载 Inter。CDP 实测标题使用 **Segoe UI Semibold**；`document.fonts.check()` 返回 true 并不能证明 Inter 存在。
- 没有页面脚本异常；8 项交互探针通过。详见 `evidence/reference/capture-report.json`。这仅是参考基线，不是 M1 验收。

| 截图 | 视口 | 页面宽度 | 观察 |
|---|---|---|---|
| reference-1920x1080.png | 1920×1080 | 1920 | 246px 侧栏，38px 内容边距，主次列明确 |
| reference-1440x900.png | 1440×900 | 1440 | 222px 侧栏，27px 边距，桌面主基准 |
| reference-1366x768.png | 1366×768 | 1366 | 桌面布局正常，页面自然纵向滚动 |
| reference-390x844.png | 390×844 | 442 | 顶栏横向溢出、收起按钮文本泄漏、图表标签被压缩 |
| reference-collapsed.png | 1440×900 | — | 78px 主动收起态 |
| reference-modal.png | 1440×900 | — | 暗色媒体弹窗、统一遮罩与 16:9 视频 |

以上图片均位于 `evidence/reference/`；人工已查看桌面、移动和弹窗原图。测试覆盖：侧栏、门店、周期、图表模式、弹窗打开/Escape、导航和 CSV。未将所有占位功能视为业务完成。

## 视觉提取

| 类别 | 原 HTML 精确值 / 行为 | 应用原则 |
|---|---|---|
| 底色 | canvas #F6F5F2；surface #FFFEFC；muted surface #F9F8F5 | 大面积暖白，细微层次 |
| 深色 | brand-black #191917；soft #282724；媒体 #262725 | 侧栏/主按钮/媒体画布；不把 Radar 全屏做深色 |
| 金色 | #B89A61 / 深金 #816333 / 浅金 #F5EFE3 | 选中标记、关键曲线、轻量标签，不大面积金色背景 |
| 文本 | #252521 / #56564E / #85837C | 保留主次层级；弱文字对比需修正 |
| 语义 | success #207C69 / wash #E8F4EF；danger #BE5F54 / wash #FBEFEA；blue #457B9D | 不让金色代替成功、风险语义 |
| 边界 | line #E8E5DF；卡片 radius 12；shadow 0 9px 35px rgba(42,37,27,.025) | 轻边框与极弱阴影，禁止堆叠玻璃面板 |
| 壳体 | 侧栏246/222；收起78；顶栏77；内容 max-width1700 | 全页面共享同一骨架 |
| 节奏 | 内容33/38/45；紧凑27；卡片间18；标题底28；内边距20–24 | 用统一 Token 表达，允许业务布局差异 |
| 字体 | body14；标题29/1.22/630/-.055em；卡标题15/660；副标题13；许多辅助9–12 | 不加入新衬线；正文提升16，卡标题18，辅助14 |
| 按钮 | 主按钮#25231F/白，hover #39342C；39高/r7；tiny30/r5；图标16–18 | 保留形态，统一40/44点击高度 |
| 主布局 | 左1.71fr+右min330；≤1450左1.55fr+右min310；间18 | Radar 保留主次比例；Atelier 将最大空间给画布 |
| 选中态 | nav #302C24、文字#EBD6AE、左3px金条；tab暖灰底白选中 | 统一组件状态，不能每页另造 |
| 动效 | nav180ms；sidebar220ms；toast220ms；toast停留3200ms | 快而克制；reduce关闭位移和滚动动画 |
| 弹窗 | 遮罩#11130FD9+blur5；媒体宽min1080；r12 | 一套 Dialog 原语；表单用浅面，媒体用暗面 |

## 必须修正而非复制的缺陷

1. 390px 顶栏越界与图表文字缩放：改移动菜单与响应式 SVG 排布，不用整体 transform 缩小。
2. 9–12px 辅助/控制文本与浅灰低对比：新正文16、业务辅助14；装饰标签下限12。语义可读色独立设置。
3. 模态仅切换 class，缺少焦点陷阱/回焦/background inert：M1 共享 Dialog/Drawer 负责。
4. Logo 宽图被塞进方框，回退自行拼双语字样：新项目只显示准确普通品牌文本与“官方 Logo 待提供”，不伪造标志。
5. 导出中 repeat/service 固定为 Ajman 值，切门店会与页面不同；表格 Dubai 数字1565与计算1566不一致：只提取视觉，不继承模拟业务实现。
6. tooltip 鼠标专用、原生 prompt 搜索、只有 toast 的 Details：新原型需要完整键盘操作、搜索对话框与可查看内容。
7. 参考 footer 对视频“全部 simulated”的笼统措辞与真实录制视频不完全一致；新系统每类对象单独标来源。

## 落地与验收

原值和适配值在 DESIGN_SYSTEM 与 tokens.css 分层命名。M1 截图与本参考比较颜色、几何、组件语言、空间节奏；字号按明确适配值比较。只比较同类壳体/组件，不能要求营销工作空间像客流仪表盘一样堆四张 KPI。

后续获准页面作为追加基线，不能替换或削弱原 HTML 权威。任何漂移必须记录差异、理由、主控审查结果和新截图。
