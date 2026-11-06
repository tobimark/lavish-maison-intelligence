> 2026-11-05最高优先级更新：当前以 docs/INTERACTIVE_MOCK_PRODUCT.md、docs/INTERACTIVE_PRODUCT_API.md、docs/pages/INTERACTIVE_WORKSPACES.md 和 tasks/DSH_HANDOFF_DEMO_FAST_05.md 为准。六工作区可自由探索，Scenario只作数据容器；只读浏览无阶段前置。旧固定四步/唯一Home可用/导出依赖模拟邮件的要求不再用于开发。冻结场景Schema/业务JSON/Tokens不改，视频仍deferred。

> 2026-11-05范围更新：用户暂缓视频制作；当前以 docs/CONTENT_ONLY_DELIVERY.md 和 tasks/DSH_HANDOFF_DEMO_FAST_04.md 为准，视频缺失不阻塞非视频开发。旧完整视频要求保留作未来范围，不将文案Demo标为完整视频验收通过。

# 四步 POC 页面与交互规格 v1.0

必读 docs/POC_SCOPE.md、docs/DESIGN_SYSTEM.md、docs/DESIGN_REFERENCE_ANALYSIS.md 与对应契约。复用已验收Tokens、字体，壳体需TASK-007主控复查；本规格取代旧Home/Radar/Atelier中的业务范围，不改变视觉语言。

## 结构

入口 `/`：标题 Lavish AI Marketing、一句用途说明、三行宽场景入口，A/B/C各一；显示ready/awaiting_content/invalid。仅ready显示Start；无数据时诚实缺项状态，不堆空KPI。下方最近本地演示记录，可继续、导出、仅重置该会话。

业务主路由 `/poc/[sessionId]`，step以query参数 `discovery|analysis|video|delivery` 表示，view=workflow/replay。Sidebar保持品牌和少量真实导航；Intelligence Radar与Creative Atelier可作阶段分组标签（1/2和3/4），不建设两套重复页面。未完成路径disabled，不404假开页。

页面主体依次：标题+永久Mock标记/场景版本、四步stepper、主体内容、统一操作区。桌面遵循现有shell宽度/inset；控制按钮在阶段底部右侧，一处主操作。右侧详情只在用户打开时出现。1366不让主体被两侧面板夹窄；390单列、stepper横向内部滚动或折行，document无横溢。

## 四个阶段

| 阶段 | 主体布局 | 交互与状态 | 视觉验收 |
|---|---|---|---|
| Discovery | 约2/3信号与趋势区域，1/3可折叠事件轨迹；无空洞统计卡 | 来源/主题筛选、信号选择、证据Drawer、回放工具条；empty与未来未解锁分开 | 正文16、辅助14；趋势不暗示真实行情；证据Drawer不压住主要操作 |
| Analysis & Script | 顶部摘要与依据入口；Brief/Script tabs；脚本正文为主，4镜头按时码排列；EN/AR切换 | 修改、保存新版本、比较/选择原版本、确认；未保存离开Dialog，校验定位字段 | 不用大聊天窗口；AR局部RTL/零tracking，SKU与ID bidi隔离；长脚本可读 |
| Script-to-Video | 9:16真实视频为中心，桌面旁列4镜头；下方固定来源/版本和播放下载操作 | 点击镜头seek；预置渲染事件可收起；无匹配版本/资源失败阻止完成，历史视频只读 | video contain保比例，最大高度适配可视区，不把1080素材拉伸；封面/加载/错误稳定布局 |
| Automated Delivery | 左侧邮件预览，右侧精简收件/附件/确认区；窄屏顺序堆叠；下方交付记录表 | 编辑模拟地址/正文、确认Dialog、模拟交付、失败重试、ZIP下载；所有attempt只读 | 顶部Simulated，成功文案“模拟交付已记录”；不使用真实发送成功图示或虚假平台勾选 |

回放工具条统一：Play/Pause、Step、1×/2×/4×、时间轴/序号、Restart；模式切换显式。未来阶段不可操作时说明原因。阅读回放时编辑/交付按钮禁用并提示“切换操作模式”。

共享组件：Button/Input/Select/Tabs/Badge、Stepper、ReplayControls、VersionSelector、EventTimeline、MediaPreview、Drawer/Dialog、Toast、Empty/Error。单一Dialog/Drawer管理Escape/focus trap/return/scroll lock；loading禁用重复命令，恢复不丢稿，状态标记不单靠颜色。

G2有限原型仅A、同一页面四步的已加载/未解锁/媒体预览/交付预览、一个证据Drawer、一个确认Dialog、EN/AR样例与真实MockApi数据。内容A未到前不写大量样例。主控截图审查G2后，才执行完整编辑器/重试/历史等后续UI任务；预览阶段按钮只开放已真正实现的动作。
